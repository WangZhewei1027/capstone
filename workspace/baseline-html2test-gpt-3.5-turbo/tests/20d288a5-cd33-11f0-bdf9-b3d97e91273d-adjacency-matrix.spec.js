import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/20d288a5-cd33-11f0-bdf9-b3d97e91273d.html';

// Page Object for the adjacency matrix application
class AdjacencyPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
  }

  // Elements
  textarea() {
    return this.page.locator('#edge-list');
  }
  generateButton() {
    return this.page.locator('#generate-btn');
  }
  errorMessage() {
    return this.page.locator('#error-message');
  }
  exampleGraph() {
    return this.page.locator('#example-graph');
  }
  matrixContainer() {
    return this.page.locator('#matrix-container');
  }
  table() {
    return this.page.locator('#matrix-container table');
  }

  // Click "Generate Adjacency Matrix" button
  async clickGenerate() {
    await this.generateButton().click();
  }

  // Read the whole adjacency table into a 2D array of strings
  async readMatrix() {
    // Wait for either a table to appear or matrix container to be empty
    const hasTable = await this.page.locator('#matrix-container table').count();
    if (!hasTable) return null;
    return await this.page.evaluate(() => {
      const table = document.querySelector('#matrix-container table');
      if (!table) return null;
      const rows = Array.from(table.querySelectorAll('tr'));
      return rows.map(row => Array.from(row.children).map(cell => cell.textContent.trim()));
    });
  }

  // Helper: get header node labels (top row, skipping top-left)
  async headerNodes() {
    const matrix = await this.readMatrix();
    if (!matrix) return [];
    // First row, skip first empty cell
    return matrix[0].slice(1);
  }

  // Helper: get left node labels (first column, skipping header row)
  async rowNodes() {
    const matrix1 = await this.readMatrix();
    if (!matrix) return [];
    // Skip header row; for each subsequent row, first cell
    return matrix.slice(1).map(r => r[0]);
  }

  // Get cell value by row and column indices (0-based for nodes ordering)
  // rowIndex and colIndex refer to node indices (not counting the header row/col)
  async cellValue(rowIndex, colIndex) {
    const matrix2 = await this.readMatrix();
    if (!matrix) return null;
    // Access matrix[rowIndex+1][colIndex+1]
    return matrix[rowIndex + 1][colIndex + 1];
  }
}

