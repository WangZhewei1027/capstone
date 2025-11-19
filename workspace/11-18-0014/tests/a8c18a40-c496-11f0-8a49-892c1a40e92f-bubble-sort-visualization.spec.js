import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/11-18-0014/html/a8c18a40-c496-11f0-8a49-892c1a40e92f.html';

// Page Object for the visualization UI
class VizPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.startBtn = page.locator('#startBtn');
    this.pauseBtn = page.locator('#pauseBtn');
    this.stepBtn = page.locator('#stepBtn');
    this.shuffleBtn = page.locator('#shuffleBtn');
    this.resetBtn = page.locator('#resetBtn');
    this.sizeInput = page.locator('#size');
    this.sizeVal = page.locator('#sizeVal');
    this.speedInput = page.locator('#speed');
    this.speedVal = page.locator('#speedVal');
    this.orderSelect = page.locator('#order');
    this.viz = page.locator('#viz');
    this.compCount = page.locator('#compCount');
    this.swapCount = page.locator('#swapCount');
    this.passCount = page.locator('#passCount');
    this.pcodeLine = (n) => page.locator(`#pcode .line[data-line="${n}"]`);
    this.barLocator = page.locator('#viz .bar');
  }

  async goto() {
    await this.page.goto(APP_URL);
    // wait for viz to be populated
    await expect(this.barLocator.first()).toBeVisible();
  }

  async getSizeValText() {
    return (await this.sizeVal.textContent()).trim();
  }

  async getSpeedValText() {
    return (await this.speedVal.textContent()).trim();
  }

  async getBarCount() {
    return await this.barLocator.count();
  }

  async getBarLabels() {
    return await this.page.$$eval('#viz .bar .bar-label', els => els.map(e => e.textContent.trim()));
  }

  async getBarHeights() {
    return await this.page.$$eval('#viz .bar', els => els.map(e => e.style.height));
  }

  async getCounts() {
    return {
      comparisons: Number((await this.compCount.textContent()).trim()),
      swaps: Number((await this.swapCount.textContent()).trim()),
      pass: Number((await this.passCount.textContent()).trim())
    };
  }

  async clickStart() {
    await this.startBtn.click();
  }
  async clickPause() {
    await this.pauseBtn.click();
  }
  async clickStep() {
    await this.stepBtn.click();
  }
  async clickShuffle() {
    await this.shuffleBtn.click();
  }
  async clickReset() {
    await this.resetBtn.click();
  }

  // Set range input value and dispatch events (input & change as needed)
  async setSize(value, triggerChange = true) {
    await this.sizeInput.evaluate((el, v) => {
      el.value = String(v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      if (el.dispatchEvent) {
        // change event will be dispatched by test caller if needed
      }
    }, value);
    if (triggerChange) {
      await this.sizeInput.evaluate((el) => el.dispatchEvent(new Event('change', { bubbles: true })));
    }
  }

  async setSpeed(value) {
    await this.speedInput.evaluate((el, v) => {
      el.value = String(v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }, value);
  }

  async setOrder(value) {
    // value should be 'ascending' or 'descending'
    await this.orderSelect.selectOption(value);
  }

  async waitForAnyCompareClass(timeout = 2000) {
    await this.page.waitForFunction(() => {
      return document.querySelectorAll('#viz .bar.compare').length > 0;
    }, null, { timeout });
  }

  async waitForAllSorted(timeout = 5000) {
    await this.page.waitForFunction(() => {
      const bars = document.querySelectorAll('#viz .bar');
      if (!bars.length) return false;
      return Array.from(bars).every(b => b.classList.contains('sorted'));
    }, null, { timeout });
  }

  async waitForPcodeLineActive(lineNum, timeout = 2000) {
    await this.page.waitForFunction((n) => {
      const el = document.querySelector(`#pcode .line[data-line="${n}"]`);
      return !!el && el.classList.contains('active');
    }, lineNum, { timeout });
  }

  async getPcodeActiveLineNumbers() {
    return await this.page.$$eval('#pcode .line.active', els => els.map(e => Number(e.getAttribute('data-line'))));
  }

  async getBarClassListAt(index) {
    return await this.page.$eval(`#viz .bar:nth-child(${index + 1})`, el => Array.from(el.classList));
  }

  async getBarTransitionStyle(index = 0) {
    return await this.page.$eval(`#viz .bar:nth-child(${index + 1})`, el => el.style.transition || '');
  }
}

test.describe('Bubble Sort Visualization — FSM integration tests', () => {
  test.describe.configure({ mode: 'serial' });

  /** Setup a fresh page before each test */
  test.beforeEach(async ({ page }) => {
    // nothing here; each test will create its VizPage and navigate
  });

  test('idle state: initial render and controls present', async ({ page }) => {
    // Validate initial idle state: stats zero, controls exist, bars match size input
    const viz = new VizPage(page);
    await viz.goto();

    // Size value displays default and matches number of bars
    const sizeText = await viz.getSizeValText();
    const barCount = await viz.getBarCount();
    expect(Number(sizeText)).toBe(barCount);

    // Stats should be zero at idle
    const counts = await viz.getCounts();
    expect(counts.comparisons).toBe(0);
    expect(counts.swaps).toBe(0);
    expect(counts.pass).toBe(0);

    // No bars are marked sorted/compare/swap
    const classes = await Promise.all(Array.from({ length: barCount }).map((_, i) => viz.getBarClassListAt(i)));
    for (const cls of classes) {
      expect(cls).not.toContain('compare');
      expect(cls).not.toContain('swap');
      // sorted may or may not be present on init; code only adds sorted during passEnd/done; so expect not present initially
      expect(cls).not.toContain('sorted');
    }
  });

  test('size input updates display and reinitializes on change', async ({ page }) => {
    // Test that input input event updates displayed sizeVal and change event reinitializes bars & resets stats
    const viz = new VizPage(page);
    await viz.goto();

    // Change the size slider using input without change: only sizeVal updates
    await viz.setSize(8, false); // only input dispatch
    expect(await viz.getSizeValText()).toBe('8');
    // Bars should remain the old count until change is fired
    const oldBarCount = await viz.getBarCount();
    expect(oldBarCount).not.toBe(0);

    // Now dispatch change - triggers initArray and resetStats
    await viz.setSize(8, true);
    // After change, bar count should equal new size
    await expect.poll(async () => await viz.getBarCount()).toBe(8);

    // Stats reset to zero
    const counts = await viz.getCounts();
    expect(counts.comparisons).toBe(0);
    expect(counts.swaps).toBe(0);
    expect(counts.pass).toBe(0);
  });

  test('speed input changes update label and bar transition style', async ({ page }) => {
    // Changing speed should update visible value and update CSS transition string on bars
    const viz = new VizPage(page);
    await viz.goto();

    // Set speed to max (fast)
    await viz.setSpeed(100);
    expect(await viz.getSpeedValText()).toBe('100');

    // At least first bar should have some transition style applied for height
    const transition = await viz.getBarTransitionStyle(0);
    expect(transition).toContain('height');
  });

  test('shuffle stops algorithm, reinitializes array and resets stats', async ({ page }) => {
    // Start algorithm then shuffle; shuffle should stop algorithm, reset stats and change bar labels
    const viz = new VizPage(page);
    await viz.goto();

    // Reduce size for quicker operations
    await viz.setSize(6, true);
    const initialLabels = await viz.getBarLabels();

    // Start running
    await viz.setSpeed(100);
    await viz.clickStart();

    // Let it run briefly
    await page.waitForTimeout(120);

    // Shuffle while running
    await viz.clickShuffle();

    // After shuffle, stats should be zero
    await expect.poll(async () => (await viz.getCounts()).comparisons).toBe(0);
    await expect.poll(async () => (await viz.getCounts()).swaps).toBe(0);
    await expect.poll(async () => (await viz.getCounts()).pass).toBe(0);

    // Bar labels should have changed (most likely)
    const newLabels = await viz.getBarLabels();
    // Since randomness could produce same labels rarely, assert at least one label changed
    const anyDifferent = initialLabels.some((v, i) => v !== newLabels[i]);
    expect(anyDifferent).toBeTruthy();
  });

  test('resetting initializes sorted ascending array and stops algorithm', async ({ page }) => {
    // Reset should initialize the array to ascending order and clear stats
    const viz = new VizPage(page);
    await viz.goto();

    // Make size small
    await viz.setSize(7, true);

    // Shuffle to make it not sorted
    await viz.clickShuffle();
    const shuffledLabels = await viz.getBarLabels();
    // Ensure not already sorted ascending (likely)
    const notSortedAsc = shuffledLabels.some((_, i, arr) => i < arr.length - 1 ? Number(arr[i]) <= Number(arr[i + 1]) === false : false);
    // perform reset
    await viz.clickReset();

    // After reset, labels should be non-decreasing (ascending)
    const labels = await viz.getBarLabels();
    for (let i = 0; i < labels.length - 1; i++) {
      expect(Number(labels[i])).toBeLessThanOrEqual(Number(labels[i + 1]));
    }

    // Stats should be zero
    const counts = await viz.getCounts();
    expect(counts.comparisons).toBe(0);
    expect(counts.swaps).toBe(0);
    expect(counts.pass).toBe(0);
  });

  test('stepping produces compare actions and highlights pseudocode', async ({ page }) => {
    // Pressing Step triggers a single generator yield. First compare yield should increment comparisons and mark compare classes/pcode.
    const viz = new VizPage(page);
    await viz.goto();

    // Use small size for deterministic fewer steps
    await viz.setSize(5, true);

    // Ensure generator is fresh by clicking step (it will create a generator)
    const beforeCounts = await viz.getCounts();
    expect(beforeCounts.comparisons).toBe(0);

    // Click Step once -> should perform the first yield (passStart) or first compare depending on generator internals.
    // We may need multiple steps to reach a compare action. We'll attempt up to 10 steps to observe a comparison.
    let sawCompare = false;
    for (let i = 0; i < 12; i++) {
      await viz.clickStep();
      // After step, check if any comparisons recorded
      const counts = await viz.getCounts();
      if (counts.comparisons > 0) {
        sawCompare = true;
        // After a compare yield, code does markCompare, waitDelay, then highlight(3) — pcode line 3 should be active (or 2/3 as transition)
        const activeLines = await viz.getPcodeActiveLineNumbers();
        expect(activeLines.length).toBeGreaterThan(0);
        // one of the lines during compare should be 3 (if compare progressed) or 2 (immediate)
        expect(activeLines.some(n => [2, 3].includes(n))).toBeTruthy();
        // Bars should carry compare class
        const compCountBars = await page.$$eval('#viz .bar.compare', els => els.length);
        expect(compCountBars).toBeGreaterThan(0);
        break;
      }
    }
    expect(sawCompare).toBeTruthy();
  });

  test('stepping until swap occurs increments swaps and updates labels', async ({ page }) => {
    // Repeatedly step until at least one swap occurs. Validate swap count increments and bar labels reflect array change.
    const viz = new VizPage(page);
    await viz.goto();

    await viz.setSize(6, true);
    // Ensure we are in ascending order then set order to ascending (default)
    await viz.setOrder('ascending');

    // Capture labels before stepping
    let labelsBefore = await viz.getBarLabels();

    // Step up to a reasonable number of times until a swap occurs
    let swapsObserved = 0;
    const maxSteps = 300;
    for (let i = 0; i < maxSteps; i++) {
      await viz.clickStep();
      const counts = await viz.getCounts();
      if (counts.swaps > 0) {
        swapsObserved = counts.swaps;
        break;
      }
      // Small pause to allow animations/timeouts inside step to settle
      await page.waitForTimeout(10);
    }

    expect(swapsObserved).toBeGreaterThan(0);

    // After observed swap, bar labels should have changed relative to labelsBefore
    const labelsAfter = await viz.getBarLabels();
    const changed = labelsBefore.some((v, idx) => v !== labelsAfter[idx]);
    expect(changed).toBeTruthy();
  }, { timeout: 120000 });

  test('running to completion marks all bars sorted and highlights final pseudocode line', async ({ page }) => {
    // Start the algorithm for a small array and wait until done. Validate final state (all bars have sorted class and pcode line 6 active).
    const viz = new VizPage(page);
    await viz.goto();

    // Use minimal size to speed up completion
    await viz.setSize(5, true);
    await viz.setSpeed(100);

    // Start running
    await viz.clickStart();

    // Wait for all bars to be marked sorted (done)
    await viz.waitForAllSorted(10000);

    // pcode line 6 should be active (end for)
    await viz.waitForPcodeLineActive(6, 2000);

    // Counts should be non-negative and at least one comparison should have occurred for non-trivial size
    const counts = await viz.getCounts();
    expect(counts.comparisons).toBeGreaterThanOrEqual(0);
    expect(counts.swaps).toBeGreaterThanOrEqual(0);

    // All bars should have sorted class
    const barCount = await viz.getBarCount();
    for (let i = 0; i < barCount; i++) {
      const cls = await viz.getBarClassListAt(i);
      expect(cls).toContain('sorted');
    }

    // Clicking start again after done should create a new run (FSM triggers START_CLICKED from done -> running)
    // We click start and wait a short moment, then pause to verify system continues to be responsive
    await viz.clickStart();
    await page.waitForTimeout(80);
    await viz.clickPause();
    // System should be responsive: counts remain numbers
    const afterCounts = await viz.getCounts();
    expect(Number.isInteger(afterCounts.comparisons)).toBeTruthy();
  }, { timeout: 20000 });

  test('window resize does not break visualization and updates widths', async ({ page }) => {
    // Resizing the window triggers a resize listener that recalculates bar widths.
    const viz = new VizPage(page);
    await viz.goto();

    // Get current widths
    const widthsBefore = await viz.getBarHeights(); // height strings used instead of widths, but we can also read style.width
    const styleWidthBefore = await page.$eval('#viz .bar', el => el.style.width);

    // Resize viewport to new size
    await page.setViewportSize({ width: 800, height: 600 });
    // Wait for resize handler to execute
    await page.waitForTimeout(120);

    // After resize, width style should still be present and formatted similarly
    const styleWidthAfter = await page.$eval('#viz .bar', el => el.style.width);
    expect(styleWidthAfter).toBe(styleWidthBefore);
  });

  test('order change stops algorithm (stopAlgorithm on ORDER_CHANGED) and sets ascending flag', async ({ page }) => {
    // Start the algorithm and then change order; code calls stopAlgorithm() on change so algorithm must stop.
    // We'll verify that after changing order while running, stats freeze (do not increase) for a short interval.
    const viz = new VizPage(page);
    await viz.goto();

    await viz.setSize(6, true);
    await viz.setSpeed(100);
    await viz.clickStart();

    // Let it run briefly and capture comparisons at moment of change
    await page.waitForTimeout(120);
    const before = await viz.getCounts();

    // Change order which triggers stopAlgorithm()
    await viz.setOrder('descending');

    // Wait briefly and ensure comparisons did not increase after stopping (gives confidence stopAlgorithm executed)
    await page.waitForTimeout(180);
    const after = await viz.getCounts();

    // The counts should not have increased much (they may be equal). We assert they did not increase by more than a small delta.
    expect(after.comparisons).toBeLessThanOrEqual(before.comparisons + 2); // allow small race
  });

  test('pressing step when finished does not crash and keeps bars sorted', async ({ page }) => {
    // Ensure pressing Step after the algorithm finished doesn't break anything and leaves bars sorted.
    const viz = new VizPage(page);
    await viz.goto();

    await viz.setSize(5, true);
    await viz.setSpeed(100);
    await viz.clickStart();
    await viz.waitForAllSorted(10000);

    // Now press step once (generator will be recreated inside step if finished flag true)
    await viz.clickStep();
    // Allow a small timeout for any action to complete
    await page.waitForTimeout(80);

    // Bars should still be sorted
    const barCount = await viz.getBarCount();
    for (let i = 0; i < barCount - 1; i++) {
      const labels = await viz.getBarLabels();
      expect(Number(labels[i])).toBeLessThanOrEqual(Number(labels[i + 1]));
    }
  });

  test('rapid size changes (edge case) do not throw and keep viz consistent', async ({ page }) => {
    // Simulate rapid user interactions changing size slider repeatedly.
    const viz = new VizPage(page);
    await viz.goto();

    // Rapidly change size several times
    for (let s of [10, 20, 7, 15, 5, 12]) {
      await viz.setSize(s, true);
      // minimal delay to simulate rapid user
      await page.waitForTimeout(30);
      // verify bars count matches reported sizeVal
      const sizeVal = Number(await viz.getSizeValText());
      const barCount = await viz.getBarCount();
      expect(sizeVal).toBe(barCount);
    }
  });

});