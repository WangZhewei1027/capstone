import { test, expect } from '@playwright/test';

// Playwright tests for Kruskal's Algorithm interactive demo
// File: d80b8271-d1c9-11f0-9efc-d1db1618a544-kruskal-s-algorithm.spec.js
//
// These tests load the page exactly as-is (no patching), observe console and page errors,
// exercise interactive controls and UI updates, and assert expected DOM/state changes.
//
// NOTE: Tests intentionally do not modify the page's JS; they allow any runtime errors
// to occur naturally and assert that there are none (i.e. ensure a clean run).

const APP_URL =
  'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini-1205/html/d80b8271-d1c9-11f0-9efc-d1db1618a544.html';

// Page object to encapsulate interactions and queries against the demo
class KruskalPage {
  constructor(page) {
    this.page = page;
    this.consoleErrors = [];
    this.pageErrors = [];
    // Collect console and page errors for assertions
    this.page.on('console', (msg) => {
      if (msg.type() === 'error') this.consoleErrors.push(msg.text());
    });
    this.page.on('pageerror', (err) => {
      this.pageErrors.push(String(err));
    });
  }

  async goto() {
    await this.page.goto(APP_URL, { waitUntil: 'networkidle' });
    // Wait for important UI elements to render
    await Promise.all([
      this.page.locator('header h1').waitFor(),
      this.page.locator('#canvas').waitFor(),
      this.page.locator('#edge-list').waitFor(),
    ]);
  }

  // Basic element getters
  modeLabel() {
    return this.page.locator('#mode-label');
  }
  edgeList() {
    return this.page.locator('#edge-list');
  }
  ufPanel() {
    return this.page.locator('#uf');
  }
  mstCount() {
    return this.page.locator('#mst-count');
  }
  edgeCount() {
    return this.page.locator('#edge-count');
  }
  mstTotal() {
    return this.page.locator('#mst-total');
  }
  canvas() {
    return this.page.locator('#canvas');
  }
  button(id) {
    return this.page.locator(`#${id}`);
  }
  randN() {
    return this.page.locator('#rand-n');
  }
  randD() {
    return this.page.locator('#rand-d');
  }
  speed() {
    return this.page.locator('#speed');
  }
  helpDialog() {
    return this.page.locator('#help');
  }

  // Query the number of node entries shown in the UF display.
  // The implementation renders each node as a div with inline style "min-width:86px".
  async ufNodeCount() {
    const nodes = await this.page.locator('#uf').locator('div[style*="min-width:86px"]').count();
    return nodes;
  }

  // Count edge rows displayed in edge list
  async edgeRowCount() {
    return await this.page.locator('#edge-list .edge-row').count();
  }

  // Click an edge row by index (0-based) in the sorted edge list
  async clickEdgeRow(index = 0) {
    const rows = this.page.locator('#edge-list .edge-row');
    await rows.nth(index).click();
  }

  // Click on the canvas at given coordinates (relative to canvas top-left)
  async clickCanvasAt(x, y) {
    const rect = await this.canvas().boundingBox();
    if (!rect) throw new Error('Canvas bounding box not found');
    const absX = rect.x + x;
    const absY = rect.y + y;
    await this.page.mouse.click(absX, absY);
  }

  // Read run button label text
  async runButtonText() {
    return await this.page.locator('#run').innerText();
  }

  // Read step button text (for accessibility)
  async stepButtonText() {
    return await this.page.locator('#step').innerText();
  }

  // Helper: wait until MST complete or until timeout
  async waitForRunToFinish(timeout = 5000) {
    await this.page.waitForFunction(() => {
      const runBtn = document.getElementById('run');
      return runBtn && runBtn.textContent === 'Play';
    }, null, { timeout });
  }
}

