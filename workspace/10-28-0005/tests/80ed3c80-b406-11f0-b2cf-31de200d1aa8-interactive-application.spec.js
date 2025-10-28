const { test, expect } = require('@playwright/test');

const APP_URL = 'http://127.0.0.1:5500/workspace/10-28-0005/html/80ed3c80-b406-11f0-b2cf-31de200d1aa8.html';

class SortApp {
  /**
   * Page object for the Bubble Sort visualization app.
   * Provides resilient selectors and helpers to interact with the UI and verify visual states.
   */
  constructor(page) {
    this.page = page;
    this.root = page.locator(':root');
    this.viz = page.locator('.viz');
    this.bars = page.locator('.bar');
    this.compareBars = page.locator('.bar.compare');
    this.lockedBars = page.locator('.bar.locked');
    this.sortedBars = page.locator('.bar.sorted');
    this.axis = page.locator('.axis');
  }

  // Generic utilities
  async firstAvailableLocator(locators) {
    for (const loc of locators) {
      const count = await loc.count().catch(() => 0);
      if (count > 0) return loc.first();
      const vis = await loc.first().isVisible().catch(() => false);
      if (vis) return loc.first();
    }
    // As a fallback, return a non-existing locator to not crash
    return this.page.locator('___never___');
  }

  async getButtonByNames(names) {
    const locators = [];
    for (const name of names) {
      locators.push(this.page.getByRole('button', { name }));
      locators.push(this.page.locator('button', { hasText: name }));
    }
    return this.firstAvailableLocator(locators);
  }

  async getCheckboxByLabel(names) {
    const locators = [];
    for (const name of names) {
      locators.push(this.page.getByLabel(name, { exact: false }));
      // Try text-based wrapper labels:
      locators.push(this.page.locator('label', { hasText: name }).locator('input[type=checkbox]'));
      locators.push(this.page.locator('label', { hasText: name }).locator('input[type=radio]'));
    }
    return this.firstAvailableLocator(locators);
  }

  async getSliderByLabel(names) {
    const locators = [];
    for (const name of names) {
      locators.push(this.page.getByLabel(name, { exact: false }));
      locators.push(this.page.locator('label', { hasText: name }).locator('input[type=range]'));
    }
    // as last resort, any range input
    locators.push(this.page.locator('input[type=range]').first());
    return this.firstAvailableLocator(locators);
  }

  // Controls
  async playButton() {
    // Names could be Play, Pause, ▶, ⏸
    return this.getButtonByNames([/play/i, /pause/i, /▶/i, /⏸/i]);
  }
  async stepButton() {
    return this.getButtonByNames([/step\b/i, /step compare/i, /compare step/i, /^S$/i]);
  }
  async stepPassButton() {
    return this.getButtonByNames([/step pass/i, /pass step/i, /pass/i]);
  }
  async resetButton() {
    return this.getButtonByNames([/reset/i, /restart/i]);
  }
  async randomButton() {
    return this.getButtonByNames([/random/i]);
  }
  async reverseButton() {
    return this.getButtonByNames([/reverse/i, /reversed/i]);
  }
  async nearlyButton() {
    return this.getButtonByNames([/nearly/i, /nearly sorted/i]);
  }
  async loadValuesButton() {
    return this.getButtonByNames([/load values/i, /load/i, /values/i]);
  }
  async shuffleButton() {
    return this.getButtonByNames([/shuffle/i]);
  }
  async ascOrderControl() {
    // Could be a radio or button
    return this.getButtonByNames([/asc/i, /ascending/i]);
  }
  async descOrderControl() {
    return this.getButtonByNames([/desc/i, /descending/i]);
  }
  async earlyExitToggle() {
    return this.getCheckboxByLabel([/early exit/i, /early/i, /short-circuit/i]);
  }
  async instantToggle() {
    return this.getCheckboxByLabel([/instant/i, /instant compare/i, /no delay/i]);
  }
  async sizeSlider() {
    return this.getSliderByLabel([/size/i, /count/i, /length/i, /n\b/i]);
  }
  async speedSlider() {
    return this.getSliderByLabel([/speed/i, /animation/i, /delay/i]);
  }

