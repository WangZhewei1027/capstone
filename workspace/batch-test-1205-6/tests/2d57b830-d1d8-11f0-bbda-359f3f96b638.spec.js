import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-6/html/2d57b830-d1d8-11f0-bbda-359f3f96b638.html';

// Page Object Model for the Knapsack page
class KnapsackPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.weightsInput = page.locator('#weights');
    this.valuesInput = page.locator('#values');
    this.capacityInput = page.locator('#capacity');
    this.solveButton = page.locator('button[onclick="solveKnapsack()"]');
    this.result = page.locator('#result');
    this.heading = page.locator('h1');
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async setWeights(text) {
    await this.weightsInput.fill(text);
  }

  async setValues(text) {
    await this.valuesInput.fill(text);
  }

  async setCapacity(text) {
    // capacity is an <input type="number">, fill accepts string
    await this.capacityInput.fill(text);
  }

  async clickSolve() {
    await this.solveButton.click();
  }

  async getResultText() {
    return (await this.result.textContent()) ?? '';
  }

  async getHeadingText() {
    return (await this.heading.textContent()) ?? '';
  }
}

test.describe('Knapsack Problem FSM and UI Tests - Application 2d57b830-d1d8-11f0-bbda-359f3f96b638', () => {
  // Arrays to capture console messages and page errors for each test
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    // Initialize containers for logs and errors
    consoleMessages = [];
    pageErrors = [];

    // Capture console.log/warn/error messages
    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Capture uncaught exceptions on the page
    page.on('pageerror', error => {
      // pageerror provides an Error object
      pageErrors.push(error);
    });
  });

  test('Idle state renders correctly on page load (S0_Idle)', async ({ page }) => {
    // This test validates the initial Idle state: page renders header, inputs and empty result.
    const knapsack = new KnapsackPage(page);

    // Navigate to the app
    await knapsack.goto();

    // Verify header (evidence for idle state)
    const heading = await knapsack.getHeadingText();
    expect(heading).toBe('Knapsack Problem Solver');

    // Verify inputs exist and have placeholders as described in the FSM/components
    await expect(knapsack.weightsInput).toHaveAttribute('placeholder', 'e.g. 1,2,3,2');
    await expect(knapsack.valuesInput).toHaveAttribute('placeholder', 'e.g. 6,10,12,7');
    await expect(knapsack.capacityInput).toHaveAttribute('placeholder', 'e.g. 5');

    // On initial render, #result should be empty
    expect(await knapsack.getResultText()).toBe('');

    // Ensure no console errors occurred during load
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);

    // Ensure no uncaught page errors occurred during load
    expect(pageErrors.length).toBe(0);
  });

  test('SolveKnapsack event transitions to Solved state and displays correct result (S1_Solved)', async ({ page }) => {
    // This test validates the transition triggered by clicking the Solve Knapsack button.
    // It confirms that for valid numeric inputs the application computes and displays the expected maximum value.
    const knapsack1 = new KnapsackPage(page);
    await knapsack.goto();

    // Provide the sample inputs from the FSM description
    // weights: [1,2,3,2], values: [6,10,12,7], capacity: 5 -> expected max value = 22
    await knapsack.setWeights('1,2,3,2');
    await knapsack.setValues('6,10,12,7');
    await knapsack.setCapacity('5');

    // Click Solve and wait a short moment for DOM update (the function runs synchronously)
    await knapsack.clickSolve();

    // Validate that the result text matches the expected "Maximum value in Knapsack = 22"
    const resultText = await knapsack.getResultText();
    expect(resultText).toBe('Maximum value in Knapsack = 22');

    // This is the evidence of entering S1_Solved (displayResult executed)
    // Confirm header persists
    expect(await knapsack.getHeadingText()).toBe('Knapsack Problem Solver');

    // Ensure there were no console errors during the solve operation
    const consoleErrors1 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);

    // Ensure no uncaught page errors occurred during this successful run
    expect(pageErrors.length).toBe(0);
  });

  test('Edge case: empty capacity input should surface a runtime error (expect pageerror)', async ({ page }) => {
    // This test intentionally triggers an edge case: empty capacity leads to parseInt -> NaN,
    // which is then used to create an array with invalid length. We observe and assert that
    // the page emits a runtime/page error when this occurs.
    const knapsack2 = new KnapsackPage(page);
    await knapsack.goto();

    // Provide weights and values but leave capacity blank to trigger error
    await knapsack.setWeights('1,2,3');
    await knapsack.setValues('10,20,30');
    await knapsack.setCapacity(''); // empty

    // Click Solve - this is expected to produce a runtime error on the page (uncaught)
    // Wait for either a pageerror event to be captured or a short timeout
    const promiseError = new Promise(resolve => {
      // If a page error occurs, resolve quickly
      page.on('pageerror', err => resolve(err));
      // Safety timeout: if no error after 500ms, resolve with null
      setTimeout(() => resolve(null), 500);
    });

    await knapsack.clickSolve();

    const maybeError = await promiseError;

    // We expect an error to have been emitted due to invalid array length/NaN usage in the implementation.
    // Assert that at least one page error was recorded by the handler
    expect(pageErrors.length + (maybeError ? 1 : 0)).toBeGreaterThan(0);

    // If we have an error object, do some light assertions about its nature (message may vary across engines)
    const observedErrors = [...pageErrors];
    if (maybeError) observedErrors.push(maybeError);

    // At least one of the errors should be an instance of Error and have a non-empty message
    const hasMeaningfulError = observedErrors.some(err => err && typeof err.message === 'string' && err.message.length > 0);
    expect(hasMeaningfulError).toBe(true);
  });

  test('Invalid non-numeric weights/values inputs produce deterministic behavior (no crash)', async ({ page }) => {
    // This test provides non-numeric entries for weights/values to observe behavior:
    // the algorithm will coerce to NaN which typically causes comparisons to be false and results to default to 0.
    // We verify the page does not throw and yields a predictable result string.
    const knapsack3 = new KnapsackPage(page);
    await knapsack.goto();

    // Non-numeric entries
    await knapsack.setWeights('a,b,c');
    await knapsack.setValues('x,y,z');
    await knapsack.setCapacity('5');

    // Click solve and observe result
    await knapsack.clickSolve();

    // The implementation may produce 0 (since comparisons with NaN fail), so check result is present and is a string.
    const resultText1 = await knapsack.getResultText();
    expect(typeof resultText).toBe('string');
    // Accept either an empty result or a message - but ensure no uncaught page errors occurred
    const consoleErrors2 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test.afterEach(async ({ page }) => {
    // Teardown: if there were any unexpected console errors, attach them to the test output via expect for visibility.
    const consoleErrors3 = consoleMessages.filter(m => m.type === 'error').map(m => m.text);
    if (consoleErrors.length > 0) {
      // Fail the test explicitly with collected console error messages to make debugging easier
      // Using expect to report the errors in the test result.
      expect(consoleErrors.length, `Console errors were emitted: ${consoleErrors.join(' | ')}`).toBe(0);
    }

    // Also fail if there are uncaught page errors (they should be asserted per-test where expected)
    if (pageErrors.length > 0) {
      const messages = pageErrors.map(e => (e && e.message) || String(e));
      expect(pageErrors.length, `Uncaught page errors: ${messages.join(' | ')}`).toBe(0);
    }
  });
});