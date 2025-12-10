import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-6/html/2d579122-d1d8-11f0-bbda-359f3f96b638.html';

// Page Object for the Fibonacci app
class FibonacciPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.numberInput = page.locator('#number');
    this.generateButton = page.locator('button[onclick="generateFibonacci()"]');
    this.result = page.locator('#result');
    // Arrays to capture console messages and page errors for assertions
    this.consoleMessages = [];
    this.pageErrors = [];
  }

  async attachListeners() {
    // Capture console messages
    this.page.on('console', (msg) => {
      this.consoleMessages.push({
        type: msg.type(),
        text: msg.text(),
      });
    });
    // Capture uncaught page errors (ReferenceError, TypeError, SyntaxError etc.)
    this.page.on('pageerror', (err) => {
      // err is Error object
      this.pageErrors.push({
        message: err.message,
        stack: err.stack,
        name: err.name,
      });
    });
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async setNumber(value) {
    // Use fill to set the input value. For number inputs, fill accepts string.
    await this.numberInput.fill(String(value));
  }

  async clickGenerate() {
    await this.generateButton.click();
  }

  async getResultText() {
    return (await this.result.textContent()) || '';
  }

  // Helper to compute expected fibonacci sequence string for assertion
  expectedFibonacciText(n) {
    const num = parseInt(n);
    if (isNaN(num) || num < 1) return 'Please enter a valid positive integer.';
    const fib = [0, 1];
    for (let i = 2; i < num; i++) {
      fib[i] = fib[i - 1] + fib[i - 2];
    }
    return 'Fibonacci Sequence: ' + fib.slice(0, num).join(', ');
  }

  // Assertion helpers for errors
  async expectNoPageErrors() {
    // Wait a tick to ensure any async page errors fire
    await this.page.waitForTimeout(10);
    expect(this.pageErrors.length, `Expected no page errors but found: ${JSON.stringify(this.pageErrors)}`).toBe(0);
    const consoleErrors = this.consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length, `Expected no console.error messages but found: ${JSON.stringify(consoleErrors)}`).toBe(0);
  }

  async expectPageErrorOfTypes(types = ['ReferenceError', 'TypeError', 'SyntaxError']) {
    await this.page.waitForTimeout(10);
    const found = this.pageErrors.some(e => types.includes(e.name));
    expect(found, `Expected at least one page error of types ${types.join(', ')}, but found: ${JSON.stringify(this.pageErrors)}`).toBeTruthy();
  }
}

