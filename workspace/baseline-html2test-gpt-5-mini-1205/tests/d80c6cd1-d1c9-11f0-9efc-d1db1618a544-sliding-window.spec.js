import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini-1205/html/d80c6cd1-d1c9-11f0-9efc-d1db1618a544.html';

// Page Object for the Sliding Window app
class SlidingWindowPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    // Controls
    this.algo = page.locator('#algo');
    this.kInput = page.locator('#k');
    this.sInput = page.locator('#s');
    this.arrayInput = page.locator('#arrayInput');
    this.stringInput = page.locator('#stringInput');
    this.resetBtn = page.locator('#reset');
    this.randomBtn = page.locator('#randomize');
    this.stepBtn = page.locator('#step');
    this.playBtn = page.locator('#play');
    this.pauseBtn = page.locator('#pause');
    this.backBtn = page.locator('#back');
    this.speedRange = page.locator('#speed');

    // Panels / displays
    this.vis = page.locator('#vis');
    this.log = page.locator('#log');
    this.statInfo = page.locator('#stat-info');
    this.statSum = page.locator('#stat-sum');
    this.statMax = page.locator('#stat-max');
    this.stepCount = page.locator('#stepCount');
    this.stringBox = page.locator('#stringBox');
    this.paramK = page.locator('#param-k');
    this.paramS = page.locator('#param-s');
  }

  async goto() {
    await this.page.goto(APP_URL, { waitUntil: 'load' });
    // ensure initial script-run completes
    await this.page.waitForLoadState('domcontentloaded');
  }

  // Helpers
  async setAlgo(value) {
    await this.algo.selectOption(value);
  }
  async setK(value) {
    await this.kInput.fill(String(value));
  }
  async setS(value) {
    await this.sInput.fill(String(value));
  }
  async setArray(value) {
    await this.arrayInput.fill(value);
  }
  async setString(value) {
    await this.stringInput.fill(value);
  }

  async clickReset() {
    await this.resetBtn.click();
  }
  async clickRandomize() {
    await this.randomBtn.click();
  }
  async clickStep() {
    await this.stepBtn.click();
  }
  async clickPlay() {
    await this.playBtn.click();
  }
  async clickPause() {
    await this.pauseBtn.click();
  }
  async clickBack() {
    await this.backBtn.click();
  }
  async setSpeed(ms) {
    await this.speedRange.fill(String(ms));
    // trigger change event by blur
    await this.speedRange.evaluate((el) => el.dispatchEvent(new Event('change')));
  }

  // Visual cells
  getCellsLocator() {
    return this.vis.locator('.cell');
  }
  async getCellCount() {
    return await this.getCellsLocator().count();
  }
  async getCellText(index) {
    const c = this.getCellsLocator().nth(index);
    return await c.textContent();
  }
  async cellHasClass(index, className) {
    const c = this.getCellsLocator().nth(index);
    return await c.evaluate((el, cls) => el.classList.contains(cls), className);
  }

  // Log entries
  async getLogEntriesCount() {
    return await this.log.locator('div').count();
  }

  // Stats text
  async getStatInfo() {
    return (await this.statInfo.textContent())?.trim();
  }
  async getStatSum() {
    return (await this.statSum.textContent())?.trim();
  }
  async getStatMax() {
    return (await this.statMax.textContent())?.trim();
  }
  async getStepCountText() {
    return (await this.stepCount.textContent())?.trim();
  }
}

