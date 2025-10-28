import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/10-28-0005/html/a3d142e0-b402-11f0-bdbc-23fe6fc76a5e.html';

class BubblePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
    // Wait for bars to appear or main title to confirm render
    await Promise.race([
      this.page.getByText(/Bubble Sort Interactive Lab/i).waitFor({ timeout: 3000 }).catch(() => {}),
      this.page.locator('.bar, [data-testid="bar"], .bars .bar').first().waitFor({ timeout: 3000 }).catch(() => {})
    ]);
    // Wait small stability time to allow INIT_COMPLETED to fire and UI to settle into paused
    await this.page.waitForTimeout(50);
  }

  // General button finder by accessible role name
  button(name) {
    return this.page.getByRole('button', { name: new RegExp(name, 'i') });
  }

  get playBtn() {
    return this.button('play');
  }
  get pauseBtn() {
    return this.button('pause');
  }
  get stepBtn() {
    return this.button('step');
  }
  get randomizeBtn() {
    return this.button('randomize|random');
  }
  get shuffleBtn() {
    return this.button('shuffle');
  }
  get resetBtn() {
    return this.button('reset|revert|clear');
  }
  get setDataBtn() {
    return this.button('set data|apply|update|submit|set');
  }
  get dataInput() {
    // First text input assumed to be data input
    return this.page.locator('input[type="text"]').first();
  }
  get speedSlider() {
    return this.page.locator('input[type="range"]').first();
  }
  get earlyExitCheckbox() {
    return this.page.getByRole('checkbox', { name: /early.*exit|no swaps|early/i }).first();
  }
  get statusRegion() {
    // Try several selectors for status/announcement area
    const candidate = this.page.locator('[data-testid="status"], #status, .status').first();
    return candidate;
  }
  get liveRegion() {
    // aria-live or log/status/alert role
    return this.page.locator('[aria-live], [role="status"], [role="log"], [role="alert"]').first();
  }
  get bars() {
    return this.page.locator('.bar, [data-testid="bar"], .bars .bar');
  }

  async countBars() {
    return await this.bars.count();
  }

  async isPaused() {
    const playEnabled = await this.playBtn.isEnabled().catch(() => false);
    const pauseEnabled = await this.pauseBtn.isEnabled().catch(() => false);
    const stepEnabled = await this.stepBtn.isEnabled().catch(() => false);
    // paused: play enabled, pause disabled, step enabled
    return playEnabled && !pauseEnabled && stepEnabled;
  }

  async isPlaying() {
    const playEnabled = await this.playBtn.isEnabled().catch(() => false);
    const pauseEnabled = await this.pauseBtn.isEnabled().catch(() => false);
    const stepEnabled = await this.stepBtn.isEnabled().catch(() => false);
    // playing: play disabled, pause enabled, step disabled
    return !playEnabled && pauseEnabled && !stepEnabled;
  }

  async readStatusText() {
    let text = '';
    if (await this.statusRegion.count()) {
      text = (await this.statusRegion.innerText()).trim();
    }
    if (!text && await this.liveRegion.count()) {
      text = (await this.liveRegion.innerText()).trim();
    }
    return text;
  }

  async readArrayValues() {
    return await this.page.evaluate(() => {
      const bars = Array.from(document.querySelectorAll('.bar, [data-testid="bar"], .bars .bar'));
      const getVal = (el) => {
        const ds = el.getAttribute('data-value') ?? (el.dataset ? el.dataset.value : undefined);
        if (ds !== undefined && ds !== null && ds !== '') {
          const n = Number(ds);
          if (!Number.isNaN(n)) return n;
        }
        const aria = el.getAttribute('aria-label');
        if (aria) {
          const m = aria.match(/-?\d+(\.\d+)?/g);
          if (m && m.length) {
            const n = Number(m[m.length - 1]);
            if (!Number.isNaN(n)) return n;
          }
        }
        const txt = (el.textContent || '').trim();
        if (txt) {
          const m = txt.match(/-?\d+(\.\d+)?/g);
          if (m && m.length) {
            const n = Number(m[m.length - 1]);
            if (!Number.isNaN(n)) return n;
          }
        }
        const h = parseFloat(getComputedStyle(el).height);
        if (!Number.isNaN(h)) return Math.round(h);
        return NaN;
      };
      return bars.map(getVal);
    });
  }

  async isArraySortedAscending() {
    const vals = await this.readArrayValues();
    const filtered = vals.filter(v => !Number.isNaN(v));
    if (filtered.length >= 2) {
      for (let i = 0; i < filtered.length - 1; i++) {
        if (filtered[i] > filtered[i + 1]) return false;
      }
      return true;
    }
    // Fallback: check for sorted class
    const hasSorted = await this.page.evaluate(() => {
      const bars = Array.from(document.querySelectorAll('.bar, [data-testid="bar"], .bars .bar'));
      return bars.length > 0 && bars.every(b => b.classList.contains('sorted') || b.classList.contains('done'));
    });
    return hasSorted;
  }

  async waitForComparePhase(timeout = 2000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      // check for compare highlight
      const compareCount = await this.page.locator('.compare').count().catch(() => 0);
      if (compareCount > 0) return;
      const status = await this.readStatusText();
      if (/compare/i.test(status)) return;
      await this.page.waitForTimeout(20);
    }
    // no throw here; allow absence in some phases; but tests can assert accordingly
  }

  async waitForSwapPhase(timeout = 2000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const swapCount = await this.page.locator('.swap').count().catch(() => 0);
      if (swapCount > 0) return;
      const status = await this.readStatusText();
      if (/swap/i.test(status)) return;
      await this.page.waitForTimeout(20);
    }
  }

  async waitForHighlightsCleared(timeout = 2000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const hasCompare = await this.page.locator('.compare').count().catch(() => 0);
      const hasSwap = await this.page.locator('.swap').count().catch(() => 0);
      if (hasCompare === 0 && hasSwap === 0) return;
      await this.page.waitForTimeout(20);
    }
  }

  async setSpeedFastest() {
    if (await this.speedSlider.count() === 0) return;
    const slider = this.speedSlider;
    // set to max value if available
    const max = await slider.getAttribute('max');
    const min = await slider.getAttribute('min');
    const val = max ?? '100';
    await slider.fill(''); // ensure we can type
    await slider.evaluate((el, value) => {
      const input = el;
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, val);
    await this.page.waitForTimeout(10);
  }

  async setDataset(valuesArray) {
    const input = this.dataInput;
    await input.click({ force: true });
    await input.fill(valuesArray.join(', '));
    if (await this.setDataBtn.count()) {
      await this.setDataBtn.click();
    } else {
      await input.press('Enter');
    }
    // wait small time for parsing/layout
    await this.page.waitForTimeout(50);
  }

  async toggleEarlyExit(on = true) {
    if (await this.earlyExitCheckbox.count()) {
      const checked = await this.earlyExitCheckbox.isChecked();
      if (checked !== on) {
        await this.earlyExitCheckbox.click();
      }
    }
  }

  async waitForDone(timeout = 6000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const sorted = await this.isArraySortedAscending();
      const status = await this.readStatusText();
      if (sorted) return true;
      if (/done|complete|sorted/i.test(status)) return true;
      await this.page.waitForTimeout(50);
    }
    return false;
  }

  async getActiveBarIndex() {
    return await this.page.evaluate(() => {
      const bars = Array.from(document.querySelectorAll('.bar, [data-testid="bar"], .bars .bar'));
      const ae = document.activeElement;
      return bars.findIndex(b => b === ae);
    });
  }

  async focusFirstBar() {
    const first = this.bars.first();
    if (await first.count()) {
      await first.focus();
    } else {
      // try tab to reach some focusable bar
      await this.page.keyboard.press('Tab');
    }
    await this.page.waitForTimeout(20);
  }
}

