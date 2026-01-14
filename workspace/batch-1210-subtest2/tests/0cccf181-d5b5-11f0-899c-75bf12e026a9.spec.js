import { test, expect } from '@playwright/test';

const APP_URL = "http://127.0.0.1:5500/workspace/batch-1210-subtest2 /html/0cccf181-d5b5-11f0-899c-75bf12e026a9.html";

/**
 * Page Object for the Knapsack demo application
 */
class KnapsackPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.itemsContainer = page.locator('#itemsContainer');
    this.addItemBtn = page.locator('#addItemBtn');
    this.solveBtn = page.locator('#solveBtn');
    this.capacityInput = page.locator('#capacity');
    this.resultDiv = page.locator('#result');
    this.dpTableContainer = page.locator('#dpTableContainer');
  }

  async goto() {
    await this.page.goto(APP_URL, { waitUntil: 'load' });
    // wait for initial renderItems to populate items container
    await expect(this.itemsContainer).toBeVisible();
  }

  async getItemsCount() {
    return await this.itemsContainer.locator('.item-row').count();
  }

  async addItem() {
    await this.addItemBtn.click();
  }

  async removeItemAt(index) {
    // Each .item-row has a Remove button with dataset.index
    const rows = this.itemsContainer.locator('.item-row');
    const count = await rows.count();
    if (index < 0 || index >= count) throw new Error('index out of range');
    const row = rows.nth(index);
    const delBtn = row.locator('button', { hasText: 'Remove' });
    await delBtn.click();
  }

  async setItemWeight(index, value) {
    const row = this.itemsContainer.locator('.item-row').nth(index);
    const wInput = row.locator("input[data-type='weight']");
    await wInput.fill(String(value));
    // trigger input event by focusing out
    await wInput.press('Tab');
  }

  async setItemValue(index, value) {
    const row = this.itemsContainer.locator('.item-row').nth(index);
    const vInput = row.locator("input[data-type='value']");
    await vInput.fill(String(value));
    await vInput.press('Tab');
  }

  async getItemWeight(index) {
    const row = this.itemsContainer.locator('.item-row').nth(index);
    const wInput = row.locator("input[data-type='weight']");
    return Number(await wInput.inputValue());
  }

  async getItemValue(index) {
    const row = this.itemsContainer.locator('.item-row').nth(index);
    const vInput = row.locator("input[data-type='value']");
    return Number(await vInput.inputValue());
  }

  async setCapacity(value) {
    await this.capacityInput.fill(String(value));
    await this.capacityInput.press('Tab');
  }

  async clickSolve() {
    await this.solveBtn.click();
  }

  async getResultHtml() {
    return await this.resultDiv.innerHTML();
  }

  async dpTableExists() {
    return (await this.dpTableContainer.locator('table').count()) > 0;
  }
}