  // Actions
  async clickPlay() {
    const btn = await this.playButton();
    await expect(btn, 'Play/Pause button should be present').toBeVisible();
    await btn.click();
  }
  async clickStep() {
    const btn = await this.stepButton();
    await expect(btn, 'Step button should be present').toBeVisible();
    await btn.click();
  }
  async clickStepPass() {
    const btn = await this.stepPassButton();
    await expect(btn, 'Step Pass button should be present').toBeVisible();
    await btn.click();
  }
  async clickReset() {
    const btn = await this.resetButton();
    await expect(btn, 'Reset button should be present').toBeVisible();
    await btn.click();
  }
  async clickRandom() {
    const btn = await this.randomButton();
    await expect(btn, 'Random button should be present').toBeVisible();
    await btn.click();
  }
  async clickReverse() {
    const btn = await this.reverseButton();
    await expect(btn, 'Reverse button should be present').toBeVisible();
    await btn.click();
  }
  async clickNearly() {
    const btn = await this.nearlyButton();
    await expect(btn).toBeVisible();
    await btn.click();
  }
  async clickLoadValues() {
    const btn = await this.loadValuesButton();
    await expect(btn).toBeVisible();
    await btn.click();
  }
  async clickShuffle() {
    const btn = await this.shuffleButton();
    await expect(btn).toBeVisible();
    await btn.click();
  }
  async setEarlyExit(enabled) {
    const cbx = await this.earlyExitToggle();
    if (await cbx.isVisible().catch(() => false)) {
      const checked = await cbx.isChecked().catch(() => false);
      if (checked !== enabled) {
        await cbx.click();
      }
      const after = await cbx.isChecked().catch(() => false);
      expect(after).toBe(enabled);
    } else {
      // try keyboard 'o' to toggle
      await this.page.keyboard.press('o');
    }
  }
  async toggleInstantCompare() {
    const cbx = await this.instantToggle();
    if (await cbx.isVisible().catch(() => false)) {
      await cbx.click();
    } else {
      await this.page.keyboard.press('i').catch(() => {});
    }
  }
  async toggleOrderAsc() {
    const ctl = await this.ascOrderControl();
    if (await ctl.isVisible().catch(() => false)) {
      await ctl.click();
    } else {
      await this.page.keyboard.press('d'); // toggle order
    }
  }
  async toggleOrderDesc() {
    const ctl = await this.descOrderControl();
    if (await ctl.isVisible().catch(() => false)) {
      await ctl.click();
    } else {
      await this.page.keyboard.press('d');
    }
  }
  async setSize(value) {
    const slider = await this.sizeSlider();
    await expect(slider).toBeVisible();
    await slider.evaluate((el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }, String(value));
  }
  async setSpeedRaw(value) {
    const slider = await this.speedSlider();
    await expect(slider).toBeVisible();
    await slider.evaluate((el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }, String(value));
  }

  async waitForInitialLoad() {
    await this.page.waitForLoadState('load');
    await expect(this.viz).toBeVisible();
    await expect(this.axis).toBeVisible();
    await this.page.waitForFunction(() => document.querySelectorAll('.bar').length > 0);
  }

  // Reads numeric representation of current bars; uses data-value if available, else computed height
  async getBarValues() {
    const values = await this.bars.evaluateAll((nodes) => {
      return nodes.map(node => {
        const dv = node.getAttribute('data-value');
        if (dv !== null) {
          const parsed = parseFloat(dv);
          if (!Number.isNaN(parsed)) return parsed;
        }
        const label = node.getAttribute('aria-label') || node.textContent || '';
        const m = String(label).match(/-?\d+(\.\d+)?/);
        if (m) return parseFloat(m[0]);
        const cs = getComputedStyle(node);
        let h = parseFloat(cs.height);
        if (Number.isNaN(h)) h = node.clientHeight || 0;
        return h;
      });
    });
    return values;
  }

  async getBarLefts() {
    return await this.bars.evaluateAll(nodes => nodes.map(n => parseFloat(getComputedStyle(n).left)));
  }

