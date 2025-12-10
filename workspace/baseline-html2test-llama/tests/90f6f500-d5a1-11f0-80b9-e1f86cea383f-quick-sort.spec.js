import { test, expect } from '@playwright/test';

// Page Object for the Quick Sort demo page
class QuickSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.url = 'http://127.0.0.1:5500/workspace/baseline-html2test-llama/html/90f6f500-d5a1-11f0-80b9-e1f86cea383f.html';
    this.arraySizeInput = '#array-size';
    this.sortButton = '#sort-button';
    this.output = '#output';
  }

  async goto() {
    await this.page.goto(this.url);
  }

  async getTitle() {
    return this.page.title();
  }

  async getArraySizeValue() {
    return this.page.$eval(this.arraySizeInput, el => el.value);
  }

  async setArraySize(value) {
    // Use fill to ensure number input updates
    await this.page.fill(this.arraySizeInput, String(value));
  }

  async clickSort() {
    await Promise.all([
      // clicking may cause DOM update synchronously; still wrap in Promise.all for consistency
      this.page.click(this.sortButton)
    ]);
  }

  // Wait until output contains the prefix "Sorted Array:" (after clicking sort)
  async waitForOutputUpdate() {
    await this.page.waitForFunction(
      selector => {
        const el = document.querySelector(selector);
        return el && el.innerText.trim().length > 0;
      },
      this.output
    );
  }

  // Parse numbers from the output text: "Sorted Array: 1, 2, 3"
  async getOutputNumbers() {
    const text = await this.page.$eval(this.output, el => el.innerText);
    const prefix = 'Sorted Array:';
    if (!text || !text.includes(prefix)) return [];
    const after = text.split(prefix)[1].trim();
    if (after === '') return [];
    return after.split(',').map(s => s.trim()).filter(s => s !== '').map(s => Number(s));
  }

  async getOutputText() {
    return this.page.$eval(this.output, el => el.innerText);
  }
}

// Helper to assert non-decreasing order
function isNonDecreasing(arr) {
  for (let i = 0; i + 1 < arr.length; i++) {
    if (arr[i] > arr[i + 1]) return false;
  }
  return true;
}