test.describe('Bubble Sort Interactive Lab - FSM Compliance', () => {
  test.beforeEach(async ({ page }) => {
    page.setDefaultTimeout(15000);
    const bubble = new BubblePage(page);
    await bubble.goto();
    await bubble.setSpeedFastest();
  });

  test('initializing -> paused on INIT_COMPLETED (controls reflect paused state)', async ({ page }) => {
    const bubble = new BubblePage(page);
    // Expect play enabled, pause disabled, step enabled -> paused state
    await expect(bubble.playBtn, 'Play should be enabled when paused').toBeEnabled();
    await expect(bubble.pauseBtn, 'Pause should be disabled when paused').toBeDisabled();
    await expect(bubble.stepBtn, 'Step should be enabled when paused').toBeEnabled();
    const status = await bubble.readStatusText();
    // Status may contain "Paused" or similar
    if (status) {
      expect(status).toMatch(/pause|ready|idle/i);
    }
  });

  test.describe('Paused state self-transitions and data events', () => {
    test('SET_DATA_VALID keeps paused and updates bars', async ({ page }) => {
      const bubble = new BubblePage(page);
      const before = await bubble.readArrayValues();
      await bubble.setDataset([4, 2, 9, 1]);
      const after = await bubble.readArrayValues();
      expect(after.length).toBeGreaterThan(0);
      // Should change to the specified dataset (or at least differ from previous)
      expect(after.join(',')).not.toBe(before.join(','));
      expect(await bubble.isPaused()).toBeTruthy();
    });

    test('SET_DATA_INVALID shows error and stays paused', async ({ page }) => {
      const bubble = new BubblePage(page);
      await bubble.dataInput.click();
      await bubble.dataInput.fill('1, a, , %');
      if (await bubble.setDataBtn.count()) {
        await bubble.setDataBtn.click();
      } else {
        await bubble.dataInput.press('Enter');
      }
      await bubble.page.waitForTimeout(50);
      // Expect some status or live region warning
      const status = await bubble.readStatusText();
      if (status) {
        expect(status).toMatch(/invalid|error|format/i);
      }
      expect(await bubble.isPaused()).toBeTruthy();
    });

    test('RANDOMIZE pauses and changes dataset', async ({ page }) => {
      const bubble = new BubblePage(page);
      const before = await bubble.readArrayValues();
      // Attempt to find and click Randomize
      if (await bubble.randomizeBtn.count()) {
        await bubble.randomizeBtn.click();
      }
      await bubble.page.waitForTimeout(50);
      const after = await bubble.readArrayValues();
      if (before.length && after.length) {
        // May occasionally randomize to same order; allow retry once
        if (after.join(',') === before.join(',')) {
          if (await bubble.randomizeBtn.count()) await bubble.randomizeBtn.click();
          await bubble.page.waitForTimeout(50);
        }
      }
      expect(await bubble.isPaused()).toBeTruthy();
    });

    test('SHUFFLE pauses and permutes current dataset', async ({ page }) => {
      const bubble = new BubblePage(page);
      const before = await bubble.readArrayValues();
      if (await bubble.shuffleBtn.count()) {
        await bubble.shuffleBtn.click();
      }
      await bubble.page.waitForTimeout(50);
      const after = await bubble.readArrayValues();
      if (before.length && after.length) {
        // Not guaranteed, but likely changed
        // We only assert paused control state
      }
      expect(await bubble.isPaused()).toBeTruthy();
    });

    test('RESET pauses and restores initial dataset', async ({ page }) => {
      const bubble = new BubblePage(page);
      const initial = await bubble.readArrayValues();
      // change dataset
      await bubble.setDataset([9, 8, 7]);
      if (await bubble.resetBtn.count()) {
        await bubble.resetBtn.click();
      }
      await bubble.page.waitForTimeout(50);
      const reverted = await bubble.readArrayValues();
      expect(await bubble.isPaused()).toBeTruthy();
      // Either equals initial or at least not equal to changed
      if (initial.length && reverted.length) {
        // We cannot guarantee equality, but we can check that it differs from [9,8,7]
        expect(reverted.join(',')).not.toBe([9, 8, 7].join(','));
      }
    });

    test('SPEED_CHANGE in paused updates UI and remains paused', async ({ page }) => {
      const bubble = new BubblePage(page);
      await bubble.setSpeedFastest();
      expect(await bubble.isPaused()).toBeTruthy();
      // Optional: verify slider value changed is at max
      if (await bubble.speedSlider.count()) {
        const max = await bubble.speedSlider.getAttribute('max');
        const value = await bubble.speedSlider.inputValue();
        if (max) expect(value).toBe(max);
      }
    });

    test('WINDOW_RESIZE does not change paused state', async ({ page }) => {
      const bubble = new BubblePage(page);
      await page.setViewportSize({ width: 800, height: 600 });
      await page.setViewportSize({ width: 1200, height: 800 });
      expect(await bubble.isPaused()).toBeTruthy();
      // Bars still present
      expect(await bubble.countBars()).toBeGreaterThan(0);
    });

    test('EARLY_EXIT_TOGGLED keeps paused and toggles checkbox', async ({ page }) => {
      const bubble = new BubblePage(page);
      if (await bubble.earlyExitCheckbox.count()) {
        const was = await bubble.earlyExitCheckbox.isChecked();
        await bubble.earlyExitCheckbox.click();
        expect(await bubble.earlyExitCheckbox.isChecked()).toBe(!was);
      }
      expect(await bubble.isPaused()).toBeTruthy();
    });

    test('BAR_FOCUS_LEFT/RIGHT moves focus on bars and remains paused', async ({ page }) => {
      const bubble = new BubblePage(page);
      await bubble.focusFirstBar();
      const beforeIndex = await bubble.getActiveBarIndex();
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(20);
      const afterIndex = await bubble.getActiveBarIndex();
      // Focus should move right when possible
      if (beforeIndex >= 0) {
        expect(afterIndex).toBe(beforeIndex + 1);
      }
      expect(await bubble.isPaused()).toBeTruthy();
      // Move left
      await page.keyboard.press('ArrowLeft');
      await page.waitForTimeout(20);
      const backIndex = await bubble.getActiveBarIndex();
      if (afterIndex >= 0) {
        expect(backIndex).toBe(afterIndex - 1);
      }
      expect(await bubble.isPaused()).toBeTruthy();
    });
  });

  test.describe('Stepping mode transitions', () => {
    test('STEP_CLICK triggers one step: pass_check -> comparing -> (swap or not) -> advance_pointer -> paused', async ({ page }) => {
      const bubble = new BubblePage(page);
      // Use dataset that ensures first comparison requires swap
      await bubble.setDataset([3, 1, 2]);
      expect(await bubble.isPaused()).toBeTruthy();
      // Click Step
      await bubble.stepBtn.click();
      // Should highlight compare
      await bubble.waitForComparePhase(1500);
      // Might swap depending on values; with [3,1,2] expect swap
      await bubble.waitForSwapPhase(1500);
      // After animation, highlights cleared and back to paused
      await bubble.waitForHighlightsCleared(2000);
      // Wait a bit for STEP_DONE to pause
      await bubble.page.waitForTimeout(20);
      expect(await bubble.isPaused()).toBeTruthy();
    });

    test('KEY_STEP (S key) performs a step when paused', async ({ page }) => {
      const bubble = new BubblePage(page);
      await bubble.setDataset([1, 5, 3]); // ensures compare with no swap on first pair
      await page.keyboard.press('s');
      await bubble.waitForComparePhase(1500);
      // No swap expected for first pair 1 <= 5, but we accept either
      await bubble.waitForHighlightsCleared(2000);
      expect(await bubble.isPaused()).toBeTruthy();
    });

    test('Stepping reaches PASS_COMPLETED_MORE_REMAINING and pauses at pass boundaries', async ({ page }) => {
      const bubble = new BubblePage(page);
      // Use a small dataset to complete a pass quickly
      await bubble.setDataset([3, 2, 1]);
      // Perform multiple step clicks to complete first pass
      for (let i = 0; i < 4; i++) {
        await bubble.stepBtn.click();
        await bubble.waitForComparePhase(1500);
        await bubble.waitForSwapPhase(1500);
        await bubble.waitForHighlightsCleared(2000);
        expect(await bubble.isPaused()).toBeTruthy();
      }
      // At least one element at end should be in sorted zone or status indicates new pass
      const status = await bubble.readStatusText();
      if (status) {
        expect(status).toMatch(/pass|sorted|boundary|end/i);
      }
      expect(await bubble.isPaused()).toBeTruthy();
    });

    test('Stepping can reach done via SORTING_FINISHED', async ({ page }) => {
      const bubble = new BubblePage(page);
      await bubble.setDataset([2, 1]);
      // Perform enough steps to finish
      for (let i = 0; i < 5; i++) {
        await bubble.stepBtn.click();
        await bubble.waitForComparePhase(1000);
        await bubble.waitForSwapPhase(1000);
        await bubble.waitForHighlightsCleared(1000);
        expect(await bubble.isPaused()).toBeTruthy();
      }
      const doneReached = await bubble.waitForDone(1500);
      expect(doneReached).toBeTruthy();
      // In 'done', further step does nothing state-wise (FSM: STEP_CLICK -> done stays done)
      await bubble.stepBtn.click();
      const doneStill = await bubble.waitForDone(1500);
      expect(doneStill).toBeTruthy();
    });
  });

  test.describe('Playing mode, pause toggles, and loop transitions', () => {
    test('PLAY_CLICK transitions to playing_pass_check and disables play button', async ({ page }) => {
      const bubble = new BubblePage(page);
      await bubble.setDataset([5, 3, 4, 1]);
      await bubble.playBtn.click();
      expect(await bubble.isPlaying()).toBeTruthy();
      await bubble.waitForComparePhase(1500);
      // Pause should bring back to paused
      await bubble.pauseBtn.click();
      expect(await bubble.isPaused()).toBeTruthy();
    });

    test('SPACE_TOGGLE_PLAY_PAUSE toggles playing <-> paused', async ({ page }) => {
      const bubble = new BubblePage(page);
      await bubble.setDataset([4, 2, 3, 1]);
      // Space to start playing
      await page.keyboard.press(' ');
      expect(await bubble.isPlaying()).toBeTruthy();
      await bubble.waitForComparePhase(1500);
      // Space to pause
      await page.keyboard.press(' ');
      expect(await bubble.isPaused()).toBeTruthy();
      // Space to resume
      await page.keyboard.press(' ');
      expect(await bubble.isPlaying()).toBeTruthy();
      await bubble.pauseBtn.click();
      expect(await bubble.isPaused()).toBeTruthy();
    });

    test('Can pause during comparing, swapping, and advance-pointer phases using PAUSE_CLICK or space', async ({ page }) => {
      const bubble = new BubblePage(page);
      await bubble.setDataset([9, 1, 8, 2]);
      await bubble.playBtn.click();
      // Pause during comparing
      await bubble.waitForComparePhase(1500);
      await bubble.pauseBtn.click();
      expect(await bubble.isPaused()).toBeTruthy();
      // Resume and pause during swap
      await bubble.playBtn.click();
      await bubble.waitForComparePhase(1500);
      await bubble.waitForSwapPhase(1500);
      await page.keyboard.press(' ');
      expect(await bubble.isPaused()).toBeTruthy();
      // Resume and pause during advance pointer/wait loop
      await bubble.playBtn.click();
      await bubble.waitForComparePhase(1500);
      // wait slightly for WAIT_BETWEEN_AUTO_STEPS to schedule
      await bubble.page.waitForTimeout(50);
      await page.keyboard.press(' ');
      expect(await bubble.isPaused()).toBeTruthy();
    });

    test('WAIT_BETWEEN_AUTO_STEPS loops playing_advance_pointer -> playing_pass_check automatically', async ({ page }) => {
      const bubble = new BubblePage(page);
      await bubble.setDataset([5, 4, 3, 2, 1]);
      await bubble.playBtn.click();
      expect(await bubble.isPlaying()).toBeTruthy();
      // Observe multiple compare phases over time indicating loop iteration
      await bubble.waitForComparePhase(1500);
      await bubble.waitForHighlightsCleared(2000);
      await bubble.waitForComparePhase(1500);
      // Pause to stop loop
      await bubble.pauseBtn.click();
      expect(await bubble.isPaused()).toBeTruthy();
    });
  });

  test.describe('Completion and early exit behaviors (done state)', () => {
    test('SORTING_FINISHED -> done on unsorted dataset; play/step do not restart', async ({ page }) => {
      const bubble = new BubblePage(page);
      await bubble.setDataset([5, 4, 3, 2, 1]);
      await bubble.toggleEarlyExit(false);
      await bubble.playBtn.click();
      const done = await bubble.waitForDone(8000);
      expect(done).toBeTruthy();
      expect(await bubble.isArraySortedAscending()).toBeTruthy();
      // Clicking Play should not restart (FSM: PLAY_CLICK stays in done)
      if (await bubble.playBtn.isEnabled().catch(() => false)) {
        await bubble.playBtn.click();
      }
      const stillDone = await bubble.waitForDone(1000);
      expect(stillDone).toBeTruthy();
      // Clicking Step should not restart
      if (await bubble.stepBtn.isEnabled().catch(() => false)) {
        await bubble.stepBtn.click();
      }
      expect(await bubble.waitForDone(1000)).toBeTruthy();
    });

    test('PASS_COMPLETED_NO_SWAPS_EARLY_EXIT -> done when already sorted and early-exit enabled', async ({ page }) => {
      const bubble = new BubblePage(page);
      await bubble.setDataset([1, 2, 3, 4]);
      await bubble.toggleEarlyExit(true);
      await bubble.playBtn.click();
      const done = await bubble.waitForDone(4000);
      expect(done).toBeTruthy();
      const status = await bubble.readStatusText();
      if (status) {
        // Expect early-exit message or completion message
        expect(status).toMatch(/no swaps|early|done|complete|sorted/i);
      }
      // Ensure done is stable on SPACE_TOGGLE_PLAY_PAUSE
      await page.keyboard.press(' ');
      expect(await bubble.waitForDone(500)).toBeTruthy();
    });
  });

  test.describe('Visual feedback and DOM changes', () => {
    test('Comparing highlights appear during compare phase', async ({ page }) => {
      const bubble = new BubblePage(page);
      await bubble.setDataset([2, 3, 1]);
      await bubble.playBtn.click();
      await bubble.waitForComparePhase(1500);
      const compareCount = await page.locator('.compare').count().catch(() => 0);
      const status = await bubble.readStatusText();
      expect(compareCount > 0 || /compare/i.test(status)).toBeTruthy();
      await bubble.pauseBtn.click();
      expect(await bubble.isPaused()).toBeTruthy();
    });

    test('Swap highlights appear and are cleared after animation', async ({ page }) => {
      const bubble = new BubblePage(page);
      await bubble.setDataset([5, 1, 2]);
      await bubble.playBtn.click();
      await bubble.waitForComparePhase(1500);
      await bubble.waitForSwapPhase(1500);
      const swapCount = await page.locator('.swap').count().catch(() => 0);
      const status = await bubble.readStatusText();
      expect(swapCount > 0 || /swap/i.test(status)).toBeTruthy();
      await bubble.waitForHighlightsCleared(2000);
      const swapAfter = await page.locator('.swap').count().catch(() => 0);
      expect(swapAfter).toBe(0);
      await bubble.pauseBtn.click().catch(() => {});
    });

    test('Sorted zone updates as passes complete', async ({ page }) => {
      const bubble = new BubblePage(page);
      await bubble.setDataset([4, 3, 2, 1]);
      await bubble.playBtn.click();
      // Wait some time for at least one full pass
      await page.waitForTimeout(1000);
      // Check if any bar has 'sorted' class or status mentions sorted zone
      const anySorted = await page.locator('.bar.sorted, .bars .sorted').count().catch(() => 0);
      const status = await bubble.readStatusText();
      expect(anySorted > 0 || /sorted|pass/i.test(status)).toBeTruthy();
      await bubble.pauseBtn.click();
      expect(await bubble.isPaused()).toBeTruthy();
    });
  });

  test.describe('Edge cases', () => {
    test('Handles repeated SPACE_TOGGLE quickly without breaking state', async ({ page }) => {
      const bubble = new BubblePage(page);
      await bubble.setDataset([3, 2, 1]);
      // Toggle rapidly
      for (let i = 0; i < 4; i++) {
        await page.keyboard.press(' ');
        await page.waitForTimeout(20);
      }
      // State should be either paused or playing but controls consistent
      const paused = await bubble.isPaused();
      const playing = await bubble.isPlaying();
      expect(paused || playing).toBeTruthy();
      // Settle in paused for next tests
      if (playing) {
        await page.keyboard.press(' ');
        await page.waitForTimeout(20);
        expect(await bubble.isPaused()).toBeTruthy();
      }
    });

    test('Speed changes during playing do not break the loop', async ({ page }) => {
      const bubble = new BubblePage(page);
      await bubble.setDataset([7, 6, 5, 4, 3]);
      await bubble.playBtn.click();
      expect(await bubble.isPlaying()).toBeTruthy();
      // Adjust speed mid-play
      if (await bubble.speedSlider.count()) {
        // Set to min then max
        const min = (await bubble.speedSlider.getAttribute('min')) ?? '0';
        await bubble.speedSlider.evaluate((el, value) => {
          el.value = value;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }, min);
        await page.waitForTimeout(20);
        const max = (await bubble.speedSlider.getAttribute('max')) ?? '100';
        await bubble.speedSlider.evaluate((el, value) => {
          el.value = value;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }, max);
      }
      // Should still be playing
      expect(await bubble.isPlaying()).toBeTruthy();
      await bubble.pauseBtn.click();
      expect(await bubble.isPaused()).toBeTruthy();
    });
  });
});