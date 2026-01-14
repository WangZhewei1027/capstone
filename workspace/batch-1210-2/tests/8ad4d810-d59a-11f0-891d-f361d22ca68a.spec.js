import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-2/html/8ad4d810-d59a-11f0-891d-f361d22ca68a.html';

// Page Object for the Fibonacci application
class FibonacciPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.form = page.locator('#fibonacci-form');
    this.inputN = page.locator('#n');
    this.submitButton = page.locator('button[type="submit"]');
    this.output = page.locator('#fibonacci-output');
    this.header = page.locator('h1');
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async fillN(value) {
    // Use fill to simulate typing exact value (can be '', 'abc', '-3', etc.)
    await this.inputN.fill(String(value));
  }

  async submit() {
    // Use click so browser validation has a chance to run for required fields
    await this.submitButton.click();
  }

  async getOutputText() {
    return (await this.output.textContent()) ?? '';
  }

  async getSpanCount() {
    return await this.page.locator('#fibonacci-output span').count();
  }

  async getSpanTexts() {
    const spans = this.page.locator('#fibonacci-output span');
    const count = await spans.count();
    const texts = [];
    for (let i = 0; i < count; i++) {
      texts.push(await spans.nth(i).textContent());
    }
    return texts;
  }
}

test.describe('Fibonacci Sequence Generator - FSM and UI tests', () => {
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    // Collect console messages and page errors for each test
    consoleMessages = [];
    pageErrors = [];

    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    page.on('pageerror', (err) => {
      // Capture uncaught exceptions in the page
      pageErrors.push(err);
    });
  });

  test.afterEach(async () => {
    // Basic sanity: ensure collected structures are defined
    expect(Array.isArray(consoleMessages)).toBe(true);
    expect(Array.isArray(pageErrors)).toBe(true);
  });

  test.describe('State S0_Idle (Initial state)', () => {
    test('renders initial page with header and empty output - verifies Idle state entry evidence', async ({ page }) => {
      // This test validates the initial (idle) state of the app as per FSM.
      // It checks that the page header is present and the output area is empty.
      const fib = new FibonacciPage(page);
      await fib.goto();

      // Verify header exists (evidence for S0_Idle)
      await expect(fib.header).toHaveText('Fibonacci Sequence Generator');

      // Output should be empty initially
      const outputText = await fib.getOutputText();
      expect(outputText.trim()).toBe('');

      // No uncaught page errors on idle render
      expect(pageErrors.length).toBe(0);

      // No console.error messages on load
      const errorConsoles = consoleMessages.filter((m) => m.type === 'error');
      expect(errorConsoles.length).toBe(0);
    });
  });

  test.describe('Transition: SubmitForm from S0_Idle to S1_SequenceGenerated', () => {
    test('submitting n=5 displays message with user-provided n but renders sequence based on internal bug (n=10)', async ({ page }) => {
      // This validates the SubmitForm transition and the consequence of generateFibonacciSequence() usage.
      // The implementation uses a global `n = 10` so the displayed sequence length differs from the displayed "nValue".
      const fib = new FibonacciPage(page);
      await fib.goto();

      // Fill input with 5 and submit
      await fib.fillN(5);
      await fib.submit();

      // Wait for output to be populated
      await expect(fib.output).toContainText('Fibonacci Sequence up to 5 terms:');

      // The implementation generates 10 Fibonacci numbers (global n = 10) regardless of input.
      const spanCount = await fib.getSpanCount();
      // Expecting 10 spans because generateFibonacciSequence uses the global n variable set to 10
      expect(spanCount).toBe(10);

      // Verify the generated sequence values match the Fibonacci sequence for 10 terms
      const spanTexts = await fib.getSpanTexts();
      const expected10 = ['0','1','1','2','3','5','8','13','21','34'];
      expect(spanTexts).toEqual(expected10);

      // Ensure there are no uncaught page errors during this transition
      expect(pageErrors.length).toBe(0);

      // No console.error messages for this successful submission
      const errorConsoles = consoleMessages.filter((m) => m.type === 'error');
      expect(errorConsoles.length).toBe(0);
    });

    test('submitting n=1 - edge case where user expects one term but page still renders 10 due to bug', async ({ page }) => {
      // Checks behavior for small input where code logic doesn't adapt to input value.
      const fib = new FibonacciPage(page);
      await fib.goto();

      await fib.fillN(1);
      await fib.submit();

      // The text should mention 1 term
      await expect(fib.output).toContainText('Fibonacci Sequence up to 1 terms:');

      // But sequence spans are still 10 because global n is 10
      const spanCount = await fib.getSpanCount();
      expect(spanCount).toBe(10);

      // Validate the first element is 0 and second is 1
      const spanTexts = await fib.getSpanTexts();
      expect(spanTexts[0]).toBe('0');
      expect(spanTexts[1]).toBe('1');

      // No page errors produced
      expect(pageErrors.length).toBe(0);
    });

    test('submitting with empty input - required attribute prevents submission and no sequence is rendered', async ({ page }) => {
      // This test ensures HTML5 validation prevents submit when required field is empty.
      const fib = new FibonacciPage(page);
      await fib.goto();

      // Clear the input to ensure empty value
      await fib.fillN('');
      await fib.submit();

      // When required input is empty, browser prevents submission; the output should remain empty
      // Give a short timeout to allow any script to possibly run (it shouldn't)
      await page.waitForTimeout(200);

      const outputText = await fib.getOutputText();
      expect(outputText.trim()).toBe('');

      // No uncaught page errors should occur
      expect(pageErrors.length).toBe(0);

      // And there should be no console.error messages
      const errorConsoles = consoleMessages.filter((m) => m.type === 'error');
      expect(errorConsoles.length).toBe(0);
    });

    test('submitting with non-numeric input "abc" results in displayed NaN for nValue while sequence still shows internal 10-term sequence', async ({ page }) => {
      // This ensures parseInt behavior and how the app displays NaN if parseInt fails.
      const fib = new FibonacciPage(page);
      await fib.goto();

      // Fill the numeric input with non-numeric text; for type=number the browser may still accept the string via fill
      await fib.fillN('abc');
      await fib.submit();

      // Wait for output to update
      await expect(fib.output).toContainText('Fibonacci Sequence up to');

      const outputText = await fib.getOutputText();
      // The displayed nValue should end up as "NaN"
      expect(outputText).toContain('NaN');

      // Sequence still rendered as 10 spans because generateFibonacciSequence uses the global n variable
      const spanCount = await fib.getSpanCount();
      expect(spanCount).toBe(10);

      // No uncaught page errors were emitted during this interaction
      expect(pageErrors.length).toBe(0);
    });

    test('submitting with a negative number shows negative nValue but still uses internal 10-term sequence', async ({ page }) => {
      // This test checks how negative numbers are treated by the UI.
      const fib = new FibonacciPage(page);
      await fib.goto();

      await fib.fillN(-3);
      await fib.submit();

      await expect(fib.output).toContainText('Fibonacci Sequence up to -3 terms:');

      const spanCount = await fib.getSpanCount();
      expect(spanCount).toBe(10);

      // No uncaught page errors
      expect(pageErrors.length).toBe(0);
    });
  });

  test.describe('Observability: console and runtime error monitoring', () => {
    test('no uncaught JavaScript exceptions on page load and interactions (assert runtime stability)', async ({ page }) => {
      // This test performs a series of interactions and asserts that no uncaught exceptions
      // (pageerror events) occurred. We capture console messages too and ensure none are of type "error".
      const fib = new FibonacciPage(page);
      await fib.goto();

      // Several interactions
      await fib.fillN(4);
      await fib.submit();
      await fib.fillN('');
      await fib.submit().catch(() => {/* click may be blocked by validation; ignore */});
      await fib.fillN('abc');
      await fib.submit();

      // Small delay to make sure any asynchronous page errors surface
      await page.waitForTimeout(200);

      // Assert no uncaught page errors
      expect(pageErrors.length).toBe(0);

      // Assert there are no console errors emitted by the app
      const errorConsoles = consoleMessages.filter((m) => m.type === 'error');
      expect(errorConsoles.length).toBe(0);
    });
  });
});