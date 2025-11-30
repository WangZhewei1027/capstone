import { test, expect } from '@playwright/test';

const URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/e03a476d-cd32-11f0-a949-f901cf5609c9.html';

// Page object for the Recursion demo page to encapsulate selectors and common actions
class RecursionPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input = page.locator('#numberInput');
    this.calcButton = page.locator('#calcBtn');
    this.result = page.locator('#result');
    this.callStack = page.locator('#call-stack');
    this.heading = page.locator('h1');
    this.label = page.locator('label[for="numberInput"]');
  }

  async goto() {
    await this.page.goto(URL);
  }

  async calculate(n) {
    // Fill the input (stringify to allow empty string)
    await this.input.fill(String(n));
    await this.calcButton.click();
  }

  async clickCalculate() {
    await this.calcButton.click();
  }

  async getResultText() {
    return await this.result.textContent();
  }

  async getCallStackText() {
    return await this.callStack.textContent();
  }
}

test.describe('Recursion Demo: Factorial Calculation UI', () => {
  // Arrays to collect console messages and page errors for each test
  let consoleMessages;
  let pageErrors;

  // Attach listeners before each test and navigate to the page
  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Capture console messages emitted by the page
    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Capture page errors (uncaught exceptions)
    page.on('pageerror', err => {
      pageErrors.push(err);
    });
  });

  // Test: initial page load and default state
  test('Initial load shows static content, controls and default state', async ({ page }) => {
    // Purpose: Verify that the page loads and static content is present, controls have expected defaults,
    // and there are no runtime errors or console errors on load.
    const app = new RecursionPage(page);
    await app.goto();

    // Verify header text
    await expect(app.heading).toHaveText('Recursion Demonstration: Factorial Calculation');

    // Verify input default value (as provided in HTML)
    await expect(app.input).toHaveValue('5');

    // Verify result area default message
    await expect(app.result).toContainText('Enter a number and click "Calculate Factorial" to see the result.');

    // Verify call stack default message
    await expect(app.callStack).toHaveText('Call stack will be displayed here.');

    // Verify label is associated with the input (accessibility)
    await expect(app.label).toHaveAttribute('for', 'numberInput');

    // Verify input constraints attributes exist
    await expect(app.input).toHaveAttribute('min', '0');
    await expect(app.input).toHaveAttribute('max', '20');

    // Assert there are no uncaught page errors
    expect(pageErrors.length, 'No page errors should occur on initial load').toBe(0);

    // Assert there are no console error messages
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length, 'No console.error messages should be emitted on initial load').toBe(0);
  });

  // Test: calculate factorial for the default value (5)
  test('Calculates factorial for 5 and displays correct result and call stack', async ({ page }) => {
    // Purpose: Validate that clicking the Calculate button computes factorial(5) correctly,
    // updates the result area, and renders a correctly ordered call stack trace.
    const app1 = new RecursionPage(page);
    await app.goto();

    // Click calculate (default value is 5)
    await app.clickCalculate();

    // Verify result contains the expected factorial value
    await expect(app.result).toContainText('Factorial of 5 is:');
    await expect(app.result).toContainText('120');

    // Verify call stack content and structure
    const callStackText = (await app.getCallStackText()) || '';
    const lines = callStackText.split('\n').map(l => l.trimEnd());
    // For n = 5 we expect 2 * (n + 1) = 12 entries (6 calls and 6 returns)
    expect(lines.length, 'Call stack should have 12 lines for n=5').toBe(12);

    // Expect top-level entries present and ordered
    expect(lines[0]).toContain('factorial(5) called');
    expect(lines[lines.length - 1]).toContain('factorial(5) returns 120');
    expect(lines).toContainEqual(expect.stringContaining('factorial(0) called'));
    expect(lines).toContainEqual(expect.stringContaining('factorial(0) returns 1'));

    // Assert no runtime errors were recorded during the calculation
    expect(pageErrors.length, 'No page errors should occur when calculating factorial(5)').toBe(0);
    const consoleErrors1 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length, 'No console.error messages should be emitted when calculating factorial(5)').toBe(0);
  });

  // Test: edge case n = 0
  test('Handles zero input correctly (n = 0)', async ({ page }) => {
    // Purpose: Ensure factorial(0) is computed as 1 and the call stack is minimal and correct.
    const app2 = new RecursionPage(page);
    await app.goto();

    await app.calculate(0);

    // Check result area
    await expect(app.result).toContainText('Factorial of 0 is:');
    await expect(app.result).toContainText('1');

    // Call stack should show a call and a return for 0 -> total 2 lines
    const callStackText1 = (await app.getCallStackText()) || '';
    const lines1 = callStackText.split('\n');
    expect(lines.length, 'Call stack for n=0 should have 2 lines').toBe(2);
    expect(lines[0]).toContain('factorial(0) called');
    expect(lines[1]).toContain('factorial(0) returns 1');

    // Assert no runtime errors
    expect(pageErrors.length, 'No page errors should occur when calculating factorial(0)').toBe(0);
    const consoleErrors2 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length, 'No console.error messages should be emitted when calculating factorial(0)').toBe(0);
  });

  // Test: invalid negative input
  test('Shows error message for negative input and clears call stack', async ({ page }) => {
    // Purpose: Verify that negative input is handled and an error message is displayed while call stack is cleared.
    const app3 = new RecursionPage(page);
    await app.goto();

    await app.calculate(-1);

    // Expect error message in result area
    await expect(app.result).toHaveText('Please enter a non-negative integer between 0 and 20.');

    // Call stack should be empty string
    const callStackText2 = await app.getCallStackText();
    expect(callStackText, 'Call stack should be cleared for invalid input').toBe('');

    // No runtime errors expected
    expect(pageErrors.length, 'No page errors should occur for invalid negative input').toBe(0);
    const consoleErrors3 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length, 'No console.error messages should be emitted for invalid negative input').toBe(0);
  });

  // Test: input above maximum allowed (21)
  test('Shows error message for input greater than 20 and clears call stack', async ({ page }) => {
    // Purpose: Ensure values greater than the allowed maximum are rejected with an informative message.
    const app4 = new RecursionPage(page);
    await app.goto();

    await app.calculate(21);

    // Expect specific error message
    await expect(app.result).toHaveText('Please enter a non-negative integer between 0 and 20.');

    // Call stack should be empty string
    const callStackText3 = await app.getCallStackText();
    expect(callStackText).toBe('');

    // No runtime errors expected
    expect(pageErrors.length, 'No page errors should occur for input > 20').toBe(0);
    const consoleErrors4 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length, 'No console.error messages should be emitted for input > 20').toBe(0);
  });

  // Test: non-numeric / empty input
  test('Handles empty/non-numeric input gracefully with error message', async ({ page }) => {
    // Purpose: Validate that empty input (or non-numeric data) produces the same informative error and no call stack.
    const app5 = new RecursionPage(page);
    await app.goto();

    // Clear the input to simulate an empty/non-numeric value
    await app.input.fill('');
    await app.clickCalculate();

    await expect(app.result).toHaveText('Please enter a non-negative integer between 0 and 20.');
    const callStackText4 = await app.getCallStackText();
    expect(callStackText).toBe('');

    // No runtime errors expected
    expect(pageErrors.length, 'No page errors should occur for empty/non-numeric input').toBe(0);
    const consoleErrors5 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length, 'No console.error messages should be emitted for empty/non-numeric input').toBe(0);
  });

  // Test: boundary test for n = 20
  test('Calculates factorial for 20 (boundary) and produces expected call stack length', async ({ page }) => {
    // Purpose: Validate correct calculation for the upper allowed bound and that the call stack has expected size.
    const app6 = new RecursionPage(page);
    await app.goto();

    // Calculate factorial of 20
    await app.calculate(20);

    // Verify result: factorial of 20 is 2432902008176640000
    await expect(app.result).toContainText('Factorial of 20 is:');
    await expect(app.result).toContainText('2432902008176640000');

    // Call stack should have 2 * (20 + 1) = 42 lines (21 calls and 21 returns)
    const callStackText5 = (await app.getCallStackText()) || '';
    const lines2 = callStackText.split('\n').map(l => l.trimEnd());
    expect(lines.length, 'Call stack should have 42 lines for n=20').toBe(42);

    // Start and end entries sanity checks
    expect(lines[0]).toContain('factorial(20) called');
    expect(lines[lines.length - 1]).toContain('factorial(20) returns 2432902008176640000');

    // No runtime errors expected
    expect(pageErrors.length, 'No page errors should occur when calculating factorial(20)').toBe(0);
    const consoleErrors6 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length, 'No console.error messages should be emitted when calculating factorial(20)').toBe(0);
  });
});