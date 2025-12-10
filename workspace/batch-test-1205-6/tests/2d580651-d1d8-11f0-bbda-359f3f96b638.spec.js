import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-6/html/2d580651-d1d8-11f0-bbda-359f3f96b638.html';

// Simple Page Object to interact with the Two Pointers app
class TwoPointersPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.arrayInput = page.locator('#arrayInput');
    this.targetInput = page.locator('#targetInput');
    this.findButton = page.locator('button[onclick="findPair()"]');
    this.result = page.locator('#result');
  }

  async goto() {
    await this.page.goto(APP_URL, { waitUntil: 'load' });
  }

  async fillArray(value) {
    await this.arrayInput.fill(value);
  }

  async fillTarget(value) {
    // use fill to set number input; convert to string
    await this.targetInput.fill(String(value));
  }

  async clickFind() {
    await this.findButton.click();
  }

  async getResultText() {
    return (await this.result.innerText()).trim();
  }

  async getArrayPlaceholder() {
    return this.arrayInput.getAttribute('placeholder');
  }

  async getTargetPlaceholder() {
    return this.targetInput.getAttribute('placeholder');
  }

  async findButtonHasOnclick() {
    const attr = await this.findButton.getAttribute('onclick');
    return attr;
  }
}

test.describe('Two Pointers Technique - Interactive App (FSM validation)', () => {
  // Collect console errors and page errors for each test run
  let consoleErrors = [];
  let pageErrors = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Capture console messages and page errors to assert runtime stability
    page.on('console', (msg) => {
      // Capture only error level console messages (these would indicate runtime issues)
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('pageerror', (err) => {
      pageErrors.push(err.message);
    });
  });

  test.afterEach(async () => {
    // After each test assert that no unexpected runtime errors (console/page) happened.
    // If errors exist, include them in assertion messages for easier debugging.
    expect(pageErrors.length, `Unexpected page errors: ${pageErrors.join(' | ')}`).toBe(0);
    expect(consoleErrors.length, `Unexpected console errors: ${consoleErrors.join(' | ')}`).toBe(0);
  });

  test('Initial render: inputs, placeholders, button and empty result (S0_Idle)', async ({ page }) => {
    // Validate that the initial page renders the expected components and placeholders.
    const app = new TwoPointersPage(page);
    await app.goto();

    // Check placeholders exist and match FSM evidence
    const arrayPlaceholder = await app.getArrayPlaceholder();
    const targetPlaceholder = await app.getTargetPlaceholder();
    expect(arrayPlaceholder).toBe('e.g. 1, 2, 3, 4, 6');
    expect(targetPlaceholder).toBe('Target Sum');

    // Check find button exists and has the inline onclick handler as per implementation
    const onclickAttr = await app.findButtonHasOnclick();
    expect(onclickAttr).toBe('findPair()');

    // On initial render, result should be empty
    const resultText = await app.getResultText();
    expect(resultText).toBe('');
  });

  test('Transition to S1_PairFound: finds a valid pair for a sorted array', async ({ page }) => {
    // This validates the "Pair Found" final state when a valid pair exists.
    const app1 = new TwoPointersPage(page);
    await app.goto();

    // Use a sorted array where 1 + 6 = 7 is a valid pair
    await app.fillArray('1, 2, 3, 4, 6');
    await app.fillTarget(7);

    // Click the button to trigger findPair()
    await app.clickFind();

    // Expect the result DOM to show the found pair matching evidence in FSM
    const resultText1 = await app.getResultText();
    expect(resultText).toBe('Pair found: 1 + 6 = 7');
  });

  test('Transition to S1_PairFound: finds a valid pair even when input is unsorted (sorting verified)', async ({ page }) => {
    // The implementation sorts the array internally; this verifies that behavior.
    const app2 = new TwoPointersPage(page);
    await app.goto();

    // Provide an unsorted array that contains the pair 1 and 6
    await app.fillArray('6,1,4,2');
    await app.fillTarget(7);

    await app.clickFind();

    // Should still find pair after sorting: 1 + 6 = 7
    const resultText2 = await app.getResultText();
    expect(resultText).toBe('Pair found: 1 + 6 = 7');
  });

  test('Transition to S2_NoPairFound: no pair exists for the target', async ({ page }) => {
    // Validates the "No Pair Found" final state when the target cannot be met.
    const app3 = new TwoPointersPage(page);
    await app.goto();

    await app.fillArray('1, 2, 3, 4, 6');
    await app.fillTarget(20); // no two numbers sum to 20 in this array

    await app.clickFind();

    const resultText3 = await app.getResultText();
    expect(resultText).toBe('No valid pair found.');
  });

  test('Edge case: empty array input yields "No valid pair found."', async ({ page }) => {
    // Cover edge case where user leaves array input blank.
    const app4 = new TwoPointersPage(page);
    await app.goto();

    await app.fillArray('');
    await app.fillTarget(5);

    await app.clickFind();

    const resultText4 = await app.getResultText();
    expect(resultText).toBe('No valid pair found.');
  });

  test('Edge case: non-numeric entries are handled gracefully (No Pair Found)', async ({ page }) => {
    // Ensure that non-numeric values do not crash the app and produce the No Pair Found outcome.
    const app5 = new TwoPointersPage(page);
    await app.goto();

    // Non-numeric entries will map to NaN; algorithm should finish without throwing and return No valid pair found.
    await app.fillArray('a, b, c');
    await app.fillTarget(5);

    await app.clickFind();

    const resultText5 = await app.getResultText();
    expect(resultText).toBe('No valid pair found.');
  });

  test('Click event wiring: clicking button triggers behavior (FindPairClick event)', async ({ page }) => {
    // Verifies the event described in FSM: clicking the button invokes the findPair action.
    const app6 = new TwoPointersPage(page);
    await app.goto();

    // Prepare a case where a pair exists
    await app.fillArray('2,3,5,8');
    await app.fillTarget(10); // 2 + 8 = 10

    // Interact with the button
    await app.clickFind();

    // Assert outcome indicates the click triggered computation
    const resultText6 = await app.getResultText();
    expect(resultText).toBe('Pair found: 2 + 8 = 10');
  });

  test('Robustness: multiple consecutive searches update result correctly', async ({ page }) => {
    // Ensures repeated interactions transition between states correctly and update DOM each time.
    const app7 = new TwoPointersPage(page);
    await app.goto();

    // First, a no-pair case
    await app.fillArray('1,2,3');
    await app.fillTarget(10);
    await app.clickFind();
    expect(await app.getResultText()).toBe('No valid pair found.');

    // Then, a pair exists
    await app.fillArray('1,2,3,7');
    await app.fillTarget(8); // 1 + 7 = 8
    await app.clickFind();
    expect(await app.getResultText()).toBe('Pair found: 1 + 7 = 8');

    // Finally, empty input again
    await app.fillArray('');
    await app.fillTarget(0);
    await app.clickFind();
    expect(await app.getResultText()).toBe('No valid pair found.');
  });

  test('Sanity check: no runtime ReferenceError/SyntaxError/TypeError observed in console or page', async ({ page }) => {
    // This test explicitly navigates and asserts that no JS runtime errors occurred.
    // It follows the instruction to observe console logs and page errors.
    const app8 = new TwoPointersPage(page);
    await app.goto();

    // Interact once to potentially surface runtime issues
    await app.fillArray('1,2,3');
    await app.fillTarget(4);
    await app.clickFind();

    // At this moment the afterEach hook will assert that consoleErrors and pageErrors are empty.
    // Additionally, perform a direct assertion here for clarity (duplicate safety).
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });
});