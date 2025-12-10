import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-llama/html/11b7942a-d5a1-11f0-9c7a-cdf1d7a06e11.html';

// Page object for the Counting Sort page
class CountingSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input = page.locator('#counting-sort-input');
    this.sortButton = page.locator('#sort-button');
    this.output = page.locator('#counting-sort-output');

    // Arrays to collect console errors and page errors during navigation/interactions
    this.consoleErrors = [];
    this.pageErrors = [];

    // Attach listeners
    this._onConsole = msg => {
      if (msg.type() === 'error') {
        this.consoleErrors.push(msg.text());
      }
    };
    this._onPageError = err => {
      // pageerror provides Error object
      this.pageErrors.push(err && err.message ? err.message : String(err));
    };

    this.page.on('console', this._onConsole);
    this.page.on('pageerror', this._onPageError);
  }

  // Navigate to the page
  async goto() {
    // Clear any previously collected errors
    this.consoleErrors = [];
    this.pageErrors = [];
    await this.page.goto(BASE_URL, { waitUntil: 'load' });
  }

  // Clean up listeners (to be called in teardown)
  async teardown() {
    this.page.off('console', this._onConsole);
    this.page.off('pageerror', this._onPageError);
  }

  // Fill the input field
  async fillInput(value) {
    await this.input.fill(value);
  }

  // Click the sort button
  async clickSort() {
    await this.sortButton.click();
  }

  // Get current output text
  async getOutputText() {
    return (await this.output.innerText()).trim();
  }

  // Get current input value property
  async getInputValue() {
    return this.page.evaluate(ele => ele.value, await this.input.elementHandle());
  }

  // Access captured errors
  getConsoleErrors() {
    return this.consoleErrors;
  }
  getPageErrors() {
    return this.pageErrors;
  }
}

test.describe('Counting Sort - UI and behavior tests', () => {
  // Ensure each test gets a fresh page
  test('Initial page load: elements present, default state, and no runtime errors', async ({ page }) => {
    const app = new CountingSortPage(page);

    // Navigate to the app
    await app.goto();

    // Verify interactive elements exist and are visible
    await expect(app.input).toBeVisible();
    await expect(app.sortButton).toBeVisible();
    await expect(app.output).toBeVisible();

    // Verify button text is as expected
    await expect(app.sortButton).toHaveText('Sort');

    // Verify input has expected placeholder and is empty by default
    await expect(app.input).toHaveAttribute('placeholder', 'Enter numbers separated by space');
    const inputVal = await app.getInputValue();
    expect(inputVal).toBe('', 'Input should be empty on initial load');

    // Output should be empty on load
    const outputText = await app.getOutputText();
    expect(outputText).toBe('', 'Output should be empty on initial load');

    // There should be no console or page errors during a normal load of the provided HTML
    expect(app.getConsoleErrors().length).toBe(0);
    expect(app.getPageErrors().length).toBe(0);

    await app.teardown();
  });

  test('Typing numbers does not automatically sort (no event handler wired); clicking Sort does not change output and no runtime errors', async ({ page }) => {
    const app1 = new CountingSortPage(page);

    await app.goto();

    // Fill numeric input with several numbers separated by spaces
    const numbers = '3 1 2';
    await app.fillInput(numbers);

    // Verify input reflects typed value
    const inputVal1 = await app.getInputValue();
    expect(inputVal).toBe(numbers, 'Input should reflect the typed numeric string');

    // Because the page's inline script returns early if input is empty on load, and no event listener is attached,
    // there is no sorting behavior wired to the button. Verify output remains unchanged after typing.
    let outputText1 = await app.getOutputText();
    expect(outputText).toBe('', 'Output should remain empty after typing, as no auto-sort occurs');

    // Click the Sort button — there is no handler defined in the provided HTML, so nothing should change and no errors should appear
    await app.clickSort();

    // Output still should be empty
    outputText = await app.getOutputText();
    expect(outputText).toBe('', 'Output should remain empty after clicking Sort because no sorting function is bound');

    // Ensure no console errors or page errors appeared as a result of these interactions
    expect(app.getConsoleErrors().length).toBe(0, 'No console.error messages should have been logged during interactions');
    expect(app.getPageErrors().length).toBe(0, 'No page errors should have been thrown during interactions');

    await app.teardown();
  });

  test('Edge cases: non-numeric input, decimals, negatives — UI should accept input but produce no output and should not throw errors', async ({ page }) => {
    const app2 = new CountingSortPage(page);

    await app.goto();

    // Non-numeric input
    const nonNumeric = 'a b c';
    await app.fillInput(nonNumeric);
    expect(await app.getInputValue()).toBe(nonNumeric, 'Input should accept non-numeric characters even though placeholder suggests numbers');

    await app.clickSort();
    expect(await app.getOutputText()).toBe('', 'Output should remain empty after clicking Sort with non-numeric input');

    // Decimal and negative values
    const mixed = '-1 2.5 3';
    await app.fillInput(mixed);
    expect(await app.getInputValue()).toBe(mixed, 'Input should accept negative and decimal numeric strings');

    await app.clickSort();
    expect(await app.getOutputText()).toBe('', 'Output should remain empty after clicking Sort with decimal/negative input');

    // No runtime errors must have occurred during these edge case interactions
    expect(app.getConsoleErrors().length).toBe(0);
    expect(app.getPageErrors().length).toBe(0);

    await app.teardown();
  });

  test('Sanity check: placeholders, attributes, and accessibility hints are present', async ({ page }) => {
    const app3 = new CountingSortPage(page);

    await app.goto();

    // Input element should be of type number (as per provided HTML)
    await expect(app.input).toHaveAttribute('type', 'number');

    // Ensure the output element exists and is a div (structural expectation)
    const tagName = await app.page.evaluate(el => el.tagName.toLowerCase(), await app.output.elementHandle());
    expect(tagName).toBe('div');

    // Verify that the page title is present and correct
    await expect(page.locator('h1')).toHaveText('Counting Sort');

    // Confirm no unexpected runtime errors on these read operations
    expect(app.getConsoleErrors().length).toBe(0);
    expect(app.getPageErrors().length).toBe(0);

    await app.teardown();
  });
});