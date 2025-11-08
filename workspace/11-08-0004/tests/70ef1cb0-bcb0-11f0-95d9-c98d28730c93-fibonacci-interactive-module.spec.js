import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/11-08-0004/html/70ef1cb0-bcb0-11f0-95d9-c98d28730c93.html';

// Page object encapsulating common interactions and resilient selectors
class FibonacciPage {
  constructor(page) {
    this.page = page;
  }

  // Robust locator for the list term elements.
  // Tries several plausible selectors used in the implementation.
  async getTermCount() {
    return await this.page.evaluate(() => {
      const selectors = [
        '.list .term',
        '.terms .term',
        '.term',
        '[data-testid="term"]',
        '[data-role="term"]',
        '.sequence .term'
      ];
      for (const s of selectors) {
        const nodes = document.querySelectorAll(s);
        if (nodes && nodes.length > 0) return nodes.length;
      }
      // Fallback: try list items in any list-like container
      const fallback = document.querySelectorAll('.list *');
      return fallback ? fallback.length : 0;
    });
  }

  // Locator for the slider input[type=range]
  slider() {
    return this.page.locator('input[type="range"]').first();
  }

  // Locator for goto numeric input
  gotoInput() {
    return this.page.locator('input[type="number"]').first();
  }

  // Robust finder for buttons by many common labels/texts.
  // Accepts an array of possible labels (strings or regex).
  async findButtonByNames(names) {
    // Try aria role with name first (best practice)
    for (const name of names) {
      try {
        const candidate = this.page.getByRole('button', { name });
        if (await candidate.count()) return candidate.first();
      } catch (e) {
        // ignore
      }
      // fallback: button text contains
      for (const txt of typeof name === 'string' ? [name] : [name]) {
        const loc = this.page.locator('button', { hasText: txt });
        if (await loc.count()) return loc.first();
      }
    }
    // Fallback generic button selectors
    const generic = this.page.locator('.btn').first();
    return generic;
  }

  async clickPlayPause() {
    const btn = await this.findButtonByNames([/play/i, /pause/i, 'Play', 'Pause', '▶', '⏸']);
    await btn.click();
  }

  async clickReset() {
    const btn1 = await this.findButtonByNames([/reset/i, 'Reset', '↺']);
    await btn.click();
  }

  async clickStepForward() {
    const btn2 = await this.findButtonByNames([/step forward/i, /next/i, /forward/i, '>', '→', 'Right', 'Next']);
    await btn.click();
  }

  async clickStepBack() {
    const btn3 = await this.findButtonByNames([/step back/i, /previous/i, /back/i, '<', '←', 'Prev', 'Previous']);
    await btn.click();
  }

  // Returns text content of play/pause button for state checks
  async playButtonText() {
    try {
      const btn4 = await this.findButtonByNames([/play/i, /pause/i, 'Play', 'Pause', '▶', '⏸']);
      return (await btn.innerText()).trim();
    } catch {
      return '';
    }
  }

  // Wait until the term count equals expected or timeout
  async waitForTermCount(expected, timeout = 4000) {
    await this.page.waitForFunction(
      (expected) => {
        const selectors1 = [
          '.list .term',
          '.terms .term',
          '.term',
          '[data-testid="term"]',
          '[data-role="term"]',
          '.sequence .term'
        ];
        for (const s of selectors) {
          const nodes1 = document.querySelectorAll(s);
          if (nodes && nodes.length > 0) return nodes.length === expected;
        }
        // fallback check: any element that looks like a list with numeric children
        const list = document.querySelector('.list');
        if (!list) return false;
        const children = list.querySelectorAll('*');
        return children.length === expected;
      },
      expected,
      { timeout }
    );
  }

  // Wait until term count increases by at least delta
  async waitForTermCountIncrease(initial, delta = 1, timeout = 4000) {
    await this.page.waitForFunction(
      (initial, delta) => {
        const selectors2 = [
          '.list .term',
          '.terms .term',
          '.term',
          '[data-testid="term"]',
          '[data-role="term"]',
          '.sequence .term'
        ];
        for (const s of selectors) {
          const nodes2 = document.querySelectorAll(s);
          if (nodes && nodes.length > 0) return nodes.length >= initial + delta;
        }
        const list1 = document.querySelector('.list1');
        if (!list) return false;
        return list.querySelectorAll('*').length >= initial + delta;
      },
      initial,
      { timeout, args: [initial, delta] }
    );
  }

