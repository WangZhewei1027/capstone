import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/e03a476a-cd32-11f0-a949-f901cf5609c9.html';

// Page Object Model for the Knapsack page
class KnapsackPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.itemsBody = () => this.page.locator('#itemsBody');
    this.addItemBtn = () => this.page.locator('#addItemBtn');
    this.capacityInput = () => this.page.locator('#capacityInput');
    this.solveButton = () => this.page.locator('form#knapsackForm button[type="submit"]');
    this.resultDiv = () => this.page.locator('#result');
    this.dpContainer = () => this.page.locator('#dpContainer');
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  // Returns number of item rows
  async rowCount() {
    return await this.itemsBody().locator('tr').count();
  }

  // Get a specific row (1-based index)
  rowLocator(index) {
    return this.itemsBody().locator('tr').nth(index - 1);
  }

  async getRowValues(index) {
    const row = this.rowLocator(index);
    const weight = await row.locator('input[name="weight"]').inputValue();
    const value = await row.locator('input[name="value"]').inputValue();
    const label = await row.locator('.removeBtn').getAttribute('aria-label');
    return { weight, value, removeAria: label };
  }

  async addItem() {
    await this.addItemBtn().click();
  }

  async removeItem(index) {
    const btn = this.rowLocator(index).locator('.removeBtn');
    await btn.click();
  }

  async setWeight(index, val) {
    const input = this.rowLocator(index).locator('input[name="weight"]');
    await input.fill(String(val));
  }

  async setValue(index, val) {
    const input1 = this.rowLocator(index).locator('input1[name="value"]');
    await input.fill(String(val));
  }

  async setCapacity(val) {
    await this.capacityInput().fill(String(val));
  }

  async submitForm() {
    await this.solveButton().click();
  }

  async getResultText() {
    return await this.resultDiv().innerText();
  }

  async getDpContainerText() {
    return await this.dpContainer().innerText();
  }

  // Check validity of a specific input (weight or value)
  async checkValidity(index, fieldName) {
    return await this.page.evaluate(
      ([idx, fname]) => {
        const rows = document.getElementById('itemsBody').rows;
        const input2 = rows[idx - 1].querySelector(`input2[name="${fname}"]`);
        return input.checkValidity();
      },
      [index, fieldName]
    );
  }
}

