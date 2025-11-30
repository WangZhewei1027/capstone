import { test, expect } from '@playwright/test';

// Test file: 2627d2f4-cd2a-11f0-bee4-a3a342d77f94-knapsack-problem.spec.js
// Application URL:
const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/2627d2f4-cd2a-11f0-bee4-a3a342d77f94.html';

// Page Object for the Knapsack application
class KnapsackPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.capacityInput = page.locator('#capacity');
    this.itemsInput = page.locator('#items');
    this.form = page.locator('#form');
    this.solveButton = page.locator('button[type="submit"]');
    this.resultBody = page.locator('#result-body');
    this.resultRows = () => this.resultBody.locator('tr');
    this.resultTable = page.locator('#result-table');
    this.pageTitle = page.locator('h1');
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async fillCapacity(value) {
    await this.capacityInput.fill(String(value));
  }

  async fillItems(value) {
    await this.itemsInput.fill(value);
  }

  async submitForm() {
    // Use the form submit via clicking the button (simulates user)
    await this.solveButton.click();
  }

  async getResultRowsCount() {
    return await this.resultRows().count();
  }

  async getResultRowData(index) {
    // index is zero-based
    const row = this.resultRows().nth(index);
    const cells = row.locator('td');
    const count = await cells.count();
    const texts = [];
    for (let i = 0; i < count; i++) {
      texts.push((await cells.nth(i).textContent())?.trim() ?? '');
    }
    return texts;
  }
}