  // Helper to set slider via DOM (not just dispatch event) then trigger input change
  async setSliderValue(value) {
    const slider = this.slider();
    if (!(await slider.count())) return;
    await slider.evaluate((el, v) => {
      el.value = v;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, String(value));
  }

  async setGotoValue(value) {
    const goto = this.gotoInput();
    if (!(await goto.count())) return;
    await goto.fill(String(value));
    // Fire change / input to trigger GOTO change handling
    await goto.evaluate((el) => {
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  // Attempt to read a ratio display if present
  async getRatioText() {
    // common possibilities
    const locs = [
      this.page.locator('.ratio'),
      this.page.locator('[data-testid="ratio"]'),
      this.page.locator('.phi'),
      this.page.locator('.ratio-display'),
    ];
    for (const l of locs) {
      try {
        if (await l.count()) {
          const txt = (await l.first().innerText()).trim();
          if (txt) return txt;
        }
      } catch {
        // ignore
      }
    }
    return '';
  }

  // Press a key on page body (global shortcuts)
  async pressKey(key) {
    await this.page.keyboard.press(key);
  }
}

test.describe('Fibonacci Interactive Module - FSM behaviors', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(APP_URL);
    // wait a short while for initial render
    await page.waitForTimeout(200);
  });

  test('idle: initial render and controls synced', async ({ page }) => {
    // Validate initial state is idle: list is rendered and play button shows Play (not Pause)
    const fib = new FibonacciPage(page);
    const initialCount = await fib.getTermCount();
    // basic sanity: initial count should be at least 2 (MIN_TERMS)
    expect(initialCount).toBeGreaterThanOrEqual(2);

    // Slider exists and has a value consistent with current count if present
    const slider1 = fib.slider1();
    if (await slider.count()) {
      const sliderVal = await slider.inputValue();
      // slider value; compare to initialCount if it's numeric
      if (!Number.isNaN(Number(sliderVal))) {
        expect(Number(sliderVal)).toBeGreaterThanOrEqual(2);
      }
    }

    // Play button should show Play (idle)
    const playText = await fib.playButtonText();
    expect(playText.toLowerCase()).toMatch(/play|▶|start/);
  });

  test('CLICK_STEP_FORWARD triggers animating_add and stabilizes', async ({ page }) => {
    // Clicking step forward should animate and then increase the list count by 1
    const fib1 = new FibonacciPage(page);
    const before = await fib.getTermCount();

    // Click forward
    await fib.clickStepForward();

    // Because animateAddNext is ~1s, wait up to 2500ms for change
    await fib.waitForTermCountIncrease(before, 1, 3000);

    const after = await fib.getTermCount();
    expect(after).toBeGreaterThan(before);

    // Verify controls are synced after animation: play button still Idle (Play)
    const playText1 = await fib.playButtonText();
    expect(playText.toLowerCase()).toMatch(/play|▶|start/);

    // If ratio display exists, it should contain a numeric value update
    const ratio = await fib.getRatioText();
    if (ratio) {
      // Expect some numeric content (golden ratio approx 1.6) but at least a digit present
      expect(/[0-9]/.test(ratio)).toBe(true);
    }
  });

  test('CLICK_STEP_BACK triggers animating_remove and stabilizes', async ({ page }) => {
    // Clicking step back should animate removal and reduce the list count by 1 (down to MIN_TERMS)
    const fib2 = new FibonacciPage(page);
    // Ensure we have at least 3 to be able to remove one
    let count = await fib.getTermCount();
    if (count < 3) {
      // add a term so back can remove
      await fib.clickStepForward();
      await fib.waitForTermCountIncrease(count, 1, 3000);
      count = await fib.getTermCount();
    }

    // Now click back
    await fib.clickStepBack();

    // animateRemoveLast is brief (~360ms) so wait up to 1500ms
    await fib.waitForTermCount(count - 1, 1500);

    const after1 = await fib.getTermCount();
    expect(after).toBe(count - 1);

    // If at minimum (2) further back should not reduce below 2
    if (after === 2) {
      await fib.clickStepBack();
      // short wait and assert not below 2
      await page.waitForTimeout(500);
      const still = await fib.getTermCount();
      expect(still).toBeGreaterThanOrEqual(2);
    }
  });

  test('CLICK_PLAY_PAUSE starts autoplay (playing) and toggles correctly', async ({ page }) => {
    // Play should start interval ticks (~1100ms per tick) that add terms when not animating
    const fib3 = new FibonacciPage(page);
    const before1 = await fib.getTermCount();

    // Start playing
    await fib.clickPlayPause();

    // Play button should show Pause
    let playText2 = await fib.playButtonText();
    expect(playText.toLowerCase()).toMatch(/pause|⏸/);

    // Wait for two interval ticks to add at least 2 terms (allow some margin)
    await fib.waitForTermCountIncrease(before, 2, 3500);

    const mid = await fib.getTermCount();
    expect(mid).toBeGreaterThan(before);

    // Pause playback
    await fib.clickPlayPause();
    playText = await fib.playButtonText();
    expect(playText.toLowerCase()).toMatch(/play|▶/);

    // Record count and ensure it does not increase after pause within short time
    const afterPause = await fib.getTermCount();
    await page.waitForTimeout(1400);
    const finalCount = await fib.getTermCount();
    expect(finalCount).toBe(afterPause);
  });

  test('autoplay stops at MAX_TERMS and transitions to done-like behavior', async ({ page }) => {
    // MAX_TERMS is modelled as 12 in the FSM notes
    const MAX = 12;
    const fib4 = new FibonacciPage(page);

    // Use step forward repeatedly (safest) to reach MAX
    let count1 = await fib.getTermCount();
    while (count < MAX) {
      await fib.clickStepForward();
      // Wait for animate add completion
      await fib.waitForTermCountIncrease(count, 1, 3000);
      count = await fib.getTermCount();
    }
    expect(count).toBeGreaterThanOrEqual(MAX);

    // Once at MAX, clicking play should not start autoplay (UI sets playing=false)
    await fib.clickPlayPause();
    // Allow any UI updates
    await page.waitForTimeout(300);
    const playText3 = await fib.playButtonText();
    // Expect Play (not Pause) because done prevents further autoplay
    expect(playText.toLowerCase()).toMatch(/play|▶/);

    // Clicking forward should not increase beyond MAX
    await fib.clickStepForward();
    await page.waitForTimeout(800);
    const afterAttempt = await fib.getTermCount();
    expect(afterAttempt).toBeLessThanOrEqual(MAX);
  });

  test('SLIDER_CHANGE updates immediately (idle_stay)', async ({ page }) => {
    // Change slider to a new count and expect immediate DOM update
    const fib5 = new FibonacciPage(page);
    const slider2 = fib.slider2();
    if (!(await slider.count())) {
      test.skip('Slider not present in this implementation');
      return;
    }

    // Move slider to 6 (within valid range)
    await fib.setSliderValue(6);
    // Because slider change applies synchronously in idle, expect immediate update
    await fib.waitForTermCount(6, 1000);
    const count2 = await fib.getTermCount();
    expect(count).toBe(6);

    // Move slider to a smaller value, e.g., 3
    await fib.setSliderValue(3);
    await fib.waitForTermCount(3, 1000);
    const count21 = await fib.getTermCount();
    expect(count2).toBe(3);
  });

  test('GOTO_CHANGE triggers jumping sequence to target and completes (jumping)', async ({ page }) => {
    // Set goto input to a target and verify animated jump completes
    const fib6 = new FibonacciPage(page);
    const goto1 = fib.gotoInput();
    if (!(await goto.count())) {
      test.skip('Goto numeric input not present in this implementation');
      return;
    }

    // Choose a target reasonably away from current count to exercise multiple steps
    const current = await fib.getTermCount();
    const target = Math.min(10, Math.max(2, current + 3));

    await fib.setGotoValue(target);

    // Jumping sequence is asynchronous and uses animate primitives per step.
    // Wait up to generous timeout to allow multiple animations
    await fib.waitForTermCount(target, 12000);

    const final = await fib.getTermCount();
    expect(final).toBe(target);

    // After jump, ensure controls synced (play button remains Play by default)
    const playText4 = await fib.playButtonText();
    expect(playText.toLowerCase()).toMatch(/play|▶/);
  });

  test('CLICK_RESET sets count to MIN_TERMS when not animating', async ({ page }) => {
    // Reset should set count to minimum (2)
    const fib7 = new FibonacciPage(page);
    // Make sure we are not animating by waiting shortly
    await page.waitForTimeout(200);

    // Increase count a bit first
    const before2 = await fib.getTermCount();
    if (before < 4) {
      await fib.clickStepForward();
      await fib.waitForTermCountIncrease(before, 1, 3000);
    }

    // Now click reset
    await fib.clickReset();

    // Wait for re-render
    await fib.waitForTermCount(2, 2000);
    const after2 = await fib.getTermCount();
    expect(after).toBe(2);
  });

  test('Keyboard shortcuts map correctly; inputs focused suppress global shortcuts', async ({ page }) => {
    const fib8 = new FibonacciPage(page);

    // Ensure body focus and test ArrowRight -> add
    await page.evaluate(() => document.body.focus());
    const before3 = await fib.getTermCount();
    await fib.pressKey('ArrowRight');
    // Wait for animation
    await fib.waitForTermCountIncrease(before, 1, 3000);
    const afterRight = await fib.getTermCount();
    expect(afterRight).toBeGreaterThan(before);

    // Test ArrowLeft -> remove
    await fib.pressKey('ArrowLeft');
    // Wait for removal
    await fib.waitForTermCount(afterRight - 1, 1500);
    const afterLeft = await fib.getTermCount();
    expect(afterLeft).toBe(afterRight - 1);

    // Test Space toggles play/pause
    await page.evaluate(() => document.body.focus());
    const prev = await fib.getTermCount();
    await fib.pressKey('Space');
    // Wait a short time for play to start and maybe add one item
    await page.waitForTimeout(1200);
    // Press space again to stop
    await fib.pressKey('Space');
    // Confirm play button toggled to Pause then back to Play
    const playText5 = await fib.playButtonText();
    expect(playText.toLowerCase()).toMatch(/play|▶/);

    // Focus on numeric input and press ArrowRight / Space - should NOT trigger global shortcuts
    const goto2 = fib.gotoInput();
    if ((await goto.count()) > 0) {
      await goto.focus();
      const current1 = await fib.getTermCount();
      await fib.pressKey('Space');
      await page.waitForTimeout(600);
      const afterFocusedSpace = await fib.getTermCount();
      // count should be unchanged because input took focus
      expect(afterFocusedSpace).toBe(current);

      // arrow keys should move caret but not trigger step forward/back
      await fib.pressKey('ArrowRight');
      await page.waitForTimeout(400);
      const afterFocusedArrow = await fib.getTermCount();
      expect(afterFocusedArrow).toBe(current);
    } else {
      test.info().log('Goto input not present; skipping focus suppression assertions.');
    }
  });

  test('Animating guard prevents concurrent animations (rapid clicks)', async ({ page }) => {
    // Rapidly click step forward multiple times; due to animating guard only one animation should take effect per animation completion
    const fib9 = new FibonacciPage(page);
    const before4 = await fib.getTermCount();

    // Click forward quickly 4 times
    for (let i = 0; i < 4; i++) {
      await fib.clickStepForward();
    }

    // Wait for exactly one or a small number of increments (depends on how many animations were queued)
    // We expect at least one increment but not 4 instantaneous increments - wait for at most 4 increments
    await fib.waitForTermCountIncrease(before, 1, 4000);
    const after3 = await fib.getTermCount();
    // It should not have jumped by 4 synchronously. At minimum it should be > before.
    expect(after).toBeGreaterThan(before);
    expect(after - before).toBeLessThanOrEqual(4);
  });

  test('Edge case: clicking reset during animation is ignored or deferred', async ({ page }) => {
    // Start an add animation then immediately attempt reset; implementation should ignore reset if animating
    const fib10 = new FibonacciPage(page);
    const before5 = await fib.getTermCount();

    // Start add
    await fib.clickStepForward();

    // Immediately attempt reset while animateAdd is in progress
    await fib.clickReset();

    // After animation completes, count should be before + 1 (reset ignored during animating)
    await fib.waitForTermCount(before + 1, 4000);
    const after4 = await fib.getTermCount();
    expect(after).toBe(before + 1);
  });
});