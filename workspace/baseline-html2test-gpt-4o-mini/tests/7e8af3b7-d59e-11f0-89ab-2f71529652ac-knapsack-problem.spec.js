import { test, expect } from '@playwright/test';

// Test file for Application ID: 7e8af3b7-d59e-11f0-89ab-2f71529652ac
// URL: http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/7e8af3b7-d59e-11f0-89ab-2f71529652ac.html
// Filename requirement satisfied by the hosting environment; this module should be saved as:
// 7e8af3b7-d59e-11f0-89ab-2f71529652ac-knapsack-problem.spec.js

// Page Object Model for the Knapsack page
class KnapsackPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.itemsInput = page.locator('#items');
    this.capacityInput = page.locator('#capacity');
    this.solveButton = page.locator('button', { hasText: 'Solve Knapsack' });
    this.results = page.locator('#results');
    this.labelItems = page.locator('label[for="items"]');
    this.labelCapacity = page.locator('label[for="capacity"]');
  }

  async goto() {
    await this.page.goto('http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/7e8af3b7-d59e-11f0-89ab-2f71529652ac.html', { waitUntil: 'domcontentloaded' });
  }

  async fillItems(value) {
    await this.itemsInput.fill(value);
  }

  async fillCapacity(value) {
    // capacity is a number input; convert to string
    await this.capacityInput.fill(String(value));
  }

  async clickSolve() {
    await this.solveButton.click();
  }

  async getResultsText() {
    return this.results.innerText();
  }

  async getResultsHTML() {
    return this.results.innerHTML();
  }
}

test.describe('Knapsack Problem Solver - UI and behavior tests', () => {
  let pageErrors = [];
  let consoleMessages = [];

  // Setup a fresh page for each test and attach listeners for console and page errors
  test.beforeEach(async ({ page }) => {
    pageErrors = [];
    consoleMessages = [];

    // Collect page errors (uncaught exceptions from page JS)
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    // Collect console messages for inspection
    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
  });

  // Test initial page load and default state
  test('Initial load: inputs, labels, button and empty results are present', async ({ page }) => {
    const knapsack = new KnapsackPage(page);
    // Navigate to the page
    await knapsack.goto();

    // Verify inputs and button are visible
    await expect(knapsack.itemsInput).toBeVisible();
    await expect(knapsack.capacityInput).toBeVisible();
    await expect(knapsack.solveButton).toBeVisible();

    // Check that labels are associated with the input elements (basic accessibility check)
    await expect(knapsack.labelItems).toHaveAttribute('for', 'items');
    await expect(knapsack.labelCapacity).toHaveAttribute('for', 'capacity');

    // Results should be present but empty initially
    const initialResultsHTML = await knapsack.getResultsHTML();
    // The results div exists; initially innerHTML should be empty (no results shown)
    expect(initialResultsHTML.trim()).toBe('');

    // Ensure that loading the page did not emit any page errors by itself
    expect(pageErrors.length).toBe(0);
  });

  // Test a successful run path that avoids the known bug by making max value zero
  test('Solve with capacity 0: computes Maximum Value 0 and updates DOM without runtime error', async ({ page }) => {
    const knapsack1 = new KnapsackPage(page);
    await knapsack.goto();

    // Input example items but set capacity to 0 so maxValue becomes 0 and the buggy reassignment is avoided
    await knapsack.fillItems('2,3;1,2;3,4');
    await knapsack.fillCapacity(0);

    // Click Solve and wait briefly for DOM update
    await knapsack.clickSolve();

    // Wait a short while to allow script to complete - this run is expected to NOT throw a page error
    await page.waitForTimeout(200);

    // Assert no page errors occurred during this run
    expect(pageErrors.length).toBe(0);

    // Verify that results container was updated and shows Maximum Value: 0
    const resultsText = await knapsack.getResultsText();
    expect(resultsText).toContain('Results');
    expect(resultsText).toContain('Maximum Value: 0');

    // Selected items list should be empty in this scenario
    expect(resultsText).toMatch(/Selected Items .*:\s*$/m).or.expect(resultsText).toContain('Selected Items (weight,value):');

    // Also confirm no console error messages were emitted
    const hasConsoleErrors = consoleMessages.some(m => m.type === 'error');
    expect(hasConsoleErrors).toBe(false);
  });

  // Test normal inputs that exercise the buggy code path and assert that a TypeError occurs
  test('Solve with positive capacity triggers a runtime TypeError due to reassignment to const (assert pageerror)', async ({ page }) => {
    const knapsack2 = new KnapsackPage(page);
    await knapsack.goto();

    // Prepare inputs that will produce a positive maximum value, which will enter the backtracking loop
    await knapsack.fillItems('2,3;1,2;3,4;2,2');
    await knapsack.fillCapacity(5);

    // The click will cause a runtime exception in the page script (assignment to a const)
    // Wait for the pageerror event that should be emitted by the uncaught exception.
    const [err] = await Promise.all([
      page.waitForEvent('pageerror'),
      knapsack.clickSolve()
    ]);

    // Confirm that an error event was captured and its name indicates a TypeError
    expect(err).toBeTruthy();
    // Different browsers may produce slightly different messages, check both type and message content
    // err is an Error object from the page context; in Playwright it includes name and message
    expect(err.name).toBe('TypeError');

    // The message should indicate assignment to a constant or similar phrasing
    const msgLower = String(err.message || '').toLowerCase();
    expect(msgLower).toMatch(/assignment to constant|assignment to constant variable|cannot assign to constant|invalid assignment/);

    // Because the error occurs before the final DOM update, results should remain empty
    const resultsHTML = await knapsack.getResultsHTML();
    expect(resultsHTML.trim()).toBe('');

    // Also ensure the captured pageErrors array contains the same error
    expect(pageErrors.length).toBeGreaterThanOrEqual(1);
    expect(pageErrors[0].name).toBe('TypeError');
  });

  // Test malformed/empty items input producing NaN output (edge case)
  test('Malformed or empty items input yields NaN Maximum Value when parsed into invalid numbers', async ({ page }) => {
    const knapsack3 = new KnapsackPage(page);
    await knapsack.goto();

    // Leave items empty (or explicitly empty string) so parsing produces NaN in values
    await knapsack.fillItems('');
    await knapsack.fillCapacity(1);

    // Click solve; this path should not throw, but produce NaN as the result
    await knapsack.clickSolve();

    // Wait briefly for DOM update
    await page.waitForTimeout(200);

    // There should be no page error for this input
    expect(pageErrors.length).toBe(0);

    // Results inner text should contain 'Maximum Value' and the textual 'NaN'
    const resultsText1 = await knapsack.getResultsText();
    expect(resultsText).toContain('Maximum Value:');
    expect(resultsText).toMatch(/Maximum Value:\s*NaN/);

    // And the selected items line should be present (may indicate invalid items)
    expect(resultsText).toContain('Selected Items (weight,value):');
  });

  // Additional sanity test: labels reference correct inputs (accessibility-related)
  test('Labels are correctly associated with inputs for accessibility', async ({ page }) => {
    const knapsack4 = new KnapsackPage(page);
    await knapsack.goto();

    // Ensure the label text is meaningful to a user
    await expect(knapsack.labelItems).toHaveText(/Enter items/i);
    await expect(knapsack.labelCapacity).toHaveText(/Enter capacity of knapsack/i);

    // Ensure clicking a label focuses the appropriate input (basic a11y behavior)
    await knapsack.labelItems.click();
    await expect(knapsack.itemsInput).toBeFocused();

    await knapsack.labelCapacity.click();
    await expect(knapsack.capacityInput).toBeFocused();
  });
});