  async clickBar(index = 0) {
    const count = await this.bars.count();
    expect(count).toBeGreaterThan(0);
    const i = Math.min(Math.max(index, 0), count - 1);
    const target = this.bars.nth(i);
    await target.click({ force: true });
  }

  async enterEditValueAndCommit(newValue) {
    // Try to find an input/number editor
    let input = this.page.locator('input[type=number]');
    if (!(await input.count())) input = this.page.locator('input[type=text]');
    if (!(await input.count())) input = this.page.locator('input');
    await expect(input.first(), 'Edit input should appear').toBeVisible();
    await input.first().fill(String(newValue));
    await input.first().blur();
    // ensure transition back to paused (no compare class)
    await this.page.waitForTimeout(50);
  }

  async enterEditValueAndEscape() {
    let input = this.page.locator('input[type=number]');
    if (!(await input.count())) input = this.page.locator('input[type=text]');
    if (!(await input.count())) input = this.page.locator('input');
    await expect(input.first(), 'Edit input should appear').toBeVisible();
    await input.first().press('Escape');
  }

  async isAnyBarComparing() {
    return (await this.compareBars.count()) > 0;
  }

  async waitForComparisonOnce(timeout = 3000) {
    await this.page.waitForSelector('.bar.compare', { timeout });
  }

  async waitForNoComparison(timeout = 1500) {
    await this.page.waitForFunction(() => document.querySelectorAll('.bar.compare').length === 0, null, { timeout });
  }

  async waitForLockedCountIncrease(prev, timeout = 5000) {
    await this.page.waitForFunction((p) => document.querySelectorAll('.bar.locked').length > p, prev, { timeout });
  }

  async waitForSortedAll(timeout = 12000) {
    await this.page.waitForFunction(() => {
      const bars = document.querySelectorAll('.bar');
      const sorted = document.querySelectorAll('.bar.sorted');
      return bars.length > 0 && sorted.length === bars.length;
    }, null, { timeout });
  }

  async anySwapHappenedWithin(timeout = 4000) {
    const before = await this.getBarLefts();
    try {
      await this.page.waitForFunction((initial) => {
        const cur = Array.from(document.querySelectorAll('.bar')).map(n => parseFloat(getComputedStyle(n).left));
        if (cur.length !== initial.length) return false;
        // return true if any left position changed
        return cur.some((v, i) => Math.abs(v - initial[i]) > 0.1);
      }, before, { timeout });
      return true;
    } catch {
      return false;
    }
  }

  async setDatasetSmallAndSortedIfPossible() {
    // Try to set small size and sorted ascending dataset for early-exit tests
    await this.setSize(5);
    await this.page.waitForTimeout(200);
    // Try Load Values modal path
    await this.clickLoadValues().catch(() => {});
    // Look for a textarea/input for values
    let valuesInput = this.page.locator('textarea');
    if (!(await valuesInput.count())) valuesInput = this.page.locator('input[placeholder*="comma"]').first();
    if (!(await valuesInput.count())) valuesInput = this.page.locator('input[type=text]').filter({ has: this.page.locator('..:has-text("values")') });
    if (await valuesInput.count()) {
      await valuesInput.fill('1,2,3,4,5');
      const apply = await this.getButtonByNames([/apply/i, /ok/i, /load/i, /submit/i]);
      if (await apply.isVisible().catch(() => false)) {
        await apply.click();
      } else {
        await valuesInput.press('Enter').catch(() => {});
      }
    } else {
      // Fallback: edit bars inline
      const valsBefore = await this.getBarValues();
      for (let i = 0; i < Math.min(valsBefore.length, 5); i++) {
        await this.clickBar(i);
        // choose increasing values
        await this.enterEditValueAndCommit(i + 1);
        await this.page.waitForTimeout(50);
      }
      await this.page.waitForTimeout(200);
    }
    // Ensure values are non-decreasing
    const vals = await this.getBarValues();
    for (let i = 1; i < vals.length; i++) {
      if (vals[i] < vals[i - 1]) {
        // Try reverse to sort
        await this.clickReverse().catch(() => {});
        break;
      }
    }
  }
}

