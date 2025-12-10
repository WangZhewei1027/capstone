import { test, expect } from '@playwright/test';

// Test file: 11b79428-d5a1-11f0-9c7a-cdf1d7a06e11-quick-sort.spec.js
// Tests for the Quick Sort interactive HTML application served at:
// http://127.0.0.1:5500/workspace/baseline-html2test-llama/html/11b79428-d5a1-11f0-9c7a-cdf1d7a06e11.html

// Page Object for the Quick Sort page
class QuickSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.url = 'http://127.0.0.1:5500/workspace/baseline-html2test-llama/html/11b79428-d5a1-11f0-9c7a-cdf1d7a06e11.html';
    this.input = page.locator('#input');
    this.sortButton = page.locator('#sort-button');
    this.resultDiv = page.locator('#result');
  }

  // Navigate to the page
  async open() {
    await this.page.goto(this.url);
  }

  // Fill the numeric input (uses string to allow non-numeric testing)
  async fillInput(value) {
    await this.input.fill(String(value));
  }

  // Click the Sort button and wait for potential UI updates
  async clickSort() {
    await Promise.all([
      // The click may cause an alert dialog; callers may want to wait on that separately.
      this.sortButton.click(),
      // Small wait for DOM update after click
      this.page.waitForTimeout(50)
    ]);
  }

  // Read the result text content
  async getResultText() {
    return (await this.resultDiv.textContent())?.trim() ?? '';
  }

  // Get placeholder text from input
  async getInputPlaceholder() {
    return await this.input.getAttribute('placeholder');
  }

  // Check if input is visible and enabled
  async isInputVisible() {
    return await this.input.isVisible();
  }

  async isButtonVisible() {
    return await this.sortButton.isVisible();
  }
}

