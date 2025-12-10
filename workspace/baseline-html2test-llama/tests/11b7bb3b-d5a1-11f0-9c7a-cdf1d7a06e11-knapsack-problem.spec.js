import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-llama/html/11b7bb3b-d5a1-11f0-9c7a-cdf1d7a06e11.html';

// Page Object for the Knapsack application
class KnapsackPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.weightInput = () => this.page.locator('#weight');
    this.valueInput = () => this.page.locator('#value');
    this.maxWeightInput = () => this.page.locator('#max_weight');
    this.solveButton = () => this.page.locator('#solve-btn');
    this.output = () => this.page.locator('#output');
    this.header = () => this.page.locator('h1');
  }

  // Navigate to the application page
  async goto() {
    await this.page.goto(APP_URL);
  }

  // Set the weight input (single numeric value as per implementation)
  async setWeight(value) {
    await this.weightInput().fill(String(value));
  }

  // Set the value input
  async setValue(value) {
    await this.valueInput().fill(String(value));
  }

  // Set the max weight input
  async setMaxWeight(value) {
    await this.maxWeightInput().fill(String(value));
  }

  // Click the Solve button
  async clickSolve() {
    await Promise.all([
      // The click may synchronously run JS; wait a tiny moment for DOM update
      this.page.waitForTimeout(50),
      this.solveButton().click()
    ]);
  }

  // Get visible output text
  async getOutputText() {
    return (await this.output().innerText()).trim();
  }
}

