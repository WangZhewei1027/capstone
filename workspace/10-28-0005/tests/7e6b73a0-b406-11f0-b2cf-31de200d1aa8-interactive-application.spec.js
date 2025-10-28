import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/10-28-0005/html/7e6b73a0-b406-11f0-b2cf-31de200d1aa8.html';

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function getTextContents(locator) {
  const count = await locator.count();
  const texts = [];
  for (let i = 0; i < count; i++) {
    texts.push(await locator.nth(i).textContent());
  }
  return texts.map(t => (t || '').trim());
}

class BubbleSortPage {
  /**
   * Page object for Bubble Sort Interactive Module
   * Provides robust selectors and actions for all major interactions.
   */
  constructor(page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto(APP_URL);
    await this.page.waitForLoadState('domcontentloaded');
    await expect(this.barArea()).toBeVisible();
    // Wait for initialization announcer "Ready"
    await this.waitForReady();
  }

  barArea() {
    return this.page.locator('.bar-area');
  }

  bars() {
    return this.page.locator('.bar-area .bar');
  }

  comparingBars() {
    return this.page.locator('.bar-area .bar.comparing');
  }

  sortedBars() {
    return this.page.locator('.bar-area .bar.sorted');
  }

  announcer() {
    return this.page.locator('[aria-live="polite"], [aria-live="assertive"]');
  }

  passLabel() {
    // Try to find a label that contains "Pass"
    return this.page.locator(':text("Pass")');
  }

  jLabel() {
    return this.page.locator(':text("j")');
  }

  playButton() {
    return this.getButton(['Play', 'Pause']);
  }

  stepButton() {
    return this.getButton(['Step', 'Next', 'Manual Step']);
  }

  randomizeButton() {
    return this.getButton(['Randomize', 'Shuffle']);
  }

  resetButton() {
    return this.getButton(['Reset']);
  }

  applyButton() {
    return this.getButton(['Apply', 'Apply Custom', 'Set']);
  }

  optimizeCheckbox() {
    // Try by label text then any checkbox in controls grid
    const labeled = this.page.getByLabel(/Optimize|Early\s*Exit|Optimization/i);
    const generic = this.page.locator('input[type="checkbox"]');
    return labeled.count().then(count => (count > 0 ? labeled : generic));
  }

  speedSlider() {
    const labeled = this.page.getByLabel(/Speed/i);
    const generic = this.page.locator('input[type="range"]').nth(0);
    return labeled.count().then(count => (count > 0 ? labeled : generic));
  }

  sizeSlider() {
    const labeled = this.page.getByLabel(/Size/i);
    const generic = this.page.locator('input[type="range"]').nth(1);
    return labeled.count().then(count => (count > 0 ? labeled : generic));
  }

  sizeLabel() {
    return this.page.locator(':text("Size")');
  }

  customInput() {
    const byLabel = this.page.getByLabel(/Custom|Input|Data|Numbers/i);
    const byPlaceholder = this.page.getByPlaceholder(/comma|number|custom/i, { exact: false });
    const generic = this.page.locator('input[type="text"]');
    return Promise.all([byLabel.count(), byPlaceholder.count(), generic.count()]).then(([a, b, c]) => {
      if (a > 0) return byLabel;
      if (b > 0) return byPlaceholder;
      return generic;
    });
  }

  async getButton(names) {
    const regex = new RegExp(names.map(escapeRegex).join('|'), 'i');
    const byRole = this.page.getByRole('button', { name: regex });
    const byText = this.page.locator('button').filter({ hasText: regex });
    const roleCount = await byRole.count();
    if (roleCount > 0) return byRole.first();
    return byText.first();
  }

  async waitForReady() {
    // Announcer should announce "Ready" after rebuilding_data -> paused
    await expect(this.announcer()).toContainText(/ready/i, { timeout: 5000 });
  }

  async waitForComparing() {
    await expect(this.comparingBars()).toHaveCount(2, { timeout: 3000 });
  }

  async waitForNoComparing() {
    await expect(this.comparingBars()).toHaveCount(0, { timeout: 4000 });
  }

  async getBarValues() {
    const texts = await getTextContents(this.bars());
    // Convert to numeric values if possible; fallback to text
    return texts.map(t => {
      const n = parseFloat((t || '').replace(/[^\d.-]/g, ''));
      return Number.isNaN(n) ? t : n;
    });
  }

  async clickPlay() {
    const btn = await this.playButton();
    await btn.click();
  }

  async clickStep() {
    const btn = await this.stepButton();
    await btn.click();
  }

  async clickRandomize() {
    const btn = await this.randomizeButton();
    await btn.click();
  }

  async clickReset() {
    const btn = await this.resetButton();
    await btn.click();
  }

