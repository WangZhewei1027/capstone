import { test, expect } from '@playwright/test';

// Page object model for the Recursion Demo page
class RecursionPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.url = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/7e8af3ba-d59e-11f0-89ab-2f71529652ac.html';
    this.input = page.locator('#numberInput');
    this.button = page.locator('button', { hasText: 'Calculate Factorial' });
    this.result = page.locator('#result');
    this.heading = page.locator('h1', { hasText: 'Recursion Demo' });
  }

  async goto() {
    await this.page.goto(this.url);
  }

  async enterNumber(value) {
    // fill the input with the provided value (string or number)
    await this.input.fill(String(value));
  }

  async clickCalculate() {
    await this.button.click();
  }

  async getResultText() {
    return (await this.result.innerText()).trim();
  }

  async clearInput() {
    await this.input.fill('');
  }
}

test.describe('Recursion Demo - Factorial Calculator', () => {
  // Arrays to capture console errors and page errors for each test
  let consoleErrors;
  let pageErrors;
  let recursionPage;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Capture console 'error' messages emitted by the page
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Capture uncaught exceptions from the page
    page.on('pageerror', err => {
      // err is an Error object; capture its message for assertions
      pageErrors.push(err.message);
    });

    recursionPage = new RecursionPage(page);
    await recursionPage.goto();
  });

  test.afterEach(async () => {
    // After each test, ensure no unexpected console errors or page errors occurred
    // This asserts that the page did not produce runtime errors like ReferenceError/TypeError/SyntaxError
    expect(consoleErrors, `Unexpected console.error messages: ${JSON.stringify(consoleErrors, null, 2)}`).toHaveLength(0);
    expect(pageErrors, `Unexpected uncaught page errors: ${JSON.stringify(pageErrors, null, 2)}`).toHaveLength(0);
  });

  test.describe('Initial load and UI', () => {
    test('should load the page and show default UI elements', async ({ page }) => {
      // Verify heading is visible and correct
      await expect(recursionPage.heading).toBeVisible();
      await expect(recursionPage.heading).toHaveText('Recursion Demo');

      // Verify input exists, is empty by default, and has placeholder
      await expect(recursionPage.input).toBeVisible();
      await expect(recursionPage.input).toHaveAttribute('placeholder', 'Enter a number');
      await expect(recursionPage.input).toHaveValue('');

      // Verify button text and visibility
      await expect(recursionPage.button).toBeVisible();
      await expect(recursionPage.button).toHaveText('Calculate Factorial');

      // Result area should be present and empty initially
      await expect(recursionPage.result).toBeVisible();
      const initialResult = await recursionPage.getResultText();
      expect(initialResult).toBe('');
    });

    test('should include accessibility-related attributes on input', async () => {
      // The input is type=number and has min attribute set to 0
      await expect(recursionPage.input).toHaveAttribute('type', 'number');
      await expect(recursionPage.input).toHaveAttribute('min', '0');
    });
  });

  test.describe('Factorial calculation behavior', () => {
    // Test a typical case
    test('calculates factorial for a positive integer (5 -> 120)', async () => {
      // Enter 5 and click calculate
      await recursionPage.enterNumber('5');
      await recursionPage.clickCalculate();

      // Expect the result text to match the factorial result
      await expect(recursionPage.result).toHaveText('Factorial of 5 is 120.');
      const result = await recursionPage.getResultText();
      expect(result).toBe('Factorial of 5 is 120.');
    });

    // Test base cases 0 and 1
    test('handles base case 0 correctly (0 -> 1)', async () => {
      await recursionPage.enterNumber('0');
      await recursionPage.clickCalculate();
      await expect(recursionPage.result).toHaveText('Factorial of 0 is 1.');
    });

    test('handles base case 1 correctly (1 -> 1)', async () => {
      await recursionPage.enterNumber('1');
      await recursionPage.clickCalculate();
      await expect(recursionPage.result).toHaveText('Factorial of 1 is 1.');
    });

    // Test non-integer input trimmed by parseInt behavior:
    // parseInt('3.7') === 3 so factorial(3) === 6. We assert this expected behavior from the implementation.
    test('handles decimal input by parseInt behavior (3.7 -> treated as 3)', async () => {
      await recursionPage.enterNumber('3.7');
      await recursionPage.clickCalculate();
      // parseInt will parse to 3, so factorial of 3 is 6
      await expect(recursionPage.result).toHaveText('Factorial of 3 is 6.');
    });

    // Test empty input -> error message
    test('shows error message when input is empty', async () => {
      await recursionPage.clearInput();
      await recursionPage.clickCalculate();
      await expect(recursionPage.result).toHaveText('Please enter a non-negative integer.');
    });

    // Test non-numeric input -> error message
    test('shows error message for non-numeric input', async () => {
      await recursionPage.enterNumber('not-a-number');
      await recursionPage.clickCalculate();
      await expect(recursionPage.result).toHaveText('Please enter a non-negative integer.');
    });

    // Test negative number -> error message
    test('shows error message for negative input (-5)', async () => {
      // Although input has min=0, browsers may still allow programmatic fill of negative numbers
      await recursionPage.enterNumber('-5');
      await recursionPage.clickCalculate();
      await expect(recursionPage.result).toHaveText('Please enter a non-negative integer.');
    });

    // Test a moderately large input to ensure recursion works (but keep it reasonable for test runtime)
    test('calculates factorial for 7 correctly (7 -> 5040)', async () => {
      await recursionPage.enterNumber('7');
      await recursionPage.clickCalculate();
      await expect(recursionPage.result).toHaveText('Factorial of 7 is 5040.');
    });
  });

  test.describe('Behavioral and DOM change checks', () => {
    test('result element updates and is visible after calculation', async () => {
      // Before interacting, result is empty
      let before = await recursionPage.getResultText();
      expect(before).toBe('');

      // Perform calculation
      await recursionPage.enterNumber('4');
      await recursionPage.clickCalculate();

      // After interaction, result should be visible and contain expected text
      await expect(recursionPage.result).toBeVisible();
      await expect(recursionPage.result).toHaveText('Factorial of 4 is 24.');
    });

    test('repeated calculations update the result element correctly', async () => {
      await recursionPage.enterNumber('2');
      await recursionPage.clickCalculate();
      await expect(recursionPage.result).toHaveText('Factorial of 2 is 2.');

      // calculate another value without reloading
      await recursionPage.enterNumber('3');
      await recursionPage.clickCalculate();
      await expect(recursionPage.result).toHaveText('Factorial of 3 is 6.');
    });
  });
});