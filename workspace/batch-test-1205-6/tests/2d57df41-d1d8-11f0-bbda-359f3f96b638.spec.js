import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-6/html/2d57df41-d1d8-11f0-bbda-359f3f96b638.html';

// Page Object Model for the Recursion Demo page
class RecursionPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.inputSelector = '#numberInput';
    this.buttonSelector = 'button[onclick="calculateFactorial()"]';
    this.outputSelector = '#output';
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async setNumber(value) {
    // Use fill to set the input (works for negative or decimal strings as well)
    await this.page.fill(this.inputSelector, String(value));
  }

  async clearNumber() {
    await this.page.fill(this.inputSelector, '');
  }

  async clickCalculate() {
    await this.page.click(this.buttonSelector);
  }

  async getOutputText() {
    return (await this.page.textContent(this.outputSelector)) || '';
  }

  async inputAttributes() {
    return this.page.locator(this.inputSelector);
  }

  async buttonExists() {
    return this.page.locator(this.buttonSelector).count().then(c => c > 0);
  }

  async isRenderPageDefined() {
    // typeof renderPage is safe even if undefined
    return this.page.evaluate(() => typeof renderPage);
  }
}

test.describe('Recursion Demo - FSM validation tests', () => {
  // Collect console and page errors for each test to assert about them when appropriate
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Capture console events
    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Capture unhandled page errors (e.g., RangeError from recursive overflow)
    page.on('pageerror', error => {
      pageErrors.push(error);
    });
  });

  test('Initial Idle state renders correctly (S0_Idle)', async ({ page }) => {
    // This test validates that on page load the Idle state UI is present:
    // - number input with type=number and min=0
    // - calculate button present
    // - output area is empty
    const app = new RecursionPage(page);
    await app.goto();

    // Verify input exists and has correct attributes
    const input = page.locator(app.inputSelector);
    await expect(input).toHaveCount(1);
    await expect(input).toHaveAttribute('type', 'number');
    await expect(input).toHaveAttribute('min', '0');

    // Verify button exists and is visible
    const button = page.locator(app.buttonSelector);
    await expect(button).toHaveCount(1);
    await expect(button).toHaveText(/Calculate Factorial/);

    // Output area should exist and be empty initially
    const outputText = await app.getOutputText();
    expect(outputText).toBe('', 'Expected output to be empty in the Idle state');

    // Verify that the FSM-specified entry action renderPage() is not defined in the page,
    // since the HTML does not implement renderPage(). We assert its typeof is 'undefined'.
    const renderPageType = await app.isRenderPageDefined();
    expect(renderPageType).toBe('undefined');

    // Ensure there were no console errors emitted during load
    const errorConsoleMessages = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleMessages.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Calculating positive number: factorial(5) -> returns 120 and returns to Idle (S1_Calculating -> S0_Idle)', async ({ page }) => {
    // This test validates the successful calculation transition:
    // - entering a valid non-negative integer computes factorial and displays correct message
    const app1 = new RecursionPage(page);
    await app.goto();

    await app.setNumber('5');
    await app.clickCalculate();

    // Expect the output to display the factorial result
    const out = await app.getOutputText();
    expect(out).toBe('Factorial of 5 is 120.');

    // Ensure no page errors or console error messages were observed
    const errorConsoleMessages1 = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleMessages.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Calculating zero: factorial(0) -> returns 1 (S1_Calculating -> S0_Idle)', async ({ page }) => {
    // Validates base-case recursion handling
    const app2 = new RecursionPage(page);
    await app.goto();

    await app.setNumber('0');
    await app.clickCalculate();

    const out1 = await app.getOutputText();
    expect(out).toBe('Factorial of 0 is 1.');

    // No runtime errors expected
    const errorConsoleMessages2 = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleMessages.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Edge case: decimal input "3.5" should parseInt -> 3 and compute factorial(3)=6', async ({ page }) => {
    // Shows how parseInt handles decimal input and how FSM transition treats the parsed integer
    const app3 = new RecursionPage(page);
    await app.goto();

    await app.setNumber('3.5');
    await app.clickCalculate();

    const out2 = await app.getOutputText();
    expect(out).toBe('Factorial of 3 is 6.');

    // No errors expected
    const errorConsoleMessages3 = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleMessages.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Error state on negative input: entering -3 shows error message (S1_Calculating -> S2_Error)', async ({ page }) => {
    // This test validates transition to the Error state when the guard number < 0 is true
    const app4 = new RecursionPage(page);
    await app.goto();

    // Even though the input has min=0, users (and Playwright) can set negative values
    await app.setNumber('-3');
    await app.clickCalculate();

    const out3 = await app.getOutputText();
    expect(out).toBe('Please enter a non-negative integer.');

    // Ensure no runtime exceptions occurred (the code handles negative numbers explicitly)
    const errorConsoleMessages4 = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleMessages.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Empty input leads to recursive NaN and should produce a pageerror (stack overflow) - observe runtime error', async ({ page }) => {
    // This test intentionally leaves the input empty so parseInt('') -> NaN.
    // The code does not guard for NaN, so factorial(NaN) will recurse indefinitely leading to a RangeError (maximum call stack).
    // We assert that a pageerror occurs and that it mentions call stack exhaustion.
    const app5 = new RecursionPage(page);
    await app.goto();

    await app.clearNumber();

    // Trigger and wait for the pageerror (RangeError due to recursion) to be emitted
    const promiseError = page.waitForEvent('pageerror');
    await app.clickCalculate();
    const error = await promiseError;

    // The message may vary by browser but commonly includes "Maximum call stack size exceeded"
    const message = (error && error.message) ? error.message : String(error);
    expect(
      /Maximum call stack size exceeded|maximum call stack size exceeded|RangeError/i.test(message)
    ).toBeTruthy();

    // Confirm that our captured pageErrors array also includes this error
    expect(pageErrors.length).toBeGreaterThanOrEqual(1);
    const capturedMsg = pageErrors[pageErrors.length - 1].message || '';
    expect(capturedMsg).toContain((/Maximum call stack size exceeded/i.test(capturedMsg) ? 'Maximum call stack size exceeded' : capturedMsg.split('\n')[0]));

    // Output text may be empty or partially updated; we primarily assert the runtime error occurred
  });

  test('Non-numeric input via script injection is not allowed by tests (do not modify page globals) - verify parseInt behavior with letters', async ({ page }) => {
    // This test inputs a non-numeric string into the numeric input (Playwright fill() permits it).
    // parseInt of a non-numeric string returns NaN -> triggers same recursion error as empty input.
    // We assert the application behaves consistently (leads to a pageerror).
    const app6 = new RecursionPage(page);
    await app.goto();

    await app.setNumber('abc');
    const waitError = page.waitForEvent('pageerror');
    await app.clickCalculate();
    const error1 = await waitError;

    expect(error).toBeTruthy();
    const message1 = error.message1 || '';
    expect(/Maximum call stack size exceeded|RangeError/i.test(message)).toBeTruthy();
  });

  test.afterEach(async ({ page }) => {
    // Sanity: no unexpected critical console errors should remain for tests that should succeed.
    // This is a gentle check: tests that expect errors (explicitly) assert them themselves.
    // Here we assert there were no unhandled ReferenceError, SyntaxError, or TypeError messages in general console logs.
    const problematic = consoleMessages.filter(m =>
      /ReferenceError|SyntaxError|TypeError/i.test(m.text)
    );
    expect(problematic.length).toBe(0);
  });
});