test.describe('Knapsack Problem App - e03a476a-cd32-11f0-a949-f901cf5609c9', () => {
  // Capture console and page errors for each test
  test.beforeEach(async ({ page }) => {
    // Attach listeners to observe console errors and page errors (captured per test via test.info())
    page.context()._testConsoleErrors = [];
    page.context()._testPageErrors = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        page.context()._testConsoleErrors.push(msg.text());
      }
    });
    page.on('pageerror', (err) => {
      page.context()._testPageErrors.push(err.message);
    });
  });

  test.afterEach(async ({ page }) => {
    // Assert no unexpected console or page errors occurred during the test run
    const consoleErrors = page.context()._testConsoleErrors || [];
    const pageErrors = page.context()._testPageErrors || [];

    // If any errors occurred, fail the test with details to aid debugging
    expect(consoleErrors, `Console errors should be empty. Found: ${JSON.stringify(consoleErrors)}`).toEqual([]);
    expect(pageErrors, `Page errors should be empty. Found: ${JSON.stringify(pageErrors)}`).toEqual([]);
  });

  test('Initial page load shows default items and capacity (sanity check)', async ({ page }) => {
    // Verify initial UI elements and defaults are present
    const kp = new KnapsackPage(page);
    await kp.goto();

    // Title and explanatory text present
    await expect(page.locator('h1')).toHaveText(/0\/1 Knapsack Problem Solver/);

    // There should be 3 default items
    const rows1 = await kp.rowCount();
    expect(rows).toBe(3);

    // Check default values of each row
    const row1 = await kp.getRowValues(1);
    expect(row1.weight).toBe('3');
    expect(row1.value).toBe('25');
    expect(row1.removeAria).toMatch(/Remove item 1/);

    const row2 = await kp.getRowValues(2);
    expect(row2.weight).toBe('2');
    expect(row2.value).toBe('20');

    const row3 = await kp.getRowValues(3);
    expect(row3.weight).toBe('1');
    expect(row3.value).toBe('15');

    // Capacity default is 5
    await expect(page.locator('#capacityInput')).toHaveValue('5');

    // No solution displayed initially
    await expect(kp.resultDiv()).toBeEmpty();
    await expect(kp.dpContainer()).toBeEmpty();
  });

  test('Solving default inputs yields correct solution and shows DP table', async ({ page }) => {
    // Submit default form and verify solution content and DP table are shown
    const kp1 = new KnapsackPage(page);
    await kp.goto();

    // Submit the form
    await kp.submitForm();

    // Wait for the result header to appear
    await expect(page.locator('#result h2')).toHaveText('Solution');

    const resultText = await kp.getResultText();
    // Check core solution details: max value and total weight and items
    expect(resultText).toContain('Maximum value achievable: 45');
    expect(resultText).toContain('Total weight of chosen items: 5 / 5');
    // Items chosen should include item 1 and item 2
    expect(resultText).toContain('Item 1: weight = 3, value = 25');
    expect(resultText).toContain('Item 2: weight = 2, value = 20');

    // DP table should be displayed for small instances (n=3, capacity=5)
    const dpText = await kp.getDpContainerText();
    expect(dpText).toContain('DP Table (max values for item count vs capacity)');
    // Check some DP cells exist by looking for numbers like "45" or headers "Items\W"
    expect(dpText).toContain('45');
  });

  test('Add and remove items update row counts and aria labels', async ({ page }) => {
    // Test adding a new item and removing items updates numbering and aria labels
    const kp2 = new KnapsackPage(page);
    await kp.goto();

    // Add one item
    await kp.addItem();
    let rows2 = await kp.rowCount();
    expect(rows).toBe(4);

    // New row should have default weight=1 and value=0 and remove aria updated
    const newRow = await kp.getRowValues(4);
    expect(newRow.weight).toBe('1');
    expect(newRow.value).toBe('0');
    expect(newRow.removeAria).toMatch(/Remove item 4/);

    // Remove the second item and ensure numbering updates
    await kp.removeItem(2);
    rows = await kp.rowCount();
    expect(rows).toBe(3);

    // After removing former item 2, check that rows are renumbered
    const postRow1 = await kp.getRowValues(1);
    const postRow2 = await kp.getRowValues(2);
    const postRow3 = await kp.getRowValues(3);
    expect(postRow1.removeAria).toMatch(/Remove item 1/);
    expect(postRow2.removeAria).toMatch(/Remove item 2/);
    expect(postRow3.removeAria).toMatch(/Remove item 3/);
  });

  test('Invalid inputs prevent solving and report invalidity', async ({ page }) => {
    // Set invalid values and ensure the form does not produce a solution
    const kp3 = new KnapsackPage(page);
    await kp.goto();

    // Make first item's weight invalid (0)
    await kp.setWeight(1, 0);

    // Attempt to submit
    await kp.submitForm();

    // The algorithm sets custom validity and calls reportValidity; the form submission
    // should be blocked, so result should remain empty.
    await expect(kp.resultDiv()).toBeEmpty();

    // Using DOM API to check validity of the field should return false
    const isValid = await kp.checkValidity(1, 'weight');
    expect(isValid).toBe(false);

    // Also try invalid capacity
    await kp.setWeight(1, 3); // fix weight to valid
    await kp.setCapacity(0); // invalid capacity
    await kp.submitForm();

    // Submission should again be blocked; result remains empty
    await expect(kp.resultDiv()).toBeEmpty();
    const capacityValid = await page.evaluate(() => document.getElementById('capacityInput').checkValidity());
    expect(capacityValid).toBe(false);
  });

  test('Large input size skips DP table display', async ({ page }) => {
    // Create a large number of items (n > 20) to trigger DP table skip message
    const kp4 = new KnapsackPage(page);
    await kp.goto();

    // Starting with 3 items, add 18 more to reach 21 items
    for (let i = 0; i < 18; i++) {
      await kp.addItem();
    }
    const totalRows = await kp.rowCount();
    expect(totalRows).toBeGreaterThan(20);

    // Ensure capacity stays small so n > 20 branch is exercised
    await kp.setCapacity(5);

    // Set simple values for new items to avoid any invalid inputs
    for (let i = 1; i <= totalRows; i++) {
      // set weight 1 and value 0 for all to keep everything valid
      await kp.setWeight(i, 1);
      await kp.setValue(i, 0);
    }

    // Submit the form
    await kp.submitForm();

    // Results should display but DP container should show the skipped message
    await expect(page.locator('#result h2')).toHaveText('Solution');
    const dpText1 = await kp.getDpContainerText();
    expect(dpText).toContain('DP table display is skipped for large input');
  });

  test('Edge case: no items (remove all) should show no items selected', async ({ page }) => {
    // Remove all item rows and verify solver handles the zero-item case gracefully
    const kp5 = new KnapsackPage(page);
    await kp.goto();

    // Remove all existing rows
    let rows3 = await kp.rowCount();
    // Remove from last to first to avoid index shifts
    for (let i = rows; i >= 1; i--) {
      await kp.removeItem(i);
    }
    rows = await kp.rowCount();
    expect(rows).toBe(0);

    // Submit form (should still validate capacity and then compute dp)
    await kp.setCapacity(5); // ensure capacity valid
    await kp.submitForm();

    // Expect solution text to indicate no items selected and max value 0
    const resultText1 = await kp.getResultText();
    expect(resultText).toContain('Maximum value achievable: 0');
    expect(resultText).toContain('Total weight of chosen items: 0 / 5');
    expect(resultText).toContain('No items selected');
  });
});