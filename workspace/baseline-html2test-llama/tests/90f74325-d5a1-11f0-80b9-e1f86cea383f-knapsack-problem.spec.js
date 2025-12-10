import { test, expect } from '@playwright/test';

// URL of the application under test
const APP_URL =
  'http://127.0.0.1:5500/workspace/baseline-html2test-llama/html/90f74325-d5a1-11f0-80b9-e1f86cea383f.html';

// Page object encapsulating interactions with the Knapsack app
class KnapsackPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.weightInput = page.locator('#weight');
    this.valueInput = page.locator('#value');
    this.solveBtn = page.locator('#solve-btn');
    this.resultDiv = page.locator('#result');
  }

  // Navigate to the app URL
  async goto() {
    await this.page.goto(APP_URL);
  }

  // Set the weight input (clears then types)
  async setWeight(value) {
    await this.weightInput.fill(String(value));
  }

  // Set the value input (clears then types)
  async setValue(value) {
    await this.valueInput.fill(String(value));
  }

  // Click the Solve button
  async clickSolve() {
    await Promise.all([
      this.page.waitForResponse(() => true).catch(() => {}), // harmless nop to yield
      this.solveBtn.click(),
    ]);
  }

  // Get the result text (innerText)
  async getResultText() {
    return (await this.resultDiv.innerText()).trim();
  }

  // Check placeholder attributes for inputs
  async getPlaceholders() {
    return {
      weight: await this.weightInput.getAttribute('placeholder'),
      value: await this.valueInput.getAttribute('placeholder'),
    };
  }

  // Check if solve button is enabled
  async isSolveEnabled() {
    return await this.solveBtn.isEnabled();
  }

  // Clear inputs
  async clearInputs() {
    await this.weightInput.fill('');
    await this.valueInput.fill('');
  }
}

// Local knapsack computation to derive expected results in tests.
// This mirrors (intentionally) the algorithm used by the page so the test expectations align.
const localKnapsack = (weights, values, capacity) => {
  const n = weights.length;
  const dp = Array(n + 1)
    .fill(null)
    .map(() => Array(capacity + 1).fill(0));

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= capacity; j++) {
      if (weights[i - 1] > j) {
        dp[i][j] = dp[i - 1][j];
      } else {
        dp[i][j] = Math.max(
          dp[i - 1][j],
          dp[i - 1][j - weights[i - 1]] + values[i - 1]
        );
      }
    }
  }
  return dp[n][capacity];
};

// Helper to replicate page's weights/values construction
const buildWeightsValues = (inputWeight, inputValue) => {
  const weights = [];
  const values = [];
  for (let i = 0; i < inputWeight; i++) {
    weights.push(inputWeight - i);
  }
  for (let i = 0; i < inputWeight; i++) {
    values.push(inputValue);
  }
  return { weights, values };
};

