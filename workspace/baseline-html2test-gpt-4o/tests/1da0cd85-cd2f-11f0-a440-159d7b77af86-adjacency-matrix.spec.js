import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/1da0cd85-cd2f-11f0-a440-159d7b77af86.html';

// Page object for the adjacency matrix page
class MatrixPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.containerSelector = '#matrix-container';
    this.buttonSelector = 'button:has-text("Generate Random Matrix")';
    this.tableSelector = `${this.containerSelector} table`;
  }

  // Navigate to the page
  async goto() {
    await this.page.goto(APP_URL);
  }

  // Click the Generate Random Matrix button
  async clickGenerate() {
    await this.page.click(this.buttonSelector);
  }

  // Return the raw HTML content of the matrix container
  async getContainerHTML() {
    return await this.page.$eval(this.containerSelector, el => el.innerHTML.trim());
  }

  // Wait for a table to appear in the matrix container
  async waitForTable() {
    await this.page.waitForSelector(this.tableSelector);
    return await this.page.$(this.tableSelector);
  }

  // Count header columns (th in thead)
  async getHeaderCount() {
    return await this.page.$$eval(`${this.tableSelector} thead th`, ths => ths.length);
  }

  // Get header text values as array
  async getHeaderTexts() {
    return await this.page.$$eval(`${this.tableSelector} thead th`, ths => ths.map(t => t.textContent.trim()));
  }

  // Count body rows
  async getBodyRowCount() {
    return await this.page.$$eval(`${this.tableSelector} tbody tr`, trs => trs.length);
  }

  // Count total td cells in tbody
  async getTDCount() {
    return await this.page.$$eval(`${this.tableSelector} tbody td`, tds => tds.length);
  }

  // Get all td texts (flattened)
  async getAllTDTexts() {
    return await this.page.$$eval(`${this.tableSelector} tbody td`, tds => tds.map(td => td.textContent.trim()));
  }

  // Count the number of tables in the container (should be 0 or 1)
  async getTableCount() {
    return await this.page.$$eval(this.containerSelector + ' table', tables => tables.length);
  }

  // Check if the generate button is visible and enabled
  async isGenerateVisible() {
    const btn = await this.page.$(this.buttonSelector);
    if (!btn) return false;
    return await btn.isVisible();
  }

  async isGenerateEnabled() {
    const btn = await this.page.$(this.buttonSelector);
    if (!btn) return false;
    return await btn.isEnabled();
  }
}