test.describe('Knapsack Problem - End-to-End', () => {
  let consoleErrors = [];
  let pageErrors = [];

  test.beforeEach(async ({ page }) => {
    // Reset error collectors
    consoleErrors = [];
    pageErrors = [];

    // Capture console.error messages
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push({
          text: msg.text(),
          location: msg.location(),
        });
      }
    });

    // Capture page runtime errors (unhandled exceptions)
    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    // Navigate to the app before each test
    await page.goto(APP_URL);
  });

  test.afterEach(async () => {
    // After each test, assert there were no console errors or page errors.
    // This validates the app did not throw unexpected runtime errors during interactions.
    expect(consoleErrors, `Console errors occurred: ${JSON.stringify(consoleErrors, null, 2)}`).toHaveLength(0);
    expect(pageErrors, `Page errors occurred: ${pageErrors.map(e => String(e)).join('\n')}`).toHaveLength(0);
  });

  test.describe('Initial load and UI structure', () => {
    test('should load the page and show the form and empty results table', async ({ page }) => {
      // Purpose: verify the page loads and initial UI elements are present and in expected default state
      const kp = new KnapsackPage(page);
      await kp.goto();

      // Title visible
      await expect(kp.pageTitle).toBeVisible();
      await expect(kp.pageTitle).toHaveText('Knapsack Problem Solver');

      // Inputs and button exist
      await expect(kp.capacityInput).toBeVisible();
      await expect(kp.itemsInput).toBeVisible();
      await expect(kp.solveButton).toBeVisible();

      // Capacity should allow numeric input; initial value is empty
      await expect(kp.capacityInput).toHaveValue('');

      // Items input is empty
      await expect(kp.itemsInput).toHaveValue('');

      // Result table header exists
      await expect(page.locator('#result-table thead')).toBeVisible();

      // No result rows initially
      const rowsCount = await kp.getResultRowsCount();
      expect(rowsCount).toBe(0);
    });
  });

  test.describe('Valid inputs and solving', () => {
    test('should solve a simple knapsack problem and display selected items in table', async ({ page }) => {
      // Purpose: test that the solver selects the correct items and updates the DOM
      const kp = new KnapsackPage(page);
      await kp.goto();

      // Provide inputs: three items (weight,value). Capacity 5 should choose items with weights 3 and 2
      await kp.fillCapacity(5);
      await kp.fillItems('1,1;2,2;3,3');

      // Submit the form
      await kp.submitForm();

      // After solving, result table should show 2 rows corresponding to items selected
      await expect(kp.resultBody).toBeVisible();
      const rowsCount = await kp.getResultRowsCount();
      expect(rowsCount).toBe(2);

      // Check specific contents of rows. The implementation backtracks from last item to first,
      // so the first displayed row will be the item with weight 3 then weight 2.
      const firstRow = await kp.getResultRowData(0);
      expect(firstRow[0]).toBe('1'); // Item # (index in result display)
      expect(firstRow[1]).toBe('3'); // Weight
      expect(firstRow[2]).toBe('3'); // Value

      const secondRow = await kp.getResultRowData(1);
      expect(secondRow[0]).toBe('2');
      expect(secondRow[1]).toBe('2');
      expect(secondRow[2]).toBe('2');
    });

    test('should update table when solving again with different inputs', async ({ page }) => {
      // Purpose: verify repeated interactions update DOM correctly (clear previous results)
      const kp = new KnapsackPage(page);
      await kp.goto();

      // First solve
      await kp.fillCapacity(5);
      await kp.fillItems('1,1;2,2;3,3');
      await kp.submitForm();

      const firstCount = await kp.getResultRowsCount();
      expect(firstCount).toBe(2);

      // Solve another instance (different items), expect table to reflect new selection only
      await kp.fillCapacity(4);
      // Items: choose 2+2 (weights 2 and 2 values 4) when capacity 4
      await kp.fillItems('2,2;2,2;3,3');
      await kp.submitForm();

      const secondCount = await kp.getResultRowsCount();
      // Optimal: two items of weight 2 each -> 2 rows
      expect(secondCount).toBeGreaterThanOrEqual(1);
      // Verify at least one of the rows contains weight '2'
      const anyHasTwo = await (async () => {
        const c = await kp.getResultRowsCount();
        for (let i = 0; i < c; i++) {
          const row = await kp.getResultRowData(i);
          if (row[1] === '2') return true;
        }
        return false;
      })();
      expect(anyHasTwo).toBe(true);
    });
  });

  test.describe('Edge cases and robustness', () => {
    test('should produce no selected items when all items exceed capacity', async ({ page }) => {
      // Purpose: verify edge case where capacity is too small to include any item -> empty result
      const kp = new KnapsackPage(page);
      await kp.goto();

      await kp.fillCapacity(1);
      await kp.fillItems('2,10;3,20');
      await kp.submitForm();

      const rowsCount = await kp.getResultRowsCount();
      expect(rowsCount).toBe(0);
    });

    test('should handle malformed item input gracefully without throwing runtime errors', async ({ page }) => {
      // Purpose: submit malformed items string and ensure the page does not crash (no console/page errors),
      // and that the result table is cleared (no selected items)
      const kp = new KnapsackPage(page);
      await kp.goto();

      // Intentionally malformed input (non-numeric values and missing commas)
      await kp.fillCapacity(5);
      await kp.fillItems('a,b;;,;3'); // malformed entries
      await kp.submitForm();

      // Expect no rows (malformed entries become NaN and thus not selected). The page should not throw.
      const rowsCount = await kp.getResultRowsCount();
      expect(rowsCount).toBe(0);

      // Also verify inputs still retain values (user-visible)
      await expect(kp.capacityInput).toHaveValue('5');
      await expect(kp.itemsInput).toHaveValue('a,b;;,;3');
    });

    test('should respect HTML required attributes and not submit empty form fields', async ({ page }) => {
      // Purpose: ensure required attributes exist on inputs and that the UI prevents submitting when empty.
      const kp = new KnapsackPage(page);
      await kp.goto();

      // Both inputs are required in the HTML. Simulate user clicking submit with empty fields.
      await kp.capacityInput.fill('');
      await kp.itemsInput.fill('');
      await kp.solveButton.click();

      // The browser's built-in validation should prevent submission; no results should appear
      // Because Playwright simulates user clicks, HTML5 constraint validation will typically block form submission.
      const rowsCount = await kp.getResultRowsCount();
      expect(rowsCount).toBe(0);

      // Ensure the inputs are still empty
      await expect(kp.capacityInput).toHaveValue('');
      await expect(kp.itemsInput).toHaveValue('');
    });
  });

  test.describe('Accessibility and basic semantics', () => {
    test('form controls should have associated labels (basic accessibility)', async ({ page }) => {
      // Purpose: ensure inputs can be located by label text (improves accessibility)
      const kp = new KnapsackPage(page);
      await kp.goto();

      // Using getByLabelText via locator with label text
      const capacityByLabel = page.getByLabel('Max Capacity');
      const itemsByLabel = page.getByLabel('Items (format: weight,value;weight,value)');

      await expect(capacityByLabel).toBeVisible();
      await expect(itemsByLabel).toBeVisible();

      // Fill via label-located controls to simulate assistive tech usage
      await capacityByLabel.fill('5');
      await itemsByLabel.fill('1,1;4,5');

      // Submit and expect 1 selected item: weight 4 value 5
      await kp.solveButton.click();

      const rowsCount = await kp.getResultRowsCount();
      expect(rowsCount).toBe(1);
      const row = await kp.getResultRowData(0);
      expect(row[1]).toBe('4');
      expect(row[2]).toBe('5');
    });
  });
});