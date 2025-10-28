import { test, expect } from '@playwright/test';

class BubbleSortPage {
  constructor(page) {
    this.page = page;
    this.url = 'http://127.0.0.1:5500/workspace/10-28-0005/html/920a2ff0-b406-11f0-b2cf-31de200d1aa8.html';
  }

  async goto() {
    await this.page.goto(this.url, { waitUntil: 'domcontentloaded' });
    await this.page.waitForSelector('.vis');
    await expect(this.page.locator('.bar')).toHaveCountGreaterThan(0);
  }

  // Locators with fallbacks
  async playPauseBtn() {
    const byId = this.page.locator('#playPauseBtn');
    if (await byId.count()) return byId;
    // Use role with accessible name fallback
    const playBtn = this.page.getByRole('button', { name: /Play/i });
    const pauseBtn = this.page.getByRole('button', { name: /Pause/i });
    if (await playBtn.count()) return playBtn;
    if (await pauseBtn.count()) return pauseBtn;
    // Generic first button fallback
    return this.page.locator('button').first();
  }

  async stepBtn() {
    const byId = this.page.locator('#stepBtn');
    if (await byId.count()) return byId;
    return this.page.getByRole('button', { name: /Step/i });
  }

  async resetBtn() {
    const byId = this.page.locator('#resetBtn');
    if (await byId.count()) return byId;
    return this.page.getByRole('button', { name: /Reset/i });
  }

  async shuffleBtn() {
    const byId = this.page.locator('#shuffleBtn');
    if (await byId.count()) return byId;
    return this.page.getByRole('button', { name: /Shuffle/i });
  }

  async arrayInput() {
    const byId = this.page.locator('#arrayInput');
    if (await byId.count()) return byId;
    // Fallbacks by placeholder or role
    const byPlaceholder = this.page.getByPlaceholder(/array|numbers|e\.g\./i);
    if (await byPlaceholder.count()) return byPlaceholder;
    const textInput = this.page.locator('input[type="text"]');
    if (await textInput.count()) return textInput;
    // As last resort, first input
    return this.page.locator('input').first();
  }

  async speedRange() {
    const byId = this.page.locator('#speedRange');
    if (await byId.count()) return byId;
    const slider = this.page.locator('input[type="range"]');
    if (await slider.count()) return slider;
    return this.page.getByRole('slider').first();
  }

  async speedVal() {
    const byId = this.page.locator('#speedVal');
    if (await byId.count()) return byId;
    return this.page.locator('[data-role="speed-val"], .speed-val, .speedValue').first();
  }

  async earlyExitToggle() {
    const byId = this.page.locator('#earlyExitToggle');
    if (await byId.count()) return byId;
    const byLabel = this.page.getByLabel(/Early Exit|Early-?exit|Early pass/i);
    if (await byLabel.count()) return byLabel;
    return this.page.locator('input[type="checkbox"]').filter({ hasText: /Early/i }).first();
  }

  async reducedMotionToggle() {
    const byId = this.page.locator('#reducedMotionToggle');
    if (await byId.count()) return byId;
    const byLabel = this.page.getByLabel(/Reduced Motion|Reduce Motion|Motion/i);
    if (await byLabel.count()) return byLabel;
    return this.page.locator('input[type="checkbox"]').filter({ hasText: /Motion/i }).first();
  }

  bars() {
    return this.page.locator('.bar');
  }

  comparingBars() {
    return this.page.locator('.bar.comparing');
  }

  swappingBars() {
    return this.page.locator('.bar.swapping');
  }

  fixedBars() {
    return this.page.locator('.bar.fixed');
  }

  vis() {
    return this.page.locator('.vis');
  }

  // Actions
  async ensureIdle() {
    const btn = await this.playPauseBtn();
    await expect(btn).toHaveText(/Play/i);
    // If UI somehow shows Pause, click to pause
    if (await btn.innerText().then(t => /Pause/i.test(t))) {
      await btn.click();
      await expect(btn).toHaveText(/Play/i);
    }
  }

