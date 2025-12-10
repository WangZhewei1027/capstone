import { test, expect } from '@playwright/test';

// Test file for Application ID: 39b75201-d1d5-11f0-b49a-6f458b3a25ef
// Verifies the Adjacency Matrix interactive application at the provided URL.
// File name required: 39b75201-d1d5-11f0-b49a-6f458b3a25ef-adjacency-matrix.spec.js

// Page Object for the Adjacency Matrix page
class AdjacencyMatrixPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.edgeInput = page.locator('#edgeInput');
    this.addEdgeBtn = page.locator('#addEdge');
    this.generateBtn = page.locator('#generateMatrix');
    this.matrixContainer = page.locator('#matrixContainer');
  }

  // Fills the edge input and clicks "Add Edge". Expects an alert with expectedMessage.
  async addEdge(edgeText, expectedAlertMessage) {
    const { page } = this;
    const dialogPromise = page.waitForEvent('dialog');
    await this.edgeInput.fill(edgeText);
    await this.addEdgeBtn.click();
    const dialog = await dialogPromise;
    // Assert the alert content is as expected and accept it
    expect(dialog.message()).toBe(expectedAlertMessage);
    await dialog.accept();
  }

  // Clicks the Generate Adjacency Matrix button and waits for the table to appear
  async generateMatrix() {
    await this.generateBtn.click();
    // Wait for a table to be present under the matrix container (may be a minimal table)
    await this.page.waitForSelector('#matrixContainer table');
  }

  // Returns parsed table data: header vertex list and rows as arrays of strings
  async getMatrixData() {
    const table = this.page.locator('#matrixContainer table');
    // Ensure table exists
    if (!(await table.count())) return { headers: [], rows: [] };

    // First row contains header th elements (first is empty top-left)
    const headerRow = table.locator('tr').first();
    const headerCells = await headerRow.locator('th').allTextContents();
    // headerCells[0] is an empty string (corner cell) — vertices start at index 1
    const headers = headerCells.slice(1);

    // Remaining rows
    const rowLocators = table.locator('tr').nth(1);
    const rowCount = (await table.locator('tr').count()) - 1;
    const rows = [];
    for (let i = 0; i < rowCount; i++) {
      const row = table.locator('tr').nth(i + 1);
      const rowHeader = (await row.locator('th').first().innerText()).trim();
      const cellTexts = await row.locator('td').allTextContents();
      rows.push({ vertex: rowHeader, cells: cellTexts });
    }

    return { headers, rows };
  }
}