test.describe('Fibonacci Sequence FSM - Interactive Tests', () => {
  // Each test gets a fresh page and FibonacciPage instance
  test('Initial Idle state renders input, button and empty result', async ({ page }) => {
    // This test validates S0_Idle entry evidence:
    // - input#number exists
    // - button[onclick="generateFibonacci()"] exists
    // - result is present and initially empty
    const app = new FibonacciPage(page);
    await app.attachListeners();
    await app.goto();

    // Verify DOM elements exist
    await expect(app.numberInput).toBeVisible();
    await expect(app.generateButton).toBeVisible();
    await expect(app.result).toBeVisible();

    // On initial render, result should be empty (Idle state)
    const resultText = await app.getResultText();
    expect(resultText).toBe('', 'Expected result div to be empty in the Idle state.');

    // verify the generateFibonacci function is defined on the page (implementation entry point)
    const fnType = await page.evaluate(() => typeof generateFibonacci);
    expect(fnType).toBe('function');

    // Ensure no runtime errors occurred during load
    await app.expectNoPageErrors();
  });

  test.describe('Valid input transitions (S0_Idle -> S1_ValidInput)', () => {
    test('Generates correct sequence for n=5', async ({ page }) => {
      // Validate that entering 5 and clicking Generate transitions to S1_ValidInput and displays the expected sequence
      const app1 = new FibonacciPage(page);
      await app.attachListeners();
      await app.goto();

      await app.setNumber(5);
      await app.clickGenerate();

      const text = await app.getResultText();
      expect(text).toBe(app.expectedFibonacciText(5));

      // No runtime errors expected during normal operation
      await app.expectNoPageErrors();
    });

    test('Edge case n=1 produces single element [0]', async ({ page }) => {
      // Validate minimal valid input
      const app2 = new FibonacciPage(page);
      await app.attachListeners();
      await app.goto();

      await app.setNumber(1);
      await app.clickGenerate();

      const text1 = await app.getResultText();
      expect(text).toBe(app.expectedFibonacciText(1));
      await app.expectNoPageErrors();
    });

    test('Decimal input "3.7" coerces to 3 via parseInt and generates sequence of length 3', async ({ page }) => {
      // parseInt('3.7') => 3, so expect 3 items
      const app3 = new FibonacciPage(page);
      await app.attachListeners();
      await app.goto();

      // Fill the number input with a decimal string
      await app.setNumber('3.7');
      await app.clickGenerate();

      const text2 = await app.getResultText();
      expect(text).toBe(app.expectedFibonacciText('3.7'));
      await app.expectNoPageErrors();
    });

    test('Large input n=20 generates sequence of correct length and values', async ({ page }) => {
      const n = 20;
      const app4 = new FibonacciPage(page);
      await app.attachListeners();
      await app.goto();

      await app.setNumber(n);
      await app.clickGenerate();

      const text3 = await app.getResultText();
      // dynamically compute expected string to avoid hardcoding many numbers
      expect(text).toBe(app.expectedFibonacciText(n));
      await app.expectNoPageErrors();
    });
  });

  test.describe('Invalid input transitions (S0_Idle -> S2_InvalidInput)', () => {
    test('Empty input shows validation message', async ({ page }) => {
      // When the input is empty, parseInt returns NaN -> error message expected
      const app5 = new FibonacciPage(page);
      await app.attachListeners();
      await app.goto();

      // Ensure input is empty
      await app.setNumber('');
      await app.clickGenerate();

      const text4 = await app.getResultText();
      expect(text).toBe('Please enter a valid positive integer.');
      await app.expectNoPageErrors();
    });

    test('Zero input shows validation message', async ({ page }) => {
      // Zero is invalid per code (num < 1)
      const app6 = new FibonacciPage(page);
      await app.attachListeners();
      await app.goto();

      await app.setNumber(0);
      await app.clickGenerate();

      const text5 = await app.getResultText();
      expect(text).toBe('Please enter a valid positive integer.');
      await app.expectNoPageErrors();
    });

    test('Negative input shows validation message', async ({ page }) => {
      const app7 = new FibonacciPage(page);
      await app.attachListeners();
      await app.goto();

      await app.setNumber(-5);
      await app.clickGenerate();

      const text6 = await app.getResultText();
      expect(text).toBe('Please enter a valid positive integer.');
      await app.expectNoPageErrors();
    });

    test('Non-numeric string in number input results in validation message (if allowed by browser)', async ({ page }) => {
      // Attempt to place a non-numeric string into the number input.
      // Some browsers prevent non-numeric input in <input type="number">; still test behavior.
      const app8 = new FibonacciPage(page);
      await app.attachListeners();
      await app.goto();

      // Force-fill a non-numeric value; if browser allows, parseInt will yield NaN.
      await app.setNumber('not-a-number');
      await app.clickGenerate();

      const text7 = await app.getResultText();
      // Expect the same validation message
      expect(text).toBe('Please enter a valid positive integer.');
      await app.expectNoPageErrors();
    });
  });

  test.describe('Observability and runtime checks', () => {
    test('generateFibonacci is callable and does not cause ReferenceError/TypeError/SyntaxError on normal use', async ({ page }) => {
      // This test ensures that calling the function via the UI does not produce runtime errors.
      const app9 = new FibonacciPage(page);
      await app.attachListeners();
      await app.goto();

      // Verify function exists
      const fnType1 = await page.evaluate(() => typeof generateFibonacci);
      expect(fnType).toBe('function');

      // Call via UI with a valid value
      await app.setNumber(4);
      await app.clickGenerate();

      const text8 = await app.getResultText();
      expect(text).toBe(app.expectedFibonacciText(4));

      // Ensure no ReferenceError/TypeError/SyntaxError occurred during execution
      await app.expectNoPageErrors();
    });

    test('If any page errors occur they are observable via pageerror events (this test observes and reports)', async ({ page }) => {
      // This test simply demonstrates that page errors would be captured.
      // We assert there are none for this implementation, but we keep the assertion descriptive.
      const app10 = new FibonacciPage(page);
      await app.attachListeners();
      await app.goto();

      // Perform an interaction that would exercise most code paths
      await app.setNumber(2);
      await app.clickGenerate();
      await app.setNumber('');
      await app.clickGenerate();

      // No exceptions expected; assert none captured
      await app.expectNoPageErrors();
    });
  });
});