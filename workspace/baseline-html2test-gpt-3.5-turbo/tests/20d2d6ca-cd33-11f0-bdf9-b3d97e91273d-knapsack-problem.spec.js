import { test, expect } from '@playwright/test';

// Page Object for the Knapsack app to encapsulate interactions and queries
class KnapsackPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.capacityInput = page.locator('#capacityInput');
    this.itemsBody = page.locator('#itemsBody');
    this.addItemBtn = page.locator('#addItemBtn');
    this.solveBtn = page.locator('#solveBtn');
    this.resultDiv = page.locator('#result');
    this.errorDiv = page.locator('#error');
    this.itemNameInput = page.locator('#itemNameInput');
    this.itemWeightInput = page.locator('#itemWeightInput');
    this.itemValueInput = page.locator('#itemValueInput');
    this.itemsTableRows = () => this.itemsBody.locator('tr');
  }

  async goto() {
    await this.page.goto('http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/20d2d6ca-cd33-11f0-bdf9-b3d97e91273d.html');
    // Wait for initial render of items
    await expect(this.itemsBody).toBeVisible();
  }

  async getTitleText() {
    return this.page.locator('h1').textContent();
  }

  async getCapacityValue() {
    return Number(await this.capacityInput.inputValue());
  }

  async setCapacity(value) {
    await this.capacityInput.fill(String(value));
    // blur to ensure change is committed
    await this.capacityInput.blur();
  }

  async getItemsCount() {
    // rows may include the 'no items' placeholder row
    return await this.itemsTableRows().count();
  }

  async getItemsText() {
    const rows = this.itemsTableRows();
    const n = await rows.count();
    const arr = [];
    for (let i = 0; i < n; i++) {
      const cells = rows.nth(i).locator('td');
      const cellTexts = await Promise.all([
        cells.nth(0).textContent(),
        cells.nth(1).textContent(),
        cells.nth(2).textContent(),
        cells.nth(3).textContent()
      ]);
      arr.push(cellTexts.map(s => s && s.trim()).join('|'));
    }
    return arr;
  }

  async addItem(name, weight, value) {
    await this.itemNameInput.fill(name);
    await this.itemWeightInput.fill(String(weight));
    await this.itemValueInput.fill(String(value));
    await this.addItemBtn.click();
  }

  async clickRemoveAt(rowIndex) {
    // rowIndex is 0-based in the current visible rows
    const row = this.itemsTableRows().nth(rowIndex);
    const removeBtn = row.locator('button[title="Remove item"]');
    await removeBtn.click();
  }

  async solve() {
    await this.solveBtn.click();
  }

  async getResultHtml() {
    return this.resultDiv.innerHTML();
  }

  async getResultText() {
    return this.resultDiv.textContent();
  }

  async getErrorText() {
    return this.errorDiv.textContent();
  }
}

