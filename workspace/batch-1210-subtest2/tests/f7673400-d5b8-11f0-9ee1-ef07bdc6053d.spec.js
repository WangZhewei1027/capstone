import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-subtest2/html/f7673400-d5b8-11f0-9ee1-ef07bdc6053d.html';

// Page Object Model for the adjacency matrix page
class AdjacencyPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.vertexA = page.locator('#vertexA');
    this.vertexB = page.locator('#vertexB');
    this.addEdgeBtn = page.locator('#addEdgeBtn');
    this.matrixHeader = page.locator('#matrixHeader');
    this.matrixBody = page.locator('#matrixBody');
    this.matrixTable = page.locator('#adjacencyMatrix');
  }

  async goto() {
    await this.page.goto(APP_URL, { waitUntil: 'load' });
  }

  async setVertices(a, b) {
    await this.vertexA.fill(String(a));
    await this.vertexB.fill(String(b));
  }

  async clickAddEdge() {
    await this.addEdgeBtn.click();
  }

  // Returns the number of <th> elements inside #matrixHeader
  async headerThCount() {
    return await this.matrixHeader.locator('th').count();
  }

  // Returns number of rows in matrix body
  async matrixRowCount() {
    return await this.matrixBody.locator('tr').count();
  }

  // Get the value in the matrix cell at row i, column j (0-indexed)
  // Note: matrix body rows are <tr><th>rowIndex</th><td>...</td>...</tr>
  async getMatrixCellValue(i, j) {
    const row = this.matrixBody.locator('tr').nth(i);
    // td cells start after the first th
    const cell = row.locator('td').nth(j);
    return (await cell.textContent())?.trim();
  }

  // Get the row header (the <th> inside a row) for row i
  async getRowHeader(i) {
    const row = this.matrixBody.locator('tr').nth(i);
    return (await row.locator('th').textContent())?.trim();
  }

  // Returns the full matrix as a 2D array of strings
  async readMatrix() {
    const rows = [];
    const rowCount = await this.matrixRowCount();
    for (let i = 0; i < rowCount; i++) {
      const row = [];
      const tds = this.matrixBody.locator('tr').nth(i).locator('td');
      const tdCount = await tds.count();
      for (let j = 0; j < tdCount; j++) {
        row.push((await tds.nth(j).textContent())?.trim());
      }
      rows.push(row);
    }
    return rows;
  }
}

