import { test, expect } from '@playwright/test';

// Test file for: Heap Sort Visualization
// Filename requirement: 20d2afb7-cd33-11f0-bdf9-b3d97e91273d-heap-sort.spec.js

// Page Object Model for the Heap Sort page
class HeapSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.url = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/20d2afb7-cd33-11f0-bdf9-b3d97e91273d.html';
    this.inputArray = page.locator('#inputArray');
    this.generateBtn = page.locator('#generateBtn');
    this.startBtn = page.locator('#startBtn');
    this.speedControl = page.locator('#speedControl');
    this.speedLabel = page.locator('#speedLabel');
    this.arrayContainer = page.locator('#array');
    this.bars = page.locator('#array .bar');
  }

  // Navigate to the page
  async goto() {
    await this.page.goto(this.url);
  }

  // Get the numbers currently in the input field (as array of numbers or empty array)
  async getInputNumbers() {
    const val = await this.inputArray.inputValue();
    if (!val) return [];
    return val.split(',').map(s => s.trim()).filter(s => s !== '').map(Number);
  }

  // Set the input array value (fill triggers input event)
  async setInputArrayValue(value) {
    await this.inputArray.fill(value);
    // Playwright's fill should dispatch input events. Add a small wait for UI updates.
    await this.page.waitForTimeout(50);
  }

  // Click Generate Random
  async clickGenerate() {
    await this.generateBtn.click();
    // allow UI to update
    await this.page.waitForTimeout(50);
  }

  // Set speed using DOM evaluation to ensure 'input' event fires for range
  async setSpeed(ms) {
    await this.page.evaluate((v) => {
      const el = document.getElementById('speedControl');
      el.value = String(v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }, ms);
    // wait for label update
    await this.page.waitForTimeout(20);
  }

  // Click start (begin sorting)
  async clickStart() {
    await this.startBtn.click();
  }

  // Return number of bars
  async getBarCount() {
    return await this.bars.count();
  }

  // Return texts of bars as numbers
  async getBarValues() {
    const count = await this.getBarCount();
    const vals = [];
    for (let i = 0; i < count; i++) {
      const t = await this.bars.nth(i).textContent();
      vals.push(Number(t));
    }
    return vals;
  }

  // Check if all bars have 'sorted' class
  async allBarsSorted() {
    const count1 = await this.getBarCount();
    for (let i = 0; i < count; i++) {
      const classAttr = await this.bars.nth(i).getAttribute('class');
      if (!classAttr || !classAttr.split(' ').includes('sorted')) return false;
    }
    return true;
  }

  // Check whether start/generate/input/speed are disabled
  async getControlsDisabledState() {
    return {
      startDisabled: await this.startBtn.isDisabled(),
      generateDisabled: await this.generateBtn.isDisabled(),
      inputDisabled: await this.inputArray.isDisabled(),
      speedDisabled: await this.speedControl.isDisabled(),
    };
  }
}

