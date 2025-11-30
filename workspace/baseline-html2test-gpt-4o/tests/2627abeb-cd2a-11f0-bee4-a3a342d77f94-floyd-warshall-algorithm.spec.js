import { test, expect } from '@playwright/test';

// Test file for Application ID: 2627abeb-cd2a-11f0-bee4-a3a342d77f94
// Floyd-Warshall Algorithm visualization E2E tests
// URL: http://127.0.0.1:5500/workspace/html2test/html/2627abeb-cd2a-11f0-bee4-a3a342d77f94.html

// Page Object for the graph page to keep tests organized and readable
class GraphPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.url = 'http://127.0.0.1:5500/workspace/html2test/html/2627abeb-cd2a-11f0-bee4-a3a342d77f94.html';
    this.verticesInput = page.locator('#vertices');
    this.generateButton = page.getByRole('button', { name: 'Generate Graph' });
    this.graphContainer = page.locator('#graph-container');
  }

  // Navigate to the page
  async goto() {
    await this.page.goto(this.url);
  }

  // Set number of vertices in the input
  async setVertices(n) {
    await this.verticesInput.fill(String(n));
  }

  // Click the top-level "Generate Graph" button (next to vertices input)
  async clickGenerate() {
    await this.generateButton.click();
  }

  // Click the dynamically created "Calculate Shortest Paths" button inside graph-container
  async clickCalculate() {
    const btn = this.graphContainer.getByRole('button', { name: 'Calculate Shortest Paths' });
    await expect(btn).toBeVisible();
    await btn.click();
  }

  // Get the current primary table (the input adjacency matrix) inside graph-container
  async getMatrixTable() {
    // The first table inside graph-container is the input matrix
    return this.graphContainer.locator('table').first();
  }

  // Get the result table appended after calculation (if present)
  async getResultTable() {
    // After calculation, second table should be result
    return this.graphContainer.locator('table').nth(1);
  }

  // Get all number inputs that belong to the current matrix table
  async getMatrixInputs() {
    const table = await this.getMatrixTable();
    return table.locator('input[type="number"]');
  }

  // Helper to read input value attribute (use getAttribute to inspect raw value)
  async getInputValueAttribute(selector) {
    return await this.page.locator(selector).getAttribute('value');
  }

  // Get header labels of the current matrix table (From \ To and numeric headers)
  async getMatrixHeaders() {
    const table = await this.getMatrixTable();
    const headers = table.locator('tr').first().locator('th');
    const count = await headers.count();
    const arr = [];
    for (let i = 0; i < count; i++) {
      arr.push((await headers.nth(i).innerText()).trim());
    }
    return arr;
  }

  // Count rows in a table (excluding header)
  async getMatrixRowCount() {
    const table = await this.getMatrixTable();
    // total rows minus 1 header
    const rows = await table.locator('tr').count();
    return rows - 1;
  }
}