// Capture console errors and page errors for each test run
test.describe('Knapsack Problem Demo - End-to-end', () => {
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Collect console error messages
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push({ text: msg.text(), location: msg.location() });
      }
    });

    // Collect unhandled page errors
    page.on('pageerror', error => {
      pageErrors.push(error);
    });
  });

  test.describe('Initial load and default state', () => {
    test('should load the page and render default elements correctly', async ({ page }) => {
      const app = new KnapsackPage(page);
      // Navigate to the test URL
      await app.goto();

      // Verify page title and heading
      await expect(page).toHaveTitle(/Knapsack Problem Demo/);
      const heading = await app.getTitleText();
      expect(heading).toContain('0/1 Knapsack Problem Solver');

      // Capacity input should have default value 50
      expect(await app.getCapacityValue()).toBe(50);

      // Default items list should contain the seeded 3 items
      const rows1 = await app.getItemsCount();
      // There should be 3 rows (one per seeded item)
      expect(rows).toBe(3);

      // Result and error areas should be empty initially
      expect(await app.getResultText()).toBe('');
      expect((await app.getErrorText()).trim()).toBe('');

      // Ensure no console errors or page errors occurred during load
      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
    });
  });

  test.describe('Adding items and validation behavior', () => {
    test('should add a valid item and clear inputs', async ({ page }) => {
      const app1 = new KnapsackPage(page);
      await app.goto();

      const before = await app.getItemsCount();
      // Add new valid item
      await app.addItem('New Gadget', 5, 42);

      // Row count should increase by 1
      expect(await app.getItemsCount()).toBe(before + 1);

      // The last row should contain the new item details
      const texts = await app.getItemsText();
      const last = texts[texts.length - 1];
      expect(last).toContain('New Gadget');
      expect(last).toContain('5');
      expect(last).toContain('42');

      // Inputs should be cleared after adding
      expect(await app.itemNameInput.inputValue()).toBe('');
      expect(await app.itemWeightInput.inputValue()).toBe('');
      expect(await app.itemValueInput.inputValue()).toBe('');

      // No error message should be shown
      expect((await app.getErrorText()).trim()).toBe('');

      // No console/page errors
      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
    });

    test('should show error when adding item with empty name', async ({ page }) => {
      const app2 = new KnapsackPage(page);
      await app.goto();

      // Attempt to add invalid item with empty name
      await app.addItem('', 10, 20);

      // Error area should show appropriate message
      const error = (await app.getErrorText()).trim();
      expect(error).toBe('Item name cannot be empty.');

      // No console/page errors beyond this expected client-side validation
      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
    });

    test('should show error when adding item with invalid weight', async ({ page }) => {
      const app3 = new KnapsackPage(page);
      await app.goto();

      // Negative weight
      await app.addItem('BadWeight', -3, 10);
      expect((await app.getErrorText()).trim()).toBe('Item weight must be a positive integer.');

      // Non-integer weight via decimal value (the UI is number type but we can set it)
      await app.itemNameInput.fill('DecimalWeight');
      await app.itemWeightInput.fill('2.5');
      await app.itemValueInput.fill('10');
      await app.addItemBtn.click();
      // The app's validation uses Number.isInteger -> should catch decimals
      expect((await app.getErrorText()).trim()).toBe('Item weight must be a positive integer.');

      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
    });

    test('should show error when adding item with negative value', async ({ page }) => {
      const app4 = new KnapsackPage(page);
      await app.goto();

      await app.addItem('BadValue', 3, -1);
      expect((await app.getErrorText()).trim()).toBe('Item value must be an integer 0 or greater.');

      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
    });
  });

  test.describe('Removing items and edge cases', () => {
    test('should remove an item and update the list and indices', async ({ page }) => {
      const app5 = new KnapsackPage(page);
      await app.goto();

      // Ensure there are initial items
      const initialCount = await app.getItemsCount();
      expect(initialCount).toBeGreaterThanOrEqual(1);

      // Remove the first item
      await app.clickRemoveAt(0);

      // Item count should have decreased by 1
      expect(await app.getItemsCount()).toBe(initialCount - 1);

      // The index column should be updated to start at 1 and be continuous
      const texts1 = await app.getItemsText();
      // Check first row index equals '1'
      const firstRow = texts[0]; // format like '1|Item 2|20|100' or the placeholder
      expect(firstRow.startsWith('1|')).toBeTruthy();

      // Result area should be cleared after removal as the UI code sets resultDiv.textContent = ''
      expect(await app.getResultText()).toBe('');

      // No console/page errors
      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
    });

    test('should show "Please add at least one item." when solving with no items', async ({ page }) => {
      const app6 = new KnapsackPage(page);
      await app.goto();

      // Remove all items one by one
      let count = await app.getItemsCount();
      // If the table shows 'No items added...' placeholder, count will be 1 but the placeholder row has colspan 5.
      // We will attempt removing up to 10 times, clicking remove on first row when a remove button exists.
      for (let i = 0; i < 10 && count > 0; i++) {
        const row1 = app.itemsTableRows().nth(0);
        // Check if the first row contains a remove button
        const hasRemove = await row.locator('button[title="Remove item"]').count();
        if (hasRemove) {
          await app.clickRemoveAt(0);
        } else {
          // No remove button -> it is the placeholder 'No items added...' row
          break;
        }
        count = await app.getItemsCount();
      }

      // Now click solve, expecting a validation error about at least one item
      await app.solve();
      expect((await app.getErrorText()).trim()).toBe('Please add at least one item.');

      // No console/page errors
      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
    });
  });

  test.describe('Solving the knapsack and validating results', () => {
    test('should compute the optimal selection for the seeded example (value 220)', async ({ page }) => {
      const app7 = new KnapsackPage(page);
      await app.goto();

      // Ensure seeded items are present (Item 1, Item 2, Item 3)
      const items = await app.getItemsText();
      expect(items.some(t => t.includes('Item 1'))).toBeTruthy();
      expect(items.some(t => t.includes('Item 2'))).toBeTruthy();
      expect(items.some(t => t.includes('Item 3'))).toBeTruthy();

      // Solve using default capacity 50
      await app.solve();

      // Validate result contains the expected optimal value and selected items
      const resultHtml = await app.getResultHtml();
      const resultText = await app.getResultText();

      expect(resultHtml).toContain('Optimal value: 220');
      expect(resultHtml).toContain('Total weight used:');
      expect(resultHtml).toContain('Selected items:');
      // Total weight should be 50 / 50
      expect(resultText).toContain('50 / 50');
      // Selected items should include Item 2 and Item 3
      expect(resultText).toContain('Item 2 (w:20, v:100)').toBeTruthy();
      expect(resultText).toContain('Item 3 (w:30, v:120)').toBeTruthy();
      // Timing note should be present
      expect(resultHtml).toMatch(/Computed in \d+\.\d{2} ms/);

      // No console/page errors
      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
    });

    test('should show capacity validation error when capacity is invalid before solving', async ({ page }) => {
      const app8 = new KnapsackPage(page);
      await app.goto();

      // Set capacity to 0 (invalid)
      await app.setCapacity(0);
      await app.solve();

      // Should show capacity error
      expect((await app.getErrorText()).trim()).toBe('Knapsack capacity must be a positive integer.');

      // Result should remain empty
      expect(await app.getResultText()).toBe('');

      // No console/page errors
      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
    });
  });

  test.afterEach(async () => {
    // Final sanity: ensure no unexpected runtime errors were emitted during the test.
    // If there were page or console errors, include them in the assertion failure message to aid debugging.
    if (consoleErrors.length > 0 || pageErrors.length > 0) {
      const errorSummary = [
        `consoleErrors: ${JSON.stringify(consoleErrors, null, 2)}`,
        `pageErrors: ${pageErrors.map(e => e.message).join('; ')}`
      ].join('\n');
      // Fail the test by throwing with detailed info
      throw new Error(`Unexpected page/runtime errors detected:\n${errorSummary}`);
    }
  });
});