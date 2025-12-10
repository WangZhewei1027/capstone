import { test, expect } from '@playwright/test';

// Test file: 0888d6a3-d59e-11f0-b3ae-79d1ce7b5503-graph-directed-undirected.spec.js
// Purpose: Validate the Graph Visualization page for directed/undirected graph drawing.
// Notes:
// - We load the page exactly as-is and observe console logs and page errors.
// - We do not modify the page or patch the runtime environment.
// - We assert expected DOM structure, interactions, canvas drawing behavior, and that no unexpected page errors occur.

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/0888d6a3-d59e-11f0-b3ae-79d1ce7b5503.html';

// Page object model for the graph visualization page
class GraphPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.consoleMessages = [];
    this.pageErrors = [];

    // Attach listeners to capture console messages and page errors for assertions
    this.page.on('console', msg => {
      // store console messages for tests to assert on
      this.consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    this.page.on('pageerror', err => {
      // store page errors (uncaught exceptions) for tests to assert on
      this.pageErrors.push(err);
    });
  }

  // Navigate to the app URL and ensure initial load
  async goto() {
    await this.page.goto(APP_URL);
  }

  // Get handles to key interactive elements
  async getCanvasElement() {
    return this.page.locator('#graphCanvas');
  }

  async getDirectedButton() {
    return this.page.locator('button', { hasText: 'Draw Directed Graph' });
  }

  async getUndirectedButton() {
    return this.page.locator('button', { hasText: 'Draw Undirected Graph' });
  }

  // Click the directed button
  async clickDirected() {
    await (await this.getDirectedButton()).click();
    // allow synchronous drawing to complete (it's sync but give a tiny tick)
    await this.page.waitForTimeout(50);
  }

  // Click the undirected button
  async clickUndirected() {
    await (await this.getUndirectedButton()).click();
    await this.page.waitForTimeout(50);
  }

  // Return [r,g,b,a] for a pixel at canvas coordinates (x,y)
  async getCanvasPixelRGBA(x, y) {
    // Evaluate in browser context to read canvas pixel data
    return await this.page.evaluate(({ x, y }) => {
      const canvas = document.getElementById('graphCanvas');
      const ctx = canvas.getContext('2d');
      const imageData = ctx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data;
      return [imageData[0], imageData[1], imageData[2], imageData[3]];
    }, { x, y });
  }

  // Get the entire canvas data URL (PNG) to compare canvas images
  async getCanvasDataURL() {
    return await this.page.evaluate(() => {
      const canvas1 = document.getElementById('graphCanvas');
      return canvas.toDataURL();
    });
  }
}