test.describe('Adjacency Matrix FSM and UI tests', () => {
  // Collect console errors and page errors to assert they do not occur
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Capture console messages of type 'error'
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Capture uncaught exceptions on the page
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });
  });

  test.afterEach(async () => {
    // afterEach hook presence is just to satisfy teardown structure if needed
  });

  test('Initial State S0: initial empty matrix setup (updateMatrix on entry)', async ({ page }) => {
    // This test validates the Initial State S0 entry actions and DOM
    // It also ensures no console errors or page errors were emitted during page load.

    const app = new AdjacencyPage(page);
    await app.goto();

    // The initial updateMatrix() should have run on load.
    // Expect header to only contain one <th> (the empty corner cell) and body has 0 rows
    const headerCount = await app.headerThCount();
    const rows = await app.matrixRowCount();

    expect(headerCount).toBe(1); // only the empty top-left header cell
    expect(rows).toBe(0); // no vertices yet, so no rows

    // Ensure there were no console errors or page errors during load
    expect(consoleErrors, 'No console.error messages should be emitted during load').toEqual([]);
    expect(pageErrors, 'No uncaught page errors should occur during load').toEqual([]);
  });

  test('Transition S0 -> S1: clicking Add Edge adds symmetric edge and updates matrix', async ({ page }) => {
    // This test exercises the AddEdgeClick event and verifies the transition to S1_EdgeAdded,
    // verifying adjacency matrix update, symmetry (undirected), and UI rendering.

    const app = new AdjacencyPage(page);
    await app.goto();

    // Add edge between vertex 0 and 1
    await app.setVertices('0', '1');
    await app.clickAddEdge();

    // After adding edge 0-1, vertices should be [0,1], so header should have 1 + 2 = 3 th elements
    const headerCount = await app.headerThCount();
    expect(headerCount).toBe(3);

    // Matrix should have 2 rows (for vertices 0 and 1)
    const rows = await app.matrixRowCount();
    expect(rows).toBe(2);

    // Check row headers (they should be '0' and '1')
    const row0Header = await app.getRowHeader(0);
    const row1Header = await app.getRowHeader(1);
    expect(row0Header).toBe('0');
    expect(row1Header).toBe('1');

    // Validate adjacency values: off-diagonals should be '1', diagonals '0'
    const m00 = await app.getMatrixCellValue(0, 0);
    const m01 = await app.getMatrixCellValue(0, 1);
    const m10 = await app.getMatrixCellValue(1, 0);
    const m11 = await app.getMatrixCellValue(1, 1);

    expect(m00).toBe('0');
    expect(m11).toBe('0');
    expect(m01).toBe('1');
    expect(m10).toBe('1');

    // Verify no console errors or page errors happened during the interaction
    expect(consoleErrors, 'No console.error messages should be emitted during add edge').toEqual([]);
    expect(pageErrors, 'No uncaught page errors should occur during add edge').toEqual([]);
  });

  test('Edge cases: invalid inputs (non-numeric and negative) should show alert and not modify matrix', async ({ page }) => {
    // This test validates error scenarios: non-numeric input and negative indices.
    // It asserts that alert dialog is shown with expected message and that no matrix changes occur.

    const app = new AdjacencyPage(page);
    await app.goto();

    // Ensure initial state has no rows
    expect(await app.matrixRowCount()).toBe(0);

    // Handle dialogs and capture their messages
    const dialogs = [];
    page.on('dialog', async (dialog) => {
      dialogs.push(dialog.message());
      await dialog.accept();
    });

    // Non-numeric input: 'a' and '1'
    await app.setVertices('a', '1');
    await app.clickAddEdge();

    // Negative index input: '-1' and '0'
    await app.setVertices('-1', '0');
    await app.clickAddEdge();

    // Two dialogs should have been shown (one per invalid attempt)
    expect(dialogs.length).toBeGreaterThanOrEqual(2);
    // Each dialog should contain the expected message
    for (const msg of dialogs) {
      expect(msg).toContain('Please enter valid vertex indices.');
    }

    // Matrix should still be empty (no valid edges added)
    expect(await app.matrixRowCount()).toBe(0);

    // No console or page errors should be emitted by handling invalid inputs
    expect(consoleErrors, 'No console.error messages for invalid input cases').toEqual([]);
    expect(pageErrors, 'No uncaught page errors for invalid input cases').toEqual([]);
  });

  test('Resizing matrix: adding edge with larger index resizes matrix correctly', async ({ page }) => {
    // This test validates that when adding an edge with a larger vertex index,
    // the adjacency matrix is resized, displayed correctly, and the added edge is symmetric.

    const app = new AdjacencyPage(page);
    await app.goto();

    // Add edge between 3 and 0 -> forces resizing to 4x4 matrix
    await app.setVertices('3', '0');
    await app.clickAddEdge();

    // Expect header to have 1 + 4 = 5 th elements (corner + 0..3)
    const headerCount = await app.headerThCount();
    expect(headerCount).toBe(5);

    // Matrix should have 4 rows (0..3)
    const rows = await app.matrixRowCount();
    expect(rows).toBe(4);

    // Read matrix and verify symmetry for cell (3,0) and (0,3)
    const val30 = await app.getMatrixCellValue(3, 0);
    const val03 = await app.getMatrixCellValue(0, 3);
    expect(val30).toBe('1');
    expect(val03).toBe('1');

    // Verify diagonal entries are '0' for untouched vertices (e.g., (0,0), (1,1), (2,2), (3,3))
    const v00 = await app.getMatrixCellValue(0, 0);
    const v11 = await app.getMatrixCellValue(1, 1);
    const v22 = await app.getMatrixCellValue(2, 2);
    const v33 = await app.getMatrixCellValue(3, 3);
    expect(v00).toBe('0');
    expect(v11).toBe('0');
    expect(v22).toBe('0');
    expect(v33).toBe('0');

    // Ensure no console or page errors during resizing
    expect(consoleErrors, 'No console.error messages during matrix resizing').toEqual([]);
    expect(pageErrors, 'No uncaught page errors during matrix resizing').toEqual([]);
  });

  test('Multiple edge additions: previous edges persist and new edges add correctly', async ({ page }) => {
    // This test ensures multiple edges can be added in sequence and the adjacency matrix
    // preserves existing edges while adding new ones.

    const app = new AdjacencyPage(page);
    await app.goto();

    // Add 0-1
    await app.setVertices('0', '1');
    await app.clickAddEdge();

    // Add 2-3 (forces expansion to 4x4 if not already)
    await app.setVertices('2', '3');
    await app.clickAddEdge();

    // Add 1-2 (connect between existing vertices)
    await app.setVertices('1', '2');
    await app.clickAddEdge();

    // Matrix should now be at least 4x4
    const rows = await app.matrixRowCount();
    expect(rows).toBeGreaterThanOrEqual(4);

    // Check key edges persisted:
    // - 0-1 should be 1
    const m01 = await app.getMatrixCellValue(0, 1);
    const m10 = await app.getMatrixCellValue(1, 0);
    expect(m01).toBe('1');
    expect(m10).toBe('1');

    // - 2-3 should be 1
    const m23 = await app.getMatrixCellValue(2, 3);
    const m32 = await app.getMatrixCellValue(3, 2);
    expect(m23).toBe('1');
    expect(m32).toBe('1');

    // - 1-2 should be 1
    const m12 = await app.getMatrixCellValue(1, 2);
    const m21 = await app.getMatrixCellValue(2, 1);
    expect(m12).toBe('1');
    expect(m21).toBe('1');

    // No console or page errors from these interactions
    expect(consoleErrors, 'No console.error messages during multiple edge additions').toEqual([]);
    expect(pageErrors, 'No uncaught page errors during multiple edge additions').toEqual([]);
  });
});