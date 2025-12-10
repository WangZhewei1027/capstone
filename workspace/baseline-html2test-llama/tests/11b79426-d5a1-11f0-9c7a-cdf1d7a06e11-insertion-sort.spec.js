import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-llama/html/11b79426-d5a1-11f0-9c7a-cdf1d7a06e11.html';

/**
 * Page Object for the Insertion Sort page
 * Encapsulates common element selectors and actions.
 */
class InsertionSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input = page.locator('#num');
    this.button = page.locator('button', { hasText: 'Sort' });
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async fillNumber(value) {
    // Use fill to simulate user typing into the input
    await this.input.fill(String(value));
  }

  async clickSort() {
    await this.button.click();
  }

  async getInputValue() {
    return this.input.inputValue();
  }
}

test.describe('Insertion Sort - interactive app tests', () => {

  // Test: Initial page load and default state
  test('Initial page load shows input and Sort button with expected defaults', async ({ page }) => {
    // Track page errors and console messages that may occur during load
    const pageErrors = [];
    const consoleMessages = [];
    page.on('pageerror', err => pageErrors.push(err));
    page.on('console', msg => consoleMessages.push(msg.text()));

    const app = new InsertionSortPage(page);
    // Navigate to the page
    await app.goto();

    // Verify input and button are present and visible
    await expect(app.input).toBeVisible();
    await expect(app.button).toBeVisible();

    // Verify input placeholder, enabled state and default value
    await expect(app.input).toHaveAttribute('placeholder', 'Enter a number');
    await expect(app.input).toBeEnabled();
    const inputValue = await app.getInputValue();
    expect(inputValue).toBe(''); // default empty

    // Verify button text
    await expect(app.button).toHaveText('Sort');

    // On initial load there should be no runtime errors
    expect(pageErrors.length).toBe(0);

    // No console logs related to sorting should have occurred yet
    const concatenatedConsole = consoleMessages.join('|');
    expect(concatenatedConsole).not.toContain('Sorted array:');
  });

  // Test: Clicking the Sort button triggers the sorting algorithm and logs the sorted array
  test('Clicking Sort logs sorted array and does not throw errors', async ({ page }) => {
    const pageErrors1 = [];
    page.on('pageerror', err => pageErrors.push(err));

    const app1 = new InsertionSortPage(page);
    await app.goto();

    // Listen for console messages and capture the first console event triggered by the click
    const consolePromise = page.waitForEvent('console', { timeout: 2000 });

    // Fill the input (app logic doesn't use it, but simulate user action)
    await app.fillNumber(5);

    // Click Sort - the page's sortInsertion() is invoked via the button's onclick
    await app.clickSort();

    // Wait for a console message (the script console.logs the sorted array)
    const consoleMessage = await consolePromise;
    const msgText = consoleMessage.text();

    // The console output should include the label "Sorted array:"
    expect(msgText).toContain('Sorted array:');

    // The sorted array should contain the sequence 0 through 9; at minimum check for 0 and 9
    // The exact formatting of console output can vary across browsers, so assert partial content
    expect(msgText).toContain('0');
    expect(msgText).toContain('9');

    // No page errors should have been thrown during the interaction
    expect(pageErrors.length).toBe(0);
  });

  // Test: Multiple interactions with different inputs (edge cases) should consistently log the sorted array
  test('Edge case inputs (empty, negative, decimal, non-numeric) still produce sorted output and no errors', async ({ page }) => {
    const pageErrors2 = [];
    const consoleMessages1 = [];
    page.on('pageerror', err => pageErrors.push(err));
    page.on('console', msg => consoleMessages.push(msg.text()));

    const app2 = new InsertionSortPage(page);
    await app.goto();

    // Define a variety of inputs to test edge handling in the UI (the app ignores input in algorithm)
    const testInputs = ['', '-3', '3.14', '1000000', 'abc'];

    for (const value of testInputs) {
      // Fill input and click the button
      await app.fillNumber(value);
      // Start waiting for a console message for this click
      const consolePromise1 = page.waitForEvent('console', { timeout: 2000 });
      await app.clickSort();
      const consoleMsg = await consolePromise;
      const text = consoleMsg.text();

      // Each click should produce the sorted array log
      expect(text).toContain('Sorted array:');
      // Basic sanity: sorted array must contain both 0 and 9 as endpoints of the sorted sequence
      expect(text).toContain('0');
      expect(text).toContain('9');
    }

    // Ensure there were no page errors across all interactions
    expect(pageErrors.length).toBe(0);

    // Ensure we captured as many console messages as interactions
    // (there might be additional console noise from the environment, so assert at least)
    expect(consoleMessages.length).toBeGreaterThanOrEqual(testInputs.length);
  });

  // Test: The sortInsertion function is present on the global window and is callable
  test('Global function sortInsertion exists and can be invoked programmatically', async ({ page }) => {
    const pageErrors3 = [];
    const consoleMessages2 = [];
    page.on('pageerror', err => pageErrors.push(err));
    page.on('console', msg => consoleMessages.push(msg.text()));

    const app3 = new InsertionSortPage(page);
    await app.goto();

    // Verify the function exists on the window
    const typeOfFn = await page.evaluate(() => typeof window.sortInsertion);
    expect(typeOfFn).toBe('function');

    // Call the function programmatically and ensure it logs the same output
    const consolePromise2 = page.waitForEvent('console', { timeout: 2000 });
    await page.evaluate(() => {
      // Call the existing global function; we do not modify it, only invoke it.
      window.sortInsertion();
    });
    const consoleMsg1 = await consolePromise;
    const text1 = consoleMsg.text1();

    expect(text).toContain('Sorted array:');
    expect(pageErrors.length).toBe(0);
  });

});