  async play() {
    const btn = await this.playPauseBtn();
    const label = await btn.innerText();
    if (/Play/i.test(label)) {
      await btn.click();
    }
    await expect(await this.playPauseBtn()).toHaveText(/Pause/i);
  }

  async pause() {
    const btn = await this.playPauseBtn();
    const label = await btn.innerText();
    if (/Pause/i.test(label)) {
      await btn.click();
    }
    await expect(await this.playPauseBtn()).toHaveText(/Play/i);
  }

  async step() {
    const btn = await this.stepBtn();
    await btn.click();
  }

  async reset() {
    const btn = await this.resetBtn();
    await btn.click();
  }

  async shuffle() {
    const btn = await this.shuffleBtn();
    await btn.click();
  }

  async setArray(valuesCsv) {
    const input = await this.arrayInput();
    await input.click({ clickCount: 3 });
    await input.fill(valuesCsv);
    await input.press('Enter');
  }

  async toggleEarlyExit(on) {
    const toggle = await this.earlyExitToggle();
    if (await toggle.count()) {
      const checked = await toggle.isChecked();
      if (on !== checked) {
        await toggle.check();
      }
    }
  }

  async toggleReducedMotion(on) {
    const toggle = await this.reducedMotionToggle();
    if (await toggle.count()) {
      const checked = await toggle.isChecked();
      if (on !== checked) {
        await toggle.check();
      }
    } else {
      // Fallback: emulate reduced motion via prefers-reduced-motion if possible? Skip
    }
  }

  async setSpeedToMax() {
    const range = await this.speedRange();
    if (await range.count()) {
      // Set to max by evaluating
      await range.evaluate((el) => { el.value = el.max || '100'; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); });
    }
  }

  // Helpers for inspecting bar layout
  async getBarsState() {
    // Return array of { index, x, height, labelText, classes }
    const bars = await this.page.$$eval('.bar', (els) => els.map((el, idx) => {
      const rect = el.getBoundingClientRect();
      const labelEl = el.querySelector('.label');
      const label = labelEl ? labelEl.textContent.trim() : '';
      return { index: idx, x: rect.left, height: rect.height, labelText: label, classes: el.className };
    }));
    // Sort by x to get visual order from left to right
    bars.sort((a, b) => a.x - b.x);
    return bars;
  }

  async waitForComparingPair() {
    await this.page.waitForFunction(() => document.querySelectorAll('.bar.comparing').length === 2, null, { timeout: 5000 });
    const bars = await this.getBarsState();
    const comparing = await this.page.$$eval('.bar.comparing .label', els => els.map(e => e.textContent.trim()));
    return { comparingLabels: comparing, bars };
  }

  async waitForSwapAnimationToComplete(previousOrderLabels) {
    // Wait until either swapping class disappears and order has changed
    await this.page.waitForFunction((prev) => {
      const swapping = document.querySelectorAll('.bar.swapping').length;
      const bars = Array.from(document.querySelectorAll('.bar'));
      const withRects = bars.map(el => ({ x: el.getBoundingClientRect().left, label: (el.querySelector('.label')?.textContent || '').trim() }))
        .sort((a, b) => a.x - b.x).map(b => b.label);
      const orderChanged = JSON.stringify(withRects) !== JSON.stringify(prev);
      return swapping === 0 && orderChanged;
    }, previousOrderLabels, { timeout: 5000 });
    const orderAfter = await this.page.$$eval('.bar', (els) => Array.from(els).map(el => ({ x: el.getBoundingClientRect().left, label: (el.querySelector('.label')?.textContent || '').trim() })).sort((a, b) => a.x - b.x).map(b => b.label));
    return orderAfter;
  }

  async getRootTransitionVar() {
    return this.page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--transition').trim());
  }
}

