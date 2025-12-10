import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-4o-5/html/39b8b192-d1d5-11f0-b49a-6f458b3a25ef.html';

// Page Object for the Factorial Calculator page
class FactorialPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input = page.locator('#number');
    // Use accessible role lookup for the button by name (label)
    this.button = page.getByRole('button', { name: 'Calculate Factorial' });
    this.result = page.locator('#result');
  }

  // Navigate to the application URL
  async goto() {
    await this.page.goto(APP_URL);
  }

  // Fill the number input with the provided value (string or number)
  async fillNumber(value) {
    // Use fill which replaces any existing content
    await this.input.fill(String(value));
  }

  // Click the calculate button
  async clickCalculate() {
    await this.button.click();
  }

  // Convenience: perform full calculation action
  async calculate(value) {
    await this.fillNumber(value);
    await this.clickCalculate();
  }

  // Read the text content of the result element (trimmed)
  async getResultText() {
    const text = await this.result.textContent();
    return text ? text.trim() : '';
  }

  // Return current input value
  async getInputValue() {
    return await this.input.inputValue();
  }

  // Check if the calculate button is enabled
  async isButtonEnabled() {
    return await this.button.isEnabled();
  }

  // Check presence of min attribute on input
  async getInputMinAttr() {
    return await this.input.getAttribute('min');
  }
}

// Helper to attach listeners for console errors and page errors, and return capture arrays
async function attachErrorListeners(page) {
  const consoleErrors = [];
  const pageErrors = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push({
        text: msg.text(),
        location: msg.location()
      });
    }
  });

  page.on('pageerror', (err) => {
    pageErrors.push(err);
  });

  return { consoleErrors, pageErrors };
}

test.describe('Factorial Calculator - Recursion Example (39b8b192-d1d5-11f0-b49a-6f458b3a25ef)', () => {
  // Each test will navigate to the page and attach listeners to observe console and page errors.
  // We assert no unexpected runtime errors occurred during the interactions.

  test('loads the page and shows the default state', async ({ page }) => {
    // Attach error listeners to observe console errors and page errors
    const { consoleErrors, pageErrors } = await attachErrorListeners(page);

    const app = new FactorialPage(page);
    // Navigate to the app
    await app.goto();

    // Verify the document title is set as expected
    await expect(page).toHaveTitle(/Recursion Example/);

    // Verify input exists and is empty by default
    await expect(app.input).toBeVisible();
    const initialInputValue = await app.getInputValue();
    expect(initialInputValue).toBe(''); // default empty

    // Verify button is visible and enabled and has expected label
    await expect(app.button).toBeVisible();
    expect(await app.isButtonEnabled()).toBe(true);

    // Verify result container is empty on load
    const initialResult = await app.getResultText();
    expect(initialResult).toBe('');

    // Verify the input has the expected min attribute set (accessibility / validation hint)
    expect(await app.getInputMinAttr()).toBe('0');

    // Assert that no console errors or page errors were produced during load
    expect(consoleErrors.length, 'console errors on page load').toBe(0);
    expect(pageErrors.length, 'page errors on page load').toBe(0);
  });

  test('calculates factorial for a positive integer (5 -> 120)', async ({ page }) => {
    // Attach error listeners
    const { consoleErrors, pageErrors } = await attachErrorListeners(page);

    const app1 = new FactorialPage(page);
    await app.goto();

    // Perform calculation for 5
    await app.calculate(5);

    // Verify result text matches expected factorial output
    const resultText = await app.getResultText();
    expect(resultText).toBe('Factorial of 5 is 120.');

    // Ensure input still contains the entered value
    expect(await app.getInputValue()).toBe('5');

    // Ensure no runtime errors occurred while computing
    expect(consoleErrors.length, 'console errors during factorial calculation').toBe(0);
    expect(pageErrors.length, 'page errors during factorial calculation').toBe(0);
  });

  test('handles base cases: 0 and 1 both return 1', async ({ page }) => {
    // Attach error listeners
    const { consoleErrors, pageErrors } = await attachErrorListeners(page);

    const app2 = new FactorialPage(page);
    await app.goto();

    // Test 0
    await app.calculate(0);
    let resultText1 = await app.getResultText();
    expect(resultText).toBe('Factorial of 0 is 1.');

    // Test 1
    await app.calculate(1);
    resultText = await app.getResultText();
    expect(resultText).toBe('Factorial of 1 is 1.');

    // No errors expected
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('shows validation message for negative numbers', async ({ page }) => {
    // Attach error listeners
    const { consoleErrors, pageErrors } = await attachErrorListeners(page);

    const app3 = new FactorialPage(page);
    await app.goto();

    // Enter a negative value and click calculate
    await app.calculate(-3);

    // The app uses parseInt and checks for number < 0; expect validation message
    const resultText2 = await app.getResultText();
    expect(resultText).toBe('Please enter a non-negative integer.');

    // No runtime errors expected
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('shows validation message for empty input', async ({ page }) => {
    // Attach error listeners
    const { consoleErrors, pageErrors } = await attachErrorListeners(page);

    const app4 = new FactorialPage(page);
    await app.goto();

    // Ensure input is empty and click calculate
    await app.fillNumber('');
    await app.clickCalculate();

    // Expect validation message for missing input
    const resultText3 = await app.getResultText();
    expect(resultText).toBe('Please enter a non-negative integer.');

    // No runtime errors expected
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('handles decimal input by using parseInt (e.g., 4.7 -> 4)', async ({ page }) => {
    // Attach error listeners
    const { consoleErrors, pageErrors } = await attachErrorListeners(page);

    const app5 = new FactorialPage(page);
    await app.goto();

    // Fill decimal value and compute
    await app.fillNumber('4.7');
    await app.clickCalculate();

    // The implementation uses parseInt, so 4.7 -> 4 => factorial 24
    const resultText4 = await app.getResultText();
    expect(resultText).toBe('Factorial of 4 is 24.');

    // No runtime errors expected
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('button has expected onclick handler and is accessible', async ({ page }) => {
    // Attach error listeners
    const { consoleErrors, pageErrors } = await attachErrorListeners(page);

    const app6 = new FactorialPage(page);
    await app.goto();

    // Verify the button is present and has an inline onclick attribute wired to calculateFactorial()
    // We directly inspect the attribute to ensure the implemented hookup exists on the element.
    const buttonHandle = page.locator('button').first();
    const onclickAttr = await buttonHandle.getAttribute('onclick');
    expect(onclickAttr).toBe('calculateFactorial()');

    // Use keyboard to ensure it is focusable (basic accessibility check)
    await buttonHandle.focus();
    expect(await buttonHandle.evaluate((el) => document.activeElement === el)).toBe(true);

    // No runtime errors expected
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('computes factorial for a larger but reasonable input (10)', async ({ page }) => {
    // Attach error listeners
    const { consoleErrors, pageErrors } = await attachErrorListeners(page);

    const app7 = new FactorialPage(page);
    await app.goto();

    // Compute factorial of 10 (should be 3628800)
    await app.calculate(10);
    const resultText5 = await app.getResultText();
    expect(resultText).toBe('Factorial of 10 is 3628800.');

    // No runtime errors expected
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });
});