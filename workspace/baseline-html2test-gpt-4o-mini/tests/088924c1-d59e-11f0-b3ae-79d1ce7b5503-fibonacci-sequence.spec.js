import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/088924c1-d59e-11f0-b3ae-79d1ce7b5503.html';

// Page Object Model for the Fibonacci page to keep tests organized and readable
class FibonacciPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input = page.locator('#numTerms');
    this.button = page.locator('button', { hasText: 'Generate' });
    this.result = page.locator('#result');
    this.heading = page.locator('h1');
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async setNumTerms(value) {
    // Use fill to set the input value (works for number input too)
    await this.input.fill(String(value));
  }

  async clickGenerate() {
    await this.button.click();
  }

  async getResultText() {
    return (await this.result.textContent()) ?? '';
  }

  async getInputValue() {
    return await this.input.inputValue();
  }

  async getInputMin() {
    return await this.input.getAttribute('min');
  }

  async isResultVisible() {
    return await this.result.isVisible();
  }

  async getHeadingText() {
    return (await this.heading.textContent()) ?? '';
  }
}

test.describe('Fibonacci Sequence App - 088924c1-d59e-11f0-b3ae-79d1ce7b5503', () => {
  // Collect console messages and page errors for assertions
  let consoleMessages;
  let pageErrors;

  // Attach listeners and navigate before each test
  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Capture console messages for later assertions
    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Capture uncaught exceptions on the page
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    // Navigate to the app
    await page.goto(APP_URL);
  });

  // Sanity check: page loads without throwing runtime errors and initial UI is correct
  test('Initial page load - heading, input, button and empty result', async ({ page }) => {
    const fib = new FibonacciPage(page);

    // Verify heading text is present and meaningful
    await expect(fib.heading).toBeVisible();
    await expect(fib.getHeadingText()).resolves.toContain('Fibonacci Sequence Generator');

    // Input should be visible, have placeholder, and be empty by default
    await expect(fib.input).toBeVisible();
    await expect(fib.input).toHaveAttribute('placeholder', 'Enter a number');
    await expect(await fib.getInputValue()).toBe('');

    // Button should be visible and have the correct label
    await expect(fib.button).toBeVisible();
    await expect(fib.button).toHaveText('Generate');

    // Result area should be present and empty on initial load
    await expect(fib.result).toBeVisible();
    await expect(await fib.getResultText()).toBe('');

    // Ensure no uncaught page errors or console errors occurred during load
    const hasConsoleErrors = consoleMessages.some(m => m.type === 'error');
    test.expect(hasConsoleErrors, 'Expected no console.error messages on initial load').toBe(false);
    test.expect(pageErrors.length === 0, 'Expected no page errors on initial load').toBe(true);
  });

  // Test validation and error message behavior for invalid inputs
  test.describe('Validation and error handling', () => {
    test('Empty input or non-number shows validation message', async ({ page }) => {
      const fib1 = new FibonacciPage(page);

      // Ensure blank input and click Generate
      await fib.setNumTerms('');
      await fib.clickGenerate();

      // Should show the validation message for positive integer requirement
      await expect(fib.result).toHaveText('Please enter a positive integer.');

      // No runtime errors should be present
      const hasConsoleErrors1 = consoleMessages.some(m => m.type === 'error');
      test.expect(hasConsoleErrors).toBe(false);
      test.expect(pageErrors.length === 0).toBe(true);
    });

    test('Zero and negative numbers show validation message', async ({ page }) => {
      const fib2 = new FibonacciPage(page);

      // Test zero
      await fib.setNumTerms('0');
      await fib.clickGenerate();
      await expect(fib.result).toHaveText('Please enter a positive integer.');

      // Test negative number
      await fib.setNumTerms('-5');
      await fib.clickGenerate();
      await expect(fib.result).toHaveText('Please enter a positive integer.');

      // Still no runtime errors
      const hasConsoleErrors2 = consoleMessages.some(m => m.type === 'error');
      test.expect(hasConsoleErrors).toBe(false);
      test.expect(pageErrors.length === 0).toBe(true);
    });

    test('Input min attribute is set to 1 to aid validation', async ({ page }) => {
      const fib3 = new FibonacciPage(page);
      await expect(await fib.getInputMin()).toBe('1');
    });
  });

  // Test correct Fibonacci outputs for various valid inputs
  test.describe('Correct Fibonacci generation and DOM updates', () => {
    test('Generate sequence for 1 term -> should return "0"', async ({ page }) => {
      const fib4 = new FibonacciPage(page);

      await fib.setNumTerms('1');
      await fib.clickGenerate();

      await expect(fib.result).toHaveText('Fibonacci Sequence: 0');

      // No runtime errors
      const hasConsoleErrors3 = consoleMessages.some(m => m.type === 'error');
      test.expect(hasConsoleErrors).toBe(false);
      test.expect(pageErrors.length === 0).toBe(true);
    });

    test('Generate sequence for 2 terms -> should return "0, 1"', async ({ page }) => {
      const fib5 = new FibonacciPage(page);

      await fib.setNumTerms('2');
      await fib.clickGenerate();

      await expect(fib.result).toHaveText('Fibonacci Sequence: 0, 1');

      // No runtime errors
      const hasConsoleErrors4 = consoleMessages.some(m => m.type === 'error');
      test.expect(hasConsoleErrors).toBe(false);
      test.expect(pageErrors.length === 0).toBe(true);
    });

    test('Generate sequence for 6 terms -> correct sequence and previous results are cleared', async ({ page }) => {
      const fib6 = new FibonacciPage(page);

      // First generate 3 terms
      await fib.setNumTerms('3');
      await fib.clickGenerate();
      await expect(fib.result).toHaveText('Fibonacci Sequence: 0, 1, 1');

      // Then generate 6 terms; previous result should be cleared and replaced by new sequence
      await fib.setNumTerms('6');
      await fib.clickGenerate();
      await expect(fib.result).toHaveText('Fibonacci Sequence: 0, 1, 1, 2, 3, 5');

      // No runtime errors
      const hasConsoleErrors5 = consoleMessages.some(m => m.type === 'error');
      test.expect(hasConsoleErrors).toBe(false);
      test.expect(pageErrors.length === 0).toBe(true);
    });

    test('Generate a larger sequence (10 terms) to verify algorithm correctness', async ({ page }) => {
      const fib7 = new FibonacciPage(page);

      await fib.setNumTerms('10');
      await fib.clickGenerate();

      // Expected 10-term Fibonacci sequence
      await expect(fib.result).toHaveText('Fibonacci Sequence: 0, 1, 1, 2, 3, 5, 8, 13, 21, 34');

      // No runtime errors
      const hasConsoleErrors6 = consoleMessages.some(m => m.type === 'error');
      test.expect(hasConsoleErrors).toBe(false);
      test.expect(pageErrors.length === 0).toBe(true);
    });
  });

  // Accessibility-focused checks: button is reachable and input has accessible placeholder
  test('Accessibility checks: interactive elements have accessible names and are keyboard focusable', async ({ page }) => {
    const fib8 = new FibonacciPage(page);

    // The button should have accessible name "Generate"
    await expect(fib.button).toHaveText('Generate');

    // The input has a placeholder and should accept keyboard focus
    await fib.input.focus();
    await expect(fib.input).toBeFocused();

    // No runtime errors observed
    const hasConsoleErrors7 = consoleMessages.some(m => m.type === 'error');
    test.expect(hasConsoleErrors).toBe(false);
    test.expect(pageErrors.length === 0).toBe(true);
  });

  // Final test: ensure no unexpected console errors or uncaught page errors occurred across interactions
  test('No uncaught exceptions or console.error messages occurred during interactions', async ({ page }) => {
    // This test relies on the consoleMessages and pageErrors collected in beforeEach and during prior actions
    // Note: Tests are isolated, so to ensure we capture messages related to this test run, perform a typical interaction
    const fib9 = new FibonacciPage(page);

    // Perform a few interactions to surface possible runtime issues
    await fib.setNumTerms('5');
    await fib.clickGenerate();
    await fib.setNumTerms('');
    await fib.clickGenerate();

    // Assert there are no console.error messages
    const errorConsoleEntries = consoleMessages.filter(m => m.type === 'error');
    test.expect(errorConsoleEntries.length === 0, `Expected no console.error messages, found: ${JSON.stringify(errorConsoleEntries)}`).toBe(true);

    // Assert there are no uncaught page errors
    test.expect(pageErrors.length === 0, `Expected no page errors, found: ${pageErrors.map(e => e.message).join('; ')}`).toBe(true);
  });
});