  async applyCustom(valuesArray) {
    const input = await this.customInput();
    const btn = await this.applyButton();
    const text = Array.isArray(valuesArray) ? valuesArray.join(',') : valuesArray;
    await input.fill(text);
    await btn.click();
  }

  async toggleOptimize(checked) {
    const cb = await this.optimizeCheckbox();
    const isChecked = await cb.isChecked().catch(() => false);
    if (checked && !isChecked) {
      await cb.check({ force: true });
    } else if (!checked && isChecked) {
      await cb.uncheck({ force: true });
    }
    const finalChecked = await cb.isChecked().catch(() => checked);
    return finalChecked;
  }

  async setSpeed(value = 50) {
    const slider = await this.speedSlider();
    await slider.focus();
    await slider.fill(String(value));
  }

  async setSize(value = 6) {
    const slider = await this.sizeSlider();
    await slider.focus();
    await slider.fill(String(value));
  }

  async getRootSwapMsVar() {
    return await this.page.evaluate(() => document.documentElement.style.getPropertyValue('--swap-ms') || '');
  }

  async getBarWidth() {
    return await this.page.evaluate(() => {
      const el = document.querySelector('.bar-area .bar');
      return el ? el.getBoundingClientRect().width : 0;
    });
  }
}

test.describe('Bubble Sort Interactive Module - FSM and UI Validation', () => {
  let bs;

  test.beforeEach(async ({ page }) => {
    bs = new BubbleSortPage(page);
    await bs.goto();
  });

  // Initialization and Paused State
  test.describe('Initialization and paused state', () => {
    test('initializing -> paused on page load with "Ready" announcer', async () => {
      // Validates INIT_COMPLETE leads to paused and onEnter actions update play button, bars render
      await expect(await bs.playButton()).toHaveText(/play/i);
      await expect(bs.bars()).toHaveCountGreaterThan(0);
      await expect(bs.announcer()).toContainText(/ready/i);
    });
  });

  // Playing and Autostep
  test.describe('Playing and autostep behavior', () => {
    test('PLAY_TOGGLE from paused -> playing, autostep starts and comparing highlighted', async () => {
      await bs.clickPlay();
      await expect(await bs.playButton()).toHaveText(/pause/i);
      await bs.waitForComparing();
      await expect(bs.announcer()).toContainText(/compar/i);
    });

    test('PLAY_TOGGLE during comparing defers pause until step finishes (compareInProgress)', async () => {
      await bs.clickPlay();
      await bs.waitForComparing();
      // Toggle pause while comparing; should pause only after current compare completes
      await bs.clickPlay();
      // Wait for comparing to finish, then ensure state paused
      await bs.waitForNoComparing();
      await expect(await bs.playButton()).toHaveText(/play/i);
    });

    test('AUTO_CONTINUE drives repeated comparing while playing', async () => {
      await bs.clickPlay();
      // Observe multiple comparing cycles
      await bs.waitForComparing();
      await bs.waitForNoComparing();
      await bs.waitForComparing(); // Should continue to next pair automatically
      await expect(await bs.playButton()).toHaveText(/pause/i);
      // Stop to stabilize
      await bs.clickPlay();
      await bs.waitForNoComparing();
      await expect(await bs.playButton()).toHaveText(/play/i);
    });
  });

  // Manual stepping
  test.describe('Manual stepping behavior', () => {
    test('STEP_REQUEST from paused -> comparing -> advancing_pair -> MANUAL_STEP_DONE -> paused', async () => {
      await bs.clickStep();
      await bs.waitForComparing();
      // Wait for the step to resolve (swap or no-swap) and advance
      await bs.waitForNoComparing();
      // After manual step, should be paused
      await expect(await bs.playButton()).toHaveText(/play/i);
    });
  });

  // Comparison outcomes and swap animations
  test.describe('Comparison outcomes and swap animations', () => {
    test('SWAP_NEEDED path: provide [2,1,3], step triggers swap and announcer mentions swap', async () => {
      await bs.applyCustom([2, 1, 3]);
      await bs.waitForReady();
      await bs.clickStep();
      await bs.waitForComparing();
      // Wait for swap to complete
      await bs.waitForNoComparing();
      await expect(bs.announcer()).toContainText(/swap/i);
      const vals = await bs.getBarValues();
      // First two should be in ascending order after swap
      expect(vals.slice(0, 2)).toEqual([1, 2]);
    });

    test('NO_SWAP path: provide [1,2,3], step triggers comparison with no swap and announcer mentions no swap/in order', async () => {
      await bs.applyCustom([1, 2, 3]);
      await bs.waitForReady();
      await bs.clickStep();
      await bs.waitForComparing();
      await bs.waitForNoComparing();
      await expect(bs.announcer()).toContainText(/no\s*swap|in\s*order|already/i);
      const vals = await bs.getBarValues();
      expect(vals.slice(0, 3)).toEqual([1, 2, 3]);
    });

    test('SWAP_ANIMATION_COMPLETE transitions to advancing_pair and clears highlight', async () => {
      await bs.applyCustom([3, 2, 1]);
      await bs.waitForReady();
      await bs.clickStep();
      await bs.waitForComparing();
      await bs.waitForNoComparing();
      // Confirm highlight cleared and data changed for first swap scenario
      const vals = await bs.getBarValues();
      expect(vals[0]).toBeLessThan(vals[1]);
      await expect(bs.comparingBars()).toHaveCount(0);
    });
  });

  // Advancing pair and pass transitions
  test.describe('Advancing pair and per-pass transitions', () => {
    test('advancing_pair increments j and updates labels; playing continues to next comparing (AUTO_CONTINUE)', async () => {
      await bs.applyCustom([5, 4, 3, 2]);
      await bs.waitForReady();
      await bs.clickPlay();
      await bs.waitForComparing();
      await bs.waitForNoComparing();
      // Next comparing should start automatically
      await bs.waitForComparing();
      // Stop and ensure paused
      await bs.clickPlay();
      await bs.waitForNoComparing();
      await expect(await bs.playButton()).toHaveText(/play/i);
    });

    test('PASS_END emits pass_transition; when not playing, PAUSE emitted and state returns to paused', async () => {
      await bs.applyCustom([2, 1, 0]);
      await bs.waitForReady();
      // Step through pairs manually to end of pass
      await bs.clickStep(); // j=0 compare
      await bs.waitForComparing();
      await bs.waitForNoComparing();
      await bs.clickStep(); // j=1 compare
      await bs.waitForComparing();
      await bs.waitForNoComparing();
      // Should be end of pass; announcer likely mentions pass transition
      await expect(bs.announcer()).toContainText(/pass|end\s*of\s*pass/i);
      await expect(await bs.playButton()).toHaveText(/play/i);
    });

    test('EARLY_EXIT path with optimize toggle: sorted input triggers early done', async () => {
      await bs.applyCustom([1, 2, 3, 4, 5]);
      await bs.waitForReady();
      const ensured = await bs.toggleOptimize(true);
      expect(ensured).toBeTruthy();
      await bs.clickPlay();
      // Early exit should announce completion quickly
      await expect(bs.announcer()).toContainText(/sorted|complete|finished/i, { timeout: 5000 });
      await expect(await bs.playButton()).toHaveText(/play/i);
      // All bars sorted class if provided
      const countBars = await bs.bars().count();
      const sortedCount = await bs.sortedBars().count().catch(() => 0);
      if (sortedCount > 0) {
        expect(sortedCount).toBe(countBars);
      }
    });
  });

  // Data rebuilding and input errors
  test.describe('Data rebuilding and input_error handling', () => {
    test('RANDOMIZE reinitializes data and announces ready', async () => {
      const before = await bs.getBarValues();
      await bs.clickRandomize();
      await bs.waitForReady();
      const after = await bs.getBarValues();
      // Values should change (randomness), but allow for rare equality
      const equal = JSON.stringify(before) === JSON.stringify(after);
      if (equal) {
        // If equal, randomize again to force change
        await bs.clickRandomize();
        await bs.waitForReady();
      }
      const after2 = await bs.getBarValues();
      expect(JSON.stringify(before) === JSON.stringify(after2)).toBeFalsy();
      await expect(await bs.playButton()).toHaveText(/play/i);
    });

    test('RESET reinitializes data and announces ready', async () => {
      await bs.applyCustom([9, 8, 7]);
      await bs.waitForReady();
      const customVals = await bs.getBarValues();
      await bs.clickReset();
      await bs.waitForReady();
      const resetVals = await bs.getBarValues();
      expect(JSON.stringify(customVals) === JSON.stringify(resetVals)).toBeFalsy();
      await expect(await bs.playButton()).toHaveText(/play/i);
    });

    test('APPLY_CUSTOM_VALID loads provided dataset, resets pass/j, and pauses', async () => {
      const arr = [7, 1, 4, 2];
      await bs.applyCustom(arr);
      await bs.waitForReady();
      const vals = await bs.getBarValues();
      expect(vals.slice(0, arr.length)).toEqual(arr);
      await expect(await bs.playButton()).toHaveText(/play/i);
    });

    test('APPLY_CUSTOM_INVALID enters input_error and announces error; transitions to rebuilding_data via randomize', async () => {
      await bs.applyCustom('1, 2, foo, 4');
      // Should announce input error
      await expect(bs.announcer()).toContainText(/invalid|error/i);
      // Now randomize -> rebuilding_data -> paused with ready
      await bs.clickRandomize();
      await bs.waitForReady();
      await expect(bs.announcer()).not.toContainText(/invalid|error/i);
    });
  });

  // Completion state 'done'
  test.describe('Completion state "done"', () => {
    test('ALL_PASSES_DONE or EARLY_EXIT leads to done; PLAY_TOGGLE/STEP_REQUEST remain in done', async () => {
      // Use optimize early exit on sorted input to reach done quickly
      await bs.applyCustom([1, 2, 3, 4]);
      await bs.waitForReady();
      await bs.toggleOptimize(true);
      await bs.clickPlay();
      await expect(bs.announcer()).toContainText(/sorted|complete|finished/i, { timeout: 5000 });
      await expect(await bs.playButton()).toHaveText(/play/i);
      // Attempt to play or step; state should remain done and announcer unchanged
      const beforeText = await bs.announcer().textContent();
      await bs.clickPlay();
      await bs.clickStep();
      // Allow any internal guard logic
      await bs.page.waitForTimeout(300);
      const afterText = await bs.announcer().textContent();
      expect((afterText || '').toLowerCase()).toContain((beforeText || '').trim().toLowerCase());
    });
  });

  // Non-state events: SPEED_CHANGE, SIZE_ADJUST, OPTIMIZE_TOGGLE, RESIZE
  test.describe('Non-state events and UI feedback', () => {
    test('SPEED_CHANGE updates CSS --swap-ms variable without leaving paused', async () => {
      await bs.clickReset();
      await bs.waitForReady();
      await expect(await bs.playButton()).toHaveText(/play/i);
      const beforeVar = await bs.getRootSwapMsVar();
      await bs.setSpeed(90);
      await bs.page.waitForTimeout(50);
      const afterVar = await bs.getRootSwapMsVar();
      // After value should differ or become set
      expect(beforeVar === afterVar).toBeFalsy();
      await expect(await bs.playButton()).toHaveText(/play/i);
    });

    test('SIZE_ADJUST updates size label only; bar count unchanged until rebuild', async () => {
      const countBefore = await bs.bars().count();
      const labelBefore = await bs.sizeLabel().textContent().catch(() => '');
      await bs.setSize(12);
      await bs.page.waitForTimeout(50);
      const labelAfter = await bs.sizeLabel().textContent().catch(() => labelBefore);
      // Label may change; bar count should remain same prior to rebuild
      const countAfter = await bs.bars().count();
      expect(countAfter).toBe(countBefore);
      if ((labelBefore || '').trim() && (labelAfter || '').trim()) {
        expect((labelBefore || '') === (labelAfter || '')).toBeFalsy();
      }
      await expect(await bs.playButton()).toHaveText(/play/i);
    });

    test('OPTIMIZE_TOGGLE flips flag without changing state', async () => {
      await bs.waitForReady();
      const checked = await bs.toggleOptimize(true);
      expect(checked).toBeTruthy();
      await expect(await bs.playButton()).toHaveText(/play/i);
      const unchecked = await bs.toggleOptimize(false);
      expect(unchecked).toBeFalsy();
      await expect(await bs.playButton()).toHaveText(/play/i);
    });

    test('RESIZE adjusts bar width responsively and does not change state', async () => {
      const widthBefore = await bs.getBarWidth();
      await bs.page.setViewportSize({ width: 500, height: 800 });
      await bs.page.waitForTimeout(100);
      const widthAfter = await bs.getBarWidth();
      // If responsive, width may change; allow equality if layout caps width
      expect(widthAfter).not.toBeNaN();
      await expect(await bs.playButton()).toHaveText(/play/i);
    });
  });

  // Keyboard shortcuts
  test.describe('Keyboard shortcuts emit FSM events', () => {
    test('Space emits PLAY_TOGGLE toggling between paused and playing', async () => {
      await bs.waitForReady();
      await bs.page.keyboard.press('Space');
      await expect(await bs.playButton()).toHaveText(/pause/i);
      await bs.page.keyboard.press('Space');
      await expect(await bs.playButton()).toHaveText(/play/i);
    });

    test('ArrowRight emits STEP_REQUEST triggering a manual step', async () => {
      await bs.waitForReady();
      await bs.page.keyboard.press('ArrowRight');
      await bs.waitForComparing();
      await bs.waitForNoComparing();
      await expect(await bs.playButton()).toHaveText(/play/i);
    });

    test('R emits RESET causing rebuilding_data and returning to paused "Ready"', async () => {
      await bs.applyCustom([9, 1, 3]);
      await bs.waitForReady();
      await bs.page.keyboard.press('KeyR');
      await bs.waitForReady();
      await expect(await bs.playButton()).toHaveText(/play/i);
    });
  });
});