test.describe('Quick Sort App (90f6f500-d5a1-11f0-80b9-e1f86cea383f)', () => {
  // Will hold errors and console messages for each test
  let pageErrors;
  let consoleMessages;

  test.beforeEach(async ({ page }) => {
    // Initialize trackers for console and page errors
    pageErrors = [];
    consoleMessages = [];

    page.on('pageerror', err => {
      // Collect runtime exceptions (ReferenceError, TypeError, etc.)
      pageErrors.push(err);
    });

    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
  });

  test.afterEach(async ({ page }) => {
    // Sanity check: ensure no uncaught page errors occurred during the test
    // This is a deliberate assertion to observe runtime errors; tests will fail if there are page errors
    expect(pageErrors.length).toBe(0, `Expected no page errors, but got: ${pageErrors.map(e => String(e)).join('\n')}`);

    // Also ensure no console messages of type 'error' were emitted
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0, `Expected no console.error messages, but got: ${consoleErrors.map(e => e.text).join('\n')}`);
  });

  test('Initial page load shows correct static elements and default state', async ({ page }) => {
    // Purpose: Verify the page loads, title is correct, input and button exist and default state is as expected
    const qs = new QuickSortPage(page);
    await qs.goto();

    // Title should include "Quick Sort"
    const title = await qs.getTitle();
    expect(title).toContain('Quick Sort');

    // The size input should be visible and default to "5"
    const arraySizeValue = await qs.getArraySizeValue();
    expect(arraySizeValue).toBe('5');

    // Sort button should be visible and enabled
    await expect(page.locator(qs.sortButton)).toBeVisible();
    await expect(page.locator(qs.sortButton)).toBeEnabled();

    // Output area should be present and initially empty
    const outputText = await qs.getOutputText();
    expect(outputText.trim()).toBe('');

    // Ensure we observed no runtime errors up to this point (checked in afterEach as well)
  });

  test('Clicking Sort with default size produces a sorted (non-decreasing) list and updates DOM', async ({ page }) => {
    // Purpose: Validate clicking Sort generates an array, sorts it, and updates #output content
    const qs1 = new QuickSortPage(page);
    await qs.goto();

    // Click the sort button and wait for output update
    await qs.clickSort();
    await qs.waitForOutputUpdate();

    const outputText1 = await qs.getOutputText();
    expect(outputText.startsWith('Sorted Array:')).toBeTruthy();

    const numbers = await qs.getOutputNumbers();

    // The implementation uses parseInt on the input; default input is "5".
    // Observed behavior of the algorithm: for sizes >= 2, it appends an extra pivot,
    // resulting in output length = requestedSize + 1 (this is a property of the given JS).
    const requestedSize = 5;
    if (requestedSize <= 1) {
      expect(numbers.length).toBe(requestedSize);
    } else {
      expect(numbers.length).toBe(requestedSize + 1);
    }

    // Assert the resulting sequence is non-decreasing (sorted ascending or equal)
    expect(isNonDecreasing(numbers)).toBeTruthy();

    // Also verify that the output text is visible to the user
    await expect(page.locator(qs.output)).toBeVisible();
  });

  test('Edge case: array size of 0 results in empty Sorted Array output', async ({ page }) => {
    // Purpose: Test behavior when array size is zero (should not throw, should show empty result)
    const qs2 = new QuickSortPage(page);
    await qs.goto();

    await qs.setArraySize(0);
    const val = await qs.getArraySizeValue();
    expect(val).toBe('0');

    await qs.clickSort();
    // wait for output to change from empty to "Sorted Array:" even if empty list
    await qs.waitForOutputUpdate();

    const outputText2 = await qs.getOutputText();
    expect(outputText.startsWith('Sorted Array:')).toBeTruthy();

    const numbers1 = await qs.getOutputNumbers();
    expect(numbers.length).toBe(0);
  });

  test('Edge case: negative array size behaves gracefully (treated as zero elements)', async ({ page }) => {
    // Purpose: Negative sizes should not crash the app; they effectively create zero-length arrays
    const qs3 = new QuickSortPage(page);
    await qs.goto();

    // Set a negative number
    await qs.setArraySize(-3);
    const val1 = await qs.getArraySizeValue();
    // HTML number input may keep the negative value textual; verify it's set
    expect(val).toBe('-3');

    await qs.clickSort();
    await qs.waitForOutputUpdate();

    const numbers2 = await qs.getOutputNumbers();
    // Negative array sizes should lead to zero generated elements
    expect(numbers.length).toBe(0);

    const outputText3 = await qs.getOutputText();
    expect(outputText.startsWith('Sorted Array:')).toBeTruthy();
  });

  test('Edge case: non-integer (float) sizes are parsed with parseInt and behave accordingly', async ({ page }) => {
    // Purpose: Ensure parseInt parsing behavior is observed by the UI (3.7 -> 3)
    const qs4 = new QuickSortPage(page);
    await qs.goto();

    await qs.setArraySize('3.7');
    const val2 = await qs.getArraySizeValue();
    // The input stores the string; parseInt in app will interpret it as 3
    expect(val).toBe('3.7');

    await qs.clickSort();
    await qs.waitForOutputUpdate();

    const numbers3 = await qs.getOutputNumbers();
    // parseInt(3.7) => 3; for requestedSize 3 the implementation produces 3+1 = 4 numbers (for sizes >=2)
    expect(numbers.length).toBe(4);

    // Ensure the resulting array is non-decreasing
    expect(isNonDecreasing(numbers)).toBeTruthy();
  });

  test('Multiple consecutive sorts update the output each time and remain stable', async ({ page }) => {
    // Purpose: Clicking Sort multiple times should update output each time without causing errors
    const qs5 = new QuickSortPage(page);
    await qs.goto();

    // First run with size 4
    await qs.setArraySize(4);
    await qs.clickSort();
    await qs.waitForOutputUpdate();
    const numbersFirst = await qs.getOutputNumbers();
    expect(numbersFirst.length).toBe(5); // 4 -> 5 due to known behavior
    expect(isNonDecreasing(numbersFirst)).toBeTruthy();

    // Second run with size 2
    await qs.setArraySize(2);
    await qs.clickSort();
    await qs.waitForOutputUpdate();
    const numbersSecond = await qs.getOutputNumbers();
    // 2 -> expected 3 numbers
    expect(numbersSecond.length).toBe(3);
    expect(isNonDecreasing(numbersSecond)).toBeTruthy();

    // Third run with size 1
    await qs.setArraySize(1);
    await qs.clickSort();
    await qs.waitForOutputUpdate();
    const numbersThird = await qs.getOutputNumbers();
    // size 1 should result in 1 number (base case)
    expect(numbersThird.length).toBe(1);
    expect(isNonDecreasing(numbersThird)).toBeTruthy();
  });
});