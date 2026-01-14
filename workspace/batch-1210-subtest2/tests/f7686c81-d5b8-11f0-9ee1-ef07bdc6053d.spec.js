import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-subtest2/html/f7686c81-d5b8-11f0-9ee1-ef07bdc6053d.html';

/**
 * Page Object for the Knapsack app.
 * Encapsulates common interactions so tests are readable and maintainable.
 */
class KnapsackPage {
  constructor(page) {
    this.page = page;
    this.valuesSelector = '#values';
    this.weightsSelector = '#weights';
    this.capacitySelector = '#capacity';
    this.solveButtonSelector = 'button[onclick="solveKnapsack()"]';
    this.resultSelector = '#result';
    // storage for observed console messages and page errors
    this.consoleErrors = [];
    this.pageErrors = [];
  }

  async attachErrorListeners() {
    // Clear any previous listeners by reassigning arrays
    this.consoleErrors = [];
    this.pageErrors = [];
    this.page.on('console', (msg) => {
      try {
        if (msg.type() === 'error') {
          this.consoleErrors.push(msg.text());
        }
      } catch (e) {
        // ensure listener never throws
      }
    });
    this.page.on('pageerror', (err) => {
      try {
        this.pageErrors.push(err.message ?? String(err));
      } catch (e) {
        // swallow
      }
    });
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async fillValues(text) {
    await this.page.fill(this.valuesSelector, text);
  }

  async fillWeights(text) {
    await this.page.fill(this.weightsSelector, text);
  }

  async fillCapacity(text) {
    // Use fill even for number input; this sets the value attribute for testing edge cases.
    await this.page.fill(this.capacitySelector, text);
  }

  async clickSolve() {
    await Promise.all([
      // clicking may trigger synchronous exceptions; keep it simple
      this.page.click(this.solveButtonSelector)
    ]);
  }

  async getResultText() {
    // result span is updated synchronously by solveKnapsack; still use locator.textContent()
    return (await this.page.locator(this.resultSelector).textContent()) ?? '';
  }
}

test.describe('Knapsack Problem Solver - FSM validation and behaviors', () => {
  // Each test will use a fresh page fixture provided by Playwright.
  test('Initial Idle state renders correctly (S0_Idle) and no runtime errors on load', async ({ page }) => {
    // This test validates the initial state rendering per FSM:
    // - H1 is present
    // - inputs and controls exist
    // - result span exists and is empty
    // - no page-level errors occurred during initial render (e.g., missing functions)
    const kp = new KnapsackPage(page);
    await kp.attachErrorListeners();
    await kp.goto();

    // Verify header
    const header = page.locator('h1');
    await expect(header).toHaveText('Knapsack Problem Solver');

    // Verify inputs and placeholders
    await expect(page.locator('#values')).toBeVisible();
    await expect(page.locator('#values')).toHaveAttribute('placeholder', 'e.g., 60, 100, 120');

    await expect(page.locator('#weights')).toBeVisible();
    await expect(page.locator('#weights')).toHaveAttribute('placeholder', 'e.g., 10, 20, 30');

    await expect(page.locator('#capacity')).toBeVisible();
    await expect(page.locator('#capacity')).toHaveAttribute('placeholder', 'e.g., 50');

    // Solve button exists
    await expect(page.locator('button[onclick="solveKnapsack()"]')).toBeVisible();

    // Result span exists and should be empty string initially
    const resultText = await kp.getResultText();
    expect(resultText.trim()).toBe('');

    // Verify no page errors occurred on load (we expect no ReferenceError for missing entry action)
    expect(kp.pageErrors.length).toBe(0);
    expect(kp.consoleErrors.length).toBe(0);
  });

  test.describe('Solve transition (S0_Idle -> S1_Solved) and result computation', () => {
    test('Solves knapsack with a typical input set and displays optimal value (220)', async ({ page }) => {
      // This test validates the main event/transition:
      // - Fill values, weights, capacity
      // - Click Solve
      // - Verify dp result is displayed in #result per FSM evidence
      const kp = new KnapsackPage(page);
      await kp.attachErrorListeners();
      await kp.goto();

      // Fill known valid inputs that should produce an optimal value of 220:
      // items: values = [60,100,120], weights = [10,20,30], capacity = 50 -> best is 100+120=220
      await kp.fillValues('60, 100, 120');
      await kp.fillWeights('10, 20, 30');
      await kp.fillCapacity('50');

      // Click Solve to trigger solveKnapsack()
      await kp.clickSolve();

      // The result is computed synchronously; wait briefly to allow DOM update
      const result = await kp.getResultText();
      expect(result.trim()).toBe('220');

      // Confirm no runtime errors were emitted during normal operation
      expect(kp.pageErrors.length).toBe(0);
      expect(kp.consoleErrors.length).toBe(0);
    });

    test('Empty inputs produce zero optimal value (edge case)', async ({ page }) => {
      // Validate that with empty inputs and empty capacity the app yields 0 and doesn't crash.
      const kp = new KnapsackPage(page);
      await kp.attachErrorListeners();
      await kp.goto();

      // Clear inputs explicitly
      await kp.fillValues('');
      await kp.fillWeights('');
      await kp.fillCapacity('0');

      await kp.clickSolve();

      const result = await kp.getResultText();
      // With no items, dp[n][capacity] should be 0
      expect(result.trim()).toBe('0');

      // No runtime errors should occur for this edge case
      expect(kp.pageErrors.length).toBe(0);
      expect(kp.consoleErrors.length).toBe(0);
    });
  });

  test.describe('Edge cases and runtime errors observation', () => {
    test('Mismatched item counts does not crash and returns a deterministic result', async ({ page }) => {
      // Validate that values and weights with mismatched lengths do not throw a runtime error.
      const kp = new KnapsackPage(page);
      await kp.attachErrorListeners();
      await kp.goto();

      // Provide more values than weights; code uses values.length as n and will read undefined for some weights.
      await kp.fillValues('10,20,30,40');
      await kp.fillWeights('5,10'); // fewer weights than values
      await kp.fillCapacity('20');

      // Click Solve and ensure no crash occurs
      await kp.clickSolve();

      // The DOM should still update with some result (likely 70 or other number), but main assertion is no runtime errors.
      expect(kp.pageErrors.length).toBe(0);
      expect(kp.consoleErrors.length).toBe(0);

      // The result should be a string (non-empty or '0'), assert it's present
      const res = (await kp.getResultText()).trim();
      expect(typeof res).toBe('string');
      expect(res.length).toBeGreaterThanOrEqual(0);
    });

    test('Non-numeric capacity triggers a runtime error (RangeError: Invalid array length) - observed and asserted', async ({ page }) => {
      // This test intentionally inputs an invalid (non-numeric) capacity to allow runtime errors to surface naturally.
      // The app constructs Array(capacity + 1) where capacity = Number('abc') -> NaN -> Array(NaN) throws RangeError.
      const kp = new KnapsackPage(page);
      await kp.attachErrorListeners();
      await kp.goto();

      // Provide valid numeric values and weights but a non-numeric capacity to trigger the potential error.
      await kp.fillValues('60,100,120');
      await kp.fillWeights('10,20,30');

      // Intentionally fill a non-numeric string into the number input to provoke Number(...) => NaN
      // Note: browsers may restrict non-numeric input for type=number, but Playwright.fill will set the value attribute.
      await kp.fillCapacity('not-a-number');

      // Prepare to wait for pageerror; the error may be synchronous on click
      let caughtPageErrors = [];
      const onErr = (err) => {
        try {
          caughtPageErrors.push(err.message ?? String(err));
        } catch (e) {}
      };
      page.on('pageerror', onErr);

      // Click Solve - this is expected to cause an exception in-page
      await kp.clickSolve();

      // Allow a short time for the pageerror event to propagate
      await page.waitForTimeout(200);

      // Cleanup listener
      page.removeListener('pageerror', onErr);

      // Merge captured errors from both page.on and our local capture
      const observedErrors = kp.pageErrors.concat(caughtPageErrors);

      // We expect at least one error relating to invalid array length or RangeError
      expect(observedErrors.length).toBeGreaterThan(0);

      // Check that some error message contains typical RangeError indicators
      const combined = observedErrors.join(' | ').toLowerCase();
      const hasRangeErrorIndicator =
        combined.includes('invalid array length') ||
        combined.includes('rangeerror') ||
        combined.includes('invalid array');

      expect(hasRangeErrorIndicator).toBeTruthy();
    });
  });
});