import { test, expect } from '@playwright/test';

// Test file for: 39b7a021-d1d5-11f0-b49a-6f458b3a25ef-insertion-sort.spec.js
// This suite validates the Insertion Sort Visualization application.
// It loads the page as-is, observes console and page errors (without modifying the app),
// performs user interactions, and asserts DOM and visual changes.

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-4o-5/html/39b7a021-d1d5-11f0-b49a-6f458b3a25ef.html';

// Page Object for the Insertion Sort page
class InsertionSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
  }

  // Navigate to the application page and attach listeners to collect console/page errors.
  async goto(collectors) {
    // collectors: { consoleErrors: [], pageErrors: [] }
    const { consoleErrors, pageErrors } = collectors;

    // Listen to console events and collect error-level messages.
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push({ text: msg.text(), location: msg.location() });
      }
    });

    // Listen to uncaught page errors (exceptions).
    this.page.on('pageerror', err => {
      pageErrors.push(err);
    });

    await this.page.goto(APP_URL);
  }

  // Set the array input text
  async setInput(value) {
    const input = await this.page.locator('#arrayInput');
    await input.fill(value);
  }

  // Click the Sort button
  async clickSort() {
    // The button uses inline onclick="startSorting()"
    const button = this.page.locator('button', { hasText: 'Sort' });
    await button.click();
  }

  // Get bar heights as numbers (pixels without 'px')
  async getBarHeights() {
    return await this.page.$$eval('#array .bar', nodes =>
      nodes.map(n => {
        const h = n.style.height || window.getComputedStyle(n).height;
        // parseInt will extract the numeric portion (px -> number)
        return parseInt(h, 10) || 0;
      })
    );
  }

  // Get count of bars
  async getBarCount() {
    return await this.page.$$eval('#array .bar', nodes => nodes.length);
  }

  // Wait until the bars reflect the expected numeric values (multiplied by scaleFactor)
  // expectedNumbers: array of numbers e.g., [1,3,4,5]
  // scaleFactor: 5 in this application (height = num * 5)
  async waitForSorted(expectedNumbers, options = {}) {
    const scaleFactor = 5;
    const expectedHeights = expectedNumbers.map(n => n * scaleFactor);
    const timeout = options.timeout ?? 10000;
    await this.page.waitForFunction(
      (expectedHeights) => {
        const nodes = Array.from(document.querySelectorAll('#array .bar'));
        if (nodes.length !== expectedHeights.length) return false;
        const heights = nodes.map(n => {
          const h1 = n.style.height || window.getComputedStyle(n).height;
          return parseInt(h, 10) || 0;
        });
        // Compare arrays element-wise
        return heights.every((h, i) => h === expectedHeights[i]);
      },
      expectedHeights,
      { timeout }
    );
  }
}

