import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-23T16-37-48/html/beec61d0-c88a-11f0-b980-35cc7f0de6b4.html';

// Page Object for the array visualization app
class ArrayPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.container = page.locator('#array-container');
    this.log = page.locator('#log');
    this.generateBtn = page.locator('#generate-array-btn');
    this.startBtn = page.locator('#start-btn');
    this.pauseBtn = page.locator('#pause-btn');
    this.resetBtn = page.locator('#reset-btn');
    this.algorithmSelect = page.locator('#algorithm-select');
    this.arraySizeInput = page.locator('#array-size');
    this.speedRange = page.locator('#speed-range');
    this.speedLabel = page.locator('#speed-label');
    this.controls = page.locator('#controls');
  }

  async goto() {
    await this.page.goto(APP_URL, { waitUntil: 'networkidle' });
    // Wait for initial render of array bars and log
    await expect(this.container).toBeVisible();
    await expect(this.log).toBeVisible();
  }

  async getBarCount() {
    return await this.page.locator('.array-bar').count();
  }

  async getFirstBarValue() {
    const first = this.page.locator('.array-bar').first();
    return (await first.textContent()).trim();
  }

  async setArraySize(size) {
    await this.arraySizeInput.fill(String(size));
    // no immediate change until generate clicked
  }

  async clickGenerate() {
    await this.generateBtn.click();
    // wait for visual re-render: at least one bar exists
    await this.page.waitForSelector('.array-bar');
  }

  async setSpeed(ms) {
    // update range value and dispatch input event to update speed label
    await this.page.$eval('#speed-range', (el, val) => {
      el.value = val;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }, String(ms));
    // ensure label updated
    await expect(this.speedLabel).toHaveText(String(ms) + 'ms');
  }

  async changeAlgorithm(value) {
    await this.algorithmSelect.selectOption(value);
    // change handler will run; wait briefly for DOM updates (search-target insertion)
    await this.page.waitForTimeout(50);
  }

  async getSearchTargetInput() {
    return this.page.locator('#search-target');
  }

  async start() {
    await this.startBtn.click();
  }

  async pause() {
    await this.pauseBtn.click();
  }

  async reset() {
    await this.resetBtn.click();
  }

  async logsContain(text) {
    const content = await this.log.innerText();
    return content.includes(text);
  }

  async waitForAllDone(timeout = 20000) {
    const total = await this.getBarCount();
    await this.page.waitForFunction(
      (cnt) => document.querySelectorAll('.array-bar.done').length === cnt,
      total,
      { timeout }
    );
  }
}

