import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/7abed132-cd32-11f0-a96f-2d591ffb35fe.html';

// Page Object for the Recursion Demo page
class RecursionPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input = page.locator('#numberInput');
    this.calcBtn = page.locator('#calcBtn');
    this.output = page.locator('#output');
    this.heading = page.locator('h1');
  }

  async goto() {
    await this.page.goto(APP_URL);
    // Wait for the main interactive elements to be present
    await Promise.all([
      this.input.waitFor({ state: 'visible' }),
      this.calcBtn.waitFor({ state: 'visible' }),
      this.output.waitFor({ state: 'visible' }),
    ]);
  }

  async getHeadingText() {
    return this.heading.textContent();
  }

  async getInputValue() {
    return this.input.inputValue();
  }

  async setInputValue(value) {
    // Replace value in the number input
    await this.input.fill(String(value));
  }

  async clickCalculate() {
    await this.calcBtn.click();
  }

  async getOutputText() {
    return this.output.textContent();
  }

  async waitForOutputContains(substring, timeout = 2000) {
    await this.page.waitForFunction(
      (sel, text) => {
        const el = document.querySelector(sel);
        return el && el.textContent && el.textContent.indexOf(text) !== -1;
      },
      ['#output', substring],
      { timeout }
    );
  }
}

test.describe('Recursion Demonstration - End-to-End', () => {
  // Arrays to collect console and page errors for each test
  let consoleMessages;
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    consoleErrors = [];
    pageErrors = [];

    // Collect console messages and errors
    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Collect uncaught page errors (ReferenceError, TypeError, etc.)
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });
  });

  // After each test, we assert there were no unexpected runtime errors
  test.afterEach(async () => {
    // Assert no uncaught page errors occurred during the test
    expect(pageErrors.length).toBe(0);

    // Assert no console.error messages were emitted during the test
    expect(consoleErrors.length).toBe(0);
  });

  test('Initial load: UI elements are present and default state is correct', async ({ page }) => {
    // Purpose: Verify that the page loads correctly and shows default values
    const app = new RecursionPage(page);
    await app.goto();

    // Header should be visible and contain correct title
    await expect(app.heading).toBeVisible();
    const headingText = await app.getHeadingText();
    expect(headingText).toContain('Recursion Demonstration');

    // Input should have default value 5 as per HTML
    const inputValue = await app.getInputValue();
    expect(inputValue).toBe('5');

    // Calculate button should be visible & enabled
    await expect(app.calcBtn).toBeVisible();
    await expect(app.calcBtn).toBeEnabled();

    // Output area should be visible and initially empty
    const outputText = await app.getOutputText();
    expect(outputText.trim()).toBe('');

    // Accessibility: input should have a label associated via for/id
    // Ensure the label exists and references the input id
    const labelFor = await page.locator('label[for="numberInput"]').first().getAttribute('for');
    expect(labelFor).toBe('numberInput');
  });

  test('Calculating factorial(5) logs recursion steps and displays correct result', async ({ page }) => {
    // Purpose: Ensure the recursion logging and result display for a typical input
    const app1 = new RecursionPage(page);
    await app.goto();

    // Use default value 5 and click calculate
    await app.clickCalculate();

    // Wait for the output to contain the calculation header
    await app.waitForOutputContains('Calculating factorial(5) using recursion...');
    const fullOutput = await app.getOutputText();

    // Should include the base case message
    expect(fullOutput).toContain('Reached base case factorial(0) = 1');

    // Should include a returning line for the top-level multiplication
    expect(fullOutput).toContain('Returning 5 * factorial(4) = 120');

    // Final result should be displayed and formatted (120)
    expect(fullOutput).toContain('Result: factorial(5) = 120');

    // The output should contain multiple lines showing the recursive calls
    expect(fullOutput.split('\n').length).toBeGreaterThanOrEqual(4);
  });

  test('Entering a negative number displays validation error message', async ({ page }) => {
    // Purpose: Validate input validation for negative integers
    const app2 = new RecursionPage(page);
    await app.goto();

    // Set input to a negative value and click calculate
    await app.setInputValue(-1);
    await app.clickCalculate();

    // The output should show the validation message
    await app.waitForOutputContains('Please enter a non-negative integer.');
    const out = await app.getOutputText();
    expect(out.trim()).toBe('Please enter a non-negative integer.');
  });

  test('Empty input (non-number) displays validation error message', async ({ page }) => {
    // Purpose: Validate input validation when input is cleared
    const app3 = new RecursionPage(page);
    await app.goto();

    // Clear the input field and click calculate
    await app.setInputValue('');
    await app.clickCalculate();

    // The output should show the validation message
    await app.waitForOutputContains('Please enter a non-negative integer.');
    const out1 = await app.getOutputText();
    expect(out.trim()).toBe('Please enter a non-negative integer.');
  });

  test('Entering a large number (>20) and cancelling the confirm dialog aborts calculation', async ({ page }) => {
    // Purpose: Verify that the confirm dialog prevents heavy calculations when cancelled
    const app4 = new RecursionPage(page);
    await app.goto();

    // Prepare to dismiss the confirm dialog (simulate user clicking "Cancel")
    page.once('dialog', async (dialog) => {
      expect(dialog.type()).toBe('confirm');
      // Dismissing the dialog simulates clicking "Cancel"
      await dialog.dismiss();
    });

    // Set input to 21 and click calculate
    await app.setInputValue(21);
    await app.clickCalculate();

    // If the confirm was dismissed, there should be no log or result added to output
    // Output may be empty string or unchanged — verify it does not contain "Calculating factorial(21)"
    const out2 = await app.getOutputText();
    expect(out).not.toContain('Calculating factorial(21)');
  });

  test('Entering a large number (>20) and accepting the confirm dialog performs calculation', async ({ page }) => {
    // Purpose: Verify that accepting the confirm dialog proceeds with calculation
    const app5 = new RecursionPage(page);
    await app.goto();

    // Prepare to accept the confirm dialog (simulate user clicking "OK")
    page.once('dialog', async (dialog) => {
      expect(dialog.type()).toBe('confirm');
      await dialog.accept();
    });

    // Set input to 21 and click calculate
    await app.setInputValue(21);
    await app.clickCalculate();

    // Wait for the output to indicate calculation started
    await app.waitForOutputContains('Calculating factorial(21) using recursion...', 5000);
    const out3 = await app.getOutputText();

    // The output should include the base case message and the final result header
    expect(out).toContain('Reached base case factorial(0) = 1');
    expect(out).toContain('Result: factorial(21) =');

    // Verify that the result number is a numeric string somewhere in the result line
    const resultLineMatch = out.match(/Result: factorial\(21\) = ([\d,]+)/);
    expect(resultLineMatch).not.toBeNull();
    // Further ensure the parsed digits result in a finite number when removing commas
    const numericString = resultLineMatch ? resultLineMatch[1].replace(/,/g, '') : '0';
    expect(Number.isFinite(Number(numericString))).toBeTruthy();
  });

  test('Console and runtime errors are observed and asserted (none expected)', async ({ page }) => {
    // Purpose: Demonstrate observation of console logs and runtime errors.
    // We will load the page and perform a benign calculation, then assert there are no page errors
    const app6 = new RecursionPage(page);
    await app.goto();

    // Perform a calculation to generate typical behavior
    await app.setInputValue(3);
    await app.clickCalculate();

    // Wait for result to appear
    await app.waitForOutputContains('Result: factorial(3) = 6');

    // Assert there were no console.error messages captured
    // (This is redundant with afterEach assertions but documented here for clarity)
    expect(consoleErrors.length).toBe(0);

    // Assert there were no uncaught page errors
    expect(pageErrors.length).toBe(0);

    // Also check that some console.log/info messages (if any) were captured without being errors
    // We don't assert exact messages, but if the page produced normal console output it will be present
    expect(consoleMessages.every(m => typeof m.text === 'string')).toBeTruthy();
  });
});