import { test, expect } from '@playwright/test';

// Test file for Application ID: 4c9ed50e-cd2f-11f0-a735-f5f9b4634e99
// Filename requirement: 4c9ed50e-cd2f-11f0-a735-f5f9b4634e99-recursion.spec.js
// This test suite validates the Recursion Example (Factorial) page.
// It checks initial state, interactions, DOM updates, edge cases, and observes console/page errors.

// Page Object Model for the Factorial page to keep tests organized and readable.
class FactorialPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.url = 'http://127.0.0.1:5500/workspace/html2test/html/4c9ed50e-cd2f-11f0-a735-f5f9b4634e99.html';
    this.input = page.locator('#numberInput');
    this.button = page.locator('button', { hasText: 'Calculate Factorial' });
    this.result = page.locator('#result');
    this.heading = page.locator('h1');
  }

  // Navigate to the page
  async goto() {
    await this.page.goto(this.url);
  }

  // Enter a value into the number input (clears first)
  async enterNumber(value) {
    await this.input.fill(String(value));
  }

  // Click the Calculate button
  async clickCalculate() {
    await this.button.click();
  }

  // Get the result text content
  async getResultText() {
    return await this.result.textContent();
  }

  // Helper to check visibility of main elements
  async isInputVisible() {
    return await this.input.isVisible();
  }

  async isButtonVisible() {
    return await this.button.isVisible();
  }

  async isResultVisible() {
    return await this.result.isVisible();
  }

  // Focus the input
  async focusInput() {
    await this.input.focus();
  }
}

