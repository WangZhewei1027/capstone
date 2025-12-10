import { test, expect } from '@playwright/test';

// Test file for Quick Sort Demo
// Application URL:
// http://127.0.0.1:5500/workspace/batch-test-1205-4o-5/html/39b7c730-d1d5-11f0-b49a-6f458b3a25ef.html
//
// Filename required by spec:
// 39b7c730-d1d5-11f0-b49a-6f458b3a25ef-quick-sort.spec.js

// Page object model for the Quick Sort demo
class QuickSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input = page.locator('#arrayInput');
    this.sortButton = page.locator('button', { hasText: 'Sort' });
    this.sortedOutput = page.locator('#sortedArray');
    this.heading = page.locator('h2', { hasText: 'Quick Sort Demo' });
  }

  // Navigate to the demo page
  async goto() {
    await this.page.goto('http://127.0.0.1:5500/workspace/batch-test-1205-4o-5/html/39b7c730-d1d5-11f0-b49a-6f458b3a25ef.html');
    // Ensure the main heading is visible to confirm the page has loaded
    await expect(this.heading).toBeVisible();
  }

  // Fill the input with given value
  async enterArray(value) {
    await this.input.fill(value);
  }

  // Click the Sort button
  async clickSort() {
    await this.sortButton.click();
  }

  // Get the visible sorted text
  async getSortedText() {
    return (await this.sortedOutput.textContent())?.trim() ?? '';
  }
}

