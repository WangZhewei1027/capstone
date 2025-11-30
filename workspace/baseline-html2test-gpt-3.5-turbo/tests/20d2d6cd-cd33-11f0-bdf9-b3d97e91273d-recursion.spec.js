import { test, expect } from '@playwright/test';

// URL of the application under test
const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/20d2d6cd-cd33-11f0-bdf9-b3d97e91273d.html';

// Page Object for the Recursion Demo app
class RecursionPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input = page.locator('#numberInput');
    this.calcBtn = page.locator('#calcBtn');
    this.result = page.locator('#result');
    this.trace = page.locator('#trace');
    this.label = page.locator('label[for="numberInput"]');
    this.heading = page.locator('h1');
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  // Fill the input with the provided value (string or number)
  async setInput(value) {
    await this.input.fill(String(value));
  }

  // Click the calculate button
  async clickCalculate() {
    await this.calcBtn.click();
  }

  // Convenience: set the input and click calculate
  async calculate(n) {
    await this.setInput(n);
    await this.clickCalculate();
  }

  // Get text content of result
  async getResultText() {
    return (await this.result.textContent()) || '';
  }

  // Get text content of trace
  async getTraceText() {
    return (await this.trace.textContent()) || '';
  }
}

test.describe('Recursion Demonstration - UI and Behavior', () => {
  // Basic sanity checks on initial load and default state
  test('Initial page load shows correct static elements and default values', async ({ page }) => {
    const recursion = new RecursionPage(page);
    // Navigate to the page
    await recursion.goto();

    // Check page title and main heading are present
    await expect(page).toHaveTitle(/Recursion Demo/i);
    await expect(recursion.heading).toHaveText('Recursion Demonstration');

    // The input should have default value 5
    await expect(recursion.input).toHaveValue('5');

    // The Calculate button should be visible and enabled
    await expect(recursion.calcBtn).toBeVisible();
    await expect(recursion.calcBtn).toBeEnabled();

    // Result and trace areas should be present and initially empty
    await expect(recursion.result).toBeVisible();
    await expect(recursion.trace).toBeVisible();
    await expect(recursion.result).toHaveText('');
    await expect(recursion.trace).toHaveText('');

    // Label should be linked to the input via for/id
    await expect(recursion.label).toHaveText(/Number \(n\):/i);
  });

  // Test the main happy path: calculate factorial of default value (5)
  test('Calculate factorial for default value (5) and show recursive trace', async ({ page }) => {
    const recursion1 = new RecursionPage(page);
    await recursion.goto();

    // Click Calculate and wait for the result to update
    await recursion.clickCalculate();

    // The page uses setTimeout(10) before calculating, so wait for result text to be updated
    await expect(recursion.result).toHaveText('Factorial of 5 is 120.', { timeout: 2000 });

    // Verify the trace contains the expected recursive calls and final return
    const traceText = await recursion.getTraceText();
    // The trace should start with the top-level call
    expect(traceText.startsWith('factorial(5) called')).toBe(true);

    // The trace should include the base case message for factorial(1)
    expect(traceText).toContain('Base case reached (factorial(1) = 1)');

    // The trace should end with the final returning line for factorial(5)
    expect(traceText.trim().endsWith('Returning factorial(5) = 120')).toBe(true);
  });

  // Edge case: calculate factorial of 0 (base case)
  test('Calculate factorial of 0 (base case) and verify trace shows base case', async ({ page }) => {
    const recursion2 = new RecursionPage(page);
    await recursion.goto();

    // Set input to 0 and calculate
    await recursion.calculate(0);

    // Expect the result to reflect factorial(0) = 1
    await expect(recursion.result).toHaveText('Factorial of 0 is 1.', { timeout: 2000 });

    // Trace should include factorial(0) called and base case reached message
    const traceText1 = await recursion.getTraceText();
    expect(traceText).toContain('factorial(0) called');
    expect(traceText).toContain('Base case reached (factorial(0) = 1)');
  });

  // Error handling: negative numbers and non-numeric input should display an error message
  test('Negative input produces validation error and clears trace', async ({ page }) => {
    const recursion3 = new RecursionPage(page);
    await recursion.goto();

    // Enter a negative number and click Calculate
    await recursion.calculate(-3);

    // The result should display the validation message and trace should be cleared
    await expect(recursion.result).toHaveText('Please enter a valid non-negative integer.');
    await expect(recursion.trace).toHaveText('');
  });

  test('Non-numeric input produces validation error and clears trace', async ({ page }) => {
    const recursion4 = new RecursionPage(page);
    await recursion.goto();

    // Fill a non-numeric string into the input (input type=number allows this via script)
    await recursion.setInput('abc');
    await recursion.clickCalculate();

    // The app uses parseInt on the input value which will be NaN, so expect the same validation message
    await expect(recursion.result).toHaveText('Please enter a valid non-negative integer.');
    await expect(recursion.trace).toHaveText('');
  });

  // Test a different positive integer and validate both result and trace structure
  test('Calculate factorial of 6 and validate result and trace ordering', async ({ page }) => {
    const recursion5 = new RecursionPage(page);
    await recursion.goto();

    // Calculate factorial of 6
    await recursion.calculate(6);
    await expect(recursion.result).toHaveText('Factorial of 6 is 720.', { timeout: 2000 });

    const traceText2 = await recursion.getTraceText();

    // Top-level call should be first
    expect(traceText.startsWith('factorial(6) called')).toBe(true);

    // Base case should mention factorial(1)
    expect(traceText).toContain('Base case reached (factorial(1) = 1)');

    // Final line should return factorial(6) = 720
    expect(traceText.trim().endsWith('Returning factorial(6) = 720')).toBe(true);

    // There should be a 'Returning factorial(2)' line somewhere before the final
    expect(traceText).toMatch(/Returning factorial\(2\) = \d+/);
  });
});

test.describe('Console and runtime error observations', () => {
  // This test observes console.error and pageerror events and asserts that no runtime errors occurred.
  // It also runs a typical interaction to exercise the script and confirm no exceptions are thrown.
  test('No console errors or page errors during typical interactions', async ({ page }) => {
    const recursion6 = new RecursionPage(page);
    await recursion.goto();

    // Collect console.error messages and page errors
    const consoleErrors = [];
    const pageErrors = [];

    const consoleListener = (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push({
          text: msg.text(),
          location: msg.location ? msg.location() : undefined,
        });
      }
    };

    const pageErrorListener = (err) => {
      pageErrors.push(err);
    };

    page.on('console', consoleListener);
    page.on('pageerror', pageErrorListener);

    // Perform a few interactions that exercise the recursive function
    await recursion.calculate(4);
    await expect(recursion.result).toHaveText('Factorial of 4 is 24.', { timeout: 2000 });

    await recursion.calculate(1);
    await expect(recursion.result).toHaveText('Factorial of 1 is 1.', { timeout: 2000 });

    // Short wait to ensure any asynchronous errors would surface
    await page.waitForTimeout(50);

    // Detach listeners to avoid leaking between tests
    page.off('console', consoleListener);
    page.off('pageerror', pageErrorListener);

    // Assert there are no console errors or page errors captured
    // This ensures the client-side runtime did not throw unexpected exceptions during normal use
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });
});