test.describe('Adjacency Matrix Demonstration - E2E', () => {
  const url =
    'http://127.0.0.1:5500/workspace/batch-test-1205-4o-5/html/39b75201-d1d5-11f0-b49a-6f458b3a25ef.html';

  // Collect console errors and page errors to assert on them in teardown
  let pageErrors = [];
  let consoleErrors = [];

  test.beforeEach(async ({ page }) => {
    pageErrors = [];
    consoleErrors = [];

    // Observe page errors (uncaught exceptions)
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    // Observe console messages; collect those of type 'error'
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg);
      }
    });

    // Navigate to the application page before each test
    await page.goto(url);
  });

  test.afterEach(async () => {
    // Assert that no uncaught page errors occurred during the test
    expect(pageErrors.length, `Expected no page errors but found: ${pageErrors.map(e => String(e)).join('; ')}`).toBe(
      0
    );

    // Assert that no console.error messages were emitted during the test
    expect(
      consoleErrors.length,
      `Expected no console.error messages but found: ${consoleErrors.map(m => m.text()).join('; ')}`
    ).toBe(0);
  });

  test('Initial page load: all controls present and matrix container is empty', async ({ page }) => {
    // Purpose: Verify the application loads correctly with inputs and buttons visible and no matrix displayed.
    const app = new AdjacencyMatrixPage(page);

    // Ensure the title and headers are present
    await expect(page.locator('h1')).toHaveText('Adjacency Matrix Demonstration');
    await expect(page.locator('h2').first()).toHaveText('Enter Edges');

    // Input and buttons should be visible and enabled
    await expect(app.edgeInput).toBeVisible();
    await expect(app.edgeInput).toHaveAttribute('placeholder', 'Enter edge (format: u,v)');
    await expect(app.addEdgeBtn).toBeVisible();
    await expect(app.generateBtn).toBeVisible();

    // Matrix container should initially be empty (innerHTML == '')
    const containerInnerHTML = await page.locator('#matrixContainer').innerHTML();
    expect(containerInnerHTML).toBe('');
  });

  test('Adding a valid edge triggers alert, clears input, and generate produces correct adjacency matrix', async ({ page }) => {
    // Purpose: Ensure adding an edge with format "u,v" shows the correct alert, clears the input,
    // and that generating the matrix reflects the added edge (undirected symmetry in this implementation).
    const app1 = new AdjacencyMatrixPage(page);

    // Add edge A,B and expect an alert with the exact message
    await app.addEdge('A,B', 'Edge added: A -- B');

    // After the alert, the input should be cleared
    await expect(app.edgeInput).toHaveValue('');

    // Generate the matrix and verify the table reflects vertices and adjacency
    await app.generateMatrix();

    // Parse matrix table
    const data = await app.getMatrixData();
    // Vertices insertion order: 'A' and then 'B'
    expect(data.headers).toEqual(['A', 'B']);

    // Expect two rows for vertices A and B
    expect(data.rows.length).toBe(2);

    // Row for A should be [0,1] and for B should be [1,0] because implementation sets both [u][v] and [v][u]
    const rowA = data.rows.find((r) => r.vertex === 'A');
    const rowB = data.rows.find((r) => r.vertex === 'B');
    expect(rowA).toBeDefined();
    expect(rowB).toBeDefined();
    expect(rowA.cells).toEqual(['0', '1']);
    expect(rowB.cells).toEqual(['1', '0']);
  });

  test('Invalid edge input triggers format alert and generateMatrix handles empty vertex set gracefully', async ({ page }) => {
    // Purpose: Ensure an invalid edge input (missing comma) shows the correct error alert.
    // Also ensure generateMatrix can be invoked when there are no vertices and produces a minimal table.
    const app2 = new AdjacencyMatrixPage(page);

    // Enter invalid edge string and expect format alert
    await app.addEdge('invalid-input', 'Please enter the edge in the format: u,v');

    // After accepting the alert, the internal vertices set should still be empty.
    // Click generateMatrix and confirm a table is produced (with a single top-left empty header)
    await app.generateMatrix();

    // Parse the resulting table
    const table1 = page.locator('#matrixContainer table1');
    await expect(table).toBeVisible();

    // The header row should exist and its first top-left cell should be empty
    const headerFirstCell = await table.locator('tr').first().locator('th').first().innerText();
    expect(headerFirstCell).toBe('');
  });

  test('Duplicate edges and self-loop produce correct diagonal and symmetric entries', async ({ page }) => {
    // Purpose: Verify the matrix correctly handles duplicate edges and self-loops.
    // Add self-loop X,X and edge X,Y then generate and validate adjacency values.
    const app3 = new AdjacencyMatrixPage(page);

    // Add a self-loop for X
    await app.addEdge('X,X', 'Edge added: X -- X');

    // Add edge between X and Y
    await app.addEdge('X,Y', 'Edge added: X -- Y');

    // Generate the matrix
    await app.generateMatrix();

    // Parse matrix
    const data1 = await app.getMatrixData();
    // Expect vertices insertion order: 'X', then 'Y'
    expect(data.headers).toEqual(['X', 'Y']);

    // Rows: X -> [1,1], Y -> [1,0]
    const rowX = data.rows.find((r) => r.vertex === 'X');
    const rowY = data.rows.find((r) => r.vertex === 'Y');
    expect(rowX).toBeDefined();
    expect(rowY).toBeDefined();
    expect(rowX.cells).toEqual(['1', '1']);
    expect(rowY.cells).toEqual(['1', '0']);
  });

  test('Multiple edge additions preserve insertion order of vertices in headers', async ({ page }) => {
    // Purpose: Verify that the vertices appear in the adjacency matrix header in the order they were first seen.
    // Add edges in a deliberate order and assert header order matches insertion order.
    const app4 = new AdjacencyMatrixPage(page);

    // Add edges in specific sequence to determine insertion order:
    // Add edge P,Q -> vertices P,Q
    await app.addEdge('P,Q', 'Edge added: P -- Q');

    // Add edge R,P -> adds R (P already present)
    await app.addEdge('R,P', 'Edge added: R -- P');

    // Add edge S,Q -> adds S (Q already present)
    await app.addEdge('S,Q', 'Edge added: S -- Q');

    // Generate matrix
    await app.generateMatrix();

    // Parse headers. Expected insertion order: P, Q, R, S
    const data2 = await app.getMatrixData();
    expect(data.headers).toEqual(['P', 'Q', 'R', 'S']);

    // Spot-check that matrix has correct dimensions (4x4)
    expect(data.rows.length).toBe(4);
    data.rows.forEach((r) => expect(r.cells.length).toBe(4));
  });
});