test.describe('Adjacency Matrix App - End to End', () => {
  // Keep track of any page errors and console error messages
  let pageErrors;
  let consoleErrors;

  test.beforeEach(async ({ page }) => {
    pageErrors = [];
    consoleErrors = [];

    // Listen for page errors (unhandled exceptions)
    page.on('pageerror', (err) => {
      // Collect error messages for assertions
      try {
        pageErrors.push(err && err.message ? err.message : String(err));
      } catch (e) {
        pageErrors.push(String(err));
      }
    });

    // Listen for console error messages
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Navigate to the application
    await page.goto(APP_URL);
  });

  // Test the initial page load and automatic matrix generation
  test('Initial load: auto-generates matrix from example input and shows expected table', async ({ page }) => {
    const app = new AdjacencyPage(page);

    // The example textarea should be populated with the example input
    const textareaValue = await app.textarea().inputValue();
    expect(textareaValue).toContain('A B');
    expect(textareaValue).toContain('B C 2');
    expect(textareaValue).toContain('C A 5');

    // Example description should be visible and contain "Example Input"
    await expect(app.exampleGraph()).toBeVisible();
    const exampleText = await app.exampleGraph().textContent();
    expect(exampleText).toContain('Example Input:');

    // The auto-generated matrix should appear (the page triggers generate on load)
    await expect(app.table()).toBeVisible();

    // Read matrix and verify headers and rows
    const headers = await app.headerNodes();
    const rows1 = await app.rowNodes();

    // Nodes should be sorted lexicographically: A, B, C, D
    expect(headers).toEqual(['A', 'B', 'C', 'D']);
    expect(rows).toEqual(['A', 'B', 'C', 'D']);

    // Verify matrix cell values based on the example input:
    // Expected mapping:
    // Row A: 0,1,0,4
    // Row B: 0,0,2,0
    // Row C: 5,0,0,0
    // Row D: 0,0,1,0
    const expected = [
      ['0', '1', '0', '4'],
      ['0', '0', '2', '0'],
      ['5', '0', '0', '0'],
      ['0', '0', '1', '0'],
    ];

    for (let r = 0; r < expected.length; r++) {
      for (let c = 0; c < expected[r].length; c++) {
        const val = await app.cellValue(r, c);
        expect(val).toBe(expected[r][c]);
      }
    }

    // There should be no runtime page errors or console errors on load
    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  // Test error handling when input lines are malformed
  test('Invalid edge format (single token) shows error message and clears matrix', async ({ page }) => {
    const app1 = new AdjacencyPage(page);

    // Type invalid input with only one token on the line
    await app.textarea().fill('A\n'); // 'A' alone should trigger a parse error
    await app.clickGenerate();

    // The specific error thrown by parseEdges for this case:
    await expect(app.errorMessage()).toBeVisible();
    const errText = (await app.errorMessage().textContent()).trim();
    expect(errText).toBe('Line 1: Must have at least two nodes per edge');

    // Matrix container should be cleared (no table)
    const tableCount = await page.locator('#matrix-container table').count();
    expect(tableCount).toBe(0);

    // No JS runtime exceptions (pageerror) should have been emitted by the runtime itself
    expect(pageErrors).toEqual([]);
    // Console errors may reflect thrown exceptions only if uncaught; parseEdges throws and is caught in click handler, so expect no console errors
    expect(consoleErrors).toEqual([]);
  });

  // Test invalid weight parsing error
  test('Invalid weight token results in a helpful error message', async ({ page }) => {
    const app2 = new AdjacencyPage(page);

    // Provide invalid weight
    await app.textarea().fill('X Y notANumber\n');
    await app.clickGenerate();

    await expect(app.errorMessage()).toBeVisible();
    const err = (await app.errorMessage().textContent()).trim();
    expect(err).toBe('Line 1: Invalid weight "notANumber"');

    // Matrix should be cleared
    const tableCount1 = await page.locator('#matrix-container table').count();
    expect(tableCount).toBe(0);

    // No runtime page errors or console errors originating from the app
    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  // Test that a subsequent valid generate clears previous error and produces matrix
  test('After an error, successful generation clears the error message and displays the matrix', async ({ page }) => {
    const app3 = new AdjacencyPage(page);

    // First produce an error
    await app.textarea().fill('BadLine\n');
    await app.clickGenerate();
    await expect(app.errorMessage()).toHaveText('Line 1: Must have at least two nodes per edge');

    // Now provide a valid input and generate
    const validInput = 'P Q\nQ R 7\n';
    await app.textarea().fill(validInput);
    await app.clickGenerate();

    // Error message should be cleared
    await expect(app.errorMessage()).toHaveText('');

    // Table should appear and reflect the new nodes P,Q,R sorted lexicographically: P,Q,R
    await expect(app.table()).toBeVisible();
    const headers1 = await app.headerNodes();
    expect(headers).toEqual(['P', 'Q', 'R']);

    // Expected matrix:
    // P -> Q = 1
    // Q -> R = 7
    // rest 0
    const valP_Q = await app.cellValue(0, 1); // row P col Q
    const valQ_R = await app.cellValue(1, 2); // row Q col R
    expect(valP_Q).toBe('1');
    expect(valQ_R).toBe('7');

    // No runtime or console errors should have occurred
    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  // Test parsing with tabs and extra whitespace and ensure unweighted defaults to 1
  test('Handles tabs and extra whitespace; unweighted edges default to weight 1', async ({ page }) => {
    const app4 = new AdjacencyPage(page);

    // Provide input that uses tabs and spaces
    const input = ' E\tF\t3 \n F   E \n';
    await app.textarea().fill(input);
    await app.clickGenerate();

    // Table should contain nodes E and F sorted as E, F
    await expect(app.table()).toBeVisible();
    const headers2 = await app.headerNodes();
    expect(headers).toEqual(['E', 'F']);

    // Matrix:
    // E->E 0, E->F 3
    // F->E 1 (unweighted), F->F 0
    expect(await app.cellValue(0, 0)).toBe('0'); // E->E
    expect(await app.cellValue(0, 1)).toBe('3'); // E->F
    expect(await app.cellValue(1, 0)).toBe('1'); // F->E
    expect(await app.cellValue(1, 1)).toBe('0'); // F->F

    // No runtime or console errors observed
    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  // Test that re-generating with new nodes updates DOM structure (headers and rows change)
  test('Generating different graph updates header and row labels accordingly', async ({ page }) => {
    const app5 = new AdjacencyPage(page);

    // Start with a simple graph
    await app.textarea().fill('Node1 Node2\n');
    await app.clickGenerate();

    let headers3 = await app.headerNodes();
    expect(headers).toEqual(['Node1', 'Node2']);
    let rows2 = await app.rowNodes();
    expect(rows).toEqual(['Node1', 'Node2']);

    // Now replace with nodes that sort differently and have numeric names
    await app.textarea().fill('10 2\n2 10 5\n');
    await app.clickGenerate();

    headers = await app.headerNodes();
    rows = await app.rowNodes();
    // localeCompare with numeric:true likely sorts "10" after "2" numerically; the implementation uses localeCompare with numeric:true
    expect(headers).toEqual(['2', '10']);
    expect(rows).toEqual(['2', '10']);

    // Check numeric weight recorded: 2->10 = 5
    expect(await app.cellValue(0, 1)).toBe('5'); // row 2 col 10

    // No runtime or console errors
    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });
});