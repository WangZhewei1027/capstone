import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/0888fdc0-d59e-11f0-b3ae-79d1ce7b5503.html';

// Page Object to encapsulate interactions with the Floyd-Warshall page
class FloydWarshallPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.vertexInput = page.locator('#vertexCount');
    this.edgesInput = page.locator('#edges');
    this.runButton = page.locator('button', { hasText: 'Run Algorithm' });
    this.resultMatrix = page.locator('#resultMatrix');
    this.resultPath = page.locator('#resultPath');
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async setVertexCount(n) {
    await this.vertexInput.fill(String(n));
  }

  async setEdges(text) {
    await this.edgesInput.fill(text);
  }

  async clickRun() {
    await this.runButton.click();
  }

  async getMatrixHeaderText() {
    return this.resultMatrix.locator('h2').innerText();
  }

  async getPathHeaderText() {
    return this.resultPath.locator('h2').innerText();
  }

  // Returns the distance matrix text rows as arrays of cell texts (including header row)
  async getTableRows() {
    const rows = [];
    const table = this.resultMatrix.locator('table');
    const rowCount = await table.locator('tr').count();
    for (let i = 0; i < rowCount; i++) {
      const row = table.locator('tr').nth(i);
      const cellCount = await row.locator('th, td').count();
      const cells = [];
      for (let j = 0; j < cellCount; j++) {
        cells.push(await row.locator('th, td').nth(j).innerText());
      }
      rows.push(cells);
    }
    return rows;
  }

  // Returns the full text content of the resultPath div
  async getResultPathText() {
    return this.resultPath.innerText();
  }
}

test.describe('Floyd-Warshall Algorithm Visualization - Basic UI and behavior', () => {
  // Collect console errors and page errors for each test
  test.beforeEach(async ({ page }) => {
    // No-op here; each test creates its own listener arrays
  });

  test('Initial page load: inputs and button are visible and result areas are empty', async ({ page }) => {
    // Purpose: Verify initial UI state before any interaction
    const consoleErrors = [];
    const pageErrors = [];

    // Collect console errors and page errors
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => pageErrors.push(err.message));

    const app = new FloydWarshallPage(page);
    await app.goto();

    // Assert inputs and button are visible
    await expect(app.vertexInput).toBeVisible();
    await expect(app.edgesInput).toBeVisible();
    await expect(app.runButton).toBeVisible();

    // The result sections exist but should not contain headers yet
    await expect(app.resultMatrix).toBeVisible();
    await expect(app.resultPath).toBeVisible();

    // resultMatrix and resultPath should not contain the "Distance Matrix:" / "Shortest Paths:" heading initially
    await expect(app.resultMatrix.locator('h2')).toHaveCount(0);
    await expect(app.resultPath.locator('h2')).toHaveCount(0);

    // No console or page errors should have occurred on simple load
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Run algorithm on a small graph: validates computed distances and displayed matrix/path', async ({ page }) => {
    // Purpose: Test correct Floyd-Warshall computation and DOM updates for a valid input
    const consoleErrors1 = [];
    const pageErrors1 = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => pageErrors.push(err.message));

    const app1 = new FloydWarshallPage(page);
    await app.goto();

    // Graph:
    // 0 -> 1 (5)
    // 1 -> 2 (3)
    // 0 -> 2 (10)
    // Vertex count = 3
    await app.setVertexCount(3);
    await app.setEdges('(0,1,5), (1,2,3), (0,2,10)');
    await app.clickRun();

    // Verify headers are added
    await expect(app.resultMatrix.locator('h2')).toHaveText('Distance Matrix:');
    await expect(app.resultPath.locator('h2')).toHaveText('Shortest Paths:');

    // Read table rows and validate distances:
    const rows1 = await app.getTableRows();
    // Expected table:
    // Header row: From/To | 0 | 1 | 2
    // Row 0: 0 | 0 | 5 | 8   (0->2 improved via 1)
    // Row 1: 1 | ∞? Wait 1->0 unreachable => ∞ ; 0 | ∞ or 0? For diagonal 0
    // Let's define expected matrix as strings:
    const expected = [
      ['From/To', '0', '1', '2'],
      ['0', '0', '5', '8'],
      ['1', '∞', '0', '3'],
      ['2', '∞', '∞', '0']
    ];

    // Compare expected and actual rows
    expect(rows.length).toBe(expected.length);
    for (let i = 0; i < expected.length; i++) {
      expect(rows[i]).toEqual(expected[i]);
    }

    // Validate the resultPath contains statements for each pair
    const pathText = await app.getResultPathText();
    // Check a few key path strings
    expect(pathText).toContain('Shortest distance from 0 to 0 is 0');
    expect(pathText).toContain('Shortest distance from 0 to 1 is 5');
    expect(pathText).toContain('Shortest distance from 0 to 2 is 8'); // via 1
    expect(pathText).toContain('Shortest distance from 2 to 0 is ∞'); // unreachable

    // Ensure no console errors or page errors occurred during normal run
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Handles duplicate edges by taking the minimum weight', async ({ page }) => {
    // Purpose: Verify that when multiple edges are provided for the same from->to,
    // the smallest weight is used in the result matrix.
    const consoleErrors2 = [];
    const pageErrors2 = [];
    page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    page.on('pageerror', err => pageErrors.push(err.message));

    const app2 = new FloydWarshallPage(page);
    await app.goto();

    // Vertex count 2, duplicate edges 0->1 weights 5 and 2 -> expect 2 used
    await app.setVertexCount(2);
    await app.setEdges('(0,1,5),(0,1,2)');
    await app.clickRun();

    const rows2 = await app.getTableRows();
    // Header + 2 rows = 3 rows
    expect(rows.length).toBe(3);
    // Row for 0 should show 0 and 2
    expect(rows[1]).toEqual(['0', '0', '2']);
    // Path text should reflect the minimal 2
    const pathText1 = await app.getResultPathText();
    expect(pathText).toContain('Shortest distance from 0 to 1 is 2');

    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });
});

