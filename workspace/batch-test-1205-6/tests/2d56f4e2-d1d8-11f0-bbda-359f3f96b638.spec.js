import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-6/html/2d56f4e2-d1d8-11f0-bbda-359f3f96b638.html';

// Page Object Model for the Radix Sort visualization page
class RadixPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.generateButton = "button[onclick='generateRandomArray()']";
    this.sortButton = "button[onclick='radixSort()']";
    this.container = '#arrayContainer';
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  // Click the "Generate Random Array" button
  async generateArray() {
    await this.page.click(this.generateButton);
  }

  // Click the "Sort Array" button
  async sortArray() {
    await this.page.click(this.sortButton);
  }

  // Return the bar elements currently rendered
  async getBars() {
    return this.page.$$(this.container + ' .bar');
  }

  // Return numeric values shown inside the bars
  async getBarValues() {
    const bars = await this.getBars();
    const values = [];
    for (const bar of bars) {
      const text = (await bar.innerText()).trim();
      const num = Number(text);
      values.push(Number.isNaN(num) ? null : num);
    }
    return values;
  }

  // Return whether all bars have the 'sorted' class
  async allBarsSorted() {
    return this.page.evaluate((sel) => {
      const bars1 = Array.from(document.querySelectorAll(sel + ' .bar'));
      if (bars.length === 0) return false;
      return bars.every(b => b.classList.contains('sorted'));
    }, this.container);
  }

  // Return number of bars
  async barCount() {
    return this.page.evaluate((sel) => {
      return document.querySelectorAll(sel + ' .bar').length;
    }, this.container);
  }

  // Wait until sorted bars appear (all bars have 'sorted' class) or timeout
  async waitForSorted(timeout = 10000) {
    await this.page.waitForFunction((sel) => {
      const bars2 = Array.from(document.querySelectorAll(sel + ' .bar'));
      return bars.length > 0 && bars.every(b => b.classList.contains('sorted'));
    }, this.container, {timeout});
  }
}

