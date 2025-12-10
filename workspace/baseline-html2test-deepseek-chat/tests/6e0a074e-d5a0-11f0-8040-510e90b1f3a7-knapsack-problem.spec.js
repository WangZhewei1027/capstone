import { test, expect } from '@playwright/test';

// Test suite for Knapsack Problem Solver
// File: 6e0a074e-d5a0-11f0-8040-510e90b1f3a7-knapsack-problem.spec.js
// This suite loads the HTML page as-is, observes console and page errors,
// and exercises all interactive controls and major user flows.
// Comments are provided for clarity for each test.

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-deepseek-chat/html/6e0a074e-d5a0-11f0-8040-510e90b1f3a7.html';

// Page Object for interacting with the Knapsack app
class KnapsackPage {
  constructor(page) {
    this.page = page;
    // Selectors used across tests
    this.selectors = {
      header: 'h1',
      itemName: '#item-name',
      itemWeight: '#item-weight',
      itemValue: '#item-value',
      addItemBtn: '#add-item',
      capacityInput: '#knapsack-capacity',
      setCapacityBtn: '#set-capacity',
      solveBtn: '#solve',
      resetBtn: '#reset',
      generateExampleBtn: '#generate-example',
      itemsTableBody: '#items-table-body',
      resultsDiv: '#results',
      maxValueSpan: '#max-value',
      totalWeightSpan: '#total-weight',
      solutionItemsDiv: '#solution-items',
      dpTableDiv: '#dp-table'
    };
  }

  // Navigate to the app
  async goto() {
    await this.page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
  }

  // Add an item using the form fields
  async addItem(name, weight, value) {
    await this.page.fill(this.selectors.itemName, name);
    await this.page.fill(this.selectors.itemWeight, String(weight));
    await this.page.fill(this.selectors.itemValue, String(value));
    await this.page.click(this.selectors.addItemBtn);
  }

  // Click set capacity (expects capacity input to be already filled)
  async clickSetCapacity() {
    await this.page.click(this.selectors.setCapacityBtn);
  }

  // Click solve button
  async clickSolve() {
    await this.page.click(this.selectors.solveBtn);
  }

  // Click reset button
  async clickReset() {
    await this.page.click(this.selectors.resetBtn);
  }

  // Click generate example button
  async clickGenerateExample() {
    await this.page.click(this.selectors.generateExampleBtn);
  }

  // Get number of items shown in the items table
  async getItemsCount() {
    return await this.page.locator(`${this.selectors.itemsTableBody} > tr`).count();
  }

  // Get text contents of the latest row in items table (for validation)
  async getLastItemRowText() {
    const rows = this.page.locator(`${this.selectors.itemsTableBody} > tr`);
    const count = await rows.count();
    if (count === 0) return null;
    return await rows.nth(count - 1).innerText();
  }

  // Remove item at given index (0-based)
  async removeItemAt(index) {
    const btn = this.page.locator(`${this.selectors.itemsTableBody} .remove-item`).nth(index);
    await btn.click();
  }

  // Get capacity input value
  async getCapacityInputValue() {
    return await this.page.inputValue(this.selectors.capacityInput);
  }

  // Get whether results div is visible (by CSS display style)
  async isResultsVisible() {
    const display = await this.page.$eval(this.selectors.resultsDiv, el => getComputedStyle(el).display);
    return display !== 'none';
  }

  // Get maximum value displayed in results
  async getMaxValue() {
    return await this.page.textContent(this.selectors.maxValueSpan);
  }

  // Get total weight displayed in results
  async getTotalWeight() {
    return await this.page.textContent(this.selectors.totalWeightSpan);
  }

  // Get list of solution item texts
  async getSolutionItemsText() {
    const items = this.page.locator(`${this.selectors.solutionItemsDiv} .item-box`);
    const count = await items.count();
    const out = [];
    for (let i = 0; i < count; i++) {
      out.push((await items.nth(i).textContent()).trim());
    }
    return out;
  }

  // Check whether DP table exists inside dpTableDiv
  async hasDpTable() {
    return await this.page.$(`${this.selectors.dpTableDiv} table`) !== null;
  }

  // Get DP table row count (if present), otherwise 0
  async getDpTableRowCount() {
    const table = await this.page.$(`${this.selectors.dpTableDiv} table`);
    if (!table) return 0;
    return await table.$$eval('tr', rows => rows.length);
  }

