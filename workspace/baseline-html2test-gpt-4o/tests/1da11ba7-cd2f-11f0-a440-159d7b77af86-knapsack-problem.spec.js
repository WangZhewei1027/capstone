import { test, expect } from '@playwright/test';

// URL of the page under test
const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/1da11ba7-cd2f-11f0-a440-159d7b77af86.html';

// Page Object Model for the Knapsack page
class KnapsackPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.capacityInput = page.locator('#capacity');
    this.weightsInput = page.locator('#weights');
    this.valuesInput = page.locator('#values');
    // There's a single button on the page; use role or tag
    this.solveButton = page.locator('button', { hasText: 'Solve Knapsack' });
    this.result = page.locator('#result');
    this.resultTable = page.locator('#resultTable');
    this.tableRows = this.resultTable.locator('tr');
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async setCapacity(value) {
    await this.capacityInput.fill(String(value));
  }

  async setWeights(value) {
    await this.weightsInput.fill(String(value));
  }

  async setValues(value) {
    await this.valuesInput.fill(String(value));
  }

  // Click the Solve button and wait for the result paragraph text to update
  async clickSolveAndWaitForResult() {
    // Read the current result text to detect change
    const before = (await this.result.textContent()) ?? '';
    await this.solveButton.click();
    // Wait for the result text to change or to include "Maximum value"
    await this.page.waitForFunction(
      (selector, prev) => {
        const el = document.querySelector(selector);
        if (!el) return false;
        const txt = el.textContent || '';
        return txt !== prev && txt.length > 0;
      },
      this.result._selector,
      before
    );
  }

  async getResultText() {
    return (await this.result.textContent()) ?? '';
  }

  // Get table rows as arrays of cell texts, excluding header optionally
  async getTableRowsTexts(skipHeader = false) {
    const rowsCount = await this.tableRows.count();
    const rows = [];
    for (let i = 0; i < rowsCount; i++) {
      if (skipHeader && i === 0) continue;
      const cells = this.tableRows.nth(i).locator('th,td');
      const cellCount = await cells.count();
      const row = [];
      for (let j = 0; j < cellCount; j++) {
        row.push((await cells.nth(j).textContent())?.trim() ?? '');
      }
      rows.push(row);
    }
    return rows;
  }

  // Convenience to get included column values (Yes/No) in order of items
  async getIncludedColumnValues() {
    const rows = await this.getTableRowsTexts(true); // skip header
    return rows.map(r => r[3]); // Included is 4th column
  }
}

// Global containers for console messages and page errors for each test run
let consoleMessages = [];
let pageErrors = [];
let consoleHandler = null;
let pageErrorHandler = null;

// Setup listeners before each test and remove them after each test
test.beforeEach(async ({ page }, testInfo) => {
  // Reset arrays
  consoleMessages = [];
  pageErrors = [];

  // Handlers capture relevant data
  consoleHandler = msg => {
    // Store message type and text for assertions
    consoleMessages.push({ type: msg.type(), text: msg.text() });
  };

  pageErrorHandler = err => {
    // err is an Error object with message and stack
    pageErrors.push({ message: err.message, stack: err.stack });
  };

  page.on('console', consoleHandler);
  page.on('pageerror', pageErrorHandler);

  // Navigate to the app fresh for each test
  await page.goto(APP_URL);
});

test.afterEach(async ({ page }) => {
  // Remove handlers to avoid cross-test leakage
  if (consoleHandler) page.off('console', consoleHandler);
  if (pageErrorHandler) page.off('pageerror', pageErrorHandler);
  consoleHandler = null;
  pageErrorHandler = null;
});

test.describe('Knapsack Problem - Default Behavior', () => {
  // Test initial page load and default state
  test('loads page and shows default inputs and empty results', async ({ page }) => {
    const knapsack = new KnapsackPage(page);

    // Verify default input values (as provided in HTML)
    await expect(knapsack.capacityInput).toHaveValue('10');
    await expect(knapsack.weightsInput).toHaveValue('2,3,4,5');
    await expect(knapsack.valuesInput).toHaveValue('3,4,5,6');

    // Result paragraph and result table should be empty on initial load
    await expect(knapsack.result).toHaveText('');
    const tableHTML = await knapsack.resultTable.innerHTML();
    expect(tableHTML.trim()).toBe('', 'Expected result table to be empty before solving');

    // Ensure no page errors or console errors were emitted during load
    expect(pageErrors.length).toBe(0);
    // There may be benign console logs; assert there are no console error-level messages
    const errorConsole = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsole.length).toBe(0);
  });

  // Test solving with the default inputs
  test('solves knapsack with default inputs and displays correct maximum and inclusion table', async ({ page }) => {
    const knapsack = new KnapsackPage(page);

    // Click Solve and wait for result to update
    await knapsack.clickSolveAndWaitForResult();

    // After solving, expect the maximum value for the provided defaults:
    // With capacity 10 and items [2,3,4,5] weights with values [3,4,5,6],
    // best selection is items 1 (w2,v3), 2 (w3,v4), and 4 (w5,v6) -> total value 13.
    const resultText = await knapsack.getResultText();
    expect(resultText.trim()).toBe('Maximum value in knapsack: 13');

    // Verify table has header + 4 item rows = 5 <tr>
    const totalRows = await knapsack.tableRows.count();
    expect(totalRows).toBe(1 + 4, 'Expected header row plus 4 item rows');

    // Verify each row content (Item number, Weight, Value, Included)
    const rows = await knapsack.getTableRowsTexts(true); // skip header
    // Row order corresponds to items 1..4
    // Expected weights and values as strings
    expect(rows[0]).toEqual(['1', '2', '3', 'Yes']); // item 1 included
    expect(rows[1]).toEqual(['2', '3', '4', 'Yes']); // item 2 included
    expect(rows[2]).toEqual(['3', '4', '5', 'No']);  // item 3 not included
    expect(rows[3]).toEqual(['4', '5', '6', 'Yes']); // item 4 included

    // Ensure no runtime page errors occurred during computation
    expect(pageErrors.length).toBe(0);
    // Ensure no console.error messages were emitted
    const errorConsole = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsole.length).toBe(0);
  });
});

