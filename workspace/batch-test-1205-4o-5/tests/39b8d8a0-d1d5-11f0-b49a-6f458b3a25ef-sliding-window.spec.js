import { test, expect } from '@playwright/test';

// Test file: 39b8d8a0-d1d5-11f0-b49a-6f458b3a25ef-sliding-window.spec.js
// Application URL (served externally as per instructions)
const APP_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-4o-5/html/39b8d8a0-d1d5-11f0-b49a-6f458b3a25ef.html';

// Page Object Model for the Sliding Window page
class SlidingWindowPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.arrayInput = page.locator('#arrayInput');
    this.windowSizeInput = page.locator('#windowSizeInput');
    this.calculateButton = page.locator('#calculateButton');
    this.result = page.locator('#result');
  }

  // Navigate to the application page
  async goto() {
    await this.page.goto(APP_URL);
    // Wait for main elements to be visible
    await Promise.all([
      this.arrayInput.waitFor({ state: 'visible' }),
      this.windowSizeInput.waitFor({ state: 'visible' }),
      this.calculateButton.waitFor({ state: 'visible' }),
    ]);
  }

  // Fill the array input (string with comma-separated values)
  async setArray(value) {
    await this.arrayInput.fill('');
    await this.arrayInput.type(value);
  }

  // Fill the window size (as number or string)
  async setWindowSize(value) {
    await this.windowSizeInput.fill('');
    await this.windowSizeInput.type(String(value));
  }

  // Click the calculate button
  async clickCalculate() {
    await this.calculateButton.click();
  }

  // Get result text content
  async getResultText() {
    return (await this.result.textContent()) || '';
  }
}

