import { test, expect } from '@playwright/test';

class BubbleSortPage {
  /**
   * Page object for Bubble Sort Interactive Module
   * Provides resilient selectors and helper actions to exercise FSM transitions and verify UI feedback.
   */
  constructor(page) {
    this.page = page;
    // Panels
    this.board = page.locator('.board');
    this.visualPanel = page.locator('.visual-panel');

    // Controls (using resilient role/name queries)
    this.playButton = page.getByRole('button', { name: /play/i });
    this.pauseButton = page.getByRole('button', { name: /pause/i });
    this.stepButton = page.getByRole('button', { name: /step/i });
    this.resetButton = page.getByRole('button', { name: /reset/i });
    this.randomizeButton = page.getByRole('button', { name: /randomize/i });
    this.applyButton = page.getByRole('button', { name: /apply/i });
    this.finishButton = page.getByRole('button', { name: /finish/i });

    // Inputs
    this.numbersInput =
      page.getByRole('textbox', { name: /numbers|values|input|enter|list/i }).or(page.locator('input[name*="number"], textarea[name*="number"]'));
    this.earlyExitCheckbox = page.getByRole('checkbox', { name: /early exit/i }).or(page.locator('input[type="checkbox"][name*="early"]'));
    this.speedSlider = page.getByRole('slider', { name: /speed/i }).or(page.locator('input[type="range"][name*="speed"]'));
    this.sizeSlider = page.getByRole('slider', { name: /size|count|length/i }).or(page.locator('input[type="range"][name*="size"], input[type="range"][name*="count"]'));

    // Bars and highlights
    this.bars = page.locator('.board .bar, .board .bar-item, .board .barRect, .board [data-bar], .board [class*="bar"]');
    this.compareBars = page.locator('.board .compare');
    this.swapBars = page.locator('.board .swap');
    this.settledBars = page.locator('.board .settled');

    // Narration and stats (resilient locators)
    this.narration = page.locator('[aria-live], .narration, #narration, .status, [data-testid="narration"]');
    this.statsComparisons = page.locator('#stat-comparisons, [data-testid="comparisons"], .comparisons, text=/comparisons/i');
    this.statsSwaps = page.locator('#stat-swaps, [data-testid="swaps"], .swaps, text=/swaps/i');
    this.statsPass = page.locator('#stat-pass, [data-testid="pass"], .pass, text=/pass(es)?/i');
    this.sizeLabel = page.getByText(/size/i).or(page.locator('[data-testid="size-label"]'));
    this.speedLabel = page.getByText(/speed/i).or(page.locator('[data-testid="speed-label"]'));
  }

  async goto() {
    await this.page.goto('http://127.0.0.1:5500/workspace/10-28-0005/html/79b40610-b406-11f0-b2cf-31de200d1aa8.html', { waitUntil: 'domcontentloaded' });
    await expect(this.board).toBeVisible();
    // Basic assertion: bars rendered
    await expect(this.bars.first()).toBeVisible();
  }

  async getBarCount() {
    return await this.bars.count();
  }

  async getBarValues() {
    const count = await this.bars.count();
    const vals = [];
    for (let i = 0; i < count; i++) {
      const bar = this.bars.nth(i);
      // Try data-value attribute, then textContent as fallback
      const attrVal = await bar.getAttribute('data-value');
      if (attrVal !== null) {
        vals.push(Number(attrVal));
      } else {
        const txt = (await bar.textContent())?.trim();
        const parsed = Number(txt);
        if (!Number.isNaN(parsed)) {
          vals.push(parsed);
        } else {
          vals.push(txt ?? '');
        }
      }
    }
    return vals;
  }

  async play() {
    // Try clicking Play; if not available, press Space
    if (await this.playButton.count()) {
      await this.playButton.first().click();
    } else {
      await this.page.keyboard.press('Space');
    }
  }

  async pause() {
    if (await this.pauseButton.count()) {
      await this.pauseButton.first().click();
    } else {
      await this.page.keyboard.press('Space');
    }
  }

  async step() {
    if (await this.stepButton.count()) {
      await this.stepButton.first().click();
    } else {
      await this.page.keyboard.press('KeyN');
    }
  }

  async finish() {
    if (await this.finishButton.count()) {
      await this.finishButton.first().click();
    } else {
      // Fallback: Maybe FINISH is accessible via keyboard 'F'?
      await this.page.keyboard.press('KeyF').catch(() => {});
    }
  }