test.describe('Insertion Sort Visualization - E2E', () => {
  // Collect console and page errors per test
  let consoleErrors = [];
  let pageErrors = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];
  });

  // Test initial page load and default state
  test('Initial page load shows title, input and empty array container without console errors', async ({ page }) => {
    const app = new InsertionSortPage(page);
    await app.goto({ consoleErrors, pageErrors });

    // Verify page title and heading
    await expect(page).toHaveTitle(/Insertion Sort Visualization/);
    const heading = page.locator('h1');
    await expect(heading).toHaveText('Insertion Sort Visualization');

    // Verify input and button are visible
    const input1 = page.locator('#arrayInput');
    await expect(input).toBeVisible();
    await expect(input).toHaveAttribute('placeholder', 'Enter numbers separated by commas');

    const button1 = page.locator('button1', { hasText: 'Sort' });
    await expect(button).toBeVisible();

    // On initial load the array container should be empty (no .bar elements)
    const barCount = await app.getBarCount();
    expect(barCount).toBe(0);

    // Assert that no console errors or uncaught page errors were produced during load
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  // Test sorting with a valid input sequence results in sorted bars
  test('Sorting a valid input updates the DOM and results in sorted bars', async ({ page }) => {
    const app1 = new InsertionSortPage(page);
    await app.goto({ consoleErrors, pageErrors });

    // Input unsorted numbers and start sorting
    await app.setInput('5,3,4,1');
    await app.clickSort();

    // Final expected sorted numbers: [1,3,4,5]
    const expected = [1, 3, 4, 5];
    // Wait for the sorting visualization to finish and the final DOM state to reflect a sorted array.
    // The algorithm uses delays of 300ms per operation, so allow sufficient timeout.
    await app.waitForSorted(expected, { timeout: 15000 });

    // Verify the DOM has the correct number of bars and heights correspond to expected values
    const heights1 = await app.getBarHeights();
    expect(heights.length).toBe(4);
    const expectedHeights1 = expected.map(n => n * 5);
    expect(heights).toEqual(expectedHeights);

    // Ensure no runtime page errors occurred during the sorting process
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  // Test empty input: should result in no bars and no errors
  test('Empty input produces no bars and does not throw errors', async ({ page }) => {
    const app2 = new InsertionSortPage(page);
    await app.goto({ consoleErrors, pageErrors });

    // Provide empty input and click sort
    await app.setInput('');
    await app.clickSort();

    // The array should remain empty
    // Give a small delay to allow any synchronous DOM updates to occur
    await page.waitForTimeout(200);
    const count = await app.getBarCount();
    expect(count).toBe(0);

    // No console or page errors are expected
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  // Test mixed invalid and valid numeric values: non-numeric values should be filtered out
  test('Input with non-numeric tokens filters invalid values and sorts remaining numbers', async ({ page }) => {
    const app3 = new InsertionSortPage(page);
    await app.goto({ consoleErrors, pageErrors });

    // Provide some invalid tokens mixed with numbers
    await app.setInput('2, a, 1, , 7b, 3');
    await app.clickSort();

    // createArray filters NaN entries; expected parsed numbers: [2,1,3] -> sorted [1,2,3]
    const expected1 = [1, 2, 3];
    await app.waitForSorted(expected, { timeout: 10000 });

    const heights2 = await app.getBarHeights();
    const expectedHeights2 = expected.map(n => n * 5);
    expect(heights).toEqual(expectedHeights);

    // No runtime errors should have been thrown
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  // Test that visual updates happen during sorting (heights change at least once)
  test('During sorting, bar heights change from initial state (visual update occurs)', async ({ page }) => {
    const app4 = new InsertionSortPage(page);
    await app.goto({ consoleErrors, pageErrors });

    // Use an input that will cause visible moves
    await app.setInput('4,2,3,1');
    // Capture initial state after immediate displayArray call (startSorting displays array first)
    // Click sort and wait a tick for initial display
    await app.clickSort();

    // Immediately after click, allow the first synchronous DOM update to occur
    await page.waitForTimeout(50);
    const initialHeights = await app.getBarHeights();

    // Poll for changes for a period shorter than full sort time but long enough to capture visual updates
    let changed = false;
    for (let i = 0; i < 10; i++) {
      await page.waitForTimeout(200); // sampling interval
      const sampleHeights = await app.getBarHeights();
      // If any height differs from initial snapshot, visual update occurred
      if (sampleHeights.length !== initialHeights.length) {
        changed = true;
        break;
      }
      for (let j = 0; j < sampleHeights.length; j++) {
        if (sampleHeights[j] !== initialHeights[j]) {
          changed = true;
          break;
        }
      }
      if (changed) break;
    }

    expect(changed).toBe(true);

    // Wait for final sorted state to avoid leaving the page mid-animation
    await app.waitForSorted([1,2,3,4], { timeout: 15000 });

    // Assert no runtime errors occurred during the visualization
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  // Additional sanity check: very short arrays (one element) should be handled quickly
  test('Single-element input results in one bar and completes without errors', async ({ page }) => {
    const app5 = new InsertionSortPage(page);
    await app.goto({ consoleErrors, pageErrors });

    await app.setInput('9');
    await app.clickSort();

    // The array should have one bar with height 45 (9 * 5)
    await page.waitForFunction(() => document.querySelectorAll('#array .bar').length === 1, { timeout: 2000 });
    const heights3 = await app.getBarHeights();
    expect(heights).toEqual([45]);

    // No errors expected
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
});