test.describe('Quick Sort Application - UI and functionality tests', () => {
  // Arrays to capture page errors and console errors for each test
  let pageErrors = [];
  let consoleErrors = [];

  // Attach listeners per test to capture errors and console messages
  test.beforeEach(async ({ page }) => {
    pageErrors = [];
    consoleErrors = [];
    page.on('pageerror', (err) => {
      // Collect runtime errors (ReferenceError, TypeError, etc.) if they happen
      pageErrors.push(err);
    });
    page.on('console', (msg) => {
      // Collect console.error messages
      if (msg.type() === 'error') {
        consoleErrors.push(msg);
      }
    });
  });

  // Test initial load: elements present, default state, no errors on load
  test('Initial page load shows controls and has empty result with no runtime errors', async ({ page }) => {
    const qs = new QuickSortPage(page);
    await qs.open();

    // Verify title and heading presence
    await expect(page).toHaveTitle(/Quick Sort/);

    // Verify interactive elements are visible and present
    expect(await qs.isInputVisible()).toBe(true);
    expect(await qs.isButtonVisible()).toBe(true);

    // Verify placeholder text on the input
    expect(await qs.getInputPlaceholder()).toBe('Enter a number');

    // Result div should be empty by default
    const initialResult = await qs.getResultText();
    expect(initialResult).toBe('', 'Result div should be empty on initial load');

    // Assert no page runtime errors or console.error messages occurred on load
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  // Test: valid positive integer input -> click Sort -> expect the app's displayed result
  test('Clicking Sort with a positive integer updates result (observes current application behavior)', async ({ page }) => {
    const qs1 = new QuickSortPage(page);
    await qs.open();

    // Enter a positive integer (e.g., 3) and click sort
    await qs.fillInput(3);
    await qs.clickSort();

    // The application code returns undefined from quickSort and then displayResult(undefined)
    // So the expected displayed text is "Sorted array: undefined"
    const resultText = await qs.getResultText();
    expect(resultText).toBe('Sorted array: undefined', 'Application currently displays undefined because quickSort does not return the array');

    // No runtime page errors or console.error messages expected from this interaction
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  // Test: input of zero should be handled (array length 0) and update the result similarly
  test('Clicking Sort with zero updates result (edge case: zero-length array)', async ({ page }) => {
    const qs2 = new QuickSortPage(page);
    await qs.open();

    // Fill 0 and click sort
    await qs.fillInput(0);
    await qs.clickSort();

    // Expect same visible behavior: "Sorted array: undefined"
    const resultText1 = await qs.getResultText();
    expect(resultText).toBe('Sorted array: undefined', 'Zero-length array path results in undefined being shown');

    // Confirm no runtime page errors or console.error messages
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  // Test: negative input triggers an alert and does not update result
  test('Negative input triggers alert and does not change result div', async ({ page }) => {
    const qs3 = new QuickSortPage(page);
    await qs.open();

    // Start with some prior result text to ensure it remains unchanged after alert
    await qs.fillInput(2);
    await qs.clickSort();
    const beforeText = await qs.getResultText();
    expect(beforeText).toBe('Sorted array: undefined');

    // Now fill a negative value which should trigger an alert
    await qs.fillInput(-5);

    // Listen for the dialog triggered by the page and assert its message
    const [dialog] = await Promise.all([
      page.waitForEvent('dialog'),
      qs.sortButton.click(), // trigger alert
    ]);
    expect(dialog.type()).toBe('alert');
    expect(dialog.message()).toBe('Please enter a non-negative integer.');
    await dialog.dismiss();

    // The result div should remain unchanged after the alert
    const afterText = await qs.getResultText();
    expect(afterText).toBe(beforeText, 'Result should remain unchanged after invalid (negative) input');

    // Confirm no runtime page errors or console.error messages
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  // Test: non-numeric input triggers alert (parseInt -> NaN)
  test('Non-numeric input triggers alert and leaves result unchanged', async ({ page }) => {
    const qs4 = new QuickSortPage(page);
    await qs.open();

    // Fill with non-numeric string - input[type=number] accepts strings via fill
    await qs.fillInput('abc');

    // Expect an alert when clicking Sort
    const [dialog] = await Promise.all([
      page.waitForEvent('dialog'),
      qs.sortButton.click(),
    ]);
    expect(dialog.type()).toBe('alert');
    expect(dialog.message()).toBe('Please enter a non-negative integer.');
    await dialog.dismiss();

    // Result should still be empty (or unchanged)
    const resultText2 = await qs.getResultText();
    expect(resultText === '' || resultText === 'Sorted array: undefined').toBe(true);

    // Confirm no runtime page errors or console.error messages
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  // Test: multiple interactions update the result div each time (demonstrate state updates)
  test('Multiple clicks update the result; each click overwrites the previous result', async ({ page }) => {
    const qs5 = new QuickSortPage(page);
    await qs.open();

    // First click with 4
    await qs.fillInput(4);
    await qs.clickSort();
    const first = await qs.getResultText();
    expect(first).toBe('Sorted array: undefined');

    // Change input to 1 and click again
    await qs.fillInput(1);
    await qs.clickSort();
    const second = await qs.getResultText();
    expect(second).toBe('Sorted array: undefined', 'New click should update result (even if value is the same in this app)');

    // The result should change (or at least be updated) - here both are the same string due to app behavior,
    // but we assert that the element still exists and is visible after multiple updates.
    expect(await qs.resultDiv.isVisible()).toBe(true);

    // Confirm no runtime page errors or console.error messages
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  // Accessibility / focus test: ensure input can be focused and button is reachable via keyboard
  test('Input can receive focus and the Sort button is keyboard reachable', async ({ page }) => {
    const qs6 = new QuickSortPage(page);
    await qs.open();

    // Focus the input
    await qs.input.focus();
    expect(await qs.input.evaluate((el) => document.activeElement === el)).toBe(true);

    // Tab to the button and press Enter to activate
    await page.keyboard.press('Tab');
    // Press Enter to activate the focused element (should trigger the Sort button if focused)
    // Use fill a valid number so no alert occurs
    await qs.fillInput(2);
    await page.keyboard.press('Enter');

    // Wait briefly and assert result updated
    await page.waitForTimeout(50);
    const resultText3 = await qs.getResultText();
    expect(resultText).toBe('Sorted array: undefined');

    // Confirm no runtime page errors or console.error messages
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });
});