  async reset() {
    if (await this.resetButton.count()) {
      await this.resetButton.first().click();
    } else {
      await this.page.keyboard.press('KeyR');
    }
  }

  async randomize() {
    await this.randomizeButton.first().click();
  }

  async applyNumbers(text) {
    await this.numbersInput.first().click();
    await this.numbersInput.first().fill(text);
    await this.applyButton.first().click();
  }

  async toggleEarlyExit(on) {
    const checkbox = this.earlyExitCheckbox.first();
    if (await checkbox.count()) {
      const checked = await checkbox.isChecked();
      if (on !== checked) {
        await checkbox.check({ force: true });
      }
    }
  }

  async setSpeed(value = 100) {
    const slider = this.speedSlider.first();
    if (await slider.count()) {
      await slider.fill(String(value));
    }
    // Speed label may show value; optional wait
    await this.page.waitForTimeout(100);
  }

  async setSize(value = 6) {
    const slider = this.sizeSlider.first();
    if (await slider.count()) {
      await slider.fill(String(value));
    }
    await this.page.waitForTimeout(100);
  }

  async waitForCompare(timeout = 3000) {
    await this.compareBars.first().waitFor({ state: 'visible', timeout });
  }

  async waitForNoCompare(timeout = 3000) {
    await this.page.waitForTimeout(50);
    await expect(this.compareBars).toHaveCount(0, { timeout });
  }

  async waitForSwap(timeout = 4000) {
    await this.swapBars.first().waitFor({ state: 'visible', timeout });
  }

  async waitForSwapCleared(timeout = 4000) {
    await expect(this.swapBars).toHaveCount(0, { timeout });
  }

  async waitForSettledCount(count, timeout = 5000) {
    await expect(this.settledBars).toHaveCount(count, { timeout });
  }

  async isDoneState() {
    // Heuristic: all bars settled and no comparing/swapping
    const barCount = await this.getBarCount();
    const settledCount = await this.settledBars.count();
    const comparingCount = await this.compareBars.count();
    const swappingCount = await this.swapBars.count();
    return settledCount === barCount && comparingCount === 0 && swappingCount === 0;
  }

  async waitForDone(timeout = 8000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (await this.isDoneState()) return;
      await this.page.waitForTimeout(100);
    }
    throw new Error('Timed out waiting for done state');
  }

  async statsSnapshot() {
    const compsText = await this.statsComparisons.first().textContent().catch(() => '');
    const swapsText = await this.statsSwaps.first().textContent().catch(() => '');
    const passText = await this.statsPass.first().textContent().catch(() => '');
    const parseNum = (t) => {
      const m = t?.match(/(\d+)/);
      return m ? Number(m[1]) : NaN;
    };
    return {
      comparisons: parseNum(compsText ?? ''),
      swaps: parseNum(swapsText ?? ''),
      pass: parseNum(passText ?? ''),
      raw: { compsText, swapsText, passText }
    };
  }
}

