import { test, expect } from '@playwright/test';

// Page object model for the factorial page
class FactorialPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input = page.locator('#numberInput');
    this.button = page.getByRole('button', { name: 'Calculate Factorial' });
    this.result = page.locator('.result');
    this.title = page.locator('h1');
  }

  async goto(url) {
    await this.page.goto(url);
  }

  async getDefaultInputValue() {
    return await this.input.inputValue();
  }

  async setInput(value) {
    // Use fill to set the input value exactly as provided
    await this.input.fill(value);
  }

  async clickCalculate() {
    await this.button.click();
  }

  async getResultText() {
    return (await this.result.textContent()) || '';
  }

  async isButtonVisibleAndEnabled() {
    return {
      visible: await this.button.isVisible(),
      enabled: await this.button.isEnabled()
    };
  }
}

// URL of the served HTML file under test
const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/2627d2f7-cd2a-11f0-bee4-a3a342d77f94.html';

test.describe('Recursion Example: Factorial Calculation (2627d2f7-cd2a-11f0-bee4-a3a342d77f94)', () => {
  // Arrays to capture console errors and page errors for each test run
  /** @type {Array<import('@playwright/test').ConsoleMessage>} */
  let consoleErrors;
  /** @type {Array<Error>} */
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Listen for console messages (capture error-level messages)
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg);
      }
    });

    // Listen for uncaught page errors
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    // Navigate to the page under test
    await page.goto(APP_URL);
  });

  test.afterEach(async () => {
    // After each test, assert there were no uncaught page errors or console.error messages.
    // This both observes console/page errors and asserts their absence for this working implementation.
    expect(pageErrors, `Expected no uncaught page errors, found: ${pageErrors.map(e => String(e)).join(', ')}`).toHaveLength(0);
    expect(consoleErrors, `Expected no console.error messages, found: ${consoleErrors.map(m => m.text()).join(' | ')}`).toHaveLength(0);
  });

  test('Initial page load shows title, default input value, and empty result', async ({ page }) => {
    // Purpose: Verify initial UI state after loading the page
    const fp = new FactorialPage(page);

    // Check visible title text
    await expect(fp.title).toBeVisible();
    await expect(fp.title).toHaveText(/Recursion Example: Factorial Calculation/);

    // Check input exists and has default value of 5
    await expect(fp.input).toBeVisible();
    const defaultValue = await fp.getDefaultInputValue();
    expect(defaultValue).toBe('5');

    // The result area should be present but empty on load
    await expect(fp.result).toBeVisible();
    const resultText = await fp.getResultText();
    expect(resultText.trim()).toBe(''); // initially empty
  });

  test('Calculating factorial of default value (5) updates DOM with correct result', async ({ page }) => {
    // Purpose: Ensure clicking the Calculate button computes factorial(5) => 120 and updates the DOM
    const fp = new FactorialPage(page);

    // Sanity: button visible & enabled
    const btnState = await fp.isButtonVisibleAndEnabled();
    expect(btnState.visible).toBe(true);
    expect(btnState.enabled).toBe(true);

    // Click the calculate button and verify result
    await fp.clickCalculate();

    // Verify the result text is updated to the expected string
    await expect(fp.result).toHaveText('The factorial of 5 is 120.');
  });

  test('Calculating factorial of zero (0) produces 1', async ({ page }) => {
    // Purpose: Test the base case of the recursive factorial function
    const fp = new FactorialPage(page);

    // Set input to 0 and click
    await fp.setInput('0');
    await fp.clickCalculate();

    // Expect factorial(0) to be 1
    await expect(fp.result).toHaveText('The factorial of 0 is 1.');
  });

  test('Calculating factorial of a larger integer (10) yields correct value', async ({ page }) => {
    // Purpose: Verify recursion correctness for larger inputs
    const fp = new FactorialPage(page);

    await fp.setInput('10');
    await fp.clickCalculate();

    await expect(fp.result).toHaveText('The factorial of 10 is 3628800.');
  });

  test('Entering a negative number shows an alert and does not update result', async ({ page }) => {
    // Purpose: Ensure invalid negative input triggers alert and prevents calculation
    const fp = new FactorialPage(page);

    // Clear any existing result by refreshing the page state in this test
    await page.reload();

    // Prepare to wait for the dialog triggered by alert
    const dialogPromise = page.waitForEvent('dialog');

    // Set negative value and click calculate
    await fp.setInput('-3');
    await fp.clickCalculate();

    // Capture and assert the dialog message
    const dialog = await dialogPromise;
    expect(dialog.message()).toBe('Please enter a non-negative integer.');
    await dialog.accept();

    // The .result should still be empty because the function returned early
    const resultText = await fp.getResultText();
    expect(resultText.trim()).toBe('');
  });

  test('Leaving input empty triggers alert for non-number input', async ({ page }) => {
    // Purpose: Test handling of empty input (parseInt yields NaN) -> alert
    const fp = new FactorialPage(page);

    // Clear input to empty string
    await fp.setInput('');
    const dialogPromise = page.waitForEvent('dialog');

    // Click calculate
    await fp.clickCalculate();

    // Validate alert content
    const dialog = await dialogPromise;
    expect(dialog.message()).toBe('Please enter a non-negative integer.');
    await dialog.accept();

    // Result should remain empty
    const resultText = await fp.getResultText();
    expect(resultText.trim()).toBe('');
  });

  test('Entering a decimal value uses parseInt behavior (e.g., 3.7 -> 3) and computes factorial', async ({ page }) => {
    // Purpose: Confirm parseInt behavior for decimals used by the implementation
    const fp = new FactorialPage(page);

    // Enter a decimal value
    await fp.setInput('3.7');
    await fp.clickCalculate();

    // parseInt(3.7) -> 3, factorial(3) = 6
    await expect(fp.result).toHaveText('The factorial of 3 is 6.');
  });

  test('Accessibility checks: input role and button accessible name', async ({ page }) => {
    // Purpose: Basic accessibility checks for interactive elements
    const fp = new FactorialPage(page);

    // The input should have role spinbutton (number input)
    const spinInputs = page.getByRole('spinbutton');
    await expect(spinInputs).toHaveCount(1);

    // The button should be discoverable by accessible name
    const calcButton = page.getByRole('button', { name: 'Calculate Factorial' });
    await expect(calcButton).toBeVisible();
    await expect(calcButton).toBeEnabled();
  });
});