test.describe('Bubble Sort Visual Lab FSM E2E - Interactive Application', () => {
  let app;

  test.beforeEach(async ({ page }) => {
    app = new BubbleSortPage(page);
    await app.goto();
    await app.ensureIdle();
    // Speed up tests
    await app.setSpeedToMax();
  });

  test.afterEach(async ({ page }) => {
    // Ensure we leave in idle for isolation
    await app.ensureIdle();
  });

  test.describe('Initial UI and idle state', () => {
    test('onEnter idle sets playing=false and Play button shows "Play"', async () => {
      const btn = await app.playPauseBtn();
      await expect(btn).toHaveText(/Play/i);
      // optional check of global playing flag if exposed
      const playingFlag = await app.page.evaluate(() => window.playing ?? undefined).catch(() => undefined);
      if (playingFlag !== undefined) {
        expect(playingFlag).toBeFalsy();
      }
    });

    test('bars are rendered and no comparing/swapping classes in idle', async () => {
      await expect(app.bars()).toHaveCountGreaterThan(0);
      await expect(app.comparingBars()).toHaveCount(0);
      await expect(app.swappingBars()).toHaveCount(0);
    });
  });

  test.describe('Playing loop and transitions', () => {
    test('CLICK_PLAY transitions idle -> playing with setPlayingTrueUI', async () => {
      await app.play();
      const btn = await app.playPauseBtn();
      await expect(btn).toHaveText(/Pause/i);
      // Also ensure comparing will start via NEXT_STEP_TICK
      await app.page.waitForFunction(() => document.querySelectorAll('.bar.comparing').length === 2, null, { timeout: 5000 });
    });

    test('NEXT_STEP_TICK triggers comparing state (two bars highlighted)', async () => {
      // Use an array that will require a swap to ensure branch coverage later
      await app.setArray('3,1,2,4');
      await app.play();
      const { comparingLabels } = await app.waitForComparingPair();
      expect(comparingLabels.length).toBe(2);
    });

    test('CLICK_PAUSE transitions playing -> idle with setPlayingFalseUI', async () => {
      await app.play();
      await app.pause();
      const btn = await app.playPauseBtn();
      await expect(btn).toHaveText(/Play/i);
      await expect(app.comparingBars()).toHaveCount(0);
    });

    test('Auto branch: COMPARE_HOLD_DONE_NEED_SWAP_AUTO -> swapping -> SWAP_ANIM_END_AUTO -> playing', async () => {
      await app.setArray('9,1,5'); // first pair needs swap (9 > 1)
      await app.play();
      const beforeOrder = (await app.getBarsState()).map(b => b.labelText);
      const { comparingLabels } = await app.waitForComparingPair();
      expect(comparingLabels).toEqual(['9', '1']);
      // Wait for swap animation to complete and order to change
      const afterOrder = await app.waitForSwapAnimationToComplete(beforeOrder);
      // 1 should be before 9 now
      expect(afterOrder.indexOf('1')).toBeLessThan(afterOrder.indexOf('9'));
      // Ensure still in playing state (button shows Pause)
      const btn = await app.playPauseBtn();
      await expect(btn).toHaveText(/Pause/i);
    });

    test('Auto branch: COMPARE_HOLD_DONE_NO_SWAP_AUTO -> playing continues to next tick', async () => {
      await app.setArray('1,3,2'); // first pair does not need swap (1 < 3)
      await app.play();
      const { comparingLabels } = await app.waitForComparingPair();
      expect(comparingLabels).toEqual(['1', '3']);
      // After compare hold, next comparing pair should be j=1 => (3,2)
      await app.page.waitForFunction(() => {
        const labels = Array.from(document.querySelectorAll('.bar.comparing .label')).map(e => e.textContent.trim());
        return labels.length === 2 && labels[0] === '3' && labels[1] === '2';
      }, null, { timeout: 5000 });
      const btn = await app.playPauseBtn();
      await expect(btn).toHaveText(/Pause/i);
    });

    test('FINISHED_NATURAL transitions to done with markAllSortedAndPauseUI', async () => {
      // Use small array to finish quickly
      await app.setArray('4,3,2,1');
      await app.play();
      // Wait until all bars are fixed/green and UI paused
      await app.page.waitForFunction(() => {
        const bars = document.querySelectorAll('.bar');
        const fixed = document.querySelectorAll('.bar.fixed').length;
        return bars.length > 0 && fixed === bars.length;
      }, null, { timeout: 15000 });
      await app.pause(); // should already be paused but ensure
      const btn = await app.playPauseBtn();
      await expect(btn).toHaveText(/Play/i);
      await expect(app.fixedBars()).toHaveCount(await app.bars().count());
    });
  });

  test.describe('Step mode transitions from idle', () => {
    test('CLICK_STEP: comparing -> COMPARE_HOLD_DONE_NEED_SWAP_STEP -> swapping -> SWAP_ANIM_END_STEP -> idle', async () => {
      await app.setArray('7,2,5');
      await app.ensureIdle();
      const beforeOrder = (await app.getBarsState()).map(b => b.labelText);
      await app.step();
      const { comparingLabels } = await app.waitForComparingPair();
      expect(comparingLabels).toEqual(['7', '2']);
      // Wait for swap animation and return to idle (Play shows Play)
      const afterOrder = await app.waitForSwapAnimationToComplete(beforeOrder);
      expect(afterOrder.indexOf('2')).toBeLessThan(afterOrder.indexOf('7'));
      const btn = await app.playPauseBtn();
      await expect(btn).toHaveText(/Play/i);
    });

    test('CLICK_STEP: comparing -> COMPARE_HOLD_DONE_NO_SWAP_STEP -> idle without swapping', async () => {
      await app.setArray('1,9,5');
      await app.ensureIdle();
      const beforeOrder = (await app.getBarsState()).map(b => b.labelText);
      await app.step();
      const { comparingLabels } = await app.waitForComparingPair();
      expect(comparingLabels).toEqual(['1', '9']);
      // Wait until comparing classes cleared and button shows Play (idle)
      await app.page.waitForFunction(() => {
        return document.querySelectorAll('.bar.comparing').length === 0;
      }, null, { timeout: 5000 });
      const afterOrder = (await app.getBarsState()).map(b => b.labelText);
      expect(afterOrder).toEqual(beforeOrder);
      const btn = await app.playPauseBtn();
      await expect(btn).toHaveText(/Play/i);
    });
  });

  test.describe('Done state and reset/shuffle/input transitions', () => {
    test('done onEnter applies .fixed to all bars and setPlayingFalseUI, CLICK_RESET leaves done -> idle', async () => {
      await app.setArray('2,1');
      await app.play();
      await app.page.waitForFunction(() => {
        const bars = document.querySelectorAll('.bar');
        return bars.length && document.querySelectorAll('.bar.fixed').length === bars.length;
      }, null, { timeout: 5000 });
      // Verify UI paused
      const btn = await app.playPauseBtn();
      await expect(btn).toHaveText(/Play/i);
      // Reset returns to idle and clears fixed classes
      await app.reset();
      await expect(app.fixedBars()).toHaveCount(0);
      await expect(btn).toHaveText(/Play/i);
    });

    test('CLICK_SHUFFLE leaves done/idle -> idle and changes array content', async () => {
      await app.ensureIdle();
      const before = (await app.getBarsState()).map(b => b.labelText);
      await app.shuffle();
      const after = (await app.getBarsState()).map(b => b.labelText);
      // The shuffle should result in different sequence; allow rare equal case by re-shuffling
      let attempts = 0;
      while (JSON.stringify(after) === JSON.stringify(before) && attempts < 2) {
        await app.shuffle();
        attempts++;
        after = (await app.getBarsState()).map(b => b.labelText);
      }
      expect(JSON.stringify(after)).not.toEqual(JSON.stringify(before));
      await app.ensureIdle();
    });

    test('ENTER_VALID_ARRAY rebuilds bars and stays in idle', async () => {
      await app.setArray('8,3,6');
      await app.ensureIdle();
      const labels = (await app.getBarsState()).map(b => b.labelText);
      expect(labels).toEqual(['8', '3', '6']);
      const btn = await app.playPauseBtn();
      await expect(btn).toHaveText(/Play/i);
      // Ensure no comparing/swapping
      await expect(app.comparingBars()).toHaveCount(0);
      await expect(app.swappingBars()).toHaveCount(0);
    });
  });

  test.describe('Input error feedback state', () => {
    test('ENTER_INVALID_ARRAY triggers input_error_feedback (aria-invalid + red border) then ERROR_TIMEOUT -> idle', async () => {
      const input = await app.arrayInput();
      await input.click({ clickCount: 3 });
      await input.fill('a,b,c'); // invalid
      await input.press('Enter');
      // Wait for aria-invalid true
      await app.page.waitForFunction(() => {
        const el = document.querySelector('#arrayInput') || document.querySelector('input[type="text"]') || document.querySelector('input');
        return el && (el.getAttribute('aria-invalid') === 'true' || el.classList.contains('invalid'));
      }, null, { timeout: 2000 });
      const ariaInvalid = await input.getAttribute('aria-invalid');
      expect(ariaInvalid === 'true' || ariaInvalid === 'True' || ariaInvalid === '1').toBeTruthy();
      // Wait ~1200ms for error timeout to clear
      await app.page.waitForTimeout(1500);
      const ariaInvalidAfter = await input.getAttribute('aria-invalid');
      expect(ariaInvalidAfter === null || ariaInvalidAfter === 'false').toBeTruthy();
      await app.ensureIdle();
    });
  });

  test.describe('Early exit completion', () => {
    test('PASS_COMPLETED_EARLY_EXIT transitions to done quickly when array is already sorted and early-exit enabled', async () => {
      await app.toggleEarlyExit(true);
      await app.setArray('1,2,3');
      await app.play();
      // Wait until done (all fixed) with a short timeout indicating early exit
      await app.page.waitForFunction(() => {
        const bars = document.querySelectorAll('.bar');
        const fixed = document.querySelectorAll('.bar.fixed').length;
        return bars.length && fixed === bars.length;
      }, null, { timeout: 4000 });
      const btn = await app.playPauseBtn();
      await expect(btn).toHaveText(/Play/i);
    });
  });

  test.describe('Controls that do not change FSM state', () => {
    test('SPEED_CHANGE updates speed UI value without changing state', async () => {
      await app.ensureIdle();
      const speedValEl = await app.speedVal();
      const before = await speedValEl.textContent().catch(() => null);
      const slider = await app.speedRange();
      if (await slider.count()) {
        // Change speed to mid
        await slider.evaluate((el) => { el.value = ((Number(el.max) || 100) / 2).toString(); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); });
        const after = await speedValEl.textContent().catch(() => null);
        if (before !== null && after !== null) {
          expect(before).not.toEqual(after);
        }
      }
      const btn = await app.playPauseBtn();
      await expect(btn).toHaveText(/Play/i);
    });

    test('TOGGLE_REDUCED_MOTION updates CSS --transition and does not change state', async () => {
      await app.ensureIdle();
      // Read current transition var
      const before = await app.getRootTransitionVar();
      await app.toggleReducedMotion(true);
      const after = await app.getRootTransitionVar();
      // transition variable should be 0ms when reduced motion is on (per CSS media query)
      expect(after.includes('0ms') || after === '0ms' || /0ms/.test(after)).toBeTruthy();
      const btn = await app.playPauseBtn();
      await expect(btn).toHaveText(/Play/i);
    });

    test('RESIZE recomputes bar positions but remains in current state', async ({ page }) => {
      await app.ensureIdle();
      const orderBefore = await app.getBarsState();
      const xsBefore = orderBefore.map(b => b.x);
      await page.setViewportSize({ width: 640, height: 480 });
      await app.page.waitForTimeout(100);
      const orderAfter = await app.getBarsState();
      const xsAfter = orderAfter.map(b => b.x);
      // Positions should update; allow rare equality by resizing again
      const changed = JSON.stringify(xsBefore) !== JSON.stringify(xsAfter);
      if (!changed) {
        await page.setViewportSize({ width: 900, height: 480 });
        await app.page.waitForTimeout(100);
        const xsAfter2 = (await app.getBarsState()).map(b => b.x);
        expect(JSON.stringify(xsBefore)).not.toEqual(JSON.stringify(xsAfter2));
      }
      const btn = await app.playPauseBtn();
      await expect(btn).toHaveText(/Play/i);
    });
  });

  test.describe('Keyboard shortcuts', () => {
    test('Space toggles CLICK_PLAY/CLICK_PAUSE', async ({ page }) => {
      await app.ensureIdle();
      await page.keyboard.press('Space');
      await expect(await app.playPauseBtn()).toHaveText(/Pause/i);
      await page.keyboard.press('Space');
      await expect(await app.playPauseBtn()).toHaveText(/Play/i);
    });

    test('N triggers CLICK_STEP and enters comparing briefly', async ({ page }) => {
      await app.ensureIdle();
      const beforeOrder = (await app.getBarsState()).map(b => b.labelText);
      await page.keyboard.press('KeyN');
      await app.page.waitForFunction(() => document.querySelectorAll('.bar.comparing').length === 2, null, { timeout: 3000 });
      await app.page.waitForFunction(() => document.querySelectorAll('.bar.comparing').length === 0, null, { timeout: 5000 });
      const afterOrder = (await app.getBarsState()).map(b => b.labelText);
      // Order may change if swap occurred; assert we returned to idle and no comparing persists
      await expect(await app.playPauseBtn()).toHaveText(/Play/i);
      await expect(app.comparingBars()).toHaveCount(0);
    });

    test('R triggers CLICK_RESET and returns to idle', async ({ page }) => {
      await app.play();
      await page.keyboard.press('KeyR');
      await expect(await app.playPauseBtn()).toHaveText(/Play/i);
      await expect(app.comparingBars()).toHaveCount(0);
      await expect(app.swappingBars()).toHaveCount(0);
    });

    test('H triggers CLICK_SHUFFLE and keeps idle', async ({ page }) => {
      await app.ensureIdle();
      const before = (await app.getBarsState()).map(b => b.labelText);
      await page.keyboard.press('KeyH');
      const after = (await app.getBarsState()).map(b => b.labelText);
      let attempts = 0;
      while (JSON.stringify(after) === JSON.stringify(before) && attempts < 2) {
        await page.keyboard.press('KeyH');
        attempts++;
        const after2 = (await app.getBarsState()).map(b => b.labelText);
        if (JSON.stringify(after2) !== JSON.stringify(before)) break;
      }
      await expect(await app.playPauseBtn()).toHaveText(/Play/i);
    });
  });

  // Edge case: entering invalid array while playing should pause and show error feedback state then go idle
  test.describe('Edge cases and error scenarios', () => {
    test('ENTER_INVALID_ARRAY while playing shows error feedback and returns to idle', async () => {
      await app.play();
      const input = await app.arrayInput();
      await input.click({ clickCount: 3 });
      await input.fill('bad,input');
      await input.press('Enter');
      await app.page.waitForFunction(() => {
        const el = document.querySelector('#arrayInput') || document.querySelector('input[type="text"]') || document.querySelector('input');
        return el && (el.getAttribute('aria-invalid') === 'true' || el.classList.contains('invalid'));
      }, null, { timeout: 2000 });
      // After timeout, should be idle
      await app.page.waitForTimeout(1500);
      await expect(await app.playPauseBtn()).toHaveText(/Play/i);
      await expect(app.comparingBars()).toHaveCount(0);
    });
  });
});