test.describe('Floyd-Warshall Algorithm Visualization - Edge cases and error observation', () => {
  test('Clicking Run with empty edges input (edge case) should cause a runtime error', async ({ page }) => {
    // Purpose: Intentionally exercise a malformed/edge-case input scenario.
    // The implementation splits the edges input and attempts to parse triples;
    // when edges input is empty, this can result in NaN indices and lead to a runtime TypeError.
    const consoleErrors3 = [];
    const pageErrors3 = [];

    page.on('console', msg => {
      // Collect console errors
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => {
      // Collect uncaught page errors
      pageErrors.push(err);
    });

    const app3 = new FloydWarshallPage(page);
    await app.goto();

    // Provide a vertex count but leave edges blank (user forgot to enter edges)
    await app.setVertexCount(2);
    await app.setEdges(''); // empty edges input

    // Clicking run should cause the page's JS to attempt to use NaN indices,
    // which typically triggers a runtime exception (TypeError). We do not prevent it --
    // we observe and assert that an error occurred naturally.
    await app.clickRun();

    // Wait a brief moment to ensure any asynchronous pageerror/console events are captured
    await page.waitForTimeout(50);

    // We expect at least one page error or console error to have been recorded
    // (depends on the browser engine and exact error message). Assert that an error was observed.
    const totalErrors = consoleErrors.length + pageErrors.length;
    expect(totalErrors).toBeGreaterThanOrEqual(1);

    // Also validate that since an error occurred, the resultMatrix header was not added
    // (displayResult should not have been reached)
    await expect(app.resultMatrix.locator('h2')).toHaveCount(0);
    await expect(app.resultPath.locator('h2')).toHaveCount(0);
  });

  test('Malformed edge entries (non-numeric) should be observed as errors or result in NaN in places', async ({ page }) => {
    // Purpose: Provide deliberately malformed edge text and observe the behavior (errors or NaN values in output).
    const consoleErrors4 = [];
    const pageErrors4 = [];
    page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    page.on('pageerror', err => pageErrors.push(err));

    const app4 = new FloydWarshallPage(page);
    await app.goto();

    // Provide non-numeric edge entries
    await app.setVertexCount(2);
    await app.setEdges('(a,b,c)');

    // Clicking run: the code will parseInt on 'a', 'b', 'c' -> NaN values
    // This may lead to an exception when used as indices, or to weird table content if it doesn't throw.
    await app.clickRun();

    // Allow event processing
    await page.waitForTimeout(50);

    // If an exception occurred, it will be captured. If not, verify DOM output includes '∞' or 'NaN' cases
    const totalErrors1 = consoleErrors.length + pageErrors.length;
    if (totalErrors > 0) {
      // At least one error was observed — assert that it's an expected kind (TypeError or similar)
      const messages = pageErrors.map(e => e.message).concat(consoleErrors);
      const foundExpectedError = messages.some(m => /TypeError|ReferenceError|Cannot read|NaN|undefined/i.test(String(m)));
      expect(foundExpectedError).toBe(true);
    } else {
      // No error thrown: check resulting DOM for indications of incorrect parsing (NaN displayed or unreachable '∞')
      const rows3 = await app.getTableRows();
      // There should be a header + 2 rows when vertexCount=2 => 3 rows
      expect(rows.length).toBe(3);
      // The diagonal should still be 0
      expect(rows[1][1]).toBe('0'); // row for vertex 0, col 0
      expect(rows[2][2]).toBe('0'); // row for vertex 1, col 1
      // At least one cell besides diagonals should be either '∞' or show a non-numeric string (malformed)
      const nonDiagonalCells = [rows[1][2], rows[2][1]];
      const anySuspicious = nonDiagonalCells.some(c => c === '∞' || /NaN|undefined/i.test(c));
      expect(anySuspicious).toBe(true);
    }
  });
});

test.describe('Accessibility and visibility checks', () => {
  test('Inputs and labels are reachable and descriptive enough for basic accessibility', async ({ page }) => {
    // Purpose: Basic accessibility checks - inputs are visible and have placeholders
    const app5 = new FloydWarshallPage(page);
    await app.goto();

    // Check placeholders exist and are meaningful
    await expect(app.vertexInput).toHaveAttribute('placeholder', 'Number of vertices');
    await expect(app.edgesInput).toHaveAttribute('placeholder', 'Edges: (from,to,weight), (from,to,weight), ...');

    // Button has accessible text
    await expect(app.runButton).toHaveText('Run Algorithm');
  });
});