test.describe('Array algorithm visualization - FSM-driven behaviors', () => {
  let page;
  let app;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    app = new ArrayPage(page);
    await app.goto();
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.describe('Initial state (idle) and basic controls', () => {
    test('initial UI controls reflect idle state (onEnter: updateControlsAfterStop)', async () => {
      // When app loads it's in idle: start enabled, pause disabled, reset disabled
      await expect(app.startBtn).toBeEnabled();
      await expect(app.pauseBtn).toBeDisabled();
      await expect(app.resetBtn).toBeDisabled();

      // Log should contain welcome message
      await expect(app.log).toContainText('欢迎使用数组算法交互式可视化演示。');
    });

    test('generate array respects array size bounds and updates DOM and log', async () => {
      // Edge case: too small value should clamp to minimum 5
      await app.setArraySize(2);
      await app.clickGenerate();
      let count = await app.getBarCount();
      expect(count).toBeGreaterThanOrEqual(5);

      // Edge case: too large value clamps to 50
      await app.setArraySize(1000);
      await app.clickGenerate();
      count = await app.getBarCount();
      expect(count).toBeLessThanOrEqual(50);

      // Normal case: set to 10
      await app.setArraySize(10);
      await app.clickGenerate();
      count = await app.getBarCount();
      expect(count).toBe(10);

      // Log should mention generation
      await expect(app.log).toContainText('生成新数组。');
    });

    test('speed slider updates label and influences animation scheduling', async () => {
      await app.setSpeed(100);
      // label updated assertion done in setSpeed helper
      // Changing speed does not enable/disable buttons
      await expect(app.startBtn).toBeEnabled();
      await expect(app.pauseBtn).toBeDisabled();
    });
  });

  test.describe('Algorithm selection and search target input behavior', () => {
    test('selecting linearSearch shows search target input and blocks start without input (prepareSteps -> alert)', async () => {
      // Intercept dialog for "请先输入搜索目标值。" when attempting to start without a target
      await app.changeAlgorithm('linearSearch');
      const targetInput = await app.getSearchTargetInput();
      await expect(targetInput).toBeVisible();

      // Attempt to start without entering a target -> should trigger alert
      const dialogPromise = page.waitForEvent('dialog');
      await app.start();
      const dialog = await dialogPromise;
      expect(dialog.message()).toMatch(/请先输入搜索目标值/);
      await dialog.dismiss();

      // Ensure still idle: start button remains enabled
      await expect(app.startBtn).toBeEnabled();
    });

    test('invalid (non-numeric) search target triggers validation alert', async () => {
      await app.changeAlgorithm('linearSearch');
      const targetInput = app.getSearchTargetInput();
      await targetInput.fill('abc'); // invalid
      const dialogPromise = page.waitForEvent('dialog');
      await app.start();
      const dialog = await dialogPromise;
      // prepareSteps uses alert("请输入有效的目标值（数字）。");
      expect(dialog.message()).toMatch(/请输入有效的目标值/);
      await dialog.dismiss();
      // Ensure no running state
      await expect(app.startBtn).toBeEnabled();
    });

    test('selecting binarySearch sorts the array and exposes search input', async () => {
      // Change to binary search; change handler sorts the array and logs sorting message
      await app.changeAlgorithm('binarySearch');
      // search target input created
      const targetInput = app.getSearchTargetInput();
      await expect(targetInput).toBeVisible();
      // The code logs "数组已排序以用于二分搜索。"
      await expect(app.log).toContainText('数组已排序以用于二分搜索。');
      // Array visually exists
      const count = await app.getBarCount();
      expect(count).toBeGreaterThan(0);
    });
  });

  test.describe('Running, pausing, resuming, completing and resetting animations (states: preparing, running, paused, completed, idle)', () => {
    test('run bubble sort to completion -> bars end with .done (running -> completed -> idle)', async () => {
      // Use a small array to keep steps short and set speed fast
      await app.setArraySize(6);
      await app.clickGenerate();

      await app.setSpeed(100);
      // Select bubble sort explicitly
      await app.changeAlgorithm('bubbleSort');

      // Start sorting
      await app.start();

      // At start, controls should update: generate disabled, pause enabled, reset enabled
      await expect(app.generateBtn).toBeDisabled();
      await expect(app.pauseBtn).toBeEnabled();
      await expect(app.resetBtn).toBeEnabled();

      // Wait until all bars have class 'done' (completed)
      await app.waitForAllDone(20000);

      // After completion, controls should be back to idle-state (start enabled, pause disabled)
      await expect(app.startBtn).toBeEnabled();
      await expect(app.pauseBtn).toBeDisabled();
      await expect(app.resetBtn).toBeDisabled();

      // Log should contain sorting completion text
      await expect(app.log).toContainText('排序完成。');
    });

    test('pause and resume behavior during running (running -> paused -> running)', async () => {
      await app.setArraySize(8);
      await app.clickGenerate();
      await app.setSpeed(200);
      await app.changeAlgorithm('selectionSort');

      // Start and let at least one step render (highlight)
      await app.start();
      // Wait for a highlight class to appear indicating comparing step
      await page.waitForSelector('.array-bar.highlight', { timeout: 5000 });

      // Pause the animation
      await app.pause();
      // When paused, pause button is disabled and start button enabled (resume path)
      await expect(app.pauseBtn).toBeDisabled();
      await expect(app.startBtn).toBeEnabled();
      // Log should contain pause message
      await expect(app.log).toContainText('动画已暂停。');

      // Resume by clicking start (resumeAnimation path)
      await app.start();
      // After resume, pause should be enabled again
      await page.waitForTimeout(50); // small wait for resume to re-enable
      await expect(app.pauseBtn).toBeEnabled();
      await expect(app.startBtn).toBeDisabled();
      // Ensure animation eventually completes
      await app.waitForAllDone(20000);
    });

    test('reset during running returns to idle and clears steps/log appropriately', async () => {
      await app.setArraySize(7);
      await app.clickGenerate();
      await app.setSpeed(200);
      await app.changeAlgorithm('insertionSort');

      await app.start();
      // Wait for at least one step to run
      await page.waitForSelector('.array-bar.highlight, .array-bar.swap, #log div', { timeout: 5000 });

      // Click reset
      await app.reset();

      // After reset, controls should reflect idle
      await expect(app.startBtn).toBeEnabled();
      await expect(app.pauseBtn).toBeDisabled();
      await expect(app.resetBtn).toBeDisabled();

      // The log should be cleared except for a reset message "动画已重置。" (it resets with clear=true)
      await expect(app.log).toContainText('动画已重置。');
      // bars should be re-rendered (no ongoing animations)
      const count = await app.getBarCount();
      expect(count).toBeGreaterThan(0);
    });
  });

  test.describe('Search algorithms and positive find scenarios (searching_highlight, mark done)', () => {
    test('linear search finds an existing value (searching_highlight -> STEP_MARK_DONE)', async () => {
      // Prepare: ensure array exists and pick a value to search for
      await app.setArraySize(10);
      await app.clickGenerate();
      const firstVal = await app.getFirstBarValue();

      await app.changeAlgorithm('linearSearch');
      const targetInput = app.getSearchTargetInput();
      await targetInput.fill(firstVal);

      await app.setSpeed(100);
      await app.start();

      // After start, steps will highlight indices; when found, the matching bar receives 'done' class
      await page.waitForSelector('.array-bar.done', { timeout: 5000 });
      // Log should indicate found
      await expect(app.log).toContainText('找到目标值');
    });

    test('binary search finds an existing value on sorted array', async () => {
      await app.setArraySize(11);
      await app.clickGenerate();

      // Switch to binary search: will sort automatically
      await app.changeAlgorithm('binarySearch');
      const targetInput = app.getSearchTargetInput();

      // Choose middle bar's value for higher chance to be found quickly
      const bars = page.locator('.array-bar');
      const midIndex = Math.floor((await bars.count()) / 2);
      const midVal = (await bars.nth(midIndex).textContent()).trim();
      await targetInput.fill(midVal);

      await app.setSpeed(100);
      await app.start();

      // Wait until found and marked done
      await page.waitForSelector('.array-bar.done', { timeout: 5000 });
      await expect(app.log).toContainText('找到目标值');
    });
  });

  test.describe('Algorithm change transitions and side effects', () => {
    test('changing algorithm from idle adds/removes search input and triggers sorting for binarySearch (ALGORITHM_CHANGE)', async () => {
      // Ensure we're idle
      await expect(app.startBtn).toBeEnabled();
      await app.changeAlgorithm('linearSearch');
      await expect(app.getSearchTargetInput()).toBeVisible();

      // Change to bubble sort -> search input removed
      await app.changeAlgorithm('bubbleSort');
      await expect(page.locator('#search-target')).toHaveCount(0);

      // Change to binarySearch should sort and add search input
      await app.changeAlgorithm('binarySearch');
      await expect(app.getSearchTargetInput()).toBeVisible();
      await expect(app.log).toContainText('数组已排序以用于二分搜索。');
    });

    test('starting without prepareSteps success is blocked (prepareSteps returns false) for missing search target', async () => {
      // Select binarySearch and leave target empty; prepareSteps should alert "请先输入搜索目标值。"
      await app.changeAlgorithm('binarySearch');
      const dialogPromise = page.waitForEvent('dialog');
      await app.start();
      const dialog = await dialogPromise;
      expect(dialog.message()).toMatch(/请先输入搜索目标值/);
      await dialog.dismiss();
      // Ensure still idle and controls unchanged
      await expect(app.startBtn).toBeEnabled();
      await expect(app.pauseBtn).toBeDisabled();
    });
  });
});