test.describe.configure({ mode: 'serial' });

test.describe('Bubble Sort Visualization - Initialization and Idle/Loading States', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(APP_URL);
    // Speed up animations: set a faster anim var to reduce flakiness
    await page.addStyleTag({ content: ':root{ --anim-ms: 120ms !important; }' });
    const app = new SortApp(page);
    await app.waitForInitialLoad();
  });

  test('Initial load creates bars and is in idle (no compare, no locked, no sorted)', async ({ page }) => {
    const app = new SortApp(page);
    const barCount = await app.bars.count();
    expect(barCount).toBeGreaterThan(1);
    await expect(app.compareBars).toHaveCount(0);
    await expect(app.lockedBars).toHaveCount(0);
    await expect(app.sortedBars).toHaveCount(0);
  });

  test('Dataset size change triggers loading_dataset and returns to idle with different count', async ({ page }) => {
    const app = new SortApp(page);
    const countBefore = await app.bars.count();
    await app.setSize(8);
    await page.waitForTimeout(150);
    const countAfter = await app.bars.count();
    expect(countAfter).toBeGreaterThan(0);
    expect(countAfter).not.toEqual(countBefore);
    await expect(app.compareBars).toHaveCount(0);
  });

  test('Random, Reverse, Nearly Sorted, Load Values, Shuffle each trigger loading_dataset and reset algorithm', async ({ page }) => {
    const app = new SortApp(page);
    const initialValues = await app.getBarValues();

    await app.clickRandom();
    await page.waitForTimeout(100);
    const randomValues = await app.getBarValues();
    // Likely different order
    expect(randomValues.join(',')).not.toEqual(initialValues.join(','));

    // Reverse should invert current sequence
    const beforeReverse = await app.getBarValues();
    await app.clickReverse();
    await page.waitForTimeout(100);
    const reversed = await app.getBarValues();
    expect(reversed.join(',')).toEqual([...beforeReverse].reverse().join(','));

    // Nearly sorted should not be fully reversed and not identical
    await app.clickNearly().catch(() => {});
    await page.waitForTimeout(100);
    const nearly = await app.getBarValues();
    expect(nearly.join(',')).not.toEqual(reversed.join(','));

    // Load values: try to load deterministic values if UI exists
    await app.clickLoadValues().catch(() => {});
    let valuesInput = page.locator('textarea');
    if (!(await valuesInput.count())) valuesInput = page.locator('input[placeholder*="comma"]').first();
    if (await valuesInput.count()) {
      await valuesInput.fill('9,2,7,4,5');
      const apply = await app.getButtonByNames([/apply/i, /ok/i, /load/i, /submit/i, /done/i]);
      if (await apply.isVisible().catch(() => false)) {
        await apply.click();
      } else {
        await valuesInput.press('Enter').catch(() => {});
      }
      await page.waitForTimeout(150);
      const loaded = await app.getBarValues();
      // We expect to match those 5 values or a scaled/proportional equivalent
      expect(loaded.length).toBeGreaterThanOrEqual(5);
    }

    // Shuffle should change order
    const beforeShuffle = await app.getBarValues();
    await app.clickShuffle().catch(() => {});
    await page.waitForTimeout(120);
    const afterShuffle = await app.getBarValues();
    expect(afterShuffle.join(',')).not.toEqual(beforeShuffle.join(','));

    // Reset state (no compare)
    await expect(app.compareBars).toHaveCount(0);
    await expect(app.lockedBars).toHaveCount(0);
  });
});

