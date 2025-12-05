import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-4o-5/html/39b7c731-d1d5-11f0-b49a-6f458b3a25ef.html';

/**
 * Page Object for the Heap Sort Visualization page.
 * Encapsulates interactions and queries on the page.
 */
class HeapSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.arrayLocator = page.locator('#array');
    this.sortBtn = page.locator('#sortBtn');
  }

  // Navigate to the application URL
  async goto() {
    await this.page.goto(APP_URL);
  }

  // Return innerText of the array container
  async getArrayText() {
    return (await this.arrayLocator.innerText()).trim();
  }

  // Parse the comma-separated numbers into an array of integers
  async getArrayValues() {
    const text = await this.getArrayText();
    if (!text) return [];
    return text.split(',').map(s => parseInt(s.trim(), 10));
  }

  // Click the Sort Array button
  async clickSort() {
    await this.sortBtn.click();
  }

  // Check visibility of the Sort button
  async isSortButtonVisible() {
    return this.sortBtn.isVisible();
  }

  // Wait until the array container's text changes from the provided initial value
  async waitForArrayTextChange(initialText, timeout = 4000) {
    // Wait for the element's innerText to differ from initialText
    await this.page.waitForFunction(
      (selector, init) => {
        const el = document.querySelector(selector);
        return el && el.innerText.trim() !== init;
      },
      this.arrayLocator.selector,
      initialText,
      { timeout }
    );
  }
}

