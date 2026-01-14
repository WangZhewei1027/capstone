import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/088924c7-d59e-11f0-b3ae-79d1ce7b5503.html';

// Page Object Model for the Sliding Window page
class SlidingWindowPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.inputArray = page.locator('#inputArray');
    this.windowSize = page.locator('#windowSize');
    this.calculateButton = page.locator('button', { hasText: 'Calculate Moving Average' });
    this.result = page.locator('#result');
    this.heading = page.locator('h1');
  }

  async goto() {
    await this.page.goto(APP_URL);
    // Wait for the main elements to be visible
    await Promise.all([
      this.inputArray.waitFor({ state: 'visible' }),
      this.windowSize.waitFor({ state: 'visible' }),
      this.calculateButton.waitFor({ state: 'visible' }),
    ]);
  }

  async enterArray(value) {
    await this.inputArray.fill(value);
  }

  async enterWindowSize(value) {
    // Use fill to ensure the value is set (number input accepts string)
    await this.windowSize.fill(String(value));
  }

  async clickCalculate() {
    await this.calculateButton.click();
  }

  async getResultText() {
    return (await this.result.textContent()) ?? '';
  }
}

test.describe('Sliding Window Application (Sliding Window Demonstration)', () => {
  // Collect console messages and page errors to assert later in tests
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Listen to console events
    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Listen to uncaught exceptions on the page
    page.on('pageerror', err => {
      // Capture the error object / message for assertions
      pageErrors.push(err);
    });
  });

  test('Initial page load - elements are visible and default state is empty', async ({ page }) => {
    // Purpose: Verify initial load, basic DOM elements, and that there are no runtime errors on load.
    const app = new SlidingWindowPage(page);
    await app.goto();

    // Check the heading is correct and visible
    await expect(app.heading).toBeVisible();
    await expect(app.heading).toHaveText('Sliding Window Demonstration');

    // Input fields and button are visible and empty by default
    await expect(app.inputArray).toBeVisible();
    await expect(app.windowSize).toBeVisible();
    await expect(app.calculateButton).toBeVisible();

    // By default the result div should be empty (no prior calculations)
    const resultText = await app.getResultText();
    expect(resultText.trim()).toBe('');

    // Assert there are no severe page errors (ReferenceError, SyntaxError, TypeError) on load
    // The pageErrors array should be empty
    expect(pageErrors.length).toBe(0);

    // Assert no console.error messages were logged
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  test('Calculates moving averages for a valid input array and window size 3', async ({ page }) => {
    // Purpose: End-to-end flow: user enters numbers and window size, clicks calculate, and sees expected averages.
    const app1 = new SlidingWindowPage(page);
    await app.goto();

    await app.enterArray('1,2,3,4,5');
    await app.enterWindowSize(3);
    await app.clickCalculate();

    // Expect the exact moving averages for window size 3: [2, 3, 4]
    // The application formats result like: "Moving Averages: 2, 3, 4"
    await expect(app.result).toBeVisible();
    await expect(app.result).toHaveText('Moving Averages: 2, 3, 4');

    // Ensure no runtime page errors occurred during the calculation
    expect(pageErrors.length).toBe(0);

    // Ensure no console.error messages were emitted during the calculation
    const consoleErrors1 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  test('Window size 1 returns the original numbers as moving averages', async ({ page }) => {
    // Purpose: Edge case where window size is 1; moving averages should equal original numbers.
    const app2 = new SlidingWindowPage(page);
    await app.goto();

    await app.enterArray('5,10,15');
    await app.enterWindowSize(1);
    await app.clickCalculate();

    await expect(app.result).toHaveText('Moving Averages: 5, 10, 15');

    // No page errors expected
    expect(pageErrors.length).toBe(0);
  });

  test('Window size larger than the array yields empty moving averages string', async ({ page }) => {
    // Purpose: If window size exceeds array length, the result should display "Moving Averages: " with no numbers.
    const app3 = new SlidingWindowPage(page);
    await app.goto();

    await app.enterArray('1,2,3');
    await app.enterWindowSize(10);
    await app.clickCalculate();

    // The implementation constructs: 'Moving Averages: ' + movingAverages.join(', ')
    // If movingAverages is empty, join returns '', so expect the trailing space after colon.
    const text = await app.getResultText();
    expect(text).toBe('Moving Averages: ');

    // Assert no runtime errors during this operation
    expect(pageErrors.length).toBe(0);
  });

  test('Shows validation message when inputs are missing or invalid', async ({ page }) => {
    // Purpose: Verify error messages for missing input and when all array items are non-numeric.
    const app4 = new SlidingWindowPage(page);
    await app.goto();

    // Case 1: Both fields empty
    await app.enterArray('');
    await app.enterWindowSize('');
    await app.clickCalculate();
    await expect(app.result).toHaveText('Please enter a valid array and window size.');

    // Case 2: Window size is zero (invalid)
    await app.enterArray('1,2,3');
    await app.enterWindowSize(0);
    await app.clickCalculate();
    await expect(app.result).toHaveText('Please enter a valid array and window size.');

    // Case 3: Array contains only non-numeric values -> filtered out -> "Please enter a valid array of numbers."
    await app.enterArray('a,b,c');
    await app.enterWindowSize(2);
    await app.clickCalculate();
    await expect(app.result).toHaveText('Please enter a valid array of numbers.');

    // Confirm no uncaught page errors occurred
    expect(pageErrors.length).toBe(0);
  });

  test('Handles mixed numeric and non-numeric tokens by ignoring non-numeric values', async ({ page }) => {
    // Purpose: The implementation filters out NaN after parseFloat; confirm behavior for mixed input.
    const app5 = new SlidingWindowPage(page);
    await app.goto();

    // Mixed tokens: 1, x, 2, y, 3 -> numeric array becomes [1,2,3]; window 2 -> averages [1.5, 2.5]
    await app.enterArray('1, x, 2, y, 3');
    await app.enterWindowSize(2);
    await app.clickCalculate();

    // Because parseFloat on ' x' returns NaN which is filtered out
    await expect(app.result).toHaveText('Moving Averages: 1.5, 2.5');

    // No runtime errors expected
    expect(pageErrors.length).toBe(0);
  });

  test('Accessibility and visibility checks for interactive controls', async ({ page }) => {
    // Purpose: Ensure inputs and button are visible, enabled and focusable.
    const app6 = new SlidingWindowPage(page);
    await app.goto();

    await expect(app.inputArray).toBeVisible();
    await expect(app.inputArray).toBeEnabled();
    await expect(app.windowSize).toBeVisible();
    await expect(app.windowSize).toBeEnabled();
    await expect(app.calculateButton).toBeVisible();
    await expect(app.calculateButton).toBeEnabled();

    // Focus order: focus the array input, then window, then button
    await app.inputArray.focus();
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('inputArray');

    await app.windowSize.focus();
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('windowSize');

    await app.calculateButton.focus();
    // The button has no id; assert activeElement is a button
    const activeTag = await page.evaluate(() => document.activeElement?.tagName);
    expect(activeTag).toBe('BUTTON');

    // No page errors
    expect(pageErrors.length).toBe(0);
  });
});