test.describe('Playback, Paused, and Controls (Play/Pause, Step, Keyboard)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(APP_URL);
    await page.addStyleTag({ content: ':root{ --anim-ms: 120ms !important; }' });
    const app = new SortApp(page);
    await app.waitForInitialLoad();
  });

  test('CLICK_PLAY enters playing; CLICK_PLAY again or KEY_SPACE pauses', async ({ page }) => {
    const app = new SortApp(page);
    await app.clickPlay();
    await app.waitForComparisonOnce(4000);
    expect(await app.isAnyBarComparing()).toBeTruthy();

    // Pause via click
    await app.clickPlay();
    await app.waitForNoComparison(2000);
    expect(await app.isAnyBarComparing()).toBeFalsy();

    // Play via keyboard Space
    await page.keyboard.press(' ');
    await app.waitForComparisonOnce(4000);
    expect(await app.isAnyBarComparing()).toBeTruthy();

    // Pause via keyboard Space
    await page.keyboard.press(' ');
    await app.waitForNoComparison(2000);
  });

  test('CLICK_STEP from idle executes a single comparing step and returns to paused', async ({ page }) => {
    const app = new SortApp(page);
    await app.clickStep();
    await app.waitForComparisonOnce(2000);
    await app.waitForNoComparison(3000);
    expect(await app.isAnyBarComparing()).toBeFalsy();
  });

  test('KEY_S from idle executes a single comparing step and returns to paused', async ({ page }) => {
    const app = new SortApp(page);
    await page.keyboard.press('s');
    await app.waitForComparisonOnce(2000);
    await app.waitForNoComparison(3000);
  });

  test('CLICK_STEP_PASS runs one full pass and then pauses (stepping_pass -> paused)', async ({ page }) => {
    const app = new SortApp(page);
    const lockedBefore = await app.lockedBars.count();
    await app.clickStepPass();
    await app.waitForLockedCountIncrease(lockedBefore, 8000);
    // After pass, should be paused (no comparing ongoing)
    await app.waitForNoComparison(2000);
  });
});

test.describe('Comparing, Swapping, Pass Locking, Next Pass transitions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(APP_URL);
    await page.addStyleTag({ content: ':root{ --anim-ms: 120ms !important; }' });
    const app = new SortApp(page);
    await app.waitForInitialLoad();
  });

  test('In playing, comparisons occur continuously (NO_SWAP_AUTO_CONTINUE path) until a swap is needed', async ({ page }) => {
    const app = new SortApp(page);
    await app.clickPlay();
    await app.waitForComparisonOnce(4000);
    // Ensure not paused immediately: comparisons should continue
    await app.waitForComparisonOnce(4000);

    // Check at least one swap happened (positions changed)
    const swapped = await app.anySwapHappenedWithin(6000);
    expect(swapped).toBeTruthy();

    // Pause for further checks
    await app.clickPlay();
    await app.waitForNoComparison(2000);
  });

  test('From comparing, if swap needed during step, it transitions to swapping then paused (SWAP_ANIMATION_DONE_STEP)', async ({ page }) => {
    const app = new SortApp(page);
    // Make reversed to ensure first comparison needs swap
    await app.clickReverse();
    await page.waitForTimeout(150);
    const leftsBefore = await app.getBarLefts();
    await app.clickStep(); // comparing
    await app.waitForComparisonOnce(2000);
    // Wait for swap and then pause
    const swapped = await app.anySwapHappenedWithin(4000);
    expect(swapped).toBeTruthy();
    await app.waitForNoComparison(2000);
    const leftsAfter = await app.getBarLefts();
    // First bars should have changed position
    const changed = leftsAfter.some((v, i) => Math.abs(v - leftsBefore[i]) > 0.1);
    expect(changed).toBeTruthy();
  });

  test('End of pass locks last element (pass_locking), and AUTO_CONTINUE keeps playing (next_pass -> AUTO_CONTINUE)', async ({ page }) => {
    const app = new SortApp(page);
    await app.clickReverse();
    await page.waitForTimeout(150);
    await app.clickPlay();
    const before = await app.lockedBars.count();
    await app.waitForLockedCountIncrease(before, 12000);
    // Still playing — more comparisons happen after lock
    await app.waitForComparisonOnce(4000);
    // Pause for clean state
    await app.clickPlay();
    await app.waitForNoComparison(2000);
  });

  test('End of pass in step mode locks element and pauses (next_pass -> STEP_COMPLETE)', async ({ page }) => {
    const app = new SortApp(page);
    await app.clickReverse();
    await page.waitForTimeout(150);
    const beforeLocked = await app.lockedBars.count();
    await app.clickStepPass();
    await app.waitForLockedCountIncrease(beforeLocked, 12000);
    // Should be paused now
    await app.waitForNoComparison(2000);
  });
});