// Group tests related to the Knapsack Problem app
test.describe('Knapsack Problem App - Functional and DOM Tests', () => {
  // Arrays to collect console messages and page errors for each test run
  let consoleMessages;
  let pageErrors;

  // Setup before each test: create fresh arrays and attach listeners before navigation
  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Listen to console messages (info, warn, error, etc.)
    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Listen to uncaught exceptions on the page
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });
  });

  // Teardown after each test: assert that no unexpected runtime errors occurred
  test.afterEach(async () => {
    // Ensure there were no uncaught page errors during test execution
    // If there are page errors, include them in the failure message to help debugging.
    expect(
      pageErrors.length,
      `Expected no uncaught page errors, but found ${pageErrors.length}: ${pageErrors
        .map((e) => String(e))
        .join('; ')}`
    ).toBe(0);

    // Also assert there are no console messages with type 'error'
    const consoleErrors = consoleMessages.filter((m) => m.type === 'error');
    expect(
      consoleErrors.length,
      `Expected no console.error messages, but found ${consoleErrors.length}: ${consoleErrors
        .map((c) => c.text)
        .join('; ')}`
    ).toBe(0);
  });

  // Test: Initial page load and default state
  test('should load the page and show default UI elements', async ({ page }) => {
    // Purpose: verify that all interactive controls exist and have expected defaults
    const app = new KnapsackPage(page);
    await app.goto();

    // Inputs and button should be visible
    await expect(app.weightInput).toBeVisible();
    await expect(app.valueInput).toBeVisible();
    await expect(app.solveBtn).toBeVisible();

    // Placeholders should match the markup
    const placeholders = await app.getPlaceholders();
    expect(placeholders.weight).toBe('Enter weight of item');
    expect(placeholders.value).toBe('Enter value of item');

    // Result div should be present and initially empty
    await expect(app.resultDiv).toBeVisible();
    const initialResult = await app.getResultText();
    expect(initialResult).toBe('');

    // Solve button should be enabled by default
    expect(await app.isSolveEnabled()).toBeTruthy();
  });

  // Test: solve with standard valid inputs
  test('should compute correct maximum value for weight=5 and value=7', async ({ page }) => {
    // Purpose: verify the knapsack computation and DOM update for a typical case
    const app1 = new KnapsackPage(page);
    await app.goto();

    // Provide inputs: weight = 5, value = 7
    const w = 5;
    const v = 7;
    await app.clearInputs();
    await app.setWeight(w);
    await app.setValue(v);

    // Click Solve and verify displayed result
    await app.clickSolve();

    // Compute expected result using the same construction logic
    const { weights, values } = buildWeightsValues(w, v);
    const expected = localKnapsack(weights, values, 10);

    const resultText = await app.getResultText();
    expect(resultText).toBe(`Maximum value: ${expected}`);
  });

  // Test: n less than capacity-fit case (n = 3) should sum all items
  test('should return sum of all values when total weight fits capacity (weight=3, value=10)', async ({ page }) => {
    // Purpose: test edge case where all items can fit into the capacity
    const app2 = new KnapsackPage(page);
    await app.goto();

    const w1 = 3;
    const v1 = 10;
    await app.clearInputs();
    await app.setWeight(w);
    await app.setValue(v);

    await app.clickSolve();

    const { weights, values } = buildWeightsValues(w, v);
    const expected1 = localKnapsack(weights, values, 10);

    const resultText1 = await app.getResultText();
    expect(resultText).toBe(`Maximum value: ${expected}`);
  });

  // Test: weight=0 should yield 0
  test('should handle zero items (weight=0) and display Maximum value: 0', async ({ page }) => {
    // Purpose: verify that zero items produce a zero result and no errors
    const app3 = new KnapsackPage(page);
    await app.goto();

    await app.clearInputs();
    await app.setWeight(0);
    await app.setValue(100); // arbitrary value; should not matter

    await app.clickSolve();

    const resultText2 = await app.getResultText();
    expect(resultText).toBe('Maximum value: 0');
  });

  // Test: missing inputs (empty fields) — check behavior when parseInt yields NaN
  test('should handle empty inputs gracefully and display Maximum value: 0 when no items are constructed', async ({ page }) => {
    // Purpose: observe behavior when user leaves inputs empty (both fields empty)
    const app4 = new KnapsackPage(page);
    await app.goto();

    // Ensure inputs are empty
    await app.clearInputs();

    // Click Solve
    await app.clickSolve();

    // With empty weight field parseInt -> NaN, loops will not construct items, so result should be 0
    const resultText3 = await app.getResultText();
    expect(resultText).toBe('Maximum value: 0');
  });

  // Test: missing value input but positive weight should produce NaN in result (values contain NaN)
  test('should produce NaN result if value input is empty but weight > 0 (values become NaN)', async ({ page }) => {
    // Purpose: confirm the application displays NaN when values are not numeric but items exist
    const app5 = new KnapsackPage(page);
    await app.goto();

    await app.clearInputs();
    await app.setWeight(2); // constructs two items
    await app.setValue(''); // empty value -> parseInt('') === NaN

    await app.clickSolve();

    const resultText4 = await app.getResultText();
    // We expect the displayed text to contain 'NaN' because the underlying calculation involves NaN
    expect(resultText.startsWith('Maximum value:')).toBeTruthy();
    expect(resultText.includes('NaN')).toBeTruthy();
  });

  // Test: non-integer input handling (decimal weight) -> parseInt should floor/truncate value
  test('should handle decimal weight input by using parseInt behavior (e.g., weight=4.9 treated as 4)', async ({ page }) => {
    // Purpose: verify parseInt behavior on decimal inputs and correct result
    const app6 = new KnapsackPage(page);
    await app.goto();

    // Input a decimal weight (as the browser provides value string), parseInt('4.9') => 4
    await app.clearInputs();
    await app.setWeight('4.9');
    await app.setValue(5);

    await app.clickSolve();

    // On the page, inputWeight becomes 4, so build weights/values accordingly
    const inputWeight = 4; // expected parseInt coercion
    const inputValue = 5;
    const { weights, values } = buildWeightsValues(inputWeight, inputValue);
    const expected2 = localKnapsack(weights, values, 10);

    const resultText5 = await app.getResultText();
    expect(resultText).toBe(`Maximum value: ${expected}`);
  });

  // Accessibility and visibility checks
  test('should maintain accessibility: inputs and button have accessible names and are focusable', async ({ page }) => {
    // Purpose: basic accessibility verification: elements can receive focus and have accessible roles
    const app7 = new KnapsackPage(page);
    await app.goto();

    // Inputs should be focusable
    await app.weightInput.focus();
    expect(await app.weightInput.evaluate((el) => document.activeElement === el)).toBeTruthy();

    await app.valueInput.focus();
    expect(await app.valueInput.evaluate((el) => document.activeElement === el)).toBeTruthy();

    // Button should be focusable and have text content 'Solve'
    await app.solveBtn.focus();
    expect(await app.solveBtn.evaluate((el) => document.activeElement === el)).toBeTruthy();
    expect(await app.solveBtn.innerText()).toBe('Solve');
  });
});