test.describe('Floyd-Warshall Algorithm Visualization - E2E', () => {
  // Arrays to capture console messages and page errors for each test
  let consoleMessages = [];
  let consoleErrors = [];
  let pageErrors = [];

  // Per-test setup: create new page and attach listeners before navigation
  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    consoleErrors = [];
    pageErrors = [];

    // Capture all console messages for inspection
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      // Store structured info for assertions and debugging
      consoleMessages.push({ type, text });
      if (type === 'error') consoleErrors.push(text);
    });

    // Capture uncaught exceptions from the page
    page.on('pageerror', err => {
      // pageerror event carries Error objects; convert to string for assertions
      pageErrors.push(String(err));
    });

    // Navigate to the page via GraphPage object (ensures listeners attached before load)
    const gp = new GraphPage(page);
    await gp.goto();

    // Wait for the initial graph-table to appear (window.onload calls generateGraph)
    await page.locator('#graph-container table').first().waitFor({ state: 'visible', timeout: 2000 });
  });

  // After each test we assert that no unexpected runtime errors were emitted.
  // Tests will explicitly check console messages when needed.
  test.afterEach(async () => {
    // Assert that there were no uncaught page errors (exceptions)
    expect(pageErrors).toEqual([], { message: `Unexpected page errors: ${JSON.stringify(pageErrors)}` });

    // Assert that there were no console.error messages emitted during the test flow
    expect(consoleErrors).toEqual([], { message: `Console error messages found: ${JSON.stringify(consoleErrors)}` });
  });

  test.describe('Initial load and default state', () => {
    test('should load page and create a default 4-vertex graph', async ({ page }) => {
      // Purpose: Verify initial DOM structure and default values created by window.onload -> generateGraph
      const gp = new GraphPage(page);

      // Page title and main heading checks
      await expect(page).toHaveTitle(/Floyd-Warshall Algorithm/);
      await expect(page.locator('h1')).toHaveText('Floyd-Warshall Algorithm');

      // The vertices input should default to 4 (as per HTML)
      await expect(gp.verticesInput).toHaveValue('4');

      // The graph-container should contain a table representing a 4x4 matrix
      const table = await gp.getMatrixTable();
      await expect(table).toBeVisible();

      // Header row should show 'From \ To' and four numeric headers 0-3
      const headers = await gp.getMatrixHeaders();
      expect(headers[0]).toContain('From'); // allow for the backslash in label
      // Next headers should be 0,1,2,3 (as text)
      const numericHeaders = headers.slice(1);
      expect(numericHeaders).toEqual(['0', '1', '2', '3']);

      // There should be 4 data rows (one per vertex)
      const rowCount = await gp.getMatrixRowCount();
      expect(rowCount).toBe(4);

      // Check the diagonal inputs are readonly and have value "0"
      // diagonal inputs have ids cell-i-i
      for (let i = 0; i < 4; i++) {
        const diagSelector = `#cell-${i}-${i}`;
        const input = page.locator(diagSelector);
        await expect(input).toHaveAttribute('readonly', '');
        // The value attribute should be "0"
        const valAttr = await input.getAttribute('value');
        expect(valAttr).toBe('0');
      }

      // Check off-diagonal inputs have the value attribute "Infinity" (as created by template)
      const offDiagSelector = '#cell-0-1';
      const offDiag = page.locator(offDiagSelector);
      const offVal = await offDiag.getAttribute('value');
      // The implementation sets value="${val}" where val can be Infinity; ensure that literal exists
      expect(offVal).toBe('Infinity');
    });
  });

  test.describe('User interactions and state updates', () => {
    test('generating a graph with a different vertex count updates the table structure', async ({ page }) => {
      // Purpose: Verify Generate Graph button rebuilds the table for the specified vertex count
      const gp = new GraphPage(page);

      // Change vertices to 3 and click Generate Graph
      await gp.setVertices(3);
      await gp.clickGenerate();

      // Wait for the new table to render
      const table = await gp.getMatrixTable();
      await expect(table).toBeVisible();

      // Validate headers now show 0..2
      const headers = await gp.getMatrixHeaders();
      expect(headers.slice(1)).toEqual(['0', '1', '2']);

      // There should be 3 data rows
      const rowCount = await gp.getMatrixRowCount();
      expect(rowCount).toBe(3);

      // Check diagonal readonly and zeros for 3x3
      for (let i = 0; i < 3; i++) {
        const diag = page.locator(`#cell-${i}-${i}`);
        await expect(diag).toHaveAttribute('readonly', '');
        expect(await diag.getAttribute('value')).toBe('0');
      }
    });

    test('calculate shortest paths appends result table showing zeros on diagonal and infinities elsewhere', async ({ page }) => {
      // Purpose: Verify that clicking "Calculate Shortest Paths" produces a result table
      const gp = new GraphPage(page);

      // Ensure matrix exists
      const matrixTable = await gp.getMatrixTable();
      await expect(matrixTable).toBeVisible();

      // Click Calculate Shortest Paths
      await gp.clickCalculate();

      // The result table should now be appended as the second table in the graph-container
      const resultTable = await gp.getResultTable();
      await expect(resultTable).toBeVisible();

      // The result header should contain "Shortest Paths From \ To"
      const resultHeader = await resultTable.locator('tr').first().locator('th').first().innerText();
      expect(resultHeader).toContain('Shortest Paths');

      // There should be one row per vertex (4 in default)
      const resultRows = resultTable.locator('tr');
      const resultRowCount = (await resultRows.count()) - 1; // minus header
      expect(resultRowCount).toBe(4);

      // Validate that diagonal entries are "0" and off-diagonals render as the infinity symbol (∞)
      for (let i = 0; i < 4; i++) {
        const row = resultTable.locator('tr').nth(i + 1); // +1 skip header
        // First cell in row is header with vertex index
        const cells = row.locator('td');
        for (let j = 0; j < 4; j++) {
          const cellText = (await cells.nth(j).innerText()).trim();
          if (i === j) {
            expect(cellText).toBe('0');
          } else {
            // displayResult used '&infin;' so the rendered text should be the infinity sign
            expect(cellText).toBe('∞');
          }
        }
      }
    });

    test('edge case: generate graph with minimum allowed vertices (2) and verify structure', async ({ page }) => {
      // Purpose: Validate behavior for the minimal allowed vertex count
      const gp = new GraphPage(page);

      // Set to 2 and generate
      await gp.setVertices(2);
      await gp.clickGenerate();

      // Verify headers and rows for 2 vertices
      const headers = await gp.getMatrixHeaders();
      expect(headers.slice(1)).toEqual(['0', '1']);
      const rowCount = await gp.getMatrixRowCount();
      expect(rowCount).toBe(2);

      // Diagonals readonly with 0 values, off-diagonal Infinity
      for (let i = 0; i < 2; i++) {
        const diag = page.locator(`#cell-${i}-${i}`);
        await expect(diag).toHaveAttribute('readonly', '');
        expect(await diag.getAttribute('value')).toBe('0');
      }
      const offVal = await page.locator('#cell-0-1').getAttribute('value');
      expect(offVal).toBe('Infinity');
    });
  });

  test.describe('Console and error monitoring', () => {
    test('should not emit console.error or uncaught page errors during normal flows', async ({ page }) => {
      // Purpose: Explicit test to ensure the app does not produce runtime errors during load, generate, and calculate
      const gp = new GraphPage(page);

      // Already loaded in beforeEach; perform a couple of interactions
      await gp.setVertices(3);
      await gp.clickGenerate();
      await gp.clickCalculate();

      // Inspect captured console messages (we collected messages in beforeEach)
      // Ensure there are messages (console logs may or may not exist) - primarily assert no errors
      // consoleMessages array should be defined and accessible
      expect(Array.isArray(consoleMessages)).toBeTruthy();

      // Ensure no console.error calls were captured
      expect(consoleErrors.length).toBe(0);

      // Ensure no uncaught page errors were captured
      expect(pageErrors.length).toBe(0);
    });
  });
});