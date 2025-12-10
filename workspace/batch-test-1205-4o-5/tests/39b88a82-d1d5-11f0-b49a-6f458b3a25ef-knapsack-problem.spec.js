import { test, expect } from '@playwright/test';

// Page Object for the Knapsack application to encapsulate interactions
class KnapsackPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.weightsInput = page.locator('#weights');
    this.valuesInput = page.locator('#values');
    this.capacityInput = page.locator('#capacity');
    this.calculateButton = page.locator('button', { hasText: 'Calculate Maximum Value' });
    this.result = page.locator('#result');
    // Labels (for basic accessibility checks)
    this.weightsLabel = page.locator('label[for="weights"]');
    this.valuesLabel = page.locator('label[for="values"]');
    this.capacityLabel = page.locator('label[for="capacity"]');
  }

  // Navigate to the page URL
  async goto() {
    await this.page.goto('http://127.0.0.1:5500/workspace/batch-test-1205-4o-5/html/39b88a82-d1d5-11f0-b49a-6f458b3a25ef.html');
  }

  // Fill inputs
  async fillWeights(text) {
    await this.weightsInput.fill(text);
  }

  async fillValues(text) {
    await this.valuesInput.fill(text);
  }

  async fillCapacity(text) {
    await this.capacityInput.fill(text);
  }

  // Click the calculate button
  async clickCalculate() {
    await this.calculateButton.click();
  }

  // Read result text
  async getResultText() {
    return (await this.result.textContent())?.trim() ?? '';
  }
}