test.describe('Quick Sort Demo - UI and Behavior', () => {
  // Collect console messages and page errors for each test to assert runtime errors
  let consoleMessages;
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    consoleErrors = [];
    pageErrors = [];

    // Listen to all console messages and page errors without modifying the page
    page.on('console', (msg) => {
      const text = `${msg.type()}: ${msg.text()}`;
      consoleMessages.push(text);
      if (msg.type() === 'error') {
        consoleErrors.push(text);
      }
    });

    page.on('pageerror', (err) => {
      // pageerror receives Error objects thrown on the page
      pageErrors.push(err && err.message ? err.message : String(err));
    });
  });

  test.afterEach(async () => {
    // Basic sanity check that no unexpected runtime errors were emitted during the test run.
    // Tests below will also assert these arrays where appropriate.
    // We don't fail the entire test suite here; individual tests assert expectations themselves.
  });

  test('Initial page load shows heading, input and empty output', async ({ page }) => {
    // Purpose: Verify initial UI elements and default state on load.
    const quickSort = new QuickSortPage(page);
    await quickSort.goto();

    // Input should be visible and have the placeholder text shown in the HTML
    await expect(quickSort.input).toBeVisible();
    await expect(quickSort.input).toHaveAttribute('placeholder', 'e.g. 34,7,23,32,5,62');

    // Sort button should be visible and enabled
    await expect(quickSort.sortButton).toBeVisible();
    await expect(quickSort.sortButton).toBeEnabled();

    // On initial load, the sortedArray div should be empty (no text)
    const initialText = await quickSort.getSortedText();
    expect(initialText).toBe('', 'Expected no sorted output on initial load');

    // Assert no page runtime errors or console error messages were emitted during load
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  test('Sorts a typical numeric array correctly', async ({ page }) => {
    // Purpose: Validate sorting behavior for a common numeric input set.
    const quickSort1 = new QuickSortPage(page);
    await quickSort.goto();

    // Enter sample numbers and click Sort
    await quickSort.enterArray('34,7,23,32,5,62');
    await quickSort.clickSort();

    // The implementation converts strings to numbers and performs quickSort returning numeric order.
    const output = await quickSort.getSortedText();
    expect(output).toBe('Sorted Array: 5, 7, 23, 32, 34, 62', 'Expected ascending sorted array output');

    // Ensure no runtime errors occurred during the operation
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  test('Handles inputs with extra spaces and varying whitespace', async ({ page }) => {
    // Purpose: Verify trimming/whitespace handling via Number conversion and correct sorting.
    const quickSort2 = new QuickSortPage(page);
    await quickSort.goto();

    // Input contains spaces around numbers
    await quickSort.enterArray('  10 , 3,  7,2  ');
    await quickSort.clickSort();

    const output1 = await quickSort.getSortedText();
    // Number('  10 ') -> 10 etc.
    expect(output).toBe('Sorted Array: 2, 3, 7, 10', 'Expected whitespace-tolerant numeric parsing and correct sort');

    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  test('Handles duplicates and negative numbers correctly', async ({ page }) => {
    // Purpose: Ensure algorithm handles negative values and duplicate entries.
    const quickSort3 = new QuickSortPage(page);
    await quickSort.goto();

    await quickSort.enterArray('-1,5,5,0,-10');
    await quickSort.clickSort();

    const output2 = await quickSort.getSortedText();
    expect(output).toBe('Sorted Array: -10, -1, 0, 5, 5', 'Expected sorted order with negatives and duplicates preserved appropriately');

    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  test('Empty input produces a 0 because Number(\"\") === 0 in implementation', async ({ page }) => {
    // Purpose: Verify the actual behavior for empty input according to the implementation (not necessarily "correct" by UX standards).
    const quickSort4 = new QuickSortPage(page);
    await quickSort.goto();

    // Clear input (ensure empty string)
    await quickSort.enterArray('');
    await quickSort.clickSort();

    const output3 = await quickSort.getSortedText();
    // Implementation: ''.split(',') -> ['']; [''].map(Number) -> [0]; sorted => [0]
    expect(output).toBe('Sorted Array: 0', 'Implementation converts empty input to numeric 0 and displays it');

    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  test('Non-numeric tokens produce NaN values visible in output (reflects current implementation)', async ({ page }) => {
    // Purpose: Confirm that non-numeric strings are converted to NaN and are present in the sorted output (observing current behavior).
    const quickSort5 = new QuickSortPage(page);
    await quickSort.goto();

    // Input that contains non-numeric tokens
    await quickSort.enterArray('a,b,3');
    await quickSort.clickSort();

    const output4 = await quickSort.getSortedText();
    // Based on the implementation the result should be: 3, NaN, NaN
    expect(output).toBe('Sorted Array: 3, NaN, NaN', 'Non-numeric tokens are converted to NaN and appear in the sorted output');

    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  test('Single element and already sorted arrays are handled idempotently', async ({ page }) => {
    // Purpose: Ensure stability when sorting trivial or already sorted inputs.
    const quickSort6 = new QuickSortPage(page);
    await quickSort.goto();

    // Single element
    await quickSort.enterArray('42');
    await quickSort.clickSort();
    let output5 = await quickSort.getSortedText();
    expect(output).toBe('Sorted Array: 42', 'Single-element input should return the same single value');

    // Already sorted multiple elements
    await quickSort.enterArray('1,2,3,4,5');
    await quickSort.clickSort();
    output = await quickSort.getSortedText();
    expect(output).toBe('Sorted Array: 1, 2, 3, 4, 5', 'Already sorted array should remain sorted');

    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  test('Observes console and page error streams across interactions', async ({ page }) => {
    // Purpose: Collect runtime diagnostic information while exercising UI to ensure no unhandled exceptions are emitted.
    const quickSort7 = new QuickSortPage(page);
    await quickSort.goto();

    await quickSort.enterArray('10,9,8');
    await quickSort.clickSort();

    await quickSort.enterArray('a,,b,'); // includes empty tokens and NaNs
    await quickSort.clickSort();

    // Verify that console messages were recorded (there may be informational logs), but there should be no console errors or page errors
    // We assert that any console output present does not include error-level messages.
    expect(consoleErrors.length).toBe(0, `Expected no console.error messages, found: ${JSON.stringify(consoleErrors)}`);
    expect(pageErrors.length).toBe(0, `Expected no page errors, found: ${JSON.stringify(pageErrors)}`);

    // Also ensure we have observed some console entries (not required, but helpful)
    // Note: The page may not emit console logs; this assertion is permissive and will not fail if none exist.
    // If consoleMessages length is 0, that's acceptable.
  });
});