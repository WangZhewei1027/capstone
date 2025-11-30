import { test, expect } from '@playwright/test';

// Page Object for the Adjacency Matrix application
class AdjacencyMatrixPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.vertexInput = page.locator('#vertexInput');
    this.edgesInput = page.locator('#edgesInput');
    this.createButton = page.getByRole('button', { name: 'Create Adjacency Matrix' });
    this.matrixTable = page.locator('#matrixTable');
    this.matrixRows = page.locator('#matrixTable tr');
  }

  async goto() {
    await this.page.goto('http://127.0.0.1:5500/workspace/html2test/html/4c9eadf2-cd2f-11f0-a735-f5f9b4634e99.html');
  }

  async fillVertices(value) {
    await this.vertexInput.fill(value);
  }

  async fillEdges(value) {
    await this.edgesInput.fill(value);
  }

  async clickCreate() {
    await this.createButton.click();
  }

  // Returns text content of a cell at table row index `rowIndex` and cell index `cellIndex`.
  // Row and cell indexes are 0-based.
  async getCellText(rowIndex, cellIndex) {
    const row = this.matrixRows.nth(rowIndex);
    const cell = row.locator('td').nth(cellIndex);
    return (await cell.textContent())?.trim() ?? '';
  }

  // Returns number of rows in the matrix table
  async rowCount() {
    return await this.matrixRows.count();
  }
}