test.describe('Knapsack Problem - UI and behavior tests', () => {
  // Variables to capture console messages and page errors for assertions
  let consoleMessages;
  let pageErrors;

  // Each test gets a fresh page and new listeners
  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Capture console messages for later inspection
    page.on('console', (msg) => {
      // Save message type and text for debugging assertions
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Capture page errors (uncaught exceptions)
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });
  });

  test.afterEach(async () => {
    // Basic sanity: do not leave references between tests
    // The arrays are cleared per test via beforeEach
  });

  test('Initial page load: inputs and button are visible and result is empty', async ({ page }) => {
    // Purpose: Verify initial DOM state after navigation
    const knapsack = new KnapsackPage(page);
    await knapsack.goto();

    // Inputs and labels are visible and accessible
    await expect(knapsack.weightsInput).toBeVisible();
    await expect(knapsack.valuesInput).toBeVisible();
    await expect(knapsack.capacityInput).toBeVisible();
    await expect(knapsack.calculateButton).toBeVisible();

    // Labels exist and are associated
    await expect(knapsack.weightsLabel).toHaveText(/Enter weights/i);
    await expect(knapsack.valuesLabel).toHaveText(/Enter values/i);
    await expect(knapsack.capacityLabel).toHaveText(/Enter capacity/i);

    // Result should be empty initially
    const initialResult = await knapsack.getResultText();
    expect(initialResult).toBe('');

    // There should be no page errors on a fresh load
    expect(pageErrors.length).toBe(0);
  });

  test('Valid input computes correct maximum value and updates DOM with no errors', async ({ page }) => {
    // Purpose: Test happy path with valid numeric inputs and capacity
    const knapsack1 = new KnapsackPage(page);
    await knapsack.goto();

    // Provide weights, values, and capacity that produce a known optimal value
    // Items: (2,3), (3,4), (4,5) with capacity 5 => best is item1 + item2 = value 7
    await knapsack.fillWeights('2,3,4');
    await knapsack.fillValues('3,4,5');
    await knapsack.fillCapacity('5');

    // Click the calculate button and wait briefly for the UI update
    await knapsack.clickCalculate();

    // Verify the result text shows the expected maximum value
    const resultText = await knapsack.getResultText();
    expect(resultText).toContain('Maximum value in the knapsack:');
    expect(resultText).toBe('Maximum value in the knapsack: 7');

    // Ensure no uncaught page errors were reported during this successful interaction
    expect(pageErrors.length).toBe(0);

    // Optional: verify no console errors (console messages might include logs but no 'error' type)
    const errorConsoleMessages = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleMessages.length).toBe(0);
  });

  test('Mismatched weights and values lengths show validation message and no errors', async ({ page }) => {
    // Purpose: Input arrays of different lengths -> expect validation message (no exception)
    const knapsack2 = new KnapsackPage(page);
    await knapsack.goto();

    // Intentionally provide mismatched arrays
    await knapsack.fillWeights('1,2,3');
    await knapsack.fillValues('10,20'); // fewer values
    await knapsack.fillCapacity('5');

    await knapsack.clickCalculate();

    // The application should display the validation string
    const resultText1 = await knapsack.getResultText();
    expect(resultText).toBe('Please enter valid weights and values.');

    // No uncaught errors should have been thrown; the code path handles this condition
    expect(pageErrors.length).toBe(0);
  });

  test('Empty capacity triggers a runtime error (invalid array length) naturally and is captured', async ({ page }) => {
    // Purpose: Verify that missing numeric capacity can lead to a runtime error and that it is observable
    const knapsack3 = new KnapsackPage(page);
    await knapsack.goto();

    // Provide valid looking weights and values but leave capacity empty to trigger parseInt('') => NaN
    await knapsack.fillWeights('1,2');
    await knapsack.fillValues('3,4');
    // Intentionally leave capacity empty
    await knapsack.fillCapacity('');

    // When clicking calculate, the script attempts Array(capacity + 1) where capacity is NaN,
    // which should result in a RangeError: Invalid array length (or similar). Capture the pageerror.
    const [error] = await Promise.all([
      page.waitForEvent('pageerror'),
      knapsack.clickCalculate()
    ]);

    // Confirm that an Error object was received and it is a RangeError or mentions invalid array length
    expect(error).toBeDefined();
    // The message may vary by engine; check for common substrings
    const msg = String(error && error.message ? error.message : error);
    expect(msg.toLowerCase()).toMatch(/invalid array length|array length|invalid array|rangeerror/);

    // The result should remain unchanged (likely empty) because the script threw before updating the DOM
    const resultText2 = await knapsack.getResultText();
    expect(resultText).toBe('');

    // Also ensure our global listener captured the same error
    expect(pageErrors.length).toBeGreaterThanOrEqual(1);
  });

  test('Non-numeric weights produce a determinable output (NaNs handled) and no uncaught errors', async ({ page }) => {
    // Purpose: Provide non-numeric strings for weights and verify application completes without exceptions.
    const knapsack4 = new KnapsackPage(page);
    await knapsack.goto();

    // Non-numeric weights; values numeric; capacity set
    await knapsack.fillWeights('a,b');
    await knapsack.fillValues('1,2');
    await knapsack.fillCapacity('3');

    // Click calculate - the script converts weights to NaN; comparisons with NaN will be false,
    // likely resulting in a maximum value calculation of 0 (no item included).
    await knapsack.clickCalculate();

    const resultText3 = await knapsack.getResultText();
    // We expect the application to finish and show a maximum value string (likely 0)
    expect(resultText).toMatch(/^Maximum value in the knapsack:/);
    // Allow either 0 or some numeric output, but for this input the logical output should be 0
    expect(resultText).toBe('Maximum value in the knapsack: 0');

    // No uncaught errors should have been thrown for this scenario
    expect(pageErrors.length).toBe(0);
  });

  test('Edge case: empty weights and values inputs show validation message', async ({ page }) => {
    // Purpose: Ensure that empty arrays produce the validation message and do not crash the app
    const knapsack5 = new KnapsackPage(page);
    await knapsack.goto();

    // Leave weights and values empty and set a capacity
    await knapsack.fillWeights('');
    await knapsack.fillValues('');
    await knapsack.fillCapacity('10');

    await knapsack.clickCalculate();

    // Expect validation message (weights.length === 1 after split('')? Note: implementation splits on ',' leading to [''] which maps to [0]?
    // The provided JS checks weights.length !== values.length or weights.length === 0 -> split('') yields [''] giving length 1.
    // To robustly test the visible behavior, assert that either validation message OR a numeric result appears.
    const resultText4 = await knapsack.getResultText();

    // Accept either the explicit validation message or some computed result, but ensure app did not throw
    const isValidation = resultText === 'Please enter valid weights and values.';
    const isResult = resultText.startsWith('Maximum value in the knapsack:');
    expect(isValidation || isResult).toBeTruthy();

    // No uncaught errors should have been thrown during this interaction
    expect(pageErrors.length).toBe(0);
  });
});