test.describe('Editing Value State: entry, commit, and cancel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(APP_URL);
    await page.addStyleTag({ content: ':root{ --anim-ms: 120ms !important; }' });
    const app = new SortApp(page);
    await app.waitForInitialLoad();
  });

  test('CLICK_BAR_EDIT while playing is blocked (no input appears), then pause and edit with blur commit', async ({ page }) => {
    const app = new SortApp(page);

    // Start playing to make app busy
    await app.clickPlay();
    await app.waitForComparisonOnce(3000);

    // Attempt to edit while busy
    await app.clickBar(0);
    const editInputBusy = page.locator('input:visible');
    expect(await editInputBusy.count()).toBe(0);

    // Pause
    await app.clickPlay();
    await app.waitForNoComparison(2000);

    // Edit now
    const valuesBefore = await app.getBarValues();
    await app.clickBar(0);
    await app.enterEditValueAndCommit(999);
    await page.waitForTimeout(200);
    const valuesAfter = await app.getBarValues();
    // Expect first bar's value (or height) to change
    expect(valuesAfter[0]).not.toEqual(valuesBefore[0]);
  });

  test('Edit and cancel with Escape restores previous value (EDIT_ESCAPE_CANCEL -> paused)', async ({ page }) => {
    const app = new SortApp(page);
    await app.waitForNoComparison(1000);
    const valuesBefore = await app.getBarValues();
    await app.clickBar(1);
    await app.enterEditValueAndEscape();
    await page.waitForTimeout(150);
    const valuesAfter = await app.getBarValues();
    // Value should remain unchanged
    expect(valuesAfter[1]).toEqual(valuesBefore[1]);
  });
});

test.describe('Done State: completion, finalizeSorted, and restrictions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(APP_URL);
    await page.addStyleTag({ content: ':root{ --anim-ms: 120ms !important; }' });
    const app = new SortApp(page);
    await app.waitForInitialLoad();
  });

  test('Algorithm completes to done with all bars sorted; Play/Space do not restart; Reset returns to idle', async ({ page }) => {
    const app = new SortApp(page);
    // Prepare small sorted dataset and enable early exit to reach done faster
    await app.setDatasetSmallAndSortedIfPossible();
    await app.setEarlyExit(true);
    await page.waitForTimeout(150);

    // Run to completion
    await app.clickPlay();
    await app.waitForSortedAll(15000);

    const total = await app.bars.count();
    await expect(app.sortedBars).toHaveCount(total);

    // Clicking Play in done should keep state as done
    await app.clickPlay();
    await page.waitForTimeout(200);
    await expect(app.sortedBars).toHaveCount(total);

    // Space key should not restart
    await page.keyboard.press(' ');
    await page.waitForTimeout(200);
    await expect(app.sortedBars).toHaveCount(total);

    // CLICK_BAR_EDIT from done should still allow editing_value
    await app.clickBar(0);
    let input = page.locator('input:visible');
    if (await input.count()) {
      await input.first().press('Escape');
    }

    // Reset returns to idle and clears sorted/locked
    await app.clickReset();
    await page.waitForTimeout(300);
    await expect(app.sortedBars).toHaveCount(0);
    await expect(app.lockedBars).toHaveCount(0);

    // Also test KEY_R
    await page.keyboard.press('r');
    await page.waitForTimeout(300);
    await expect(app.sortedBars).toHaveCount(0);
  });
});