test.describe('Sliding Window Technique - Interactive Tests', () => {
  // Arrays to capture console and page errors during each test
  let consoleErrors;
  let pageErrors;

  // Setup before each test: visit page and attach error listeners
  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Capture console error messages
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Capture uncaught page errors
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    // Navigate to the app
    const swPage = new SlidingWindowPage(page);
    await swPage.goto();
  });

  // Teardown after each test: assert no uncaught page errors or console errors occurred
  test.afterEach(async () => {
    // Ensure that no unexpected runtime errors were logged to the console or emitted as page errors.
    // If errors do exist, include them in the assertion message to aid debugging.
    expect(pageErrors.length, `Expected no uncaught page errors, but found: ${pageErrors.map(e => String(e)).join('; ')}`).toBe(0);
    expect(consoleErrors.length, `Expected no console.error() messages, but found: ${consoleErrors.join(' | ')}`).toBe(0);
  });

  // Test initial page load and default state
  test('Initial load: inputs are visible and result area is empty', async ({ page }) => {
    const sw = new SlidingWindowPage(page);

    // Assert the placeholders and visibility of inputs and button
    await expect(sw.arrayInput).toBeVisible();
    await expect(sw.windowSizeInput).toBeVisible();
    await expect(sw.calculateButton).toBeVisible();

    // Check placeholders text to ensure inputs are correctly wired
    await expect(sw.arrayInput).toHaveAttribute('placeholder', /Enter numbers/i);
    await expect(sw.windowSizeInput).toHaveAttribute('placeholder', /Window Size/i);

    // By default, result should be empty
    const resultText = await sw.getResultText();
    expect(resultText).toBe('', 'Expected result area to be empty on initial load');
  });

  // Test valid calculation for a small array and window
  test('Calculate maximum sum for array "1,2,3,4,5" with window size 2', async ({ page }) => {
    const sw1 = new SlidingWindowPage(page);

    // Enter the array and window size then click calculate
    await sw.setArray('1,2,3,4,5');
    await sw.setWindowSize(2);
    await sw.clickCalculate();

    // Verify the result text is correct
    const resultText1 = await sw.getResultText();
    expect(resultText).toContain('Maximum sum of the sliding window is:', 'Result should indicate maximum sum');
    expect(resultText).toContain('9', 'For window size 2 on 1,2,3,4,5 the maximum sum should be 9');
  });

  // Test calculation with window equal to array length
  test('Window size equal to array length returns sum of all elements', async ({ page }) => {
    const sw2 = new SlidingWindowPage(page);

    await sw.setArray('1,2,3,4,5');
    await sw.setWindowSize(5);
    await sw.clickCalculate();

    const resultText2 = await sw.getResultText();
    // 1+2+3+4+5 = 15
    expect(resultText).toContain('15', 'When window size equals array length, the sum should be total of array');
  });

  // Test validation: missing inputs should show validation message
  test('Missing inputs or invalid window size triggers validation message', async ({ page }) => {
    const sw3 = new SlidingWindowPage(page);

    // Case 1: empty array input
    await sw.setArray('');
    await sw.setWindowSize(3);
    await sw.clickCalculate();
    let text = await sw.getResultText();
    expect(text).toBe('Please enter valid inputs.', 'Empty array input should trigger validation message');

    // Case 2: window size 0
    await sw.setArray('1,2,3');
    await sw.setWindowSize(0);
    await sw.clickCalculate();
    text = await sw.getResultText();
    expect(text).toBe('Please enter valid inputs.', 'Window size 0 should trigger validation message');

    // Case 3: negative window size
    await sw.setArray('1,2,3');
    await sw.setWindowSize(-1);
    await sw.clickCalculate();
    text = await sw.getResultText();
    expect(text).toBe('Please enter valid inputs.', 'Negative window size should trigger validation message');

    // Case 4: non-numeric window size (clearing the input)
    await sw.setArray('1,2,3');
    await sw.setWindowSize(''); // empty => NaN
    await sw.clickCalculate();
    text = await sw.getResultText();
    expect(text).toBe('Please enter valid inputs.', 'Empty/non-numeric window size should trigger validation message');
  });

  // Test handling of non-numeric array entries - should result in NaN propagated into result
  test('Non-numeric array entries result in NaN in computed result (no runtime errors)', async ({ page }) => {
    const sw4 = new SlidingWindowPage(page);

    // Provide an array with a non-numeric token; window size valid
    await sw.setArray('1,foo,3');
    await sw.setWindowSize(2);
    await sw.clickCalculate();

    const text1 = await sw.getResultText();
    // Expect that NaN appears in the displayed result due to Number('foo') -> NaN
    expect(text).toContain('Maximum sum of the sliding window is:', 'Result should still attempt to display computation outcome');
    expect(text).toContain('NaN', 'Non-numeric entries should produce NaN in the calculated result text');
  });

  // Test window size larger than array length - leads to NaN result but no uncaught errors
  test('Window size greater than array length produces NaN result without throwing runtime errors', async ({ page }) => {
    const sw5 = new SlidingWindowPage(page);

    await sw.setArray('1,2');
    await sw.setWindowSize(3); // larger than array length
    await sw.clickCalculate();

    const text2 = await sw.getResultText();
    expect(text).toContain('NaN', 'Window size larger than array should make the calculation result NaN');
  });

  // Test that calculate button is functional and clickable repeatedly (idempotent behavior)
  test('Calculate button can be clicked multiple times and updates DOM each time', async ({ page }) => {
    const sw6 = new SlidingWindowPage(page);

    await sw.setArray('2,4,6,8');
    await sw.setWindowSize(2);

    // Click first time
    await sw.clickCalculate();
    let text1 = await sw.getResultText();
    expect(text1).toContain('Maximum sum', 'First click should produce a result');
    expect(text1).toContain('14', 'For array 2,4,6,8 and window 2 the max sum is 14 (6+8)');

    // Modify inputs and click again
    await sw.setArray('5,5,5,5');
    await sw.setWindowSize(3);
    await sw.clickCalculate();
    const text2 = await sw.getResultText();
    expect(text2).toContain('15', 'After changing inputs, second calculation should reflect new values (5+5+5)');
    // Ensure the DOM actually updated and is not equal to the previous result
    expect(text2).not.toBe(text1);
  });

  // Accessibility and attribute checks
  test('Accessibility-related attributes and visible labels', async ({ page }) => {
    const sw7 = new SlidingWindowPage(page);

    // Ensure inputs are reachable and have accessible placeholders (basic accessibility check)
    await expect(sw.arrayInput).toHaveAttribute('placeholder', /Enter numbers/i);
    await expect(sw.windowSizeInput).toHaveAttribute('placeholder', /Window Size/i);

    // Button should be enabled and contain expected text
    await expect(sw.calculateButton).toBeEnabled();
    await expect(sw.calculateButton).toHaveText('Calculate Maximum Sum');
  });
});