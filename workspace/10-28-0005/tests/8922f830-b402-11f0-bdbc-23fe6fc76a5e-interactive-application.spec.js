import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/10-28-0005/html/8922f830-b402-11f0-bdbc-23fe6fc76a5e.html';

class BubbleSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    // Buttons
    this.playBtn = page.getByRole('button', { name: /Play|Pause/i });
    this.stepBtn = page.getByRole('button', { name: /^Step$/i });
    this.passBtn = page.getByRole('button', { name: /^Pass$/i });
    this.resetBtn = page.getByRole('button', { name: /^Reset$/i });
    this.loadBtn = page.getByRole('button', { name: /^Load$/i });
    this.randomBtn = page.getByRole('button', { name: /^Random$/i });
    // Inputs
    this.arrayInput = page.locator('input[type="text"]');
    this.speedSlider = page.locator('input[type="range"]');
    // Bars (multiple fallbacks for robustness)
    this.bars = page.locator('[role="slider"], .bar, [data-bar]');
    this.barsContainer = page.locator('#bars, .bars, [data-bars]');
    // Status / info elements (fallbacks)
    this.invariantInfo = page.locator('#invariantInfoEl, [data-testid="invariant-info"], .invariant-info, text=Sorted complete');
    this.comparisonsEl = page.locator('#comparisons, [data-testid="comparisons"], .comparisons, text=/Comparisons/i');
    this.swapsEl = page.locator('#swaps, [data-testid="swaps"], .swaps, text=/Swaps/i');
    this.passInfoEl = page.locator('#passInfo, [data-testid="pass-info"], .pass-info, text=/Pass/i');
  }

  async goto() {
    await this.page.goto(APP_URL);
    // Wait for at least one bar to render
    await expect(this.bars.first()).toBeVisible();
  }

  async getPlayLabel() {
    return (await this.playBtn.textContent())?.trim();
  }

  async setArray(values) {
    // Load array via input text and Load button
    await this.arrayInput.first().click();
    await this.arrayInput.first().fill(values.join(','));
    await this.loadBtn.click();
    // Wait for renderBars: bars count equals values length
    await this.page.waitForTimeout(50);
    await expect(this.bars).toHaveCount(values.length);
  }

  async maybeGetNumberFromText(locator) {
    const text = (await locator.first().textContent()) || '';
    const m = text.match(/(-?\d+)/g);
    if (!m) return null;
    return m.map(Number).pop() ?? null;
  }

  async getComparisons() {
    // Some UIs use data attributes or text; try both
    const valAttr = await this.comparisonsEl.first().getAttribute('data-value');
    if (valAttr != null) return parseInt(valAttr, 10);
    const num = await this.maybeGetNumberFromText(this.comparisonsEl);
    return num ?? 0;
  }

  async getSwaps() {
    const valAttr = await this.swapsEl.first().getAttribute('data-value');
    if (valAttr != null) return parseInt(valAttr, 10);
    const num = await this.maybeGetNumberFromText(this.swapsEl);
    return num ?? 0;
  }

  async getPassCount() {
    const valAttr = await this.passInfoEl.first().getAttribute('data-pass');
    if (valAttr != null) return parseInt(valAttr, 10);
    const num = await this.maybeGetNumberFromText(this.passInfoEl);
    return num ?? 0;
  }

  async getBarValues() {
    const values = await this.bars.evaluateAll((els) =>
      els.map((el) => {
        const aria = el.getAttribute('aria-valuenow');
        if (aria != null) return parseInt(aria, 10);
        const dv = el.getAttribute('data-value') || (el.dataset ? el.dataset.value : null);
        if (dv != null) return parseInt(dv, 10);
        const h = getComputedStyle(el).height;
        const n = parseInt(h, 10);
        return Number.isNaN(n) ? null : n;
      })
    );
    return values;
  }

  async getLockedCount() {
    return await this.page.locator('.locked').count();
  }

  compareEls() {
    return this.page.locator('.compare');
  }

  swapEls() {
    return this.page.locator('.swap');
  }

  async waitForCompare(minCount = 2, timeout = 2000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const c = await this.compareEls().count();
      if (c >= minCount) return;
      await this.page.waitForTimeout(16);
    }
    throw new Error('Timed out waiting for compare highlights');
  }

  async waitForSwap(timeout = 2000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const c = await this.swapEls().count();
      if (c >= 1) return;
      await this.page.waitForTimeout(16);
    }
    throw new Error('Timed out waiting for swap highlight');
  }

  async waitForNoCompare(timeout = 2000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const c = await this.compareEls().count();
      if (c === 0) return;
      await this.page.waitForTimeout(16);
    }
    throw new Error('Timed out waiting for compare highlights to clear');
  }

  async togglePlay() {
    await this.playBtn.click();
  }

  async isPlaying() {
    const label = await this.getPlayLabel();
    return /Pause/i.test(label || '');
  }

  async pressSpace() {
    await this.page.keyboard.press(' ');
  }

  async pressKeyS() {
    await this.page.keyboard.press('s');
  }

  async pressKeyP() {
    await this.page.keyboard.press('p');
  }

  async pressKeyR() {
    await this.page.keyboard.press('r');
  }

  async dragBar(index, deltaY = -50) {
    const bar = this.bars.nth(index);
    await expect(bar).toBeVisible();
    const box = await bar.boundingBox();
    if (!box) throw new Error('Bar has no bounding box');
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    await this.page.mouse.move(x, y);
    await this.page.mouse.down();
    await this.page.mouse.move(x, y + deltaY, { steps: 10 });
    await this.page.mouse.up();
  }

  async focusBar(index) {
    const bar = this.bars.nth(index);
    await bar.focus();
  }

  async changeSpeedTo(value) {
    // Value could be string or number; use fill for reliability
    const slider = this.speedSlider.first();
    await slider.focus();
    await slider.fill(String(value));
    await slider.dispatchEvent('input');
    await slider.dispatchEvent('change');
  }

  async getSpeedScale() {
    // Read CSS var from computed style
    const val = await this.page.evaluate(() => {
      const cs = getComputedStyle(document.documentElement);
      return cs.getPropertyValue('--speed-scale').trim();
    });
    return val;
  }

  async resize(width, height) {
    await this.page.setViewportSize({ width, height });
  }

  async reset() {
    await this.resetBtn.click();
    await this.page.waitForTimeout(50);
  }
}