test.describe('Adjacency Matrix App - Comprehensive Tests', () => {
  let pageErrors = [];
  let consoleErrors = [];
  let page;

  test.beforeEach(async ({ browser }) => {
    // Create a fresh page for each test to isolate console/page errors.
    page = await (await browser.newContext()).newPage();

    // Collect any uncaught page errors
    pageErrors = [];
    page.on('pageerror', error => {
      // store the error for assertions
      pageErrors.push(error);
    });

    // Collect console messages and particularly console.error
    consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
  });

  test.afterEach(async () => {
    // Assert there were no unexpected page errors or console.error calls during the test.
    // The application is expected to run without uncaught exceptions in normal scenarios.
    expect(pageErrors, 'Expected no uncaught page errors').toHaveLength(0);
    expect(consoleErrors, 'Expected no console.error messages').toHaveLength(0);

    // Close the page context to clean up
    await page.context().close();
  });

  test('Initial page load shows inputs, button and empty matrix', async () => {
    // Purpose: Verify the initial state of the page before any interaction.
    const app = new AdjacencyMatrixPage(page);
    await app.goto();

    // Inputs and button should be visible and empty
    await expect(app.vertexInput).toBeVisible();
    await expect(app.vertexInput).toHaveValue('');
    await expect(app.vertexInput).toHaveAttribute('placeholder', 'A,B,C,D');

    await expect(app.edgesInput).toBeVisible();
    await expect(app.edgesInput).toHaveValue('');
    await expect(app.edgesInput).toHaveAttribute('placeholder', 'A-B,B-C');

    await expect(app.createButton).toBeVisible();

    // The matrix table should be initially empty (no rows)
    const rows = await app.rowCount();
    expect(rows).toBe(0);
  });

  test('Creates adjacency matrix for a simple undirected graph', async () => {
    // Purpose: Validate matrix generation for vertices A,B,C with edges A-B and B-C.
    const app = new AdjacencyMatrixPage(page);
    await app.goto();

    await app.fillVertices('A,B,C');
    await app.fillEdges('A-B,B-C');
    await app.clickCreate();

    // After clicking, the table should render: 1 header row + number of vertices rows
    await expect(app.matrixTable).toBeVisible();

    // Expect 4 rows (header + 3 vertex rows)
    await expect(app.matrixRows).toHaveCount(4);

    // Header row cells: first empty then vertex names
    const headerFirstCell = await app.getCellText(0, 0); // top-left empty cell
    const headerA = await app.getCellText(0, 1);
    const headerB = await app.getCellText(0, 2);
    const headerC = await app.getCellText(0, 3);
    expect(headerFirstCell).toBe(''); // top-left intentionally empty
    expect([headerA, headerB, headerC]).toEqual(['A', 'B', 'C']);

    // Row for vertex A (row index 1): row header 'A', then adjacency values [0,1,0]
    expect(await app.getCellText(1, 0)).toBe('A');
    expect(await app.getCellText(1, 1)).toBe('0');
    expect(await app.getCellText(1, 2)).toBe('1');
    expect(await app.getCellText(1, 3)).toBe('0');

    // Row for vertex B (row index 2): [1,0,1]
    expect(await app.getCellText(2, 0)).toBe('B');
    expect(await app.getCellText(2, 1)).toBe('1');
    expect(await app.getCellText(2, 2)).toBe('0');
    expect(await app.getCellText(2, 3)).toBe('1');

    // Row for vertex C (row index 3): [0,1,0]
    expect(await app.getCellText(3, 0)).toBe('C');
    expect(await app.getCellText(3, 1)).toBe('0');
    expect(await app.getCellText(3, 2)).toBe('1');
    expect(await app.getCellText(3, 3)).toBe('0');
  });

  test('Ignores edges that reference unknown vertices and handles malformed edges gracefully', async () => {
    // Purpose: Edges that include vertices not in the vertex list should be ignored.
    // Also demonstrate how spaces around '-' in an edge cause mismatch (no trimming around split parts).
    const app = new AdjacencyMatrixPage(page);
    await app.goto();

    // Vertex list contains A, B, C
    await app.fillVertices('A,B,C');

    // Edges include:
    // - 'A - B' has spaces around dash -> split yields ['A ', ' B'] and will NOT match trimmed vertex names
    // - 'B-C' valid and should be included
    // - 'X-Y' references unknown vertices -> ignored
    await app.fillEdges('A - B,B-C,X-Y');
    await app.clickCreate();

    // Expect header row present and correct vertices
    await expect(app.matrixRows).toHaveCount(4);
    expect(await app.getCellText(0, 1)).toBe('A');
    expect(await app.getCellText(0, 2)).toBe('B');
    expect(await app.getCellText(0, 3)).toBe('C');

    // Because 'A - B' contained extra spaces around dash, it will be ignored by the parser.
    // Only B-C should set adjacency between B and C.
    // Check A row: no adjacency to B or C
    expect(await app.getCellText(1, 1)).toBe('0'); // A-A
    expect(await app.getCellText(1, 2)).toBe('0'); // A-B
    expect(await app.getCellText(1, 3)).toBe('0'); // A-C

    // Check B row: adjacency to C only
    expect(await app.getCellText(2, 1)).toBe('0'); // B-A
    expect(await app.getCellText(2, 2)).toBe('0'); // B-B
    expect(await app.getCellText(2, 3)).toBe('1'); // B-C

    // Check C row: adjacency to B only
    expect(await app.getCellText(3, 1)).toBe('0'); // C-A
    expect(await app.getCellText(3, 2)).toBe('1'); // C-B
    expect(await app.getCellText(3, 3)).toBe('0'); // C-C
  });

  test('Handles duplicate vertex names and empty tokens in the vertex list', async () => {
    // Purpose: Verify behavior when vertex list contains duplicates or empty entries.
    // The implementation uses indexOf on the vertex list, so duplicates may result in only the first duplicate getting edges.
    const app = new AdjacencyMatrixPage(page);
    await app.goto();

    // Provide duplicate "A" entries and an empty token at the end
    await app.fillVertices('A,A,B,');
    // Edge "A-B" should connect the first occurrence of "A" (index 0) with "B" (index 2).
    await app.fillEdges('A-B');
    await app.clickCreate();

    // Expect 1 header row + 4 rows (3 vertex entries + the trailing empty entry leads to a row)
    await expect(app.matrixRows).toHaveCount(4);

    // Header cells: ['', 'A', 'A', 'B'] - the trailing empty vertex is represented by a blank header cell not included because split produced empty token at end which still becomes a vertex.
    // Because of how the page builds the table, the trailing empty token will produce a header with empty text.
    expect(await app.getCellText(0, 1)).toBe('A');
    expect(await app.getCellText(0, 2)).toBe('A');
    expect(await app.getCellText(0, 3)).toBe('B');

    // The adjacency for A-B will use the indexOf('A') -> 0 (first A). So the adjacency matrix should reflect an edge between row 1 (first A) and row 3 (B).
    // Row 1 (first A)
    expect(await app.getCellText(1, 0)).toBe('A');
    expect(await app.getCellText(1, 1)).toBe('0'); // A-A
    expect(await app.getCellText(1, 2)).toBe('0'); // A-(second A)
    expect(await app.getCellText(1, 3)).toBe('1'); // A-B (connected)

    // Row 2 (second A) likely has no connection to B because indexOf returned the first A
    expect(await app.getCellText(2, 0)).toBe('A');
    expect(await app.getCellText(2, 1)).toBe('0'); // second A to first A
    expect(await app.getCellText(2, 2)).toBe('0'); // second A to second A
    expect(await app.getCellText(2, 3)).toBe('0'); // second A to B (no edge established)

    // Row 3 (B) should reflect connection back to the first A
    expect(await app.getCellText(3, 0)).toBe('B');
    expect(await app.getCellText(3, 1)).toBe('1'); // B to first A
    expect(await app.getCellText(3, 2)).toBe('0'); // B to second A
    expect(await app.getCellText(3, 3)).toBe('0'); // B-B
  });

  test('Clicking create with empty inputs creates a single empty vertex row (edge case)', async () => {
    // Purpose: Demonstrate how the implementation behaves with completely empty inputs.
    // The implementation will split empty strings and produce a single empty token vertex list.
    const app = new AdjacencyMatrixPage(page);
    await app.goto();

    // Ensure inputs are empty
    await app.fillVertices('');
    await app.fillEdges('');
    await app.clickCreate();

    // The implementation will produce a 1x1 matrix (header + 1 row).
    await expect(app.matrixRows).toHaveCount(2);

    // Top-left header cell is empty, header vertex is empty string
    expect(await app.getCellText(0, 0)).toBe('');
    expect(await app.getCellText(0, 1)).toBe(''); // header vertex text is empty

    // The single row header (vertex) is also empty and the single cell value should be '0'
    expect(await app.getCellText(1, 0)).toBe(''); // row header (empty vertex)
    expect(await app.getCellText(1, 1)).toBe('0'); // adjacency value
  });
});