test.describe('Radix Sort Visualization - FSM states and transitions', () => {
  let pageErrors = [];
  let consoleErrors = [];

  test.beforeEach(async ({ page }) => {
    // Capture page errors and console errors for each test
    pageErrors = [];
    consoleErrors = [];

    page.on('pageerror', error => {
      // store error objects (can be ReferenceError, TypeError, etc.)
      pageErrors.push(error);
    });

    page.on('console', msg => {
      // capture console errors (level 'error')
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Navigate to the application page
    await page.goto(APP_URL);
  });

  test.afterEach(async () => {
    // After each test, assert that there were no uncaught page errors or console errors.
    // This ensures we observed console/page errors and can fail fast if something broke.
    expect(pageErrors.length, `No page errors expected, got: ${pageErrors.map(e => String(e))}`).toBe(0);
    expect(consoleErrors.length, `No console.error calls expected, got: ${consoleErrors.join(' | ')}`).toBe(0);
  });

  test('S0_Idle: initial page load shows controls and empty container', async ({ page }) => {
    // Validate the Idle state (S0_Idle)
    const radix = new RadixPage(page);

    // Ensure buttons exist
    await expect(page.locator(radix.generateButton)).toBeVisible();
    await expect(page.locator(radix.sortButton)).toBeVisible();

    // On initial load, container should exist and be empty (no bars)
    const count = await radix.barCount();
    // Container could be empty (0 bars)
    expect(count).toBe(0);

    // Also verify that clicking nothing doesn't trigger errors (captured in afterEach)
  });

  test('S1_ArrayGenerated: clicking Generate Random Array creates 10 bars with numeric values', async ({ page }) => {
    // This test validates the transition S0_Idle -> S1_ArrayGenerated via GenerateRandomArray
    const radix1 = new RadixPage(page);

    // Click generate and wait a short moment for DOM updates
    await radix.generateArray();

    // Expect exactly 10 bars to be rendered
    await page.waitForFunction((sel) => document.querySelectorAll(sel + ' .bar').length === 10, radix.container);

    const count1 = await radix.barCount();
    expect(count).toBe(10);

    // Extract values and validate they are integers between 0 and 99
    const values1 = await radix.getBarValues();
    expect(values.length).toBe(10);
    for (const v of values) {
      expect(typeof v).toBe('number');
      // values should be integers in the specified generation range (0-99)
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(100);
    }

    // Also assert that each bar has a positive height style (sanity check of display)
    const heights = await page.$$eval(radix.container + ' .bar', bars => bars.map(b => b.style.height));
    heights.forEach(h => {
      // height should be present and end with 'px'
      expect(typeof h).toBe('string');
      expect(h.endsWith('px')).toBe(true);
    });
  });

  test('Transition S1_ArrayGenerated -> S2_Sorting -> S3_ArraySorted: sort produces sorted array with "sorted" class', async ({ page }) => {
    // This test covers the full transition: generate -> sort -> final sorted display
    const radix2 = new RadixPage(page);

    // Generate array first
    await radix.generateArray();

    await page.waitForFunction((sel) => document.querySelectorAll(sel + ' .bar').length === 10, radix.container);
    const beforeValues = await radix.getBarValues();

    // Trigger sort (this initiates radixSort which uses async delays)
    await radix.sortArray();

    // Wait for final sorted state (all bars should have 'sorted' class)
    // The algorithm may take some time depending on digits; give generous timeout
    await radix.waitForSorted(15000);

    // Validate that all bars now have 'sorted' class
    const allSorted = await radix.allBarsSorted();
    expect(allSorted).toBe(true);

    // Validate that the values are sorted in non-decreasing order
    const afterValues = await radix.getBarValues();
    expect(afterValues.length).toBeGreaterThan(0);

    // Ensure array is non-decreasing
    for (let i = 1; i < afterValues.length; i++) {
      expect(afterValues[i]).toBeGreaterThanOrEqual(afterValues[i - 1]);
    }

    // Check that the sorted values are a permutation of original values (same multiset)
    // Sort both arrays in ascending order and compare
    const sortedCopy = [...beforeValues].sort((a,b) => a - b);
    const afterSorted = [...afterValues].sort((a,b) => a - b);
    expect(afterSorted).toEqual(sortedCopy);
  });

  test('Edge case: clicking Sort Array when no array generated results in empty display and no exceptions', async ({ page }) => {
    // This test examines behavior of the SortArray event when array is empty (S0_Idle -> S3_ArraySorted via SortArray directly)
    // According to implementation, getMax(array) on empty array will be -Infinity and sorting loop skipped,
    // resulting in displaySortedArray being called which will show no bars (container cleared).
    const radix3 = new RadixPage(page);

    // Ensure container initially empty
    let initialCount = await radix.barCount();
    expect(initialCount).toBe(0);

    // Click Sort without generating
    await radix.sortArray();

    // Wait a short time to allow any synchronous display updates
    await page.waitForTimeout(200);

    // After calling sort on empty array, container should remain empty (or no bars rendered)
    const countAfterSort = await radix.barCount();
    expect(countAfterSort).toBe(0);

    // No runtime exceptions should have been thrown (asserted in afterEach)
  });

  test('Edge case: generating multiple times resets the display and produces new arrays', async ({ page }) => {
    // This test validates that multiple GenerateRandomArray actions reset and re-render the array
    const radix4 = new RadixPage(page);

    // Generate first array
    await radix.generateArray();
    await page.waitForFunction((sel) => document.querySelectorAll(sel + ' .bar').length === 10, radix.container);
    const values1 = await radix.getBarValues();
    expect(values1.length).toBe(10);

    // Generate again
    await radix.generateArray();
    await page.waitForFunction((sel) => document.querySelectorAll(sel + ' .bar').length === 10, radix.container);
    const values2 = await radix.getBarValues();
    expect(values2.length).toBe(10);

    // It's possible (though unlikely) the new array equals the previous one due to randomness.
    // Assert that the DOM was replaced: since generateRandomArray clears container.innerHTML, there should be new elements.
    // We check that at least the array was re-rendered by ensuring bars exist and are numeric.
    values2.forEach(v => {
      expect(typeof v).toBe('number');
      expect(Number.isInteger(v)).toBe(true);
    });
  });

  test('UI sanity: Ensure buttons have expected text and attributes (evidence checks)', async ({ page }) => {
    // Validate that the buttons exist and match the evidence described in the FSM
    const radix5 = new RadixPage(page);

    const genText = await page.locator(radix.generateButton).innerText();
    const sortText = await page.locator(radix.sortButton).innerText();

    expect(genText).toMatch(/Generate Random Array/i);
    expect(sortText).toMatch(/Sort Array/i);

    // Ensure container element exists
    const containerExists = await page.$(radix.container);
    expect(containerExists).not.toBeNull();
  });
});