test.describe('Heap Sort Visualization - End-to-end tests', () => {
  // Arrays to capture runtime errors and console error messages per test
  let pageErrors;
  let consoleErrors;

  test.beforeEach(async ({ page }) => {
    // Initialize error collectors
    pageErrors = [];
    consoleErrors = [];

    // Capture uncaught exceptions on the page
    page.on('pageerror', error => {
      // store the Error object for later assertions
      pageErrors.push(error);
    });

    // Capture console messages and track those of type 'error'
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push({
          text: msg.text(),
          location: msg.location()
        });
      }
    });

    // Navigate to the application under test
    await page.goto(APP_URL);
  });

  test.afterEach(async () => {
    // After each test assert that there were no runtime page errors and no console errors.
    // The application provided should run without throwing; if errors exist they will be reported.
    expect(pageErrors.length, `Unexpected page errors: ${pageErrors.map(e => String(e)).join(' | ')}`).toBe(0);
    expect(consoleErrors.length, `Unexpected console error messages: ${consoleErrors.map(e => e.text).join(' | ')}`).toBe(0);
  });

  test('Initial page load should show header, visible button, and empty array container by default', async ({ page }) => {
    // Purpose: Verify initial UI and default state before any user interaction.
    const heapPage = new HeapSortPage(page);

    // Check that the page loaded and the Sort button is visible
    await expect(heapPage.sortBtn).toBeVisible();
    expect(await heapPage.isSortButtonVisible()).toBeTruthy();

    // The array container should exist; on initial load it's expected to be empty
    const initialText = await heapPage.getArrayText();
    // It may be empty string or whitespace; assert that it's empty or not yet populated
    expect(initialText === '' || initialText.length === 0).toBeTruthy();
  });

  test('Clicking Sort Array displays a ten-element array then updates to sorted array after 2s', async ({ page }) => {
    // Purpose: Validate interactive flow: generate -> show unsorted -> sort -> re-render sorted
    const heapPage1 = new HeapSortPage(page);

    // Ensure button exists and click it to trigger array generation and sort
    await expect(heapPage.sortBtn).toBeVisible();
    await heapPage.clickSort();

    // After click the page renders the unsorted array immediately.
    // Wait briefly for the immediate render to complete and capture its text.
    await page.waitForTimeout(50); // small wait to allow immediate render
    const beforeText = await heapPage.getArrayText();
    expect(beforeText, 'Expected initial array text to be present after clicking Sort Array').not.toBe('');

    // Parse the displayed values and ensure there are 10 integers
    const beforeValues = beforeText.split(',').map(s => parseInt(s.trim(), 10));
    expect(beforeValues.length, 'Expected generated array to contain 10 elements').toBe(10);
    beforeValues.forEach((v, i) => {
      expect(Number.isFinite(v), `Array element at index ${i} is not a number`).toBeTruthy();
    });

    // Now wait for the later re-render (setTimeout 2000ms in the app). Use waitForArrayTextChange
    await heapPage.waitForArrayTextChange(beforeText, 4000);

    // After update, capture the new text and parse
    const afterText = await heapPage.getArrayText();
    expect(afterText, 'Expected array text to update to sorted values').not.toBe(beforeText);

    const afterValues = afterText.split(',').map(s => parseInt(s.trim(), 10));
    expect(afterValues.length, 'Expected sorted array to contain 10 elements').toBe(10);

    // Verify the afterValues is a sorted (non-decreasing) permutation of beforeValues
    // First, check sortedness
    for (let i = 0; i < afterValues.length - 1; i++) {
      expect(afterValues[i] <= afterValues[i + 1], `Expected sorted order at indices ${i} and ${i + 1}`).toBeTruthy();
    }

    // Next, check that afterValues is a permutation of beforeValues (same multiset)
    const countMap = arr => {
      const map = new Map();
      arr.forEach(n => map.set(n, (map.get(n) || 0) + 1));
      return map;
    };
    const beforeMap = countMap(beforeValues);
    const afterMap = countMap(afterValues);
    expect(beforeMap.size === afterMap.size || afterValues.length === beforeValues.length).toBeTruthy();
    // Ensure counts match
    for (const [num, count] of beforeMap.entries()) {
      expect(afterMap.get(num) === count, `Element ${num} should appear ${count} times after sort`).toBeTruthy();
    }
  });

  test('Clicking Sort Array multiple times regenerates and sorts new arrays', async ({ page }) => {
    // Purpose: Validate repeated interactions and that consecutive runs update the DOM appropriately.
    const heapPage2 = new HeapSortPage(page);

    // First run
    await heapPage.clickSort();
    await page.waitForTimeout(50);
    const firstBefore = await heapPage.getArrayText();
    await heapPage.waitForArrayTextChange(firstBefore, 4000);
    const firstAfter = await heapPage.getArrayText();

    // Second run - new generation should replace content and after sort update again
    await heapPage.clickSort();
    // Immediately after clicking second time, the content should change (new unsorted array)
    await page.waitForTimeout(50);
    const secondBefore = await heapPage.getArrayText();
    // secondBefore should be different from firstAfter in most cases; assert it's a valid 10-element array
    expect(secondBefore, 'Expected second generated array to be present after second click').not.toBe('');
    const secondBeforeVals = secondBefore.split(',').map(s => parseInt(s.trim(), 10));
    expect(secondBeforeVals.length, 'Expected second generated array to have 10 elements').toBe(10);

    // Wait for second sort to finish and the DOM to update
    await heapPage.waitForArrayTextChange(secondBefore, 4000);
    const secondAfter = await heapPage.getArrayText();

    // Validate sortedness for second run
    const secondAfterVals = secondAfter.split(',').map(s => parseInt(s.trim(), 10));
    for (let i = 0; i < secondAfterVals.length - 1; i++) {
      expect(secondAfterVals[i] <= secondAfterVals[i + 1], `Expected second run sorted order at ${i}`).toBeTruthy();
    }
  });

  test('Accessibility and ARIA basics: button is reachable and has discernible text', async ({ page }) => {
    // Purpose: Basic accessibility checks relevant to this simple app.
    const heapPage3 = new HeapSortPage(page);

    // The Sort button should be accessible by its role and name
    const sortByRole = page.getByRole('button', { name: /Sort Array/i });
    await expect(sortByRole).toBeVisible();
    await expect(sortByRole).toHaveText(/Sort Array/i);

    // Ensure #array region exists and has text content updates when clicking the button
    await heapPage.clickSort();
    await page.waitForTimeout(50);
    const beforeText1 = await heapPage.getArrayText();
    expect(beforeText.length).toBeGreaterThan(0);
  });

  test('Edge case: Rapid clicks should still result in a final sorted array (last click wins)', async ({ page }) => {
    // Purpose: Simulate rapid user interactions to check stability. Do not attempt to patch the app; let it behave naturally.
    const heapPage4 = new HeapSortPage(page);

    // Perform several rapid clicks
    await heapPage.clickSort();
    await heapPage.clickSort();
    await heapPage.clickSort();

    // After the rapid clicks, wait for a stabilized update (allowing the last timer to fire)
    // We will poll until the array text stops changing for a short interval.
    let lastText = await heapPage.getArrayText();
    // Wait for any immediate render
    await page.waitForTimeout(100);

    // Poll until change settles or timeout
    const start = Date.now();
    let settled = false;
    while (Date.now() - start < 5000) {
      const currentText = await heapPage.getArrayText();
      if (currentText !== lastText) {
        // reset timer to detect settle after change
        lastText = currentText;
        // give a short time to potentially change again
        await page.waitForTimeout(150);
        continue;
      } else {
        // If unchanged for some cycles, consider settled
        settled = true;
        break;
      }
    }

    expect(settled, 'Expected array text to settle after rapid clicks').toBeTruthy();

    // Final content should be a sorted array of 10 numbers
    const finalVals = (await heapPage.getArrayValues());
    expect(finalVals.length, 'Final array expected to have 10 elements').toBe(10);
    for (let i = 0; i < finalVals.length - 1; i++) {
      expect(finalVals[i] <= finalVals[i + 1], `Final array should be sorted at indices ${i}, ${i + 1}`).toBeTruthy();
    }
  });
});