test.describe('Graph Visualization (Directed/Undirected) - UI and Canvas Drawing', () => {
  // Shared state for each test
  test.beforeEach(async ({ page }) => {
    // Nothing here; per-test GraphPage will attach listeners
  });

  // Test: initial page load - DOM elements exist and canvas is empty (transparent)
  test('Initial load shows title, canvas and both control buttons; canvas is initially blank', async ({ page }) => {
    const graph = new GraphPage(page);
    await graph.goto();

    // Verify title text is present
    await expect(page.locator('h1')).toHaveText(/Graph Visualization \(Directed\/Undirected\)/);

    // Verify canvas exists and has expected dimensions
    const canvas2 = await graph.getCanvasElement();
    await expect(canvas).toBeVisible();
    // Evaluate width/height attributes on the canvas element
    const dims = await page.evaluate(() => {
      const c = document.getElementById('graphCanvas');
      return { w: c.width, h: c.height, cssW: c.clientWidth, cssH: c.clientHeight };
    });
    expect(dims.w).toBe(600);
    expect(dims.h).toBe(400);

    // Verify both buttons are present and accessible
    const directedBtn = await graph.getDirectedButton();
    const undirectedBtn = await graph.getUndirectedButton();
    await expect(directedBtn).toBeVisible();
    await expect(undirectedBtn).toBeVisible();

    // Check that the canvas is initially empty/transparent at a known node location (A: 100,100)
    const pixelA = await graph.getCanvasPixelRGBA(100, 100);
    // Transparent canvas pixel expected: alpha = 0 or all zeros
    expect(pixelA[3] === 0 || (pixelA[0] === 0 && pixelA[1] === 0 && pixelA[2] === 0)).toBeTruthy();

    // Ensure no uncaught page errors happened during load
    expect(graph.pageErrors.length).toBe(0);
  });

  // Test: draw directed graph and verify nodes and edges drawn
  test('Clicking "Draw Directed Graph" draws nodes (blue) and edges (black) on the canvas', async ({ page }) => {
    const graph1 = new GraphPage(page);
    await graph.goto();

    // Interact: click directed graph button
    await graph.clickDirected();

    // Node centers (from HTML): A(100,100), B(300,50), C(300,200)
    // The nodes are filled with '#007BFF' => RGB(0,123,255)
    const nodeAcenter = await graph.getCanvasPixelRGBA(100, 100);
    const nodeBcenter = await graph.getCanvasPixelRGBA(300, 50);
    const nodeCcenter = await graph.getCanvasPixelRGBA(300, 200);

    // Assert centers are filled blue (alpha 255 expected)
    expect(nodeAcenter[3]).toBeGreaterThan(0);
    expect(nodeBcenter[3]).toBeGreaterThan(0);
    expect(nodeCcenter[3]).toBeGreaterThan(0);

    // Allow some tolerance in color sampling for antialiasing. We expect blue channel to be dominant.
    expect(nodeAcenter[2]).toBeGreaterThanOrEqual(200); // blue channel high
    expect(nodeAcenter[0]).toBeLessThanOrEqual(50);     // red small
    expect(nodeAcenter[1]).toBeGreaterThanOrEqual(100); // green moderate

    // Check an edge pixel: midpoint between A(100,100) and B(300,50) => approx (200,75)
    const edgeMidAB = await graph.getCanvasPixelRGBA(200, 75);
    // Edges are stroked with default (black) so expect dark pixel (black-ish)
    expect(edgeMidAB[0]).toBeLessThanOrEqual(50);
    expect(edgeMidAB[1]).toBeLessThanOrEqual(50);
    expect(edgeMidAB[2]).toBeLessThanOrEqual(50);
    expect(edgeMidAB[3]).toBeGreaterThan(0);

    // Ensure that we recorded no page errors during drawing
    expect(graph.pageErrors.length).toBe(0);
  });

  // Test: draw undirected graph and compare canvas image with directed graph drawing
  test('Clicking "Draw Undirected Graph" draws edges/nodes and produces a different canvas image than directed graph', async ({ page }) => {
    const graph2 = new GraphPage(page);
    await graph.goto();

    // Draw directed graph first and capture image
    await graph.clickDirected();
    const directedDataURL = await graph.getCanvasDataURL();

    // Draw undirected graph and capture image
    await graph.clickUndirected();
    const undirectedDataURL = await graph.getCanvasDataURL();

    // The two canvases should not be identical (directed draws arrowheads)
    expect(directedDataURL).not.toBe(undirectedDataURL);

    // Verify nodes still present for undirected graph: sample node A center
    const nodeA_undirected = await graph.getCanvasPixelRGBA(100, 100);
    expect(nodeA_undirected[3]).toBeGreaterThan(0);
    expect(nodeA_undirected[2]).toBeGreaterThanOrEqual(150); // blue-ish

    // Verify an edge pixel for undirected is black-ish as well
    const edgeMidAB_undirected = await graph.getCanvasPixelRGBA(200, 75);
    expect(edgeMidAB_undirected[0]).toBeLessThanOrEqual(60);
    expect(edgeMidAB_undirected[1]).toBeLessThanOrEqual(60);
    expect(edgeMidAB_undirected[2]).toBeLessThanOrEqual(60);

    // Ensure no runtime page errors occurred during these interactions
    expect(graph.pageErrors.length).toBe(0);
  });

  // Test: repeated clicks and idempotency - drawing repeatedly should not throw errors and canvas updates
  test('Repeatedly clicking draw buttons updates the canvas and does not produce page errors', async ({ page }) => {
    const graph3 = new GraphPage(page);
    await graph.goto();

    // Click sequence: directed -> directed -> undirected -> undirected -> directed
    await graph.clickDirected();
    const data1 = await graph.getCanvasDataURL();

    await graph.clickDirected();
    const data2 = await graph.getCanvasDataURL();

    await graph.clickUndirected();
    const data3 = await graph.getCanvasDataURL();

    await graph.clickUndirected();
    const data4 = await graph.getCanvasDataURL();

    await graph.clickDirected();
    const data5 = await graph.getCanvasDataURL();

    // Verify that canvases after consecutive identical clicks produce the same image (idempotent redraw)
    expect(data1).toBe(data2); // second directed same as first
    expect(data3).toBe(data4); // second undirected same as first undirected

    // And directed and undirected differ at times
    expect(data2).not.toBe(data3);

    // Final directed should match earlier directed
    expect(data5).toBe(data1);

    // No page errors throughout repeated interactions
    expect(graph.pageErrors.length).toBe(0);
  });

  // Test: accessibility and focus behavior of buttons
  test('Buttons are keyboard-focusable and reachable via Tab, and have descriptive text', async ({ page }) => {
    const graph4 = new GraphPage(page);
    await graph.goto();

    // Focus the page then tab to the first button
    await page.keyboard.press('Tab'); // typically moves to first focusable element (the first button)
    const focused = await page.evaluate(() => document.activeElement && document.activeElement.textContent);
    // The focused text should be one of the buttons
    expect(['Draw Directed Graph', 'Draw Undirected Graph']).toContain(focused);

    // Ensure both buttons have accessible text content
    const directedText = await (await graph.getDirectedButton()).innerText();
    const undirectedText = await (await graph.getUndirectedButton()).innerText();
    expect(directedText).toContain('Directed');
    expect(undirectedText).toContain('Undirected');

    // Ensure no page errors while focusing
    expect(graph.pageErrors.length).toBe(0);
  });

  // Test: Observe console messages and assert there are none that indicate errors
  test('Console should not emit error-level messages during normal interactions', async ({ page }) => {
    const graph5 = new GraphPage(page);
    await graph.goto();

    // Interact with the app to generate possible console output
    await graph.clickDirected();
    await graph.clickUndirected();

    // Inspect captured console messages for 'error' or 'warning' types
    const errorOrWarn = graph.consoleMessages.filter(m => m.type === 'error' || m.type === 'warning');
    // The implementation should not intentionally log errors; assert none were emitted
    expect(errorOrWarn.length).toBe(0);

    // And also confirm no page errors were thrown
    expect(graph.pageErrors.length).toBe(0);
  });
});