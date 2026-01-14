import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/088924c2-d59e-11f0-b3ae-79d1ce7b5503.html';

/**
 * Page Object for the Knapsack Problem page
 * Encapsulates selectors and common interactions to keep tests readable.
 */
class KnapsackPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.weightsInput = page.locator('#weights');
    this.valuesInput = page.locator('#values');
    this.capacityInput = page.locator('#capacity');
    this.solveButton = page.locator('button', { hasText: 'Solve Knapsack' });
    this.result = page.locator('#result');
    this.labelWeights = page.locator('label[for="weights"]');
    this.labelValues = page.locator('label[for="values"]');
    this.labelCapacity = page.locator('label[for="capacity"]');
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async fillWeights(text) {
    await this.weightsInput.fill(text);
  }

  async fillValues(text) {
    await this.valuesInput.fill(text);
  }

  async fillCapacity(text) {
    await this.capacityInput.fill(text);
  }

  async clickSolve() {
    await this.solveButton.click();
  }

  async getResultText() {
    return (await this.result.textContent())?.trim() ?? '';
  }

  async getResultHTML() {
    return (await this.result.innerHTML()) ?? '';
  }
}

test.describe('Knapsack Problem - UI and behavior tests', () => {
  // Collect page console messages and errors for assertions
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Capture console messages (log, warn, error, etc.)
    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Capture uncaught page errors (ReferenceError, TypeError, etc.)
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });
  });

  // Helper to assert that there were no runtime page errors or console errors
  async function assertNoRuntimeErrors() {
    // Fail if any uncaught page errors occurred
    expect(pageErrors.length, `Expected no page errors but found: ${pageErrors.map(e => e.message).join(' | ')}`).toBe(0);

    // Fail if any console messages are of type 'error'
    const errorConsole = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsole.length, `Expected no console.error messages but found: ${errorConsole.map(m => m.text).join(' | ')}`).toBe(0);
  }

  test('Initial page load shows expected elements and default state', async ({ page }) => {
    // Purpose: Verify that on initial load the inputs, labels, button and result area are present and empty.
    const kp = new KnapsackPage(page);
    await kp.goto();

    // Inputs and labels should be visible
    await expect(kp.labelWeights).toBeVisible();
    await expect(kp.labelValues).toBeVisible();
    await expect(kp.labelCapacity).toBeVisible();

    await expect(kp.weightsInput).toBeVisible();
    await expect(kp.valuesInput).toBeVisible();
    await expect(kp.capacityInput).toBeVisible();

    // Inputs should be empty by default
    await expect(kp.weightsInput).toHaveValue('');
    await expect(kp.valuesInput).toHaveValue('');
    await expect(kp.capacityInput).toHaveValue('');

    // Button present and enabled
    await expect(kp.solveButton).toBeVisible();
    await expect(kp.solveButton).toBeEnabled();

    // Result area should be present but empty
    const resultHTML = await kp.getResultHTML();
    expect(resultHTML.trim(), 'Expected the result area to be empty on load').toBe('');

    // Assert no runtime errors on initial load
    await assertNoRuntimeErrors();
  });

  test('Solves knapsack correctly for a standard valid input and displays expected items', async ({ page }) => {
    // Purpose: Test main happy path where valid inputs produce expected maximum value and included items.
    const kp1 = new KnapsackPage(page);
    await kp.goto();

    // Use the example weights and values from the UI placeholder
    // weights: 2,3,4,5 values: 3,4,5,6 capacity: 5
    // Expected maximum value = 7 (items 1 and 2)
    await kp.fillWeights('2,3,4,5');
    await kp.fillValues('3,4,5,6');
    await kp.fillCapacity('5');

    // Click Solve and wait for the result to populate
    await kp.clickSolve();
    await expect(kp.result).toBeVisible();

    // Check that the result contains the expected maximum value and the included items list
    const resultText = await kp.getResultText();
    expect(resultText).toContain('Maximum value in knapsack:');
    expect(resultText).toContain('7'); // maximum value should be 7
    expect(resultText).toContain('Items included (1-indexed):');
    // Ensure the included items are "1, 2" (the app prints 1-indexed indices)
    expect(resultText.replace(/\s+/g, ' ')).toContain('Items included (1-indexed): 1, 2');

    // Ensure no runtime JS errors occurred while solving
    await assertNoRuntimeErrors();
  });

  test('Shows validation error when inputs are invalid (mismatched lengths)', async ({ page }) => {
    // Purpose: Provide mismatched lengths for weights and values and verify validation feedback.
    const kp2 = new KnapsackPage(page);
    await kp.goto();

    // Provide mismatched lists
    await kp.fillWeights('1,2');
    await kp.fillValues('1,2,3');
    await kp.fillCapacity('5');

    // Click solve and verify error message appears in result
    await kp.clickSolve();
    await expect(kp.result).toBeVisible();

    const resultHTML1 = await kp.getResultHTML();
    // The implementation uses an innerHTML with a red paragraph when invalid
    expect(resultHTML).toContain('Please provide valid inputs.');
    expect(resultHTML).toContain('color: red');

    // Confirm that no uncaught runtime errors occurred (validation is done in JS but should not throw)
    await assertNoRuntimeErrors();
  });

  test('Shows validation error when inputs contain non-numeric entries', async ({ page }) => {
    // Purpose: Provide non-numeric tokens in the inputs and verify validation feedback is shown.
    const kp3 = new KnapsackPage(page);
    await kp.goto();

    // Provide a non-numeric token in weights
    await kp.fillWeights('2,three,4');
    await kp.fillValues('3,4,5');
    await kp.fillCapacity('5');

    await kp.clickSolve();
    await expect(kp.result).toBeVisible();

    const resultHTML2 = await kp.getResultHTML();
    expect(resultHTML).toContain('Please provide valid inputs.');
    expect(resultHTML).toContain('color: red');

    // Ensure there were no uncaught runtime errors triggered by parsing
    await assertNoRuntimeErrors();
  });

  test('Handles edge case of capacity zero by returning zero value and no items', async ({ page }) => {
    // Purpose: Validate the algorithm when capacity is zero. Expect maximum value 0 and empty items list.
    const kp4 = new KnapsackPage(page);
    await kp.goto();

    await kp.fillWeights('1,2,3');
    await kp.fillValues('10,20,30');
    await kp.fillCapacity('0');

    await kp.clickSolve();
    await expect(kp.result).toBeVisible();

    const resultText1 = await kp.getResultText();
    expect(resultText).toContain('Maximum value in knapsack:');
    // Should explicitly show 0 as maximum
    expect(resultText).toContain('0');

    // Items included should be empty (strong tag exists but contains no indices)
    const resultHTML3 = await kp.getResultHTML();
    // Find the "Items included" line and ensure strong contains empty string or whitespace only
    // We assert that the string "Items included (1-indexed):" exists and that no digits follow in that segment
    expect(resultHTML).toContain('Items included (1-indexed):');
    // Ensure no digits appear after that phrase (simple check)
    const itemsSegment = resultHTML.split('Items included (1-indexed):')[1] || '';
    expect(itemsSegment).not.toMatch(/\d/);

    // Ensure no runtime JS errors during this edge-case scenario
    await assertNoRuntimeErrors();
  });

  test('Accessibility: input labels are associated with inputs (for attributes)', async ({ page }) => {
    // Purpose: Verify basic accessibility by ensuring labels are correctly bound to inputs via "for" attributes.
    const kp5 = new KnapsackPage(page);
    await kp.goto();

    // Check that clicking the label focuses the corresponding input
    await kp.labelWeights.click();
    await expect(kp.weightsInput).toBeFocused();

    await kp.labelValues.click();
    await expect(kp.valuesInput).toBeFocused();

    await kp.labelCapacity.click();
    await expect(kp.capacityInput).toBeFocused();

    // No runtime errors expected while interacting with labels
    await assertNoRuntimeErrors();
  });

  test('Repeated solves update the result area correctly (state reset between solves)', async ({ page }) => {
    // Purpose: Ensure the UI updates correctly with subsequent solves without stale data.
    const kp6 = new KnapsackPage(page);
    await kp.goto();

    // First solve: small example
    await kp.fillWeights('2,3');
    await kp.fillValues('3,4');
    await kp.fillCapacity('5');
    await kp.clickSolve();
    await expect(kp.result).toBeVisible();
    let resultText2 = await kp.getResultText();
    expect(resultText).toContain('Maximum value in knapsack:');
    expect(resultText).toContain('7');

    // Now change inputs to a different scenario and solve again
    await kp.fillWeights('5');
    await kp.fillValues('10');
    await kp.fillCapacity('5');
    await kp.clickSolve();
    resultText = await kp.getResultText();

    // New expected value should be 10 and items included should be "1"
    expect(resultText).toContain('Maximum value in knapsack:');
    expect(resultText).toContain('10');
    expect(resultText.replace(/\s+/g, ' ')).toContain('Items included (1-indexed): 1');

    // Ensure no runtime errors occurred during repeated operations
    await assertNoRuntimeErrors();
  });
});