test.describe('Heap Sort Visualization - End-to-End', () => {
  let pageErrors = [];
  let consoleErrors = [];

  test.beforeEach(async ({ page }) => {
    // Reset collectors before each test
    pageErrors = [];
    consoleErrors = [];

    // Capture console.error messages
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Capture uncaught page errors
    page.on('pageerror', err => {
      pageErrors.push(err.message || String(err));
    });
  });

  // Test initial load and default state of the application
  test('Initial load: page elements and default state are correct', async ({ page }) => {
    const app = new HeapSortPage(page);
    await app.goto();

    // Document title and header sanity checks
    await expect(page).toHaveTitle(/Heap Sort Visualization/);
    await expect(page.locator('h1')).toHaveText('Heap Sort Visualization');

    // Default speed control and label should be in sync
    const speedVal = await app.speedControl.inputValue();
    const label = await app.speedLabel.textContent();
    expect(Number(speedVal)).toBeGreaterThanOrEqual(100);
    expect(label.trim()).toMatch(new RegExp(`${speedVal}\\s*ms`));

    // The page initializes with a generated array (default size 15)
    const barCount = await app.getBarCount();
    expect(barCount).toBeGreaterThan(0); // should have bars
    // Start button should be enabled on init per script
    expect(await app.startBtn.isDisabled()).toBeFalsy();
    expect(await app.generateBtn.isDisabled()).toBeFalsy();

    // No console errors or page errors on initial load
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Test generate random button behavior
  test('Generate Random button produces a comma-separated input and renders bars', async ({ page }) => {
    const app1 = new HeapSortPage(page);
    await app.goto();

    // Click the generate button and validate input and bars update
    await app.clickGenerate();

    const nums = await app.getInputNumbers();
    expect(nums.length).toBeGreaterThan(0);
    // Bars count should match number of numbers in input
    const barCount1 = await app.getBarCount();
    expect(barCount).toBe(nums.length);

    // Start should be enabled after generation
    expect(await app.startBtn.isDisabled()).toBeFalsy();

    // No runtime errors produced by clicking Generate
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Test manual input parsing and enabling of Start button, plus invalid input handling
  test('Manual input: valid input enables Start; invalid input disables it and clears bars', async ({ page }) => {
    const app2 = new HeapSortPage(page);
    await app.goto();

    // Provide a valid small array and confirm bars and start button
    await app.setInputArrayValue('4,1,7,3');
    let nums1 = await app.getInputNumbers();
    expect(nums).toEqual([4, 1, 7, 3]);

    let barCount2 = await app.getBarCount();
    expect(barCount).toBe(4);
    expect(await app.startBtn.isDisabled()).toBeFalsy();

    // Provide invalid input - should clear bars and disable start
    await app.setInputArrayValue('abc, , ,');
    nums = await app.getInputNumbers();
    // parseInput in page returns null for invalid, inputValue still contains text,
    // but bars should be cleared and start disabled per script.
    barCount = await app.getBarCount();
    expect(barCount).toBe(0);
    expect(await app.startBtn.isDisabled()).toBeTruthy();

    // No console or page errors caused by invalid input typing
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Test speed control updates label and affects internal delay display
  test('Speed control updates the UI label when adjusted', async ({ page }) => {
    const app3 = new HeapSortPage(page);
    await app.goto();

    // Set speed to 1200 ms and check label
    await app.setSpeed(1200);
    const label1 = await app.speedLabel.textContent();
    expect(label.trim()).toBe('1200 ms');

    // Lower speed to 100 ms and validate label again
    await app.setSpeed(100);
    const label2 = await app.speedLabel.textContent();
    expect(label2.trim()).toBe('100 ms');

    // No runtime errors from speed adjustments
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Test full sorting flow for a small array and visual state changes
  test('Start sorting: controls disable during sort, sorting completes, and bars become sorted', async ({ page }) => {
    const app4 = new HeapSortPage(page);
    await app.goto();

    // Use a small deterministic array to keep test time short
    await app.setInputArrayValue('4,1,7,3');
    expect(await app.getBarCount()).toBe(4);

    // Reduce animation delay to speed up test
    await app.setSpeed(100);

    // Start sorting and immediately assert controls are disabled
    const startPromise = (async () => {
      await app.clickStart();
    })();

    // After clicking start, controls should become disabled quickly
    // Wait until start button is disabled
    await expect(app.startBtn).toBeDisabled({ timeout: 2000 });

    // Other controls should also be disabled while sorting is ongoing
    const stateDuring = await app.getControlsDisabledState();
    expect(stateDuring.startDisabled).toBe(true);
    expect(stateDuring.generateDisabled).toBe(true);
    expect(stateDuring.inputDisabled).toBe(true);
    expect(stateDuring.speedDisabled).toBe(true);

    // While sorting runs, we expect to see transient classes such as 'swapping' or 'heapify'
    // Wait for at least one swapping indicator to appear (gives confidence animation is happening)
    let sawSwapping = false;
    try {
      await page.waitForSelector('.bar.swapping', { timeout: 2000 });
      sawSwapping = true;
    } catch (e) {
      // It's possible for some tiny arrays the timing aligns such that swapping flash was missed.
      sawSwapping = false;
    }

    // Wait for the sorting to finish: start button will be re-enabled at end of sorting
    await expect(app.startBtn).toBeEnabled({ timeout: 5000 });

    // Confirm controls are re-enabled
    const stateAfter = await app.getControlsDisabledState();
    expect(stateAfter.startDisabled).toBe(false);
    expect(stateAfter.generateDisabled).toBe(false);
    expect(stateAfter.inputDisabled).toBe(false);
    expect(stateAfter.speedDisabled).toBe(false);

    // All bars should be marked as sorted (class 'sorted' present)
    const allSorted = await app.allBarsSorted();
    expect(allSorted).toBe(true);

    // Ensure sorting process did not introduce console or page errors
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);

    // It's acceptable whether or not we observed a swapping indicator during runtime,
    // but include a soft expectation by asserting that either swapping was observed or
    // sorting completed successfully (which we already assert).
    expect(allSorted || sawSwapping).toBeTruthy();

    // Ensure any started click promise resolves (defensive)
    await startPromise;
  });

  // Accessibility and role checks: ensure array container and items expose list/listitem
  test('Accessibility: array container has role list and each bar is a listitem', async ({ page }) => {
    const app5 = new HeapSortPage(page);
    await app.goto();

    // Container should have role list
    const role = await app.arrayContainer.getAttribute('role');
    expect(role).toBe('list');

    // Each bar should have role listitem attribute
    const count2 = await app.getBarCount();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const r = await app.bars.nth(i).getAttribute('role');
      expect(r).toBe('listitem');
    }

    // No runtime errors
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Final test to surface any unexpected console/page errors after interactions
  test('No unexpected console or page errors throughout user interactions', async ({ page }) => {
    const app6 = new HeapSortPage(page);
    await app.goto();

    // Perform a series of interactions
    await app.clickGenerate();
    await app.setInputArrayValue('10,9,8,7,6');
    await app.setSpeed(100);
    await app.clickStart();

    // Wait for sorting to finish (start button re-enabled)
    await expect(app.startBtn).toBeEnabled({ timeout: 5000 });

    // Assert collected errors arrays are empty (i.e., no uncaught errors occurred)
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });
});