test.describe('Bubble Sort Interactive Module FSM — Interactive Application', () => {
  let app;

  test.beforeEach(async ({ page }) => {
    app = new BubbleSortPage(page);
    await app.goto();
  });

  test.afterEach(async ({ page }) => {
    // Ensure page is reset for next test
    await page.close();
  });

  test.describe('Initial state and idle behavior', () => {
    test('Initial state is idle: board visible, no highlights, controls available', async () => {
      // Validate board and bars rendered
      await expect(app.board).toBeVisible();
      const barCount = await app.getBarCount();
      expect(barCount).toBeGreaterThan(1);

      // No compare/swap highlights in idle
      await expect(app.compareBars).toHaveCount(0);
      await expect(app.swapBars).toHaveCount(0);

      // Controls exist
      await expect(app.stepButton.first()).toBeVisible();
      await expect(app.playButton.first()).toBeVisible();
      await expect(app.resetButton.first()).toBeVisible();
      await expect(app.randomizeButton.first()).toBeVisible();
      await expect(app.applyButton.first()).toBeVisible();
      await expect(app.finishButton.first()).toBeVisible();
    });

    test('Toggling Early Exit checkbox does not change state (TOGGLE_EARLY_EXIT)', async () => {
      await app.toggleEarlyExit(true);
      // Still idle, no compare highlight should appear spontaneously
      await app.waitForNoCompare(1000);
      await app.toggleEarlyExit(false);
      await app.waitForNoCompare(1000);
    });
  });

  test.describe('PLAY and PAUSE transitions', () => {
    test('PLAY from idle -> playing (auto compares), then PAUSE -> idle', async () => {
      const statsBefore = await app.statsSnapshot();

      await app.play();
      // Comparing should start automatically (AUTO_STEP driving comparing)
      await app.waitForCompare(4000);
      const statsDuring = await app.statsSnapshot();
      // Comparisons should increment or narration updated
      expect(isNaN(statsDuring.comparisons) || statsDuring.comparisons >= (isNaN(statsBefore.comparisons) ? 0 : statsBefore.comparisons)).toBeTruthy();

      // Pause returns to idle, stopping auto
      await app.pause();
      await app.waitForNoCompare(2000);

      // Ensure play/pause toggled properly
      // Idle should allow step without auto comparing
      await app.step();
      await app.waitForCompare(3000);
      await app.pause(); // Pause again to clear comparing
      await app.waitForNoCompare(2000);
    });
  });

  test.describe('STEP transitions and comparing/swapping/advancing', () => {
    test('STEP -> comparing then NO_SWAP path (advancing without swap) using input "1,2"', async () => {
      await app.reset();
      await app.applyNumbers('1, 2');
      // Step into comparing
      await app.step();
      await app.waitForCompare(3000);

      // For 1,2 first pair is already in order: NO_SWAP -> advancing
      // Ensure swap highlight never appears, and compare disappears as advancing occurs
      await app.page.waitForTimeout(500); // allow algorithm to decide
      const swapVisible = await app.swapBars.count();
      expect(swapVisible).toBe(0);

      // Wait for compare to clear (advancing)
      await app.waitForNoCompare(3000);
    });

    test('STEP -> comparing with NEED_SWAP -> swapping -> advancing using input "2,1"', async () => {
      await app.reset();
      await app.applyNumbers('2, 1');
      await app.step();
      await app.waitForCompare(3000);

      // Expect swap for 2,1
      await app.waitForSwap(4000);

      // OnExit swapping: clear swap highlight after animation completes
      await app.waitForSwapCleared(4000);

      // At advancing, compare may continue to next pair or pause based on FSM; ensure no immediate swap without compare
      await app.waitForNoCompare(2000);
    });
  });

  test.describe('Pass end and settled markers', () => {
    test('REACHED_PASS_END -> pass_end marks rightmost settled, continue next pass', async () => {
      await app.reset();
      // Use three numbers to exercise pass end and settled marking
      await app.applyNumbers('3, 2, 1');

      // Play to drive multiple auto steps to reach end of pass quickly
      await app.setSpeed(100); // highest speed for faster animation
      await app.play();

      // Expect at least one settled bar after first pass
      // Wait until at least one settled
      await app.waitForSettledCount(1, 8000);

      // Pause to stop auto and inspect
      await app.pause();
      await expect(app.settledBars).toHaveCount(1);
    });

    test('EARLY_EXIT at pass_end when no swaps and checkbox enabled leads to done', async () => {
      await app.reset();
      await app.applyNumbers('1, 2, 3, 4'); // already sorted
      await app.toggleEarlyExit(true);
      await app.setSpeed(100);
      await app.play();

      // Since no swaps in pass and early exit enabled, should jump to done
      await app.waitForDone(8000);

      // All bars settled
      const barCount = await app.getBarCount();
      await app.waitForSettledCount(barCount, 4000);
      // Stop playing if any and ensure ignore of Play in done
      await app.pause().catch(() => {});
      const doneBefore = await app.isDoneState();
      await app.play(); // Done state ignores Play
      await app.page.waitForTimeout(500);
      const doneAfter = await app.isDoneState();
      expect(doneBefore).toBeTruthy();
      expect(doneAfter).toBeTruthy();
    });
  });

  test.describe('Finish (fast_forward) transitions and completion', () => {
    test('FINISH from idle -> fast_forward -> done; PAUSE during fast_forward returns to idle', async () => {
      await app.reset();
      await app.applyNumbers('5, 1, 4, 2, 3');
      await app.setSpeed(50); // ensure speed is normal first

      // Enter fast_forward via Finish
      await app.finish();
      // Comparing should start quickly
      await app.waitForCompare(3000);

      // Pause should return to idle
      await app.pause();
      await app.waitForNoCompare(2000);

      // Finish again and allow to complete
      await app.finish();
      await app.waitForDone(10000);

      // Assert all bars settled
      const barCount = await app.getBarCount();
      await app.waitForSettledCount(barCount, 5000);
    });

    test('onExit fast_forward restores previous speed (heuristic)', async () => {
      await app.reset();
      // Set a recognizable speed label/value if available
      await app.setSpeed(10);
      const speedLabelBefore = await app.speedLabel.first().textContent().catch(() => '');
      await app.finish();
      await app.waitForCompare(3000);
      await app.pause(); // exit fast_forward
      const speedLabelAfter = await app.speedLabel.first().textContent().catch(() => '');
      // Heuristic: labels should still reflect user-chosen speed
      if (speedLabelBefore && speedLabelAfter) {
        expect(speedLabelAfter.trim()).toContain((speedLabelBefore ?? '').trim());
      }
      await app.waitForNoCompare(2000);
    });
  });

  test.describe('Done state robustness', () => {
    test('DONE ignores Play/Step/Finish, only Reset/Randomize/Apply returns to idle', async () => {
      await app.reset();
      await app.applyNumbers('4, 3, 2, 1'); // unsorted to ensure algorithm runs
      await app.setSpeed(100);
      await app.finish();
      await app.waitForDone(12000);

      // Try Play/Step/Finish — they should not change state
      const settledCountBefore = await app.settledBars.count();
      await app.play();
      await app.step();
      await app.finish();
      await app.page.waitForTimeout(500);
      const settledCountAfter = await app.settledBars.count();
      expect(settledCountAfter).toBe(settledCountBefore);
      expect(await app.isDoneState()).toBeTruthy();

      // Reset returns to idle, clearing settled markers
      await app.reset();
      await app.page.waitForTimeout(200);
      await expect(app.compareBars).toHaveCount(0);
      await expect(app.swapBars).toHaveCount(0);
      // Settled may be zero or reset to initial state with none settled
      const settledAfterReset = await app.settledBars.count();
      expect(settledAfterReset).toBeLessThan(settledCountBefore);

      // Randomize returns to idle with new items
      const valuesBefore = await app.getBarValues();
      await app.randomize();
      await app.page.waitForTimeout(300);
      const valuesAfter = await app.getBarValues();
      // It's random; often will differ
      expect(valuesAfter.join(',') !== valuesBefore.join(',')).toBeTruthy();

      // Apply valid returns to idle
      await app.applyNumbers('9, 7, 8');
      await app.waitForNoCompare(1000);
    });
  });

  test.describe('Resetting and randomizing states', () => {
    test('RESET -> resetting then AFTER_RESET -> idle; stats reset', async () => {
      await app.reset();
      const stats = await app.statsSnapshot();
      // After reset, counts should be zero or undefined
      if (!isNaN(stats.comparisons)) expect(stats.comparisons).toBe(0);
      if (!isNaN(stats.swaps)) expect(stats.swaps).toBe(0);
    });

    test('RANDOMIZE -> randomizing then AFTER_RANDOMIZE -> idle; items change', async () => {
      await app.reset();
      const valuesBefore = await app.getBarValues();
      await app.randomize();
      const valuesAfter = await app.getBarValues();
      expect(valuesAfter.join(',') !== valuesBefore.join(',')).toBeTruthy();
      await app.waitForNoCompare(1000);
    });
  });

  test.describe('Applying input and input error handling', () => {
    test('APPLY_NUMBERS valid -> applying_input then APPLY_NUMBERS_VALID -> idle; bars update', async () => {
      await app.reset();
      const before = await app.getBarValues();
      await app.applyNumbers('10, 3, 6, 1');
      const after = await app.getBarValues();
      expect(after.join(',')).toBe('10,3,6,1'); // assuming data-value or text reflects numbers (trimmed)
      expect(after.join(',') !== before.join(',')).toBeTruthy();
    });

    test('APPLY_NUMBERS invalid -> input_error; narrative displays error; transitions from input_error', async () => {
      await app.reset();
      await app.applyNumbers('bad, data, !!');
      // Expect an error message in narration or near input
      const errorMsg = await app.narration.first().textContent().catch(() => '');
      if (errorMsg) {
        expect(/invalid|error|parse/i.test(errorMsg)).toBeTruthy();
      }

      // From input_error: PLAY -> playing
      await app.play();
      await app.waitForCompare(4000);
      await app.pause();

      // From input_error: STEP -> comparing
      await app.step();
      await app.waitForCompare(3000);
      await app.pause();

      // From input_error: RESET -> resetting
      await app.reset();
      await app.waitForNoCompare(2000);

      // From input_error: RANDOMIZE -> randomizing
      await app.randomize();
      await app.waitForNoCompare(2000);

      // Apply valid -> idle
      await app.applyNumbers('2, 2, 1');
      await app.waitForNoCompare(2000);
    });
  });

  test.describe('AUTO_STEP behavior in playing and fast_forward', () => {
    test('AUTO_STEP produces multiple comparisons during playing', async () => {
      await app.reset();
      await app.applyNumbers('9, 1, 8, 2, 7');
      await app.setSpeed(100);
      await app.play();
      // Observe multiple compare cycles by checking comparisons stat increasing or alternating compare highlight
      const stats1 = await app.statsSnapshot();
      await app.waitForCompare(3000);
      await app.page.waitForTimeout(800);
      const stats2 = await app.statsSnapshot();
      await app.page.waitForTimeout(800);
      const stats3 = await app.statsSnapshot();
      const cmpNums = [stats1.comparisons, stats2.comparisons, stats3.comparisons].filter((n) => !isNaN(n));
      if (cmpNums.length >= 2) {
        expect(cmpNums[cmpNums.length - 1]).toBeGreaterThanOrEqual(cmpNums[0]);
      } else {
        // Fallback: ensure compare highlights appear at least twice
        await app.waitForCompare(3000);
        await app.page.waitForTimeout(500);
        await app.waitForCompare(3000);
      }
      await app.pause();
    });

    test('AUTO_STEP in fast_forward quickly drives to completion', async () => {
      await app.reset();
      await app.applyNumbers('6, 5, 4, 3, 2, 1');
      await app.finish();
      await app.waitForDone(12000);
      const barCount = await app.getBarCount();
      await app.waitForSettledCount(barCount, 5000);
    });
  });

  test.describe('SPEED_CHANGE, SIZE_CHANGE, WINDOW_RESIZE do not alter FSM state', () => {
    test('Speed slider changes animation speed but remains idle when not playing', async ({ page }) => {
      await app.reset();
      await app.waitForNoCompare(1000);
      await app.setSpeed(1);
      await app.waitForNoCompare(1000);
      await app.setSpeed(100);
      await app.waitForNoCompare(1000);
      // Start playing and ensure compares occur; then changing speed does not exit playing
      await app.play();
      await app.waitForCompare(3000);
      await app.setSpeed(1);
      await app.waitForCompare(3000);
      await app.pause();
    });

    test('Size slider updates displayed size; new size applies on Randomize', async () => {
      await app.reset();
      const initialCount = await app.getBarCount();
      await app.setSize(initialCount + 2);
      // The size label may change immediately
      const labelText = await app.sizeLabel.first().textContent().catch(() => '');
      if (labelText) {
        expect(/size/i.test(labelText)).toBeTruthy();
      }
      // Bars count should change after Randomize
      await app.randomize();
      const newCount = await app.getBarCount();
      expect(newCount === initialCount).toBeFalsy();
    });

    test('Window resize re-renders visuals but does not change state', async ({ page }) => {
      await app.reset();
      await app.waitForNoCompare(1000);
      const boardSizeBefore = await app.board.boundingBox();
      await page.setViewportSize({ width: 900, height: 700 });
      await page.waitForTimeout(200);
      const boardSizeAfter = await app.board.boundingBox();
      // Dimensions likely changed
      if (boardSizeBefore && boardSizeAfter) {
        expect(boardSizeAfter.width !== boardSizeBefore.width || boardSizeAfter.height !== boardSizeBefore.height).toBeTruthy();
      }
      // Still idle
      await app.waitForNoCompare(1000);
    });
  });

  test.describe('Keyboard shortcuts for events', () => {
    test('Space toggles PLAY/PAUSE; N triggers STEP; R triggers RESET', async ({ page }) => {
      await app.reset();
      // Ensure focus is on body; press Space to play
      await page.keyboard.press('Space');
      await app.waitForCompare(3000);

      // Space to pause
      await page.keyboard.press('Space');
      await app.waitForNoCompare(2000);

      // N to step
      await page.keyboard.press('KeyN');
      await app.waitForCompare(3000);

      // R to reset
      await page.keyboard.press('KeyR');
      await app.waitForNoCompare(2000);
    });
  });
});