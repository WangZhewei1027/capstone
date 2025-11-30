import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/262784d3-cd2a-11f0-bee4-a3a342d77f94.html';

// Page Object for the adjacency matrix application
class AdjacencyMatrixPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.sizeInput = page.locator('#size');
    this.generateButton = page.locator('button', { hasText: 'Generate Matrix' });
    this.table = page.locator('#adjMatrix');
    this.tableRows = () => this.table.locator('tr');
    this.headerRow = () => this.table.locator('tr').first();
    this.checkboxes = () => this.table.locator('td input[type="checkbox"]');
  }

  async goto() {
    await this.page.goto(APP_URL);
    // Wait for the initial matrix to be generated (script runs on load)
    await this.page.waitForSelector('#adjMatrix tr');
  }

  async getSizeValue() {
    // input.value is string; return as string to reflect DOM
    return await this.sizeInput.inputValue();
  }

  async setSize(value) {
    // Replace the value in the input and trigger generation by clicking button
    await this.sizeInput.fill(String(value));
  }

  async clickGenerate() {
    await Promise.all([
      this.page.waitForSelector('#adjMatrix tr'), // ensure table is present after generation
      this.generateButton.click()
    ]);
  }

  async getRowCount() {
    return await this.tableRows().count();
  }

  async getColumnCount() {
    // Count <th> cells in the header row
    return await this.headerRow().locator('th').count();
  }

  async getCheckboxCount() {
    return await this.checkboxes().count();
  }

  async getHeaderTexts() {
    const count = await this.headerRow().locator('th').count();
    const texts = [];
    for (let i = 0; i < count; i++) {
      texts.push((await this.headerRow().locator('th').nth(i).innerText()).trim());
    }
    return texts;
  }

  async toggleCheckboxAt(index) {
    const cb = this.checkboxes().nth(index);
    await cb.click();
  }

  async isCheckboxChecked(index) {
    return await this.checkboxes().nth(index).isChecked();
  }
}