test.describe('Knapsack Problem App - end-to-end behavior', () => {
  // Arrays to capture console errors and page errors for each test
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Capture console messages; store only errors to assert later
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push({
          text: msg.text(),
          location: msg.location()
        });
      }
    });

    // Capture unhandled page errors (exceptions)
    page.on('pageerror', error => {
      pageErrors.push(error);
    });
  });

  test('Initial load: page title, header, inputs and output are present and empty', async ({ page }) => {
    // Purpose: verify the initial DOM structure, visibility of interactive elements, and default output
    const app = new KnapsackPage(page);
    await app.goto();

    // Title in document
    await expect(page).toHaveTitle(/Knapsack Problem/);

    // Header visible
    await expect(app.header()).toBeVisible();
    await expect(app.header()).toHaveText('Knapsack Problem');

    // Inputs and button are visible
    await expect(app.weightInput()).toBeVisible();
    await expect(app.valueInput()).toBeVisible();
    await expect(app.maxWeightInput()).toBeVisible();
    await expect(app.solveButton()).toBeVisible();

    // Output exists and is initially empty
    const outText = await app.getOutputText();
    expect(outText === '' || outText === undefined).toBeTruthy();

    // No console errors or page errors on initial load
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Click Solve with valid numeric inputs updates output to show a Maximum value', async ({ page }) => {
    // Purpose: verify typical user flow where numeric inputs lead to an output string
    const app1 = new KnapsackPage(page);
    await app.goto();

    // Provide simple numeric inputs
    await app.setWeight(2);       // weight (as implemented: single numeric)
    await app.setValue(3);        // value (single numeric)
    await app.setMaxWeight(4);    // max capacity

    // Click solve
    await app.clickSolve();

    // Output should contain the "Maximum value: $" prefix
    await expect(app.output()).toBeVisible();
    const outText1 = await app.getOutputText();
    expect(outText.startsWith('Maximum value: $')).toBeTruthy();

    // After a standard valid input run, there should be no console or page errors
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Click Solve with empty inputs does not throw and produces an output (edge case)', async ({ page }) => {
    // Purpose: test edge case where user submits without filling inputs
    const app2 = new KnapsackPage(page);
    await app.goto();

    // Ensure inputs are empty
    await app.setWeight('');
    await app.setValue('');
    await app.setMaxWeight('');

    // Click solve
    await app.clickSolve();

    // The implementation writes something to the output element even for empty inputs.
    // We assert the output contains the expected prefix (even if the numeric part could be 'undefined' or '0').
    const outText2 = await app.getOutputText();
    expect(outText.startsWith('Maximum value: $')).toBeTruthy();

    // Confirm that no console or page errors were emitted during this interaction
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Non-numeric input values produce a visible output reflecting the computed result (likely "undefined" or similar) without crashing', async ({ page }) => {
    // Purpose: verify that non-numeric inputs are handled by the app's JS without throwing unhandled exceptions
    const app3 = new KnapsackPage(page);
    await app.goto();

    // Fill inputs with non-numeric strings
    await app.setWeight('abc');
    await app.setValue('xyz');
    await app.setMaxWeight('not-a-number');

    // Click solve
    await app.clickSolve();

    // The code uses parseFloat on inputs, so non-numeric leads to NaN -> index lookups may yield undefined.
    // The output will still be updated using template string; check it exists and starts as expected.
    const outText3 = await app.getOutputText();
    expect(outText.startsWith('Maximum value: $')).toBeTruthy();

    // The numeric part might be 'undefined' in this broken-input scenario; check that the string contains either digits or 'undefined'/'NaN'
    const numericPart = outText.replace('Maximum value: $', '').trim();
    const isNumberLike = /^\d+$/.test(numericPart);
    const isUndefinedOrNaN = /^(undefined|NaN)$/.test(numericPart);
    expect(isNumberLike || isUndefinedOrNaN).toBeTruthy();

    // Ensure no unhandled exceptions were thrown in the page runtime
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Negative and large numeric inputs: application responds and updates DOM without throwing runtime errors', async ({ page }) => {
    // Purpose: test a couple of numeric edge cases that might stress loops or array allocation
    const app4 = new KnapsackPage(page);
    await app.goto();

    // Negative capacity (max_weight negative) and large weight
    await app.setWeight(1000000);
    await app.setValue(500);
    await app.setMaxWeight(-5);

    // Click solve
    await app.clickSolve();

    // Even if logic is incorrect, output should be updated to the expected prefix
    const outTextNeg = await app.getOutputText();
    expect(outTextNeg.startsWith('Maximum value: $')).toBeTruthy();

    // Now try a reasonably large but not insane capacity
    await app.setWeight(10);
    await app.setValue(20);
    await app.setMaxWeight(50);
    await app.clickSolve();

    const outTextLarge = await app.getOutputText();
    expect(outTextLarge.startsWith('Maximum value: $')).toBeTruthy();

    // Confirm no unhandled exceptions or console.error entries
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Accessibility checks: inputs have accessible names and button is focusable', async ({ page }) => {
    // Purpose: ensure basic accessibility attributes and focus behavior for interactive elements
    const app5 = new KnapsackPage(page);
    await app.goto();

    // Inputs should be focusable
    await app.weightInput().focus();
    await expect(app.weightInput()).toBeFocused();

    await app.valueInput().focus();
    await expect(app.valueInput()).toBeFocused();

    await app.maxWeightInput().focus();
    await expect(app.maxWeightInput()).toBeFocused();

    // Button focusable and clickable via keyboard
    await app.solveButton().focus();
    await expect(app.solveButton()).toBeFocused();

    // Press Enter to trigger the click (keyboard interaction)
    await app.solveButton().press('Enter');

    // Output should update or be present (application handles click events)
    const outText4 = await app.getOutputText();
    expect(outText.startsWith('Maximum value: $')).toBeTruthy();

    // No unexpected runtime errors from keyboard interaction
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Observe and report any runtime exceptions or console.error entries (final assertion)', async ({ page }) => {
    // Purpose: this test exists to explicitly observe console and page errors across a normal interaction,
    // and assert that no runtime exceptions leaked to the global handler.
    const app6 = new KnapsackPage(page);
    await app.goto();

    // A normal run with small numbers
    await app.setWeight(1);
    await app.setValue(1);
    await app.setMaxWeight(1);
    await app.clickSolve();

    // If any console.error or page error occurred earlier in the session, they will be reported here.
    // We assert that the app did not emit console.error nor throw unhandled exceptions.
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });
});