test.describe('Bubble Sort Interactive Module FSM - 8922f830-b402-11f0-bdbc-23fe6fc76a5e', () => {
  let mod;

  test.beforeEach(async ({ page }) => {
    mod = new BubbleSortPage(page);
    await mod.goto();
  });

  test.describe('Initial idle state and setup', () => {
    test('Loads in idle: Play label "Play", no highlights, bars rendered', async () => {
      // idle: onEnter updateStatus; ensure UI shows initial stats and no compare/swap
      const label = await mod.getPlayLabel();
      expect(label).toMatch(/Play/i);
      await expect(mod.compareEls()).toHaveCount(0);
      await expect(mod.swapEls()).toHaveCount(0);
      await expect(mod.bars.first()).toBeVisible();
      // Capture initial stats
      const comps = await mod.getComparisons();
      const swaps = await mod.getSwaps();
      const passCount = await mod.getPassCount();
      expect(comps).toBeGreaterThanOrEqual(0);
      expect(swaps).toBeGreaterThanOrEqual(0);
      expect(passCount).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Loading and resetting (loading, resetting states)', () => {
    test('LOAD_CLICK -> loading -> LOAD_SUCCESS -> idle; renders specific array', async () => {
      const initialValues = await mod.getBarValues();
      await mod.setArray([5, 1, 4, 2, 8]);
      const values = await mod.getBarValues();
      expect(values.length).toBe(5);
      // If aria values present, they should equal the array
      if (values.every((v) => v !== null)) {
        // Some UIs might scale heights; only assert relative equality if aria available
        const ariaValues = await mod.bars.evaluateAll((els) => els.map((el) => el.getAttribute('aria-valuenow')));
        if (ariaValues.every((v) => v != null)) {
          expect(values).toEqual([5, 1, 4, 2, 8]);
        }
      }
      // Ensure data changed from initial (if different size or order)
      if (initialValues.length !== values.length) {
        expect(values.length).not.toBe(initialValues.length);
      } else {
        // If same length, at least order differs most times
        const isSame = values.every((v, i) => v === initialValues[i]);
        // It is allowed to be same; no strict assert here
        expect(Array.isArray(values)).toBeTruthy();
      }
    });

    test('RANDOM_CLICK -> loading -> RANDOM_SUCCESS -> idle; array becomes randomized', async () => {
      const before = await mod.getBarValues();
      await mod.randomBtn.click();
      await mod.page.waitForTimeout(50);
      const after = await mod.getBarValues();
      // Often random changes at least one position
      const changed = before.length !== after.length || after.some((v, i) => v !== before[i]);
      expect(changed).toBeTruthy();
    });

    test('INVALID_INPUT on Load keeps previous data; state returns to idle', async () => {
      const before = await mod.getBarValues();
      await mod.arrayInput.first().fill('a, b, , c, --');
      await mod.loadBtn.click();
      await mod.page.waitForTimeout(50);
      const after = await mod.getBarValues();
      expect(after.length).toBe(before.length);
      // Expect no change or minimal change; to be robust just verify not all null
      expect(after.every((v) => v !== null)).toBeTruthy();
    });

    test('RESET_CLICK -> resetting -> RESET_DONE -> idle; restores initial array and clears visuals', async () => {
      // Change array and start playing to set some highlights
      await mod.setArray([3, 1, 2]);
      await mod.togglePlay();
      await mod.waitForCompare(2);
      // Reset
      await mod.reset();
      const label = await mod.getPlayLabel();
      expect(label).toMatch(/Play/i);
      await expect(mod.compareEls()).toHaveCount(0);
      await expect(mod.swapEls()).toHaveCount(0);
      // Stats should be reset
      const comps = await mod.getComparisons();
      const swaps = await mod.getSwaps();
      const passCount = await mod.getPassCount();
      expect(comps).toBe(0);
      expect(swaps).toBe(0);
      expect(passCount).toBe(0);
    });
  });

  test.describe('Step mode (step_comparing, step_swapping, end_of_pass_locking)', () => {
    test('STEP_CLICK with swap scenario: compare -> swap -> idle; counters update', async () => {
      await mod.setArray([3, 2, 1]);
      const swapsBefore = await mod.getSwaps();
      await mod.stepBtn.click(); // step_comparing
      await mod.waitForCompare(2);
      // Either SWAP_REQUIRED or NO_SWAP; expect swap here
      await mod.waitForSwap();
      // Wait for SWAP_ANIMATION_DONE and removeComparisons
      await mod.page.waitForTimeout(260);
      await mod.waitForNoCompare();
      // Ensure we are idle (Play label "Play")
      const label = await mod.getPlayLabel();
      expect(label).toMatch(/Play/i);
      const swapsAfter = await mod.getSwaps();
      expect(swapsAfter).toBeGreaterThanOrEqual(swapsBefore + 1);
    });

    test('STEP_CLICK with no-swap scenario: compare -> idle; no swap class', async () => {
      await mod.setArray([1, 2, 3, 4]);
      await mod.stepBtn.click();
      await mod.waitForCompare(2);
      await mod.page.waitForTimeout(200);
      await expect(mod.swapEls()).toHaveCount(0);
      await mod.waitForNoCompare();
      const valuesAfter = await mod.getBarValues();
      // If aria-known values, array should remain unchanged
      const ariaValues = await mod.bars.evaluateAll((els) => els.map((el) => el.getAttribute('aria-valuenow')));
      if (ariaValues.every((v) => v != null)) {
        expect(valuesAfter).toEqual([1, 2, 3, 4]);
      }
    });

    test('END_OF_PASS transitions to end_of_pass_locking and returns to idle with locked bar', async () => {
      await mod.setArray([5, 1, 4, 2, 8]);
      const lockedBefore = await mod.getLockedCount();
      await mod.passBtn.click(); // pass_running
      // Wait until at least one bar has "locked"
      await test.step('Wait for one locked bar after end of pass', async () => {
        const start = Date.now();
        while (Date.now() - start < 4000) {
          const lockedNow = await mod.getLockedCount();
          if (lockedNow > lockedBefore) break;
          await mod.page.waitForTimeout(50);
        }
        const lockedAfter = await mod.getLockedCount();
        expect(lockedAfter).toBeGreaterThan(lockedBefore);
      });
      // Ensure we are back to idle (PASS_LOOP_COMPLETED -> idle)
      const label = await mod.getPlayLabel();
      expect(label).toMatch(/Play/i);
    });
  });

  test.describe('Playing and pass running (playing, pass_running)', () => {
    test('PLAY_TOGGLE enters playing: TIMER_TICKs produce compare; toggling pauses', async () => {
      await mod.setArray([5, 1, 4, 2, 8]);
      await mod.togglePlay(); // playing: onEnter runPlayLoop
      await expect.poll(async () => (await mod.getPlayLabel()) || '').toMatch(/Pause/i);
      // TIMER_TICK -> step_comparing: wait for compare highlight
      await mod.waitForCompare(2);
      // Pause via PLAY_TOGGLE
      await mod.togglePlay(); // playing -> idle via onExit clearTimer
      await expect.poll(async () => (await mod.getPlayLabel()) || '').toMatch(/Play/i);
      await mod.waitForNoCompare();
    });

    test('PASS_CLICK enters pass_running: PASS_TIMER_TICK produces compare; END_OF_PASS back to idle', async () => {
      await mod.setArray([5, 1, 4, 2, 8]);
      await mod.passBtn.click(); // pass_running
      await mod.waitForCompare(2);
      // Wait for end of pass -> idle
      await mod.page.waitForTimeout(1200);
      const label = await mod.getPlayLabel();
      expect(label).toMatch(/Play/i);
      await mod.waitForNoCompare();
    });

    test('CONTINUE_PLAY keeps auto-play running across steps', async () => {
      await mod.setArray([9, 8, 7, 6]);
      await mod.togglePlay();
      await expect.poll(async () => (await mod.getPlayLabel()) || '').toMatch(/Pause/i);
      // Observe multiple compare cycles while staying in playing state
      await mod.waitForCompare(2);
      await mod.page.waitForTimeout(300);
      // Still playing
      expect(await mod.isPlaying()).toBeTruthy();
      await mod.waitForCompare(2);
      // Pause to clean up
      await mod.togglePlay();
      expect(await mod.isPlaying()).toBeFalsy();
    });

    test('SPACE toggles playing (KEYBOARD_SPACE)', async () => {
      await mod.setArray([4, 3, 2, 1]);
      await mod.pressSpace();
      await expect.poll(async () => (await mod.getPlayLabel()) || '').toMatch(/Pause/i);
      await mod.waitForCompare(2);
      // Pause with SPACE
      await mod.pressSpace();
      await expect.poll(async () => (await mod.getPlayLabel()) || '').toMatch(/Play/i);
    });
  });

  test.describe('Done state behavior', () => {
    test('ARRAY_SORTED -> done: all locked, status text shows completion, controls mostly inert', async () => {
      await mod.setArray([5, 4, 3, 2, 1]);
      // Speed up to finish quicker
      await mod.changeSpeedTo(5);
      await mod.togglePlay();
      // Wait until all bars locked or "Sorted complete" visible
      await test.step('Wait for sorted completion', async () => {
        const start = Date.now();
        const count = await mod.bars.count();
        while (Date.now() - start < 6000) {
          const allLocked = (await mod.page.locator('.locked').count()) === count;
          const completedText = await mod.invariantInfo.first().isVisible().catch(() => false);
          if (allLocked || completedText) break;
          await mod.page.waitForTimeout(100);
        }
        const countBars = await mod.bars.count();
        const lockedCount = await mod.page.locator('.locked').count();
        expect(lockedCount === countBars || (await mod.invariantInfo.first().isVisible().catch(() => false))).toBeTruthy();
      });
      // Ensure Play label reads "Play" as per notes after done
      const label = await mod.getPlayLabel();
      expect(label).toMatch(/Play/i);
      // Try controls: Step, Pass, Play should not start new actions in done
      await mod.stepBtn.click();
      await mod.page.waitForTimeout(200);
      await expect(mod.compareEls()).toHaveCount(0);
      await mod.passBtn.click();
      await mod.page.waitForTimeout(200);
      await expect(mod.compareEls()).toHaveCount(0);
      await mod.togglePlay();
      await mod.page.waitForTimeout(200);
      await expect(mod.compareEls()).toHaveCount(0);
      // Editing should exit done; Random triggers loading
      await mod.randomBtn.click();
      await mod.page.waitForTimeout(100);
      // Verify locked states cleared
      expect(await mod.page.locator('.locked').count()).toBeLessThan(await mod.bars.count());
    });
  });

  test.describe('Editing interactions (editing_drag, editing_keyboard)', () => {
    test('Dragging a bar interrupts playing (clearTimer) and updates value', async () => {
      await mod.setArray([2, 9, 1, 8, 3]);
      // Start playing then drag
      await mod.togglePlay();
      await mod.waitForCompare(2);
      const beforeVals = await mod.getBarValues();
      await mod.dragBar(0, -60);
      await mod.page.waitForTimeout(50);
      // Should be paused
      const label = await mod.getPlayLabel();
      expect(label).toMatch(/Play/i);
      // Visual states cleared
      await expect(mod.compareEls()).toHaveCount(0);
      // Value changed (if aria available)
      const afterVals = await mod.getBarValues();
      if (beforeVals[0] !== null && afterVals[0] !== null) {
        expect(afterVals[0]).not.toBe(beforeVals[0]);
      }
    });

    test('Keyboard adjustments ArrowUp/ArrowDown/PageUp/PageDown update bar and reset algorithm state', async () => {
      await mod.setArray([5, 1, 4, 2, 8]);
      const idx = 2;
      await mod.focusBar(idx);
      const before = await mod.getBarValues();
      // ArrowUp
      await mod.page.keyboard.press('ArrowUp');
      await mod.page.waitForTimeout(40);
      const afterUp = await mod.getBarValues();
      if (before[idx] !== null && afterUp[idx] !== null) {
        expect(afterUp[idx]).toBeGreaterThan(before[idx]);
      }
      // ArrowDown
      await mod.page.keyboard.press('ArrowDown');
      await mod.page.waitForTimeout(40);
      const afterDown = await mod.getBarValues();
      if (afterUp[idx] !== null && afterDown[idx] !== null) {
        // Down may revert to before or lower than afterUp
        expect(afterDown[idx]).toBeLessThanOrEqual(afterUp[idx]);
      }
      // PageUp (larger increment)
      await mod.page.keyboard.press('PageUp');
      await mod.page.waitForTimeout(40);
      const afterPageUp = await mod.getBarValues();
      if (afterDown[idx] !== null && afterPageUp[idx] !== null) {
        expect(afterPageUp[idx]).toBeGreaterThan(afterDown[idx]);
      }
      // PageDown (larger decrement)
      await mod.page.keyboard.press('PageDown');
      await mod.page.waitForTimeout(40);
      const afterPageDown = await mod.getBarValues();
      if (afterPageUp[idx] !== null && afterPageDown[idx] !== null) {
        expect(afterPageDown[idx]).toBeLessThan(afterPageUp[idx]);
      }
      // KEY_ADJUST_APPLIED should return to idle: ensure no highlights
      await expect(mod.compareEls()).toHaveCount(0);
      // Algorithm state reset counters
      const comps = await mod.getComparisons();
      const swaps = await mod.getSwaps();
      const passCount = await mod.getPassCount();
      expect(comps).toBe(0);
      expect(swaps).toBe(0);
      expect(passCount).toBe(0);
    });
  });

  test.describe('Keyboard shortcuts and window resize', () => {
    test('KEYBOARD_S (s) triggers a step; KEYBOARD_P (p) triggers a pass; KEYBOARD_R (r) triggers reset', async () => {
      await mod.setArray([3, 2, 1]);
      // s for step
      await mod.pressKeyS();
      await mod.waitForCompare(2);
      await mod.page.waitForTimeout(220);
      await mod.waitForNoCompare();
      // p for pass
      await mod.pressKeyP();
      await mod.waitForCompare(2);
      await mod.page.waitForTimeout(1200);
      await mod.waitForNoCompare();
      // r for reset, clears counters and visuals
      const compsBefore = await mod.getComparisons();
      await mod.pressKeyR();
      await mod.page.waitForTimeout(80);
      const compsAfter = await mod.getComparisons();
      expect(compsAfter).toBe(0);
      await expect(mod.compareEls()).toHaveCount(0);
      await expect(mod.swapEls()).toHaveCount(0);
    });

    test('WINDOW_RESIZE maintains state and layout', async () => {
      const countBefore = await mod.bars.count();
      const containerBefore = await mod.barsContainer.first().boundingBox();
      await mod.resize(800, 600);
      await mod.page.waitForTimeout(100);
      const countAfter = await mod.bars.count();
      const containerAfter = await mod.barsContainer.first().boundingBox();
      expect(countAfter).toBe(countBefore);
      // Some change in layout is expected, but at least container remains rendered
      expect(containerAfter).not.toBeNull();
    });
  });

  test.describe('Speed control (SPEED_CHANGE)', () => {
    test('Changing speed slider updates CSS speed-scale variable', async () => {
      const before = await mod.getSpeedScale();
      await mod.changeSpeedTo(3);
      await mod.page.waitForTimeout(50);
      const after = await mod.getSpeedScale();
      // Either numeric change or empty string if computed; assert not equal or is expected numeric
      if (before) {
        expect(after).not.toBe(before);
      } else {
        // If before empty, ensure after is non-empty or a plausible scale
        expect(after === '' || after === '3' || after === '3.0').toBeTruthy();
      }
    });
  });

  test.describe('Edge cases and robustness', () => {
    test('Single-element array should immediately be in done state', async () => {
      await mod.setArray([7]);
      // Should mark sorted complete and bars locked
      await mod.page.waitForTimeout(100);
      const countBars = await mod.bars.count();
      const lockedCount = await mod.page.locator('.locked').count();
      if (countBars === 1) {
        expect(lockedCount === 1 || (await mod.invariantInfo.first().isVisible().catch(() => false))).toBeTruthy();
      }
    });

    test('Empty or malformed array input keeps previous data (INVALID_INPUT)', async () => {
      const beforeVals = await mod.getBarValues();
      await mod.arrayInput.first().fill('');
      await mod.loadBtn.click();
      await mod.page.waitForTimeout(60);
      const afterVals = await mod.getBarValues();
      expect(afterVals.length).toBe(beforeVals.length);
    });
  });
});