test.describe('Knapsack Problem - Edge Cases and Error Handling', () => {
  // Test a very small capacity where no items fit
  test('returns zero maximum and no items included when capacity too small', async ({ page }) => {
    const knapsack = new KnapsackPage(page);

    // Set capacity to 1 (all items have weight >=2) and solve
    await knapsack.setCapacity(1);
    await knapsack.clickSolveAndWaitForResult();

    const resultText = await knapsack.getResultText();
    expect(resultText.trim()).toBe('Maximum value in knapsack: 0');

    // All included column entries should be "No"
    const included = await knapsack.getIncludedColumnValues();
    expect(included).toEqual(['No', 'No', 'No', 'No']);

    // No page errors expected even in this edge case
    expect(pageErrors.length).toBe(0);
  });

  // Test malformed numeric input leading to NaN in computation/display
  test('displays NaN when provided non-numeric values and does not crash', async ({ page }) => {
    const knapsack = new KnapsackPage(page);

    // Provide malformed values (non-numeric)
    await knapsack.setWeights('2,3');
    await knapsack.setValues('a,b'); // 'a' -> NaN
    await knapsack.setCapacity(5);

    // Solve and wait for result change
    await knapsack.clickSolveAndWaitForResult();

    const resultText = await knapsack.getResultText();
    // The algorithm uses Number('a') -> NaN, numeric operations will produce NaN
    expect(resultText).toContain('Maximum value in knapsack:');
    // The maximum may be "NaN" as a string in the displayed result
    expect(resultText).toMatch(/NaN|nan/);

    // Table should display 'NaN' in value cells for the malformed values
    const rows = await knapsack.getTableRowsTexts(true); // skip header
    // rows length should equal number of weights (2)
    expect(rows.length).toBe(2);
    // weights column should be the numeric strings; values column should show 'NaN'
    expect(rows[0][1]).toBe('2');
    expect(rows[0][2]).toMatch(/NaN|nan/);
    expect(rows[1][1]).toBe('3');
    expect(rows[1][2]).toMatch(/NaN|nan/);

    // Algorithm should not have thrown a page error (no exception)
    expect(pageErrors.length).toBe(0);

    // However, since invalid numeric input was provided, console may contain warnings or logs;
    // Ensure there are no console.error messages (critical failures) as a result.
    const errorConsole = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsole.length).toBe(0);
  });
});

test.describe('Knapsack Problem - Accessibility & Interaction', () => {
  // Ensure interactive controls are present and focusable
  test('controls are present, focusable and have expected attributes', async ({ page }) => {
    const knapsack = new KnapsackPage(page);

    // Inputs should be visible and enabled
    await expect(knapsack.capacityInput).toBeVisible();
    await expect(knapsack.weightsInput).toBeVisible();
    await expect(knapsack.valuesInput).toBeVisible();
    await expect(knapsack.solveButton).toBeVisible();
    await expect(knapsack.solveButton).toBeEnabled();

    // Capacity input has min attribute of 1 as defined in HTML
    const minAttr = await knapsack.capacityInput.getAttribute('min');
    expect(minAttr).toBe('1');

    // Tab through controls to ensure they are focusable in order
    await page.keyboard.press('Tab'); // to capacity
    await expect(knapsack.capacityInput).toBeFocused();
    await page.keyboard.press('Tab'); // to weights
    await expect(knapsack.weightsInput).toBeFocused();
    await page.keyboard.press('Tab'); // to values
    await expect(knapsack.valuesInput).toBeFocused();
    await page.keyboard.press('Tab'); // to button
    await expect(knapsack.solveButton).toBeFocused();

    // No page errors just from focusing and interactions
    expect(pageErrors.length).toBe(0);
  });
});