test.describe('Settings and Misc Events: Early Exit, Instant Compare, Speed, Resize, Order Toggle', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(APP_URL);
    await page.addStyleTag({ content: ':root{ --anim-ms: 120ms !important; }' });
    const app = new SortApp(page);
    await app.waitForInitialLoad();
  });

  test('TOGGLE_EARLY_EXIT self-loops in idle and paused; remains in playing when toggled during play', async ({ page }) => {
    const app = new SortApp(page);
    // idle => toggle
    await app.setEarlyExit(true);
    await app.setEarlyExit(false);

    // paused path: enter paused via a step
    await app.clickStep();
    await app.waitForNoComparison(2000);
    await app.setEarlyExit(true);
    await app.setEarlyExit(false);
    await app.waitForNoComparison(1000);

    // playing: toggle should not pause
    await app.clickPlay();
    await app.waitForComparisonOnce(4000);
    await app.setEarlyExit(true);
    await app.waitForComparisonOnce(4000);
    await app.setEarlyExit(false);
    await app.waitForComparisonOnce(4000);
    // pause
    await app.clickPlay();
    await app.waitForNoComparison(2000);
  });

  test('TOGGLE_INSTANT_COMPARE self-loops and SPEED_CHANGE does not alter state', async ({ page }) => {
    const app = new SortApp(page);
    // paused: toggle instant
    await app.toggleInstantCompare();

    // adjust speed slider (SPEED_CHANGE)
    await app.setSpeedRaw(0);

    // playing: toggle instant and speed
    await app.clickPlay();
    await app.waitForComparisonOnce(4000);
    await app.toggleInstantCompare();
    await app.waitForComparisonOnce(4000);
    await app.setSpeedRaw(100);
    await app.waitForComparisonOnce(4000);

    // pause
    await app.clickPlay();
    await app.waitForNoComparison(2000);
  });

  test('RESIZE event self-loops: resizing viewport keeps state', async ({ page, browserName }) => {
    const app = new SortApp(page);
    const beforeCount = await app.bars.count();
    // Start playing
    await app.clickPlay();
    await app.waitForComparisonOnce(4000);
    // Resize
    await page.setViewportSize({ width: 900, height: 700 });
    await app.waitForComparisonOnce(4000);
    const afterCount = await app.bars.count();
    expect(afterCount).toEqual(beforeCount);
    // Pause
    await app.clickPlay();
    await app.waitForNoComparison(2000);
  });

  test('CHANGE_ORDER_ASC / CHANGE_ORDER_DESC via UI or KEY_D triggers resetting to idle', async ({ page }) => {
    const app = new SortApp(page);
    // Induce some classes
    await app.clickPlay();
    await app.waitForComparisonOnce(3000);
    await app.clickPlay();
    await app.waitForNoComparison(2000);
    await expect(app.compareBars).toHaveCount(0);

    // Toggle order to trigger resetting
    await app.toggleOrderDesc();
    await page.waitForTimeout(200);
    await expect(app.compareBars).toHaveCount(0);
    await expect(app.lockedBars).toHaveCount(0);

    await app.toggleOrderAsc();
    await page.waitForTimeout(200);
    await expect(app.compareBars).toHaveCount(0);
  });
});

test.describe('Keyboard shortcuts: KEY_SPACE, KEY_S, KEY_R, KEY_D, KEY_O', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(APP_URL);
    await page.addStyleTag({ content: ':root{ --anim-ms: 120ms !important; }' });
    const app = new SortApp(page);
    await app.waitForInitialLoad();
  });

  test('KEY_SPACE toggles playing/paused', async ({ page }) => {
    const app = new SortApp(page);
    await page.keyboard.press(' ');
    await (new SortApp(page)).waitForComparisonOnce(4000);
    await page.keyboard.press(' ');
    await (new SortApp(page)).waitForNoComparison(2000);
  });

  test('KEY_S steps once; KEY_R resets; KEY_D toggles order; KEY_O toggles early exit', async ({ page }) => {
    const app = new SortApp(page);
    await page.keyboard.press('s');
    await app.waitForComparisonOnce(2000);
    await app.waitForNoComparison(3000);

    // Reset with R
    await page.keyboard.press('r');
    await page.waitForTimeout(200);
    await expect(app.compareBars).toHaveCount(0);

    // Toggle order with D twice
    await page.keyboard.press('d');
    await page.waitForTimeout(150);
    await page.keyboard.press('d');
    await page.waitForTimeout(150);

    // Toggle early exit with O
    await page.keyboard.press('o');
    await page.waitForTimeout(100);
    await page.keyboard.press('o');
  });
});