test.describe('Recursion Example - Factorial (4c9ed50e-cd2f-11f0-a735-f5f9b4634e99)', () => {
  // Arrays to capture console messages and page errors for each test
  let consoleMessages;
  let pageErrors;

  // Setup before each test: instantiate page object, attach listeners, and navigate to the page
  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Capture console messages
    page.on('console', (msg) => {
      // Store the whole message object for flexible assertions later
      consoleMessages.push(msg);
    });

    // Capture uncaught exceptions on the page
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });
  });

  // Test initial page load and default state
  test('Initial page load shows correct structure and default state', async ({ page }) => {
    const fp = new FactorialPage(page);
    // Navigate to the app as-is
    await fp.goto();

    // Verify heading text (ensures page loaded the expected content)
    await expect(fp.heading).toHaveText(/Recursion Example: Calculate Factorial/);

    // Verify input, button and result elements are present and visible
    expect(await fp.isInputVisible()).toBe(true);
    expect(await fp.isButtonVisible()).toBe(true);
    expect(await fp.isResultVisible()).toBe(true);

    // On initial load, the result div should be empty
    const initialResult = await fp.getResultText();
    expect(initialResult.trim()).toBe('');

    // Verify no page errors were thrown during initial load
    expect(pageErrors).toEqual([]);

    // Ensure no console error-level messages were emitted
    const consoleErrors = consoleMessages.filter(m => m.type() === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  // Test base cases for factorial: 0 and 1
  test.describe('Base case calculations', () => {
    test('Calculating factorial of 0 returns 1', async ({ page }) => {
      const fp = new FactorialPage(page);
      await fp.goto();

      // Enter 0 and click calculate
      await fp.enterNumber(0);
      await fp.clickCalculate();

      // Validate the resulting text
      await expect(fp.result).toHaveText('Factorial of 0 is: 1');

      // Validate no JavaScript errors occurred
      expect(pageErrors).toEqual([]);
      const consoleErrors = consoleMessages.filter(m => m.type() === 'error');
      expect(consoleErrors.length).toBe(0);
    });

    test('Calculating factorial of 1 returns 1', async ({ page }) => {
      const fp = new FactorialPage(page);
      await fp.goto();

      // Enter 1 and click calculate
      await fp.enterNumber(1);
      await fp.clickCalculate();

      await expect(fp.result).toHaveText('Factorial of 1 is: 1');

      // Validate no JavaScript errors occurred
      expect(pageErrors).toEqual([]);
      const consoleErrors = consoleMessages.filter(m => m.type() === 'error');
      expect(consoleErrors.length).toBe(0);
    });
  });

  // Test a typical positive integer
  test('Calculating factorial of 5 returns 120', async ({ page }) => {
    const fp = new FactorialPage(page);
    await fp.goto();

    // Enter 5 and click calculate
    await fp.enterNumber(5);
    await fp.clickCalculate();

    // The result should be correctly computed
    await expect(fp.result).toHaveText('Factorial of 5 is: 120');

    // Validate no JS runtime errors
    expect(pageErrors).toEqual([]);
    const consoleErrors = consoleMessages.filter(m => m.type() === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  // Test edge cases and invalid input handling
  test.describe('Error handling and edge cases', () => {
    test('Empty input produces validation message', async ({ page }) => {
      const fp = new FactorialPage(page);
      await fp.goto();

      // Ensure input is empty and click calculate
      await fp.enterNumber(''); // clearing input
      await fp.clickCalculate();

      await expect(fp.result).toHaveText('Please enter a valid non-negative integer.');

      // Validate no JS runtime errors
      expect(pageErrors).toEqual([]);
      const consoleErrors = consoleMessages.filter(m => m.type() === 'error');
      expect(consoleErrors.length).toBe(0);
    });

    test('Negative input produces validation message', async ({ page }) => {
      const fp = new FactorialPage(page);
      await fp.goto();

      // Enter a negative number
      await fp.enterNumber(-3);
      await fp.clickCalculate();

      await expect(fp.result).toHaveText('Please enter a valid non-negative integer.');

      // Validate no JS runtime errors
      expect(pageErrors).toEqual([]);
      const consoleErrors = consoleMessages.filter(m => m.type() === 'error');
      expect(consoleErrors.length).toBe(0);
    });

    test('Non-numeric input (attempt) produces validation message', async ({ page }) => {
      const fp = new FactorialPage(page);
      await fp.goto();

      // The input is of type number. However, attempt to fill with a non-numeric string.
      // The browser will typically allow setting the value via JS; fill will set the field's value attribute.
      await fp.enterNumber('abc');
      await fp.clickCalculate();

      // parseInt('abc') results in NaN, so expect the validation message
      await expect(fp.result).toHaveText('Please enter a valid non-negative integer.');

      // Validate no JS runtime errors
      expect(pageErrors).toEqual([]);
      const consoleErrors = consoleMessages.filter(m => m.type() === 'error');
      expect(consoleErrors.length).toBe(0);
    });
  });

  // Test accessibility and interaction niceties
  test('Input can be focused and button is operable (accessibility check)', async ({ page }) => {
    const fp = new FactorialPage(page);
    await fp.goto();

    // Focus the input and verify focus state
    await fp.focusInput();
    // Ensure the page's active element is the input
    const activeId = await page.evaluate(() => document.activeElement && document.activeElement.id);
    expect(activeId).toBe('numberInput');

    // Button should be visible and enabled
    expect(await fp.isButtonVisible()).toBe(true);
    // Click button with empty input to ensure clickable
    await fp.clickCalculate();
    await expect(fp.result).toHaveText('Please enter a valid non-negative integer.');

    // Validate no JS runtime errors occurred during these interactions
    expect(pageErrors).toEqual([]);
    const consoleErrors = consoleMessages.filter(m => m.type() === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  // Final sanity check: ensure that during typical usage no page errors were emitted
  test('No uncaught page errors or console error messages occurred during typical usage', async ({ page }) => {
    const fp = new FactorialPage(page);
    await fp.goto();

    // Perform a sequence of typical interactions
    await fp.enterNumber(3);
    await fp.clickCalculate();
    await expect(fp.result).toHaveText('Factorial of 3 is: 6');

    await fp.enterNumber(4);
    await fp.clickCalculate();
    await expect(fp.result).toHaveText('Factorial of 4 is: 24');

    // After interactions, ensure zero pageerrors and no console.error messages
    expect(pageErrors).toEqual([]);
    const consoleErrors = consoleMessages.filter(m => m.type() === 'error');
    expect(consoleErrors.length).toBe(0);
  });
});