import { test, expect } from '@playwright/test';

// Test file for application: 11b7bb3e-d5a1-11f0-9c7a-cdf1d7a06e11
// URL served at:
// http://127.0.0.1:5500/workspace/baseline-html2test-llama/html/11b7bb3e-d5a1-11f0-9c7a-cdf1d7a06e11.html

// Page Object Model for the Recursion Calculator page
class RecursionPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.url = 'http://127.0.0.1:5500/workspace/baseline-html2test-llama/html/11b7bb3e-d5a1-11f0-9c7a-cdf1d7a06e11.html';
    this.input = page.locator('#number');
    this.button = page.locator('#calculate');
    this.result = page.locator('#result');
    this.heading = page.locator('h1');
  }

  async goto() {
    await this.page.goto(this.url);
    // Wait for the main elements to be available
    await expect(this.heading).toBeVisible();
    await expect(this.input).toBeVisible();
    await expect(this.button).toBeVisible();
    await expect(this.result).toBeVisible();
  }

  async fillNumber(value) {
    // Use fill to replace value
    await this.input.fill(String(value));
  }

  async clickCalculate() {
    await this.button.click();
  }

  async getResultText() {
    return await this.result.textContent();
  }
}

test.describe('Recursion Calculator - interactive behavior and state transitions', () => {
  let pageErrors = [];
  let consoleMessages = [];

  test.beforeEach(async ({ page }) => {
    // Reset error/message collectors
    pageErrors = [];
    consoleMessages = [];

    // Collect pageerrors (uncaught exceptions)
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    // Collect console messages for later assertions (info/warn/error)
    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
  });

  test.afterEach(async () => {
    // after each test we keep the arrays for assertions inside tests.
    // No teardown needed beyond Playwright fixtures.
  });

  test('Initial page load shows expected controls and default states', async ({ page }) => {
    // Purpose: verify initial DOM structure, visibility and default values
    const app = new RecursionPage(page);
    await app.goto();

    // Heading text should indicate application identity
    await expect(app.heading).toHaveText('Recursion Calculator');

    // Input should be present and empty by default (value is empty string)
    await expect(app.input).toHaveAttribute('placeholder', 'Enter a number');
    const initialInputValue = await app.input.inputValue();
    expect(initialInputValue === '' || initialInputValue === '0' || initialInputValue === '0').toBeTruthy();

    // Button should be visible and enabled
    await expect(app.button).toBeVisible();
    await expect(app.button).toBeEnabled();

    // Result element should be present and initially empty
    const initialResult = await app.getResultText();
    expect(initialResult === '' || initialResult === null).toBeTruthy();

    // No uncaught page errors should have occurred during load
    expect(pageErrors.length).toBe(0);

    // Record console messages snapshot (not asserting they are empty here)
    // but ensure consoleMessages is an array
    expect(Array.isArray(consoleMessages)).toBeTruthy();
  });

  test('Clicking Calculate without entering a number uses the captured initial value and updates the result', async ({ page }) => {
    // Purpose: validate behavior when user clicks Calculate immediately after load
    const app1 = new RecursionPage(page);
    await app.goto();

    // Click the calculate button with no user input
    await app.clickCalculate();

    // The implementation captures the input value at load time into a constant "number".
    // When the page initially loads the input is empty, which coerces to 0 when using unary +.
    // Therefore the result text is expected to show the recursive function evaluated at 0.
    await expect(app.result).toBeVisible();
    await expect(app.result).toHaveText('The result of recursive function call is: 0');

    // Ensure no uncaught page errors occurred upon clicking
    expect(pageErrors.length).toBe(0);
  });

  test('Entering a number then clicking Calculate: result does NOT change due to captured initial value bug', async ({ page }) => {
    // Purpose: test the bug where the script captures the input value at load and does not
    // re-read it on button click. We assert the observed behavior (not the ideal).
    const app2 = new RecursionPage(page);
    await app.goto();

    // Fill the input with a non-zero value
    await app.fillNumber(5);
    await expect(app.input).toHaveValue('5');

    // Click calculate
    await app.clickCalculate();

    // Because the code captured the input value at load (which was empty -> coerced to 0),
    // the calculation uses that captured value. The displayed result should therefore still be 0.
    await expect(app.result).toHaveText('The result of recursive function call is: 0');

    // Confirm the input retains the value the user typed
    await expect(app.input).toHaveValue('5');

    // No page errors from this interaction
    expect(pageErrors.length).toBe(0);
  });

  test('Direct access to recursiveFunction in page context works and produces expected numeric result', async ({ page }) => {
    // Purpose: validate that the recursive implementation is present on the page and
    // that its algorithm (sum from n to 1) is correct when invoked directly.
    const app3 = new RecursionPage(page);
    await app.goto();

    // The function is declared in global scope; verify its presence and behavior
    const typeOfFn = await page.evaluate(() => typeof recursiveFunction);
    expect(typeOfFn).toBe('function');

    // Evaluate the function with a few inputs to verify logic
    const results = await page.evaluate(() => {
      return {
        zero: recursiveFunction(0),   // expected 0
        one: recursiveFunction(1),    // expected 1
        five: recursiveFunction(5),   // expected 15 (5+4+3+2+1)
        negative: recursiveFunction(-3) // for n <= 1 returns n, so -3
      };
    });

    expect(results.zero).toBe(0);
    expect(results.one).toBe(1);
    expect(results.five).toBe(15);
    expect(results.negative).toBe(-3);

    // No page errors from evaluating the function
    expect(pageErrors.length).toBe(0);
  });

  test('Edge cases: entering 1 and negative numbers then clicking Calculate preserve captured behavior', async ({ page }) => {
    // Purpose: ensure that edge-case input values do not change the observed behavior
    const app4 = new RecursionPage(page);
    await app.goto();

    // Enter 1 and click - ideal behavior would show 1, but implementation uses captured initial value
    await app.fillNumber(1);
    await expect(app.input).toHaveValue('1');
    await app.clickCalculate();
    await expect(app.result).toHaveText('The result of recursive function call is: 0');

    // Enter a negative number and click - the same captured value is used (0)
    await app.fillNumber(-5);
    await expect(app.input).toHaveValue('-5');
    await app.clickCalculate();
    await expect(app.result).toHaveText('The result of recursive function call is: 0');

    // Confirm no uncaught exceptions during these interactions
    expect(pageErrors.length).toBe(0);
  });

  test('Accessibility and focusability: input and button can be focused and operated with keyboard', async ({ page }) => {
    // Purpose: basic accessibility checks - ensure focus order and activation work
    const app5 = new RecursionPage(page);
    await app.goto();

    // Focus the input via keyboard and type a value
    await app.input.focus();
    await expect(app.input).toBeFocused();
    await page.keyboard.type('3');
    await expect(app.input).toHaveValue('3');

    // Press Tab to move focus to the button, then press Enter to activate
    await page.keyboard.press('Tab');
    await expect(app.button).toBeFocused();
    await page.keyboard.press('Enter');

    // Again, due to captured initial value at load, the result will be based on that initial capture (0)
    await expect(app.result).toHaveText('The result of recursive function call is: 0');

    // No uncaught page errors
    expect(pageErrors.length).toBe(0);
  });

  test('Console and page error observation: no unexpected runtime errors emitted during normal flow', async ({ page }) => {
    // Purpose: explicitly assert that no uncaught runtime errors were emitted during load and interactions.
    const app6 = new RecursionPage(page);
    await app.goto();

    // Perform a representative set of interactions
    await app.fillNumber(4);
    await app.clickCalculate();

    // Wait briefly to allow any potential async errors to surface
    await page.waitForTimeout(100);

    // Assert that there are no uncaught page errors recorded
    expect(pageErrors.length).toBe(0);

    // Optionally assert there's at least some console activity (not required), but ensure the collector worked
    expect(Array.isArray(consoleMessages)).toBeTruthy();
  });
});