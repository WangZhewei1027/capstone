import { test, expect } from '@playwright/test';

test.describe('Adjacency Matrix - GraphVisualizer UI', () => {
  // Page object for interacting with the graph visualizer page
  class GraphPage {
    constructor(page) {
      this.page = page;
      this.canvas = page.locator('#graphCanvas');
      this.matrixContainer = page.locator('#matrixContainer');
      this.addNodeBtn = page.locator('#addNode');
      this.addEdgeBtn = page.locator('#addEdge');
      this.clearEdgesBtn = page.locator('#clearEdges');
      this.resetGraphBtn = page.locator('#resetGraph');
    }

    // Wait until the matrix container is present and initial matrix is rendered
    async waitForReady() {
      await this.page.waitForSelector('#matrixContainer');
      // Wait for at least the header row to be present
      await this.page.waitForSelector('#matrixContainer > div');
    }

    // Return number of nodes inferred from matrix rows (rows = nodes + 1 header)
    async nodeCount() {
      const rows = await this.page.locator('#matrixContainer > div').count();
      return Math.max(0, rows - 1);
    }

    // Get header labels (A, B, C, ...) from the first header row (skipping the corner cell)
    async headerLabels() {
      const headerRow = this.page.locator('#matrixContainer > div').first();
      const headerCells = headerRow.locator('.matrix-cell');
      const count = await headerCells.count();
      const texts = [];
      for (let i = 1; i < count; i++) {
        texts.push((await headerCells.nth(i).textContent()).trim());
      }
      return texts;
    }

    // Get matrix cell text at row i, column j (0-based)
    async matrixCellText(i, j) {
      const rows = this.page.locator('#matrixContainer > div');
      const row = rows.nth(i + 1); // first row is headerRow
      const cells = row.locator('.matrix-cell');
      return (await cells.nth(j + 1).textContent()).trim();
    }

    // Check whether a specific cell has the 'edge' CSS class
    async matrixCellHasEdgeClass(i, j) {
      const rows = this.page.locator('#matrixContainer > div');
      const row = rows.nth(i + 1);
      const cell = row.locator('.matrix-cell').nth(j + 1);
      return await cell.evaluate((el) => el.classList.contains('edge'));
    }

    // Click canvas at coordinates (x,y) relative to the top-left of the canvas element
    async clickCanvasAt(x, y) {
      await this.canvas.click({ position: { x, y } });
    }

    async clickAddNode() {
      await this.addNodeBtn.click();
    }
    async clickAddEdgeMode() {
      await this.addEdgeBtn.click();
    }
    async clickClearEdges() {
      await this.clearEdgesBtn.click();
    }
    async clickResetGraph() {
      await this.resetGraphBtn.click();
    }

    // Click a matrix cell at row i, col j
    async clickMatrixCell(i, j) {
      const rows = this.page.locator('#matrixContainer > div');
      const row = rows.nth(i + 1);
      const cell = row.locator('.matrix-cell').nth(j + 1);
      await cell.click();
    }
  }

  // Shared setup for each test: capture console messages and page errors for assertions
  test.beforeEach(async ({ page }) => {
    // Nothing here; individual tests set up their own listeners so that arrays are scoped to tests.
  });

  // Test initial load and default state
  test('Initial load: page renders header, canvas, controls, and default 3 nodes with matrix', async ({ page }) => {
    // Arrays to capture console messages and page errors
    const consoleMessages = [];
    const pageErrors = [];

    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    // Navigate to the served HTML page
    await page.goto('http://127.0.0.1:5500/workspace/baseline-html2test-deepseek-chat/html/6e09e030-d5a0-11f0-8040-510e90b1f3a7.html');

    const gp = new GraphPage(page);
    await gp.waitForReady();

    // Verify main header and subtitle are present
    await expect(page.locator('header h1')).toHaveText('Adjacency Matrix');
    await expect(page.locator('.subtitle')).toHaveText('Interactive Graph Representation');

    // Canvas should be visible
    await expect(gp.canvas).toBeVisible();

    // Controls should be visible and enabled
    await expect(gp.addNodeBtn).toBeVisible();
    await expect(gp.addNodeBtn).toBeEnabled();
    await expect(gp.addEdgeBtn).toBeVisible();
    await expect(gp.clearEdgesBtn).toBeVisible();
    await expect(gp.resetGraphBtn).toBeVisible();

    // Default nodes expected: 3 (added in initializeGraph)
    const initialNodes = await gp.nodeCount();
    expect(initialNodes).toBe(3);

    // Header labels should be A, B, C
    const labels = await gp.headerLabels();
    expect(labels).toEqual(['A', 'B', 'C']);

    // All matrix cells (off-diagonal) should initially be '0' and not have 'edge' class
    for (let i = 0; i < initialNodes; i++) {
      for (let j = 0; j < initialNodes; j++) {
        const txt = await gp.matrixCellText(i, j);
        expect(['0', '1']).toContain(txt); // should be either 0 or 1; default is 0
        // default graph has no edges set, so expect '0'
        expect(txt).toBe('0');
        const hasEdgeClass = await gp.matrixCellHasEdgeClass(i, j);
        expect(hasEdgeClass).toBe(false);
      }
    }

    // Assert no page errors were produced during initial load
    expect(pageErrors).toEqual([]);
    // Assert there were no console.error messages
    const consoleErrors = consoleMessages.filter((m) => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  // Test adding node, then resetting graph
  test('Add Node increases node count and Reset Graph restores initial state', async ({ page }) => {
    const consoleMessages = [];
    const pageErrors = [];
    page.on('console', (msg) => consoleMessages.push({ type: msg.type(), text: msg.text() }));
    page.on('pageerror', (err) => pageErrors.push(err));

    await page.goto('http://127.0.0.1:5500/workspace/baseline-html2test-deepseek-chat/html/6e09e030-d5a0-11f0-8040-510e90b1f3a7.html');
    const gp = new GraphPage(page);
    await gp.waitForReady();

    // initial nodes count
    const before = await gp.nodeCount();
    expect(before).toBe(3);

    // Click Add Node button - adds node at center
    await gp.clickAddNode();

    // Wait for DOM update - matrix should now have one additional row
    await page.waitForTimeout(100); // small wait to let JS update DOM
    const after = await gp.nodeCount();
    expect(after).toBe(before + 1);

    // New header label should be 'D' (since labels A,B,C then D)
    const labels = await gp.headerLabels();
    expect(labels[labels.length - 1]).toBe('D');

    // Now click Reset Graph - should restore to initial three nodes labeled A,B,C
    await gp.clickResetGraph();
    await page.waitForTimeout(100);
    const resetCount = await gp.nodeCount();
    expect(resetCount).toBe(3);

    const resetLabels = await gp.headerLabels();
    expect(resetLabels).toEqual(['A', 'B', 'C']);

    // No page errors or console.error
    expect(pageErrors).toEqual([]);
    const consoleErrors = consoleMessages.filter((m) => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  // Test adding an edge via edge mode and checking matrix update
  test('Add Edge Mode: clicking two nodes creates edge and updates matrix cell to 1 with edge class', async ({ page }) => {
    const consoleMessages = [];
    const pageErrors = [];
    page.on('console', (msg) => consoleMessages.push({ type: msg.type(), text: msg.text() }));
    page.on('pageerror', (err) => pageErrors.push(err));

    await page.goto('http://127.0.0.1:5500/workspace/baseline-html2test-deepseek-chat/html/6e09e030-d5a0-11f0-8040-510e90b1f3a7.html');
    const gp = new GraphPage(page);
    await gp.waitForReady();

    // Enter add-edge mode
    await gp.clickAddEdgeMode();

    // Click near node A (100,100) and node B (200,200) on the canvas to create an edge
    // Use small offsets to ensure within node radius
    await gp.clickCanvasAt(100, 100);
    await gp.clickCanvasAt(200, 200);

    // Allow some time for matrix update
    await page.waitForTimeout(150);

    // Now matrix cell [0][1] (A,B) should be '1' and have 'edge' class due to undirected edge handling
    const cellText01 = await gp.matrixCellText(0, 1);
    expect(cellText01).toBe('1');
    const hasEdgeClass01 = await gp.matrixCellHasEdgeClass(0, 1);
    expect(hasEdgeClass01).toBe(true);

    // Because edges are treated symmetric in the matrix display, [1][0] should also reflect the edge
    const cellText10 = await gp.matrixCellText(1, 0);
    expect(cellText10).toBe('1');
    const hasEdgeClass10 = await gp.matrixCellHasEdgeClass(1, 0);
    expect(hasEdgeClass10).toBe(true);

    // No page errors or console.error
    expect(pageErrors).toEqual([]);
    const consoleErrors = consoleMessages.filter((m) => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  // Test clearing edges
  test('Clear Edges button removes edges and updates matrix cells to 0', async ({ page }) => {
    const consoleMessages = [];
    const pageErrors = [];
    page.on('console', (msg) => consoleMessages.push({ type: msg.type(), text: msg.text() }));
    page.on('pageerror', (err) => pageErrors.push(err));

    await page.goto('http://127.0.0.1:5500/workspace/baseline-html2test-deepseek-chat/html/6e09e030-d5a0-11f0-8040-510e90b1f3a7.html');
    const gp = new GraphPage(page);
    await gp.waitForReady();

    // Create an edge first
    await gp.clickAddEdgeMode();
    await gp.clickCanvasAt(100, 100);
    await gp.clickCanvasAt(200, 200);
    await page.waitForTimeout(100);

    // Confirm edge exists
    expect(await gp.matrixCellText(0, 1)).toBe('1');

    // Click Clear Edges
    await gp.clickClearEdges();
    await page.waitForTimeout(100);

    // Matrix cells should all be '0' again
    const n = await gp.nodeCount();
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const txt = await gp.matrixCellText(i, j);
        expect(txt).toBe('0');
        const hasEdgeClass = await gp.matrixCellHasEdgeClass(i, j);
        expect(hasEdgeClass).toBe(false);
      }
    }

    // No page errors or console.error
    expect(pageErrors).toEqual([]);
    const consoleErrors = consoleMessages.filter((m) => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  // Test clicking matrix cell to highlight edge: ensure click doesn't throw and no errors emitted
  test('Clicking a matrix cell that represents an edge triggers highlight without page errors', async ({ page }) => {
    const consoleMessages = [];
    const pageErrors = [];
    page.on('console', (msg) => consoleMessages.push({ type: msg.type(), text: msg.text() }));
    page.on('pageerror', (err) => pageErrors.push(err));

    await page.goto('http://127.0.0.1:5500/workspace/baseline-html2test-deepseek-chat/html/6e09e030-d5a0-11f0-8040-510e90b1f3a7.html');
    const gp = new GraphPage(page);
    await gp.waitForReady();

    // Create an edge so that matrix cell represents an edge
    await gp.clickAddEdgeMode();
    await gp.clickCanvasAt(100, 100);
    await gp.clickCanvasAt(200, 200);
    await page.waitForTimeout(100);

    // Click the matrix cell corresponding to (A,B)
    await gp.clickMatrixCell(0, 1);

    // Wait for the highlight effect and redraw (highlightEdge uses setTimeout 500ms)
    await page.waitForTimeout(700);

    // Verify no page errors occurred during highlight
    expect(pageErrors).toEqual([]);
    const consoleErrors = consoleMessages.filter((m) => m.type === 'error');
    expect(consoleErrors.length).toBe(0);

    // Matrix cell should still indicate the edge exists
    expect(await gp.matrixCellText(0, 1)).toBe('1');
  });

  // Edge case: clicking empty canvas area while not in edge mode should deselect nodes and not create nodes
  test('Clicking empty canvas area does not add nodes (when not in Add Node mode) and does not error', async ({ page }) => {
    const consoleMessages = [];
    const pageErrors = [];
    page.on('console', (msg) => consoleMessages.push({ type: msg.type(), text: msg.text() }));
    page.on('pageerror', (err) => pageErrors.push(err));

    await page.goto('http://127.0.0.1:5500/workspace/baseline-html2test-deepseek-chat/html/6e09e030-d5a0-11f0-8040-510e90b1f3a7.html');
    const gp = new GraphPage(page);
    await gp.waitForReady();

    const before = await gp.nodeCount();

    // Click an area away from nodes (e.g., near right-bottom corner)
    // Canvas height is 300, pick position (canvas.width - 10, 290)
    const canvasBox = await gp.canvas.boundingBox();
    if (canvasBox) {
      const x = Math.max(10, Math.floor(canvasBox.width) - 10);
      const y = Math.max(10, Math.floor(canvasBox.height) - 10);
      await gp.clickCanvasAt(x, y);
    } else {
      // If bounding box is not available for some reason, click a safe default
      await gp.clickCanvasAt(400, 280);
    }

    await page.waitForTimeout(100);
    const after = await gp.nodeCount();

    // Node count should be unchanged
    expect(after).toBe(before);

    // No page errors or console.error
    expect(pageErrors).toEqual([]);
    const consoleErrors = consoleMessages.filter((m) => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });
});