test.describe('Sliding Window Visualizer - end-to-end', () => {
  let consoleErrors = [];
  let pageErrors = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // collect console messages and page errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push({ text: msg.text(), location: msg.location() });
      }
    });
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });
  });

  test.afterEach(async () => {
    // After each test assert there were no runtime page errors or console errors
    // This validates that the application did not produce unexpected exceptions.
    expect(pageErrors, 'no uncaught page errors').toEqual([]);
    expect(consoleErrors, 'no console.error messages').toEqual([]);
  });

  test('Initial load shows default fixed-window state and visuals', async ({ page }) => {
    // Purpose: Verify the initial UI and rendered window for default inputs.
    const app = new SlidingWindowPage(page);
    await app.goto();

    // Default array is "2,1,5,1,3,2" -> 6 items
    expect(await app.getCellCount()).toBe(6);

    // Default k is 3, initial window should be indices 0..2
    // left pointer is index 0, right pointer index 2, window covers 0..2
    const statInfo = await app.getStatInfo();
    expect(statInfo).toContain('Initial window');
    // Sum 2+1+5 = 8 should be shown in statSum
    const sumText = await app.getStatSum();
    expect(sumText).toContain('Sum: 8');

    // Stat max should reflect max sum equal to initial best (8)
    const maxText = await app.getStatMax();
    expect(maxText).toContain('Max sum: 8');

    // Check classes on the cells by reading their index elements
    // cell with idx 0 should have 'left', idx 2 should have 'right'
    // Find the cell whose .idx textContent === '0' etc.
    const cells = app.getCellsLocator();
    const count = await cells.count();
    let foundLeft = false, foundRight = false, windowCount = 0, bestCount = 0;
    for (let i = 0; i < count; i++) {
      const cell = cells.nth(i);
      const idxText = (await cell.locator('.idx').textContent())?.trim();
      if (idxText === '0') {
        if (await cell.evaluate((el) => el.classList.contains('left'))) foundLeft = true;
      }
      if (idxText === '2') {
        if (await cell.evaluate((el) => el.classList.contains('right'))) foundRight = true;
      }
      if (await cell.evaluate((el) => el.classList.contains('window'))) windowCount++;
      if (await cell.evaluate((el) => el.classList.contains('best'))) bestCount++;
    }
    expect(foundLeft).toBe(true);
    expect(foundRight).toBe(true);
    // window spans 3 cells
    expect(windowCount).toBe(3);
    // initial best window should be shown (same as current window)
    expect(bestCount).toBe(3);
  });

  test('Stepping advances the window and updates best when larger sum encountered', async ({ page }) => {
    // Purpose: Exercise step control and ensure state evolves and best is updated.
    const app = new SlidingWindowPage(page);
    await app.goto();

    // Ensure initial step count is 0 or 1 depending on script; read Step: X
    let beforeStep = await app.getStepCountText();

    // Click Step to advance (this should move to next slide)
    await app.clickStep();
    // After a step, step count increments in the UI
    const afterStep = await app.getStepCountText();
    expect(afterStep).not.toBe(beforeStep);

    // The window should have moved: initial window [0..2] then [1..3]
    // Check that there exists a cell labeled idx 1 that now has 'left'
    const cells = app.getCellsLocator();
    const count = await cells.count();
    let leftAt1 = false;
    for (let i = 0; i < count; i++) {
      const idxText = (await cells.nth(i).locator('.idx').textContent())?.trim();
      if (idxText === '1') {
        if (await cells.nth(i).evaluate((el) => el.classList.contains('left'))) leftAt1 = true;
      }
    }
    expect(leftAt1).toBe(true);

    // Step forward enough times until new best sum occurs (we know arr yields a new best at window [2..4] sum=9)
    // We'll perform steps and watch statMax for "Max sum: 9" or bestSum updated text.
    let maxText = await app.getStatMax();
    // Perform up to 5 steps to reach the new best
    let foundNewBest = false;
    for (let i = 0; i < 5; i++) {
      await app.clickStep();
      maxText = await app.getStatMax();
      if (maxText.includes('9')) {
        foundNewBest = true;
        break;
      }
    }
    expect(foundNewBest).toBe(true);

    // Verify that the cells in the best window have 'best' class (indices 2..4)
    let bestMarked = 0;
    for (let i = 0; i < count; i++) {
      const idxText = (await cells.nth(i).locator('.idx').textContent())?.trim();
      if (['2','3','4'].includes(idxText)) {
        if (await cells.nth(i).evaluate((el) => el.classList.contains('best'))) bestMarked++;
      }
    }
    expect(bestMarked).toBe(3);

    // Use Back to step back one state and ensure window changes (history rewind)
    const stepBeforeBack = await app.getStepCountText();
    await app.clickBack();
    const stepAfterBack = await app.getStepCountText();
    // step count in the UI should not increase; it should show earlier step number
    expect(stepAfterBack).not.toBe(stepBeforeBack);
  });

  test('Play and Pause control automates stepping respecting speed control', async ({ page }) => {
    // Purpose: Verify play/pause controls and that changing speed affects playback cadence.
    const app = new SlidingWindowPage(page);
    await app.goto();

    // Speed up playback to 100ms intervals to run tests faster
    await app.setSpeed(100);

    // Record initial log count
    const beforeLogs = await app.getLogEntriesCount();

    // Start playing
    await app.clickPlay();
    // Wait for a few intervals (slightly longer than two intervals)
    await page.waitForTimeout(350);
    // Pause playback
    await app.clickPause();

    // After play some log entries should have been appended
    const afterLogs = await app.getLogEntriesCount();
    expect(afterLogs).toBeGreaterThan(beforeLogs);

    // Ensure playback stops by waiting and confirming log count does not increase
    const logsAfterPause = await app.getLogEntriesCount();
    await page.waitForTimeout(300);
    const logsFinal = await app.getLogEntriesCount();
    expect(logsFinal).toBe(logsAfterPause);
  });

  test('Randomize populates inputs and updates visualization accordingly', async ({ page }) => {
    // Purpose: Ensure Randomize button changes input values and triggers reset of visualization.
    const app = new SlidingWindowPage(page);
    await app.goto();

    // Click randomize
    await app.clickRandomize();

    // The textarea arrayInput should now contain a comma-separated list (non-empty)
    const arrText = (await app.arrayInput.inputValue()).trim();
    expect(arrText.length).toBeGreaterThan(0);

    // After reset, vis should show number of cells matching parsed array length
    // verify at least 1 cell
    const cellCount = await app.getCellCount();
    expect(cellCount).toBeGreaterThan(0);
  });

  test('Switching algorithm toggles visible inputs and string mode works', async ({ page }) => {
    // Purpose: Validate UI adaptation when switching algorithms and ensure string algorithm runs.
    const app = new SlidingWindowPage(page);
    await app.goto();

    // Switch to 'unique' algo (string sliding window)
    await app.setAlgo('unique');

    // String box should be visible and array input hidden
    expect(await app.stringBox.isVisible()).toBe(true);
    expect(await app.arrayInput.isVisible()).toBe(false);
    // Param K and S should be hidden
    expect(await app.paramK.isVisible()).toBe(false);
    expect(await app.paramS.isVisible()).toBe(false);

    // Provide a deterministic string and reset
    await app.setString('abcabcbb');
    await app.clickReset();

    // The vis should display characters as cells
    const count = await app.getCellCount();
    expect(count).toBe(8); // "abcabcbb" length 8

    // Advance steps until we find the best substring length 3 (for "abc")
    let foundBestLen3 = false;
    for (let i = 0; i < 20; i++) {
      const statMax = await app.getStatMax();
      if (statMax.includes('Best length: 3')) {
        foundBestLen3 = true;
        break;
      }
      await app.clickStep();
    }
    expect(foundBestLen3).toBe(true);
  });

  test('Invalid k yields an informative state message (edge case)', async ({ page }) => {
    // Purpose: Test handling of invalid window size (k > n).
    const app = new SlidingWindowPage(page);
    await app.goto();

    // Default array length is 6 - set k to a larger value and Reset
    await app.setK(10);
    await app.clickReset();

    // The statInfo should indicate invalid k
    const info = await app.getStatInfo();
    expect(info).toContain('Invalid k');

    // Log should contain a message about invalid k as well
    const logCount = await app.getLogEntriesCount();
    expect(logCount).toBeGreaterThanOrEqual(1);
    const statSumVisible = await app.statSum.isVisible();
    // statSum should be hidden because invalid state doesn't provide currentSum
    expect(statSumVisible).toBe(false);
  });

  test('At-most-S algorithm shrinks window when sum exceeds S', async ({ page }) => {
    // Purpose: Exercise the variable-size window behavior (genAtMost).
    const app = new SlidingWindowPage(page);
    await app.goto();

    // Switch to atmost algorithm
    await app.setAlgo('atmost');

    // Provide a known array and a small S to force shrinking
    await app.setArray('5,4,3,2,1');
    await app.setS(3);
    await app.clickReset();

    // Walk a few steps and ensure that when sum > S, the state message indicates shrinking
    let sawShrinkMessage = false;
    for (let i = 0; i < 10; i++) {
      const info = await app.getStatInfo();
      if (info && info.toLowerCase().includes('shrank')) {
        sawShrinkMessage = true;
        break;
      }
      await app.clickStep();
    }
    expect(sawShrinkMessage).toBe(true);

    // The best length should be computed as at least 1 in this case
    const maxText = await app.getStatMax();
    expect(maxText).toContain('Best length:');
  });
});