test.describe('Knapsack Problem Demo - FSM and UI tests', () => {
  let consoleMessages = [];
  let consoleErrors = [];
  let pageErrors = [];
  let lastDialog = null;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    consoleErrors = [];
    pageErrors = [];
    lastDialog = null;

    // Listen to console messages and page errors so tests can assert on them
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      consoleMessages.push({ type, text });
      if (type === 'error') consoleErrors.push({ type, text });
    });

    page.on('pageerror', exception => {
      // Uncaught exceptions will be captured here
      pageErrors.push(exception);
    });

    page.on('dialog', async dialog => {
      // capture last dialog and accept it to allow flow to continue (alerts used for validation)
      lastDialog = dialog;
      await dialog.accept();
    });

    // Navigate to the app (load initial state S0_Idle)
    await page.goto(APP_URL, { waitUntil: 'load' });
  });

  test.afterEach(async () => {
    // Sanity assertions about unexpected runtime errors after each test
    // The implementation instructs observing console logs and page errors. We assert there were no uncaught page errors
    expect(pageErrors.length, `No uncaught page errors expected but found: ${pageErrors.map(e=>String(e)).join(', ')}`).toBe(0);
    // Also assert no console error messages were emitted
    expect(consoleErrors.length, `No console.error messages expected but found: ${consoleErrors.map(e=>e.text).join('; ')}`).toBe(0);
  });

  test('S0_Idle: Initial render shows default items and capacity', async ({ page }) => {
    // Validate initial state S0_Idle entry action renderItems() effected DOM
    const app = new KnapsackPage(page);

    // Expect items to be present (initial 5 items from implementation)
    const count = await app.getItemsCount();
    expect(count).toBe(5);

    // Validate first and last items match initial data (spot check)
    const firstWeight = await app.getItemWeight(0);
    const firstValue = await app.getItemValue(0);
    expect(firstWeight).toBe(3);
    expect(firstValue).toBe(25);

    const lastWeight = await app.getItemWeight(4);
    const lastValue = await app.getItemValue(4);
    expect(lastWeight).toBe(5);
    expect(lastValue).toBe(50);

    // Capacity input default should be 10
    const capacityVal = Number(await page.locator('#capacity').inputValue());
    expect(capacityVal).toBe(10);

    // Result and DP containers should be initially empty
    await expect(page.locator('#result')).toBeEmpty();
    await expect(page.locator('#dpTableContainer')).toBeEmpty();
  });

  test('S1_ItemAdded: Clicking Add Item pushes a new item and re-renders', async ({ page }) => {
    // This test validates the AddItem event and transition S0 -> S1 (entry_actions renderItems())
    const app = new KnapsackPage(page);

    const before = await app.getItemsCount();
    await app.addItem();

    const after = await app.getItemsCount();
    expect(after).toBe(before + 1);

    // New item should have default weight 1 and value 0
    const newIndex = after - 1;
    const w = await app.getItemWeight(newIndex);
    const v = await app.getItemValue(newIndex);
    expect(w).toBe(1);
    expect(v).toBe(0);

    // Ensure DOM updated (renderItems() called implicitly as part of click handler).
    const row = page.locator('#itemsContainer .item-row').nth(newIndex);
    await expect(row).toBeVisible();
  });

  test('InputChange: Editing item inputs updates underlying values and transitions back to Idle', async ({ page }) => {
    // This test validates InputChange event and transition S1 -> S0
    const app = new KnapsackPage(page);

    // Add one item to ensure we have a target to edit
    await app.addItem();
    const idx = (await app.getItemsCount()) - 1;

    // Change weight and value
    await app.setItemWeight(idx, 7);
    await app.setItemValue(idx, 123);

    // After input, the inputs should reflect changes (items array updated via event listener)
    const weight = await app.getItemWeight(idx);
    const value = await app.getItemValue(idx);
    expect(weight).toBe(7);
    expect(value).toBe(123);
  });

  test('S2_ItemRemoved: Removing an item updates DOM and items count', async ({ page }) => {
    // This test validates RemoveItem event and transition S1 -> S2
    const app = new KnapsackPage(page);

    // Ensure at least one removable item exists
    const initial = await app.getItemsCount();
    expect(initial).toBeGreaterThan(0);

    // Remove the second item (index 1) and verify count decreases
    await app.removeItemAt(1);
    const after = await app.getItemsCount();
    expect(after).toBe(initial - 1);

    // Also validate that remove caused a re-render (no item with previous index content)
    if (after > 0) {
      // verify index 1 now contains what used to be index 2 (best-effort check by ensuring there is still an item-row)
      await expect(page.locator('#itemsContainer .item-row')).toBeVisible();
    }
  });

  test('S3_Solving -> S4_ResultDisplayed: Solving knapsack shows result and DP table', async ({ page }) => {
    // This test validates clicking SolveKnapsack (S0 -> S3) and subsequent render of result & DP table (S3 -> S4)
    const app = new KnapsackPage(page);

    // Ensure capacity is reasonable
    await app.setCapacity(10);

    // Click solve
    await app.clickSolve();

    // After solving, resultDiv should contain Maximum Value
    const resultHtml = await app.getResultHtml();
    expect(resultHtml).toContain('Maximum Value');

    // The chosen items list should be present or a message about no items
    const resultText = await page.locator('#result').innerText();
    expect(resultText.length).toBeGreaterThan(0);

    // DP table should be rendered with a table element in dpTableContainer
    const hasTable = await app.dpTableExists();
    expect(hasTable).toBe(true);

    // Basic sanity checks on DP table: header contains capacities
    const headerCells = page.locator('#dpTableContainer table tr').first().locator('th');
    const headerCount = await headerCells.count();
    // There should be at least capacity+2 header cells (label + capacities 0..capacity)
    expect(headerCount).toBeGreaterThanOrEqual(2);
  });

  test('Edge case: Invalid capacity (<=0) triggers validation alert and prevents solving', async ({ page }) => {
    // This tests the validation path that should produce an alert dialog
    const app = new KnapsackPage(page);

    // Set capacity to 0 (invalid)
    await app.setCapacity(0);

    // Reset lastDialog
    let capturedDialog = null;
    page.on('dialog', d => {
      capturedDialog = d;
      d.accept();
    });

    // Click solve, should open alert with validation message
    await app.clickSolve();

    // We expect an alert dialog to have been triggered
    expect(capturedDialog, 'Expected an alert dialog for invalid capacity').not.toBeNull();
    if (capturedDialog) {
      // Check the message text matches the validation message in implementation
      expect(capturedDialog.message()).toContain('Please enter a positive knapsack capacity.');
    }
  });

  test('Edge case: No items triggers validation alert when solving', async ({ page }) => {
    // Remove all items and attempt to solve
    const app = new KnapsackPage(page);

    // Remove items until none left
    let count = await app.getItemsCount();
    while (count > 0) {
      // Always remove at index 0
      await app.removeItemAt(0);
      count = await app.getItemsCount();
    }
    expect(await app.getItemsCount()).toBe(0);

    // Capture dialog
    let capturedDialog = null;
    page.on('dialog', d => {
      capturedDialog = d;
      d.accept();
    });

    // Click solve - should trigger "Please add at least one item."
    await app.clickSolve();
    expect(capturedDialog, 'Expected an alert dialog when solving with no items').not.toBeNull();
    if (capturedDialog) {
      expect(capturedDialog.message()).toContain('Please add at least one item.');
    }
  });

  test('Edge case: Invalid item weight/value triggers validation alert when solving', async ({ page }) => {
    // Add an item with invalid weight (0) to trigger validation
    const app = new KnapsackPage(page);

    // Ensure at least one item exists
    if ((await app.getItemsCount()) === 0) {
      await app.addItem();
    }

    // Set first item's weight to 0 which is invalid per validation
    await app.setItemWeight(0, 0);

    // Capture dialog
    let capturedDialog = null;
    page.on('dialog', d => {
      capturedDialog = d;
      d.accept();
    });

    // Attempt to solve
    await app.clickSolve();

    // Expect an alert about invalid weights/values
    expect(capturedDialog, 'Expected an alert dialog for invalid item weights/values').not.toBeNull();
    if (capturedDialog) {
      expect(capturedDialog.message()).toContain('Please enter valid weights and values for all items.');
    }
  });
});