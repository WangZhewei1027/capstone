import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-llama/html/90f6cdf2-d5a1-11f0-80b9-e1f86cea383f.html';

// Page Object for the Bubble Sort page
class BubbleSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input = page.locator('#n');
    this.sortBtn = page.locator('#sort-btn');
    this.resetBtn = page.locator('#reset-btn');
    this.result = page.locator('.result');
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async enterN(value) {
    await this.input.fill(String(value));
  }

  async clearInput() {
    await this.input.fill('');
  }

  async clickSort() {
    await this.sortBtn.click();
  }

  async clickReset() {
    await this.resetBtn.click();
  }

  // Returns normalized textContent of the result div
  async getResultText() {
    const text = await this.result.evaluate((el) => el.textContent || '');
    // Normalize whitespace and remove trailing newlines
    return text.replace(/\s+/g, ' ').trim();
  }

  async isResetVisible() {
    // Use the locator's isVisible which respects display:none
    return await this.resetBtn.isVisible();
  }
}

test.describe('Bubble Sort App - 90f6cdf2-d5a1-11f0-80b9-e1f86cea383f', () => {
  // Capture console errors and page errors for each test
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Collect console error messages
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Collect uncaught page errors (ReferenceError, TypeError, etc.)
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });
  });

  // Test initial page load and default state
  test('Initial load: controls present, reset hidden, result empty', async ({ page }) => {
    const app = new BubbleSortPage(page);
    await app.goto();

    // Verify heading and input/button elements are present in the DOM
    await expect(page.locator('h2')).toHaveText('Bubble Sort Algorithm');
    await expect(app.input).toBeVisible();
    await expect(app.sortBtn).toBeVisible();

    // Reset button should be hidden (display)
    const resetVisible = await app.isResetVisible();
    expect(resetVisible).toBeFalsy();

    // Result area should be empty on initial load
    const resultText = await app.getResultText();
    expect(resultText).toBe('');

    // Assert there are no console errors or uncaught page errors on load
    expect(consoleErrors).toHaveLength(0);
    expect(pageErrors).toHaveLength(0);
  });

  // Test sorting with a typical positive integer
  test('Sort 5 elements: displays sorted array "0 1 2 3 4"', async ({ page }) => {
    const app1 = new BubbleSortPage(page);
    await app.goto();

    // Enter 5 and click sort
    await app.enterN(5);
    await app.clickSort();

    // Verify result text contains the expected sorted sequence
    const resultText1 = await app.getResultText();
    expect(resultText).toContain('Sorted array:');
    // Expect numbers 0..4 in order with spaces
    expect(resultText).toContain('0 1 2 3 4');

    // Reset should remain hidden (no code shows it)
    const resetVisible1 = await app.isResetVisible();
    expect(resetVisible).toBeFalsy();

    // No console or page errors produced by sorting
    expect(consoleErrors).toHaveLength(0);
    expect(pageErrors).toHaveLength(0);
  });

  // Test edge case: entering 0 should trigger an alert and prevent sorting
  test('Entering 0 triggers alert "Please enter a positive integer."', async ({ page }) => {
    const app2 = new BubbleSortPage(page);
    await app.goto();

    // Ensure result is empty before the action
    const before = await app.getResultText();
    expect(before).toBe('');

    // Prepare to capture the dialog triggered by clicking sort with n=0
    const dialogPromise = page.waitForEvent('dialog');

    await app.enterN(0);
    // Click sort which should trigger an alert dialog
    await app.clickSort();

    // Wait for and verify the dialog message, then accept it
    const dialog = await dialogPromise;
    expect(dialog.message()).toBe('Please enter a positive integer.');
    await dialog.accept();

    // After dismissing the alert, result should still be unchanged (no sorted output)
    const after = await app.getResultText();
    // The app's sortBtn handler returns early on n <= 0, so result remains empty
    expect(after).toBe('');

    // No uncaught exceptions or console errors resulted from the alert flow
    expect(consoleErrors).toHaveLength(0);
    expect(pageErrors).toHaveLength(0);
  });

  // Test empty input (NaN) behavior: parseInt('') -> NaN; bubbleSort called with NaN => shows header only
  test('Empty input leads to "Sorted array:" with no elements (handles NaN gracefully)', async ({ page }) => {
    const app3 = new BubbleSortPage(page);
    await app.goto();

    // Clear input to ensure it's empty and click sort
    await app.clearInput();

    await app.clickSort();

    // The code will call bubbleSort(NaN) which results in resultDiv being 'Sorted array:' with no numbers
    const resultText2 = await app.getResultText();
    // Normalize and assert it contains the header but no numeric elements
    expect(resultText).toContain('Sorted array:');
    // There should be no digits following 'Sorted array:' in this case
    // Use a regex to ensure no numbers exist in the result
    const digitsMatch = resultText.match(/\d+/);
    expect(digitsMatch).toBeNull();

    // Ensure no console or page errors happened
    expect(consoleErrors).toHaveLength(0);
    expect(pageErrors).toHaveLength(0);
  });

  // Test minimal valid input n=1
  test('Sorting 1 element displays "0"', async ({ page }) => {
    const app4 = new BubbleSortPage(page);
    await app.goto();

    await app.enterN(1);
    await app.clickSort();

    const resultText3 = await app.getResultText();
    expect(resultText).toContain('Sorted array:');
    expect(resultText).toContain('0');

    // No console or page errors
    expect(consoleErrors).toHaveLength(0);
    expect(pageErrors).toHaveLength(0);
  });

  // Accessibility and visibility check for interactive elements
  test('Interactive controls have accessible roles and are keyboard focusable', async ({ page }) => {
    const app5 = new BubbleSortPage(page);
    await app.goto();

    // Buttons should be focusable via keyboard tabbing; simulate focus
    await app.sortBtn.focus();
    expect(await app.sortBtn.evaluate((el) => document.activeElement === el)).toBeTruthy();

    // Input should be focusable and accept typing
    await app.input.focus();
    expect(await app.input.evaluate((el) => document.activeElement === el)).toBeTruthy();
    await app.input.fill('2');
    expect(await app.input.inputValue()).toBe('2');

    // No console or page errors during these interactions
    expect(consoleErrors).toHaveLength(0);
    expect(pageErrors).toHaveLength(0);
  });
});