test.describe('Adjacency Matrix Visualization - End-to-end', () => {
  // Collect console errors and page errors for each test to assert no unexpected runtime errors occur
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Record console messages of type 'error'
    page.on('console', msg => {
      try {
        if (msg.type() === 'error') {
          consoleErrors.push({
            text: msg.text(),
            location: msg.location()
          });
        }
      } catch {
        // ignore any instrumentation error from Playwright API
      }
    });

    // Record unhandled page errors
    page.on('pageerror', error => {
      try {
        pageErrors.push(error && error.message ? error.message : String(error));
      } catch {
        // ignore
      }
    });

    // Navigate to the application page
    await page.goto(APP_URL);
  });

  test.afterEach(async () => {
    // After each test, ensure there were no console/page errors during the interactions by default.
    // Tests that expect errors should explicitly assert otherwise.
    expect(consoleErrors, 'No console.error messages should be emitted during the test').toEqual([]);
    expect(pageErrors, 'No uncaught page errors should occur during the test').toEqual([]);
  });

  test('Initial load: heading, instructions, button exist and matrix container is empty', async ({ page }) => {
    // Purpose: Verify the initial state of the page before any interaction
    const matrixPage = new MatrixPage(page);

    // Verify page heading exists and contains expected text
    const heading = await page.locator('h1');
    await expect(heading).toHaveText('Adjacency Matrix Visualization');

    // Verify descriptive paragraph is present
    const paragraph = await page.locator('p');
    await expect(paragraph).toContainText('Below is an example of an adjacency matrix');

    // Verify the Generate button is visible and enabled
    expect(await matrixPage.isGenerateVisible()).toBe(true);
    expect(await matrixPage.isGenerateEnabled()).toBe(true);

    // Verify the matrix container is present and initially empty
    const containerHTML = await matrixPage.getContainerHTML();
    expect(containerHTML === '' || containerHTML === '\n' || containerHTML === '<!-- -->').toBeTruthy();
  });

  test('Clicking Generate Random Matrix creates a 5x5 matrix table with expected structure', async ({ page }) => {
    // Purpose: Validate that clicking the button produces a table with correct dimensions and content format
    const matrixPage = new MatrixPage(page);

    // Click the button to generate the matrix
    await matrixPage.clickGenerate();

    // Wait for the table to appear
    await matrixPage.waitForTable();

    // Header: there should be 6 th elements in the thead (one empty header cell + 5 node headers)
    const headerCount = await matrixPage.getHeaderCount();
    expect(headerCount).toBe(6);

    // Header texts should contain an empty/label first cell and Node 0..4
    const headerTexts = await matrixPage.getHeaderTexts();
    expect(headerTexts.length).toBe(6);
    // First header cell is expected to be empty string (the implementation uses '<th></th>')
    expect(headerTexts[0]).toBe(''); // confirm the empty corner cell
    // Remaining headers should follow "Node 0" ... "Node 4"
    for (let i = 1; i < headerTexts.length; i++) {
      expect(headerTexts[i]).toBe(`Node ${i - 1}`);
    }

    // Body rows should be 5 (Node 0 .. Node 4)
    const rowCount = await matrixPage.getBodyRowCount();
    expect(rowCount).toBe(5);

    // Total td count should be 25 (5x5 adjacency entries)
    const tdCount = await matrixPage.getTDCount();
    expect(tdCount).toBe(25);

    // Each td should be either '0' or '1'
    const tdTexts = await matrixPage.getAllTDTexts();
    for (const text of tdTexts) {
      expect(['0', '1']).toContain(text);
    }
  });

  test('Repeated clicks replace previous table and do not produce multiple tables', async ({ page }) => {
    // Purpose: Ensure that the container is replaced on each generation and only one table remains
    const matrixPage = new MatrixPage(page);

    // First generation
    await matrixPage.clickGenerate();
    await matrixPage.waitForTable();
    const firstHTML = await matrixPage.getContainerHTML();
    expect(firstHTML.length).toBeGreaterThan(0);

    // Click again quickly multiple times to simulate rapid user interaction
    for (let i = 0; i < 3; i++) {
      await matrixPage.clickGenerate();
    }

    // After repeated clicks, ensure there's only one table inside the container
    const tableCount = await matrixPage.getTableCount();
    expect(tableCount).toBe(1);

    // The container HTML should be non-empty and valid table structure remains
    const secondHTML = await matrixPage.getContainerHTML();
    expect(secondHTML.length).toBeGreaterThan(0);

    // The table must still have 25 td cells (5x5)
    const tdCount = await matrixPage.getTDCount();
    expect(tdCount).toBe(25);
  });

  test('generateRandomMatrix function is defined on the window and callable', async ({ page }) => {
    // Purpose: Validate that the page exposes the generateRandomMatrix function and that calling it produces the expected table
    const matrixPage = new MatrixPage(page);

    // Check the function exists on the page global
    const fnType = await page.evaluate(() => typeof generateRandomMatrix);
    expect(fnType).toBe('function');

    // Clear any existing content and call the function directly via evaluate
    await page.evaluate(() => {
      const container = document.getElementById('matrix-container');
      if (container) container.innerHTML = '';
    });

    // Call the function
    await page.evaluate(() => {
      // Call without catching errors so any runtime errors bubble up as page errors
      generateRandomMatrix();
    });

    // Ensure the table now exists
    await matrixPage.waitForTable();
    const tdCount = await matrixPage.getTDCount();
    expect(tdCount).toBe(25);
  });

  test('Stress test: clicking the generate button many times does not produce runtime errors', async ({ page }) => {
    // Purpose: Rapidly click the generate button many times and ensure the app remains stable (no uncaught errors)
    const matrixPage = new MatrixPage(page);

    // Perform 20 rapid clicks
    for (let i = 0; i < 20; i++) {
      await matrixPage.clickGenerate();
    }

    // After operations, there should still be a single table and correct number of cells
    expect(await matrixPage.getTableCount()).toBe(1);
    expect(await matrixPage.getTDCount()).toBe(25);
  });

  test('Accessibility and content checks: button text and labels for nodes are present', async ({ page }) => {
    // Purpose: Basic accessibility and content verification: ensure labels are present and meaningful
    const matrixPage = new MatrixPage(page);

    // Button text is clear
    const button = page.locator('button:has-text("Generate Random Matrix")');
    await expect(button).toBeVisible();
    await expect(button).toHaveText('Generate Random Matrix');

    // Generate the matrix and verify row header labels "Node 0" .. "Node 4" are present in tbody th elements
    await matrixPage.clickGenerate();
    await matrixPage.waitForTable();

    const rowHeaderTexts = await page.$$eval(`${matrixPage.tableSelector} tbody th`, ths => ths.map(t => t.textContent.trim()));
    expect(rowHeaderTexts.length).toBe(5);
    for (let i = 0; i < 5; i++) {
      expect(rowHeaderTexts[i]).toBe(`Node ${i}`);
    }
  });
});