test.describe('Adjacency Matrix Application - 262784d3-cd2a-11f0-bee4-a3a342d77f94', () => {
  let pageErrors;
  let consoleErrors;

  // Attach listeners and navigate to the app before each test.
  test.beforeEach(async ({ page }) => {
    pageErrors = [];
    consoleErrors = [];

    // Capture uncaught exceptions on the page
    page.on('pageerror', (err) => {
      // Collect page errors (e.g., ReferenceError, TypeError)
      try {
        pageErrors.push(err && err.message ? String(err.message) : String(err));
      } catch (e) {
        pageErrors.push(String(err));
      }
    });

    // Capture console messages of type 'error'
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Navigate to the application and wait for the initial table to be generated
    await page.goto(APP_URL);
    await page.waitForSelector('#adjMatrix tr');
  });

  test.afterEach(async () => {
    // After each test we will not modify the page, but tests below assert on collected errors.
  });

  test('Initial page load renders header, input, button, and a generated matrix with default size', async ({ page }) => {
    // Purpose: Verify default DOM elements and that the matrix is generated on load
    const app = new AdjacencyMatrixPage(page);

    // Check header and controls
    await expect(page.locator('h1')).toHaveText('Graph Adjacency Matrix');
    await expect(app.sizeInput).toHaveValue('4'); // default as defined in HTML

    await expect(app.generateButton).toBeVisible();
    await expect(app.generateButton).toHaveText('Generate Matrix');

    // Table should have been generated with size 4 -> rows = size + 1 header
    const rowCount = await app.getRowCount();
    expect(rowCount).toBe(5); // header + 4 rows

    // Header should contain the correct number of <th> (empty + N0..N3)
    const columnCount = await app.getColumnCount();
    expect(columnCount).toBe(5); // empty + 4 node headers

    // There should be 4*4 = 16 checkboxes inside the table
    const checkboxCount = await app.getCheckboxCount();
    expect(checkboxCount).toBe(16);

    // Verify header texts include expected labels (first header cell is empty)
    const headerTexts = await app.getHeaderTexts();
    expect(headerTexts[0]).toBe(''); // empty top-left cell
    expect(headerTexts[1]).toBe('N0');
    expect(headerTexts[2]).toBe('N1');
    expect(headerTexts[3]).toBe('N2');
    expect(headerTexts[4]).toBe('N3');

    // Ensure that no page errors or console errors were captured during load
    expect(pageErrors, 'No page errors should occur during initial load').toEqual([]);
    expect(consoleErrors, 'No console error messages should be logged during initial load').toEqual([]);
  });

  test('Changing the size input and clicking Generate Matrix updates table dimensions accordingly', async ({ page }) => {
    // Purpose: Verify the user can change the matrix size and regenerate the table
    const app = new AdjacencyMatrixPage(page);

    // Change size to 2 and regenerate
    await app.setSize(2);
    await app.clickGenerate();

    // Expect rows = 1 header + 2 = 3, columns = 1 empty + 2 = 3, checkboxes = 4
    expect(await app.getRowCount()).toBe(3);
    expect(await app.getColumnCount()).toBe(3);
    expect(await app.getCheckboxCount()).toBe(4);

    // Verify headers are labeled N0, N1
    const headerTexts = await app.getHeaderTexts();
    expect(headerTexts[1]).toBe('N0');
    expect(headerTexts[2]).toBe('N1');

    // Change size to 3 and regenerate to confirm repeated operations work
    await app.setSize(3);
    await app.clickGenerate();
    expect(await app.getRowCount()).toBe(4); // header + 3 rows
    expect(await app.getColumnCount()).toBe(4); // empty + 3 headers
    expect(await app.getCheckboxCount()).toBe(9); // 3x3

    // Ensure no console or page errors occurred during these interactions
    expect(pageErrors, 'No page errors should occur when changing sizes').toEqual([]);
    expect(consoleErrors, 'No console error messages should be logged when changing sizes').toEqual([]);
  });

  test('Toggling a checkbox updates its checked state (user interaction)', async ({ page }) => {
    // Purpose: Ensure checkboxes are interactive and clicking toggles their state
    const app = new AdjacencyMatrixPage(page);

    // Ensure we have at least one checkbox
    const total = await app.getCheckboxCount();
    expect(total).toBeGreaterThan(0);

    // Pick the first checkbox, record initial state, click it, and verify toggled state
    const initial = await app.isCheckboxChecked(0);
    await app.toggleCheckboxAt(0);
    const afterClick = await app.isCheckboxChecked(0);
    expect(afterClick).toBe(!initial);

    // Click again to restore to original state and assert
    await app.toggleCheckboxAt(0);
    const afterSecondClick = await app.isCheckboxChecked(0);
    expect(afterSecondClick).toBe(initial);

    // Ensure no errors were generated by direct user interactions
    expect(pageErrors, 'No page errors should occur when interacting with checkboxes').toEqual([]);
    expect(consoleErrors, 'No console error messages should be logged when interacting with checkboxes').toEqual([]);
  });

  test('Edge cases: generating minimal (1) and large (10) matrices', async ({ page }) => {
    // Purpose: Test lower and upper bounds for the size input and ensure table behavior is correct
    const app = new AdjacencyMatrixPage(page);

    // Minimal size 1
    await app.setSize(1);
    await app.clickGenerate();
    expect(await app.getRowCount()).toBe(2); // header + one row
    expect(await app.getColumnCount()).toBe(2); // empty + N0
    expect(await app.getCheckboxCount()).toBe(1); // 1x1

    // Large size 10 (should create 10x10 = 100 checkboxes)
    await app.setSize(10);
    await app.clickGenerate();
    expect(await app.getRowCount()).toBe(11); // header + 10 rows
    expect(await app.getColumnCount()).toBe(11); // empty + N0..N9
    expect(await app.getCheckboxCount()).toBe(100); // 10x10

    // Also spot check some header labels for the 10-case
    const headerTexts = await app.getHeaderTexts();
    expect(headerTexts[1]).toBe('N0');
    expect(headerTexts[10]).toBe('N9');

    // Confirm no console or page errors for edge-case generation
    expect(pageErrors, 'No page errors should occur when generating edge-case sizes').toEqual([]);
    expect(consoleErrors, 'No console error messages should be logged when generating edge-case sizes').toEqual([]);
  });

  test('Accessibility and DOM shape checks: checkbox inputs exist in expected cells', async ({ page }) => {
    // Purpose: Verify that each table cell contains a checkbox input element and inputs are accessible via selector
    const app = new AdjacencyMatrixPage(page);

    // Use current size value to compute expectations
    const sizeValue = Number(await app.getSizeValue());
    const expectedCheckboxes = sizeValue * sizeValue;
    const count = await app.getCheckboxCount();
    expect(count).toBe(expectedCheckboxes);

    // Verify that every checkbox is indeed an input[type="checkbox"]
    const checkboxLocator = app.checkboxes();
    for (let i = 0; i < count; i++) {
      const attr = await checkboxLocator.nth(i).getAttribute('type');
      expect(attr).toBe('checkbox');
    }

    // No errors should have been logged
    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test('No unexpected console errors or page errors are produced during a sequence of interactions', async ({ page }) => {
    // Purpose: Stress test combined interactions and ensure runtime stays error-free
    const app = new AdjacencyMatrixPage(page);

    // Sequence: change sizes, toggle a few checkboxes, regenerate
    await app.setSize(5);
    await app.clickGenerate();

    // Toggle a handful of checkboxes
    const cbCount = await app.getCheckboxCount();
    const toggles = Math.min(5, cbCount);
    for (let i = 0; i < toggles; i++) {
      await app.toggleCheckboxAt(i);
    }

    // Regenerate with another size
    await app.setSize(3);
    await app.clickGenerate();

    // Final assertions about the table shape
    expect(await app.getCheckboxCount()).toBe(9);
    expect(await app.getRowCount()).toBe(4);

    // Assert that no console errors or page errors were observed during the sequence
    expect(pageErrors, 'No page errors should occur during combined interactions').toEqual([]);
    expect(consoleErrors, 'No console error messages should be logged during combined interactions').toEqual([]);
  });
});