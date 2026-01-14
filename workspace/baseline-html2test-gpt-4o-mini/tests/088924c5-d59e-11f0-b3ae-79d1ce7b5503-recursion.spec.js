import { test, expect } from '@playwright/test';

// Test file for Recursion Demo application
// Application URL:
// http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/088924c5-d59e-11f0-b3ae-79d1ce7b5503.html

// Page Object Model for the Recursion demo page
class RecursionPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input = page.locator('#numberInput');
    this.calculateButton = page.locator('#calculateButton');
    this.result = page.locator('#result');
    this.label = page.locator('label[for="numberInput"]');
    this.header = page.locator('h1');
  }

  async goto(url) {
    await this.page.goto(url);
  }

  // Fill the number input with the provided value (string or number)
  async setInput(value) {
    // Use fill to simulate typing/setting the value
    await this.input.fill(String(value));
  }

  // Click the calculate button
  async clickCalculate() {
    await this.calculateButton.click();
  }

  // Get result text content
  async getResultText() {
    return await this.result.textContent();
  }

  // Get input value attribute
  async getInputValue() {
    return await this.input.inputValue();
  }
}

test.describe('Recursion Demo - Factorial page tests', () => {
  const APP_URL =
    'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/088924c5-d59e-11f0-b3ae-79d1ce7b5503.html';

  // Will collect console errors and page errors emitted during each test
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    // Initialize error collectors
    consoleErrors = [];
    pageErrors = [];

    // Listen to console events and collect error-level messages
    page.on('console', (msg) => {
      try {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      } catch (e) {
        // In case msg.type() is not available or another issue, record the raw message
        consoleErrors.push(String(msg));
      }
    });

    // Listen to uncaught exceptions on the page
    page.on('pageerror', (err) => {
      pageErrors.push(String(err && err.message ? err.message : err));
    });

    // Navigate to the application page
    await page.goto(APP_URL);
  });

  test.afterEach(async () => {
    // After each test assert there were no console errors or page errors
    // These assertions ensure the page did not throw unexpected runtime errors during the test.
    expect(consoleErrors, `Expected no console.error messages, found: ${consoleErrors.join(' | ')}`).toHaveLength(0);
    expect(pageErrors, `Expected no uncaught page errors, found: ${pageErrors.join(' | ')}`).toHaveLength(0);
  });

  test('Initial page load shows expected elements and default state', async ({ page }) => {
    // Purpose: Verify that main elements are present and default states are correct
    const app = new RecursionPage(page);

    // Check header text
    await expect(app.header).toBeVisible();
    await expect(app.header).toHaveText('Recursion Demonstration');

    // Check label and association
    await expect(app.label).toBeVisible();
    const labelFor = await app.label.getAttribute('for');
    expect(labelFor).toBe('numberInput');

    // Check input and button presence
    await expect(app.input).toBeVisible();
    await expect(app.calculateButton).toBeVisible();
    await expect(app.calculateButton).toHaveText('Calculate Factorial');

    // On initial load, result container should be empty (no text)
    await expect(app.result).toBeVisible();
    const initialResult = (await app.getResultText()) || '';
    expect(initialResult.trim().length).toBe(0);
  });

  test.describe('Valid input interactions', () => {
    test('Calculating factorial of 0 should show 1 (base case)', async ({ page }) => {
      // Purpose: Test base case factorial(0) => 1
      const app1 = new RecursionPage(page);

      await app.setInput(0);
      // Sanity check input value is '0'
      expect(await app.getInputValue()).toBe('0');

      await app.clickCalculate();

      // Verify the result text is exactly as expected
      await expect(app.result).toHaveText('The factorial of 0 is 1.');
    });

    test('Calculating factorial of 5 should show 120 (recursive case)', async ({ page }) => {
      // Purpose: Test typical recursive computation factorial(5) => 120
      const app2 = new RecursionPage(page);

      await app.setInput(5);
      expect(await app.getInputValue()).toBe('5');

      await app.clickCalculate();

      await expect(app.result).toHaveText('The factorial of 5 is 120.');
    });

    test('Non-integer numeric input (e.g., 4.7) should be parsed using parseInt and computed accordingly', async ({ page }) => {
      // Purpose: parseInt is used in the implementation. 4.7 => parseInt => 4 => factorial(4) = 24
      const app3 = new RecursionPage(page);

      // Fill with a float value
      await app.setInput('4.7');
      // Input.value for number input will typically be '4.7' as a string
      expect(await app.getInputValue()).toBe('4.7');

      await app.clickCalculate();

      // Expect parsed to 4 so factorial is 24
      await expect(app.result).toHaveText('The factorial of 4 is 24.');
    });
  });

  test.describe('Invalid and edge case inputs', () => {
    test('Negative integer input should display an error message', async ({ page }) => {
      // Purpose: Ensure the UI handles negative input by showing the expected error message
      const app4 = new RecursionPage(page);

      await app.setInput(-3);
      expect(await app.getInputValue()).toBe('-3');

      await app.clickCalculate();

      await expect(app.result).toHaveText('Please enter a non-negative integer.');
    });

    test('Empty input (no value) should display an error message', async ({ page }) => {
      // Purpose: Ensure empty input yields the expected validation message
      const app5 = new RecursionPage(page);

      // Clear the input to simulate blank
      await app.setInput('');
      // HTML number input with empty value returns empty string
      expect(await app.getInputValue()).toBe('');

      await app.clickCalculate();

      await expect(app.result).toHaveText('Please enter a non-negative integer.');
    });

    test('Non-numeric input should display an error message (simulate user entering text via fill)', async ({ page }) => {
      // Purpose: Although input type=number, script uses parseInt and isNaN check — ensure text results in the validation message
      const app6 = new RecursionPage(page);

      // Fill with a non-numeric string. For number inputs, some browsers may normalize this to empty, but code handles NaN
      await app.setInput('not-a-number');

      // The input value for a number input when given non-numeric may be '' — we don't rely on it, just click and assert result
      await app.clickCalculate();

      await expect(app.result).toHaveText('Please enter a non-negative integer.');
    });
  });

  test('Accessibility and semantics: controls available by role and label', async ({ page }) => {
    // Purpose: Verify accessibility aspects like role and label association
    const app7 = new RecursionPage(page);

    // Get button by role and name
    const buttonByRole = page.getByRole('button', { name: 'Calculate Factorial' });
    await expect(buttonByRole).toBeVisible();

    // Label should be associated with the input via 'for' attribute referencing the input id
    const labelFor1 = await app.label.getAttribute('for');
    expect(labelFor).toBe('numberInput');

    // Ensure the input is reachable via the label (simulate reading the label text)
    await expect(app.label).toContainText('Enter a non-negative integer:');
  });

  test('Multiple successive calculations update the result correctly', async ({ page }) => {
    // Purpose: Ensure repeated interactions update the DOM each time with correct results
    const app8 = new RecursionPage(page);

    // First calculation
    await app.setInput(3);
    await app.clickCalculate();
    await expect(app.result).toHaveText('The factorial of 3 is 6.');

    // Second calculation with different value
    await app.setInput(6);
    await app.clickCalculate();
    await expect(app.result).toHaveText('The factorial of 6 is 720.');

    // Third calculation with zero again
    await app.setInput(0);
    await app.clickCalculate();
    await expect(app.result).toHaveText('The factorial of 0 is 1.');
  });

  test('No unexpected runtime errors are emitted during typical usage', async ({ page }) => {
    // Purpose: Simulate a sequence of interaction and assert that there are no console.error or uncaught page errors
    const app9 = new RecursionPage(page);

    // Perform a set of interactions
    await app.setInput(4);
    await app.clickCalculate();
    await expect(app.result).toHaveText('The factorial of 4 is 24.');

    await app.setInput(-1);
    await app.clickCalculate();
    await expect(app.result).toHaveText('Please enter a non-negative integer.');

    await app.setInput('');
    await app.clickCalculate();
    await expect(app.result).toHaveText('Please enter a non-negative integer.');

    // The afterEach hook will assert consoleErrors and pageErrors arrays are empty
  });
});