  // Evaluate items.length in page context (accesses the app's global variable)
  async getInternalItemsLength() {
    return await this.page.evaluate(() => {
      // Accessing global variable 'items' from the page script
      return (window.items && window.items.length) || 0;
    });
  }
}

test.describe('Knapsack Problem Solver - End-to-End', () => {
  let consoleErrors;
  let pageErrors;
  let logs;
  let knapsack;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];
    logs = [];

    // Capture console messages and page errors for assertion later.
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      logs.push({ type, text });
      if (type === 'error') {
        consoleErrors.push(text);
      }
    });

    page.on('pageerror', (err) => {
      // pageerror receives an Error object for unhandled exceptions in page
      pageErrors.push(String(err && err.message ? err.message : err));
    });

    knapsack = new KnapsackPage(page);
    await knapsack.goto();
  });

  test.afterEach(async () => {
    // After each test assert that there were no page errors or console errors.
    // This verifies the runtime behaved without unhandled exceptions.
    expect(pageErrors, 'No runtime page errors should occur').toEqual([]);
    expect(consoleErrors, 'No console errors should be logged').toEqual([]);
  });

  test('Initial page load shows header, generated example items, and capacity is set', async ({ page }) => {
    // Verify title header exists and text is correct
    await expect(page.locator('h1')).toHaveText('Knapsack Problem Solver');

    // generateExample runs on load; it should create 5 items
    const itemCount = await knapsack.getItemsCount();
    expect(itemCount, 'Initial generated example should create 5 items').toBe(5);

    // Capacity input should reflect the generateExample capacity (6)
    const capacityValue = await knapsack.getCapacityInputValue();
    expect(capacityValue, 'Capacity input should be set to 6 by generateExample').toBe('6');

    // Results should be hidden initially
    const visible = await knapsack.isResultsVisible();
    expect(visible, 'Results panel should be hidden on initial load').toBe(false);
  });

  test('Adding a valid item updates the table and can be removed', async ({ page }) => {
    // Count before adding
    const before = await knapsack.getItemsCount();

    // Add a new valid item
    await knapsack.addItem('Phone', 2, 200);

    // After adding, count increased by 1
    const after = await knapsack.getItemsCount();
    expect(after, 'Items table should increase after adding a valid item').toBe(before + 1);

    // Last row should contain the item details
    const lastRowText = await knapsack.getLastItemRowText();
    expect(lastRowText, 'Last row should contain the new item details').toContain('Phone');
    expect(lastRowText).toContain('2');
    expect(lastRowText).toContain('200');

    // Remove the newly added item (it should be the last remove button)
    // Locate index of the remove button corresponding to the last row
    await knapsack.removeItemAt(after - 1);

    // Verify the row count returned to previous value
    const afterRemove = await knapsack.getItemsCount();
    expect(afterRemove, 'Item should be removed and table count should decrement').toBe(before);
  });

  test('Adding an invalid item triggers an alert and does not modify items', async ({ page }) => {
    // Ensure some baseline count
    const baseline = await knapsack.getItemsCount();

    // Clicking add without filling fields should trigger an alert
    const [dialog] = await Promise.all([
      page.waitForEvent('dialog'),
      page.click(knapsack.selectors.addItemBtn)
    ]);
    expect(dialog.message()).toContain('Please enter valid item details.');
    await dialog.accept();

    // Ensure items count unchanged
    const after = await knapsack.getItemsCount();
    expect(after, 'Invalid add should not change items list').toBe(baseline);
  });

  test('Setting capacity with invalid and valid values triggers appropriate alerts and updates input', async ({ page }) => {
    // Invalid capacity (empty or 0) -> alert
    await page.fill(knapsack.selectors.capacityInput, '0');
    const [invalidDialog] = await Promise.all([
      page.waitForEvent('dialog'),
      knapsack.clickSetCapacity()
    ]);
    expect(invalidDialog.message()).toContain('Please enter a valid capacity.');
    await invalidDialog.accept();

    // Now set a valid capacity, expect confirmation alert and input update
    await page.fill(knapsack.selectors.capacityInput, '10');
    const [validDialog] = await Promise.all([
      page.waitForEvent('dialog'),
      knapsack.clickSetCapacity()
    ]);
    expect(validDialog.message()).toContain('Capacity set to 10');
    await validDialog.accept();

    // Verify input value updated to 10
    const capVal = await knapsack.getCapacityInputValue();
    expect(capVal, 'Capacity input reflects the newly set capacity').toBe('10');
  });

  test('Solving the knapsack displays results, selected items, total weight and DP table', async ({ page }) => {
    // Ensure the example items and capacity (6) are present from initialization
    const preCount = await knapsack.getItemsCount();
    expect(preCount).toBeGreaterThan(0);

    // Click Solve - should compute and display results
    await knapsack.clickSolve();

    // Results panel should now be visible
    const visible = await knapsack.isResultsVisible();
    expect(visible, 'Results should be visible after solving').toBe(true);

    // The known example optimal value should be 950 for the provided example (Laptop+Camera+Headphones)
    const maxValue = await knapsack.getMaxValue();
    expect(String(maxValue).trim()).toBe('950');

    // Total weight for the chosen items should be 5
    const totalWeight = await knapsack.getTotalWeight();
    expect(String(totalWeight).trim()).toBe('5');

    // The solution items should include the expected item names
    const solutionTexts = await knapsack.getSolutionItemsText();
    // Check presence of core items by substring (order is not strictly enforced)
    const joined = solutionTexts.join('|');
    expect(joined).toContain('Laptop');
    expect(joined).toContain('Camera');
    expect(joined).toContain('Headphones');

    // DP table should be rendered and have rows equal to items.length + 1
    const dpExists = await knapsack.hasDpTable();
    expect(dpExists, 'DP table should be shown after solving').toBe(true);

    // Compare dp table row count with internal items length + 1
    const dpRows = await knapsack.getDpTableRowCount();
    const internalItemsLen = await knapsack.getInternalItemsLength();
    expect(dpRows, 'DP table should contain one header row per item + 1 for 0 items').toBe(internalItemsLen + 1);
  });

  test('Solving with no items shows alert and does not display results', async ({ page }) => {
    // Reset items to clear everything
    await knapsack.clickReset();

    // Verify internal items array is now empty
    const internalLen = await knapsack.getInternalItemsLength();
    expect(internalLen, 'Internal items should be cleared after reset').toBe(0);

    // Solve should trigger an alert asking to add at least one item
    const [dialog] = await Promise.all([
      page.waitForEvent('dialog'),
      knapsack.clickSolve()
    ]);
    expect(dialog.message()).toContain('Please add at least one item.');
    await dialog.accept();

    // Results should remain hidden
    const visible = await knapsack.isResultsVisible();
    expect(visible, 'Results should remain hidden when solving with no items').toBe(false);
  });

  test('Resetting items hides results and clears the internal list', async ({ page }) => {
    // Ensure items exist
    const before = await knapsack.getItemsCount();
    expect(before).toBeGreaterThan(0);

    // Solve first to make results visible
    await knapsack.clickSolve();
    const visibleAfterSolve = await knapsack.isResultsVisible();
    expect(visibleAfterSolve).toBe(true);

    // Now click reset and verify behavior
    await knapsack.clickReset();

    const afterCount = await knapsack.getItemsCount();
    expect(afterCount, 'Items table should be empty after reset').toBe(0);

    const visibleAfterReset = await knapsack.isResultsVisible();
    expect(visibleAfterReset, 'Results should be hidden after reset').toBe(false);

    const internalLen = await knapsack.getInternalItemsLength();
    expect(internalLen, 'Internal items array should be empty after reset').toBe(0);
  });

  test('DP table structure matches expected columns (capacity + 2 headers) after solving', async ({ page }) => {
    // Ensure capacity is set to a known small number to simplify assertion
    await page.fill(knapsack.selectors.capacityInput, '6');
    const [setDialog] = await Promise.all([
      page.waitForEvent('dialog'),
      knapsack.clickSetCapacity()
    ]);
    // Accept the simple confirmation
    await setDialog.accept();

    // Solve
    await knapsack.clickSolve();

    // Locate the DP table and assert header column count matches capacity + 2 (one item header + 0..capacity)
    const tableHandle = await page.$(`${knapsack.selectors.dpTableDiv} table`);
    expect(tableHandle).not.toBeNull();

    // Count header cells in the first row
    const headerCells = await tableHandle.$$eval('tr:first-child th', ths => ths.map(t => t.textContent.trim()));
    // headerCells length should be capacity + 2 (one "Item/Weight" + header for 0..capacity)
    const capacityVal = parseInt(await knapsack.getCapacityInputValue(), 10);
    expect(headerCells.length, 'DP table header column count should be capacity + 2').toBe(capacityVal + 2);
  });
});