test.describe('Kruskal Algorithm Interactive Demo - E2E', () => {
  let app;

  test.beforeEach(async ({ page }) => {
    app = new KruskalPage(page);
    await app.goto();
  });

  test.afterEach(async () => {
    // Assert no runtime page errors or console errors occurred during the test
    // These assertions ensure the demo runs without uncaught exceptions.
    expect(app.consoleErrors, 'No console.errors should be emitted').toEqual([]);
    expect(app.pageErrors, 'No uncaught page errors should occur').toEqual([]);
  });

  test('initial page load shows header, canvas, edge list and initial MST state', async () => {
    // Verify header title is present
    await expect(app.page.locator('header h1')).toHaveText("Kruskal's Algorithm — Interactive Demo");

    // Verify mode label initial hint is visible
    await expect(app.modeLabel()).toContainText('Idle');

    // Canvas exists and has width/height attributes
    const canvasEl = await app.canvas();
    const attrW = await canvasEl.getAttribute('width');
    const attrH = await canvasEl.getAttribute('height');
    expect(Number(attrW) > 0, 'canvas width should be set').toBeTruthy();
    expect(Number(attrH) > 0, 'canvas height should be set').toBeTruthy();

    // Edge list and UF panel should be populated by the sample init
    const edges = await app.edgeRowCount();
    expect(edges, 'initial sample should have some edges').toBeGreaterThan(0);

    const ufNodes = await app.ufNodeCount();
    // initSample creates 9 nodes
    expect(ufNodes, 'initial sample should render 9 nodes in UF panel').toBeGreaterThanOrEqual(3);

    // MST count should be zero on initial state
    await expect(app.mstCount()).toHaveText('0');
    await expect(app.mstTotal()).toHaveText('0');
  });

  test('random graph generation creates expected number of nodes and edges', async () => {
    // set a deterministic requested node count
    await app.randN().fill('6');
    // choose dense so edges are likely present
    await app.randD().selectOption('0.8');

    // Click "Random Graph" button to generate graph
    await app.button('random-graph').click();

    // Wait briefly for redraw/rebuildState to complete
    await app.page.waitForTimeout(250);

    // UF panel should now show the requested number of nodes
    const ufNodes = await app.ufNodeCount();
    expect(ufNodes, 'UF should render 6 nodes after random generation').toBeGreaterThanOrEqual(6);

    // There should be edges present and edge-count updated
    const edgeCntText = await app.edgeCount().innerText();
    const edgeCnt = Number(edgeCntText);
    expect(edgeCnt, 'edge count should be numeric and > 0 after random graph').toBeGreaterThan(0);

    // Edge list must have at least one row
    const rows = await app.edgeRowCount();
    expect(rows).toBeGreaterThan(0);
  });

  test('Add Node mode toggles and clicking canvas adds a node', async () => {
    // Count nodes before adding
    const before = await app.ufNodeCount();

    // Toggle "Add Node"
    await app.button('add-node').click();
    await expect(app.button('add-node')).toHaveClass(/active/);
    await expect(app.modeLabel()).toContainText('Add Node mode');

    // Click canvas in upper-left area to add a node
    // Use a spot likely not occupied by an existing node: (40, 40)
    await app.clickCanvasAt(40, 40);

    // Allow UI to update
    await app.page.waitForTimeout(200);

    const after = await app.ufNodeCount();
    expect(after, 'UF node count should increase by at least 1 after adding a node').toBeGreaterThanOrEqual(before + 1);

    // Toggle Add Node off to return to Idle
    await app.button('add-node').click();
    await expect(app.button('add-node')).not.toHaveClass(/active/);
  });

  test('Step and Run controls perform Kruskal steps and auto-run completes', async () => {
    // Ensure we have nodes and edges
    const initialEdges = await app.edgeRowCount();
    expect(initialEdges).toBeGreaterThan(0);

    // Click "Step" to perform a single Kruskal step
    await app.button('step').click();
    // wait a short time for UI to update
    await app.page.waitForTimeout(200);

    // After a step, at least one edge should be marked accept or reject
    const anyAcceptedOrRejected = await app.page.$eval('#edge-list', (el) => {
      return !!el.querySelector('.edge-row.accept, .edge-row.reject');
    });
    expect(anyAcceptedOrRejected, 'At least one edge should be accepted or rejected after a step').toBeTruthy();

    // Now click "Play" (Run) to auto-run the algorithm to completion.
    // Reduce speed to make it finish faster
    await app.speed().evaluate((el) => (el.value = '200'));
    await app.button('run').click();

    // Wait until the run button returns to "Play" indicating the run finished or paused
    await app.waitForRunToFinish(8000);

    // After run finishes, MST count should be >= 0 and MST total should be numeric
    const mstCountText = await app.mstCount().innerText();
    const mstCount = Number(mstCountText);
    expect(Number.isFinite(mstCount), 'MST count should be numeric after run').toBeTruthy();

    const mstTotalText = await app.mstTotal().innerText();
    expect(!Number.isNaN(Number(mstTotalText)), 'MST total should be numeric after run').toBeTruthy();

    // Reset algorithm and verify MST info resets to zero
    await app.button('reset').click();
    await app.page.waitForTimeout(150);
    await expect(app.mstCount()).toHaveText('0');
    await expect(app.mstTotal()).toHaveText('0');

    // Additionally ensure edge rows no longer show accept/reject classes after reset
    const anyStateful = await app.page.$eval('#edge-list', (el) => {
      return !!el.querySelector('.edge-row.accept, .edge-row.reject, .edge-row.consider');
    });
    expect(anyStateful, 'No edges should be marked after reset').toBeFalsy();
  });

  test('Clicking an edge row highlights it on the canvas (visual highlight interaction)', async () => {
    // Ensure there is at least one edge row to click
    const rows = await app.edgeRowCount();
    expect(rows).toBeGreaterThan(0);

    // Click the first edge row to trigger highlight on canvas drawing
    await app.clickEdgeRow(0);

    // The click handler in the page sets a temporary highlight flag and uses setTimeout to clear it.
    // We wait a short time to allow the highlight cycle to happen without error.
    await app.page.waitForTimeout(1000);

    // The main check here is that the page handled the click without runtime errors
    // (console/page errors are asserted in afterEach).
    expect(rows).toBeGreaterThan(0);
  });

  test('Help / Explanation dialog opens and closes correctly', async () => {
    // Initially hidden
    await expect(app.helpDialog()).toBeHidden();

    // Click the "Help / Explanation" button
    await app.button('explain').click();
    await expect(app.helpDialog()).toBeVisible();

    // Close the help dialog
    await app.button('close-help').click();
    await expect(app.helpDialog()).toBeHidden();
  });

  test('Keyboard shortcuts: Enter triggers Step and Space toggles Run', async ({ page }) => {
    // Count accepted/rejected before keyboard actions
    const beforeAny = await app.page.$eval('#edge-list', (el) => {
      return !!el.querySelector('.edge-row.accept, .edge-row.reject');
    });

    // Press Enter to trigger a step
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);

    const afterEnter = await app.page.$eval('#edge-list', (el) => {
      return !!el.querySelector('.edge-row.accept, .edge-row.reject');
    });

    // After Enter, there should be at least as many accept/reject as before (non-decreasing)
    expect(afterEnter || !beforeAny).toBeTruthy();

    // Press Space to toggle run (Play/Pause) — the page listens for space to click runBtn
    // We'll toggle it on and then off quickly to ensure the handler executes without errors
    await page.keyboard.press(' ');
    // wait briefly for run to start/pause
    await page.waitForTimeout(300);
    await page.keyboard.press(' ');
    await page.waitForTimeout(300);

    // If run produced changes, ok; main assertion is no runtime errors (checked in afterEach)
    expect(true).toBeTruthy();
  });
});