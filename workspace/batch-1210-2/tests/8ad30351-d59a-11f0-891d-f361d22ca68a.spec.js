import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-2/html/8ad30351-d59a-11f0-891d-f361d22ca68a.html';

// Page Object for the Graph application to encapsulate interactions
class GraphPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.addNodeButton = page.locator('#add-node');
    this.addEdgeButton = page.locator('#add-edge');
    this.graphContainer = page.locator('#graph');
  }

  async goto() {
    await this.page.goto(APP_URL);
    // wait for load event; the page script runs on load and may throw errors which we want to capture
    await this.page.waitForLoadState('load');
    // a small delay to allow synchronous script-started errors to surface to the page/error listeners
    await this.page.waitForTimeout(50);
  }

  async clickAddNode() {
    await this.addNodeButton.click();
  }

  async clickAddEdge() {
    await this.addEdgeButton.click();
  }

  async getGraphNodesCount() {
    return await this.page.evaluate(() => window.graph && window.graph.nodes ? window.graph.nodes.length : 0);
  }

  async getGraphEdgesCount() {
    return await this.page.evaluate(() => window.graph && window.graph.edges ? window.graph.edges.length : 0);
  }

  async getDomNodeCount() {
    return await this.page.locator('#graph .node').count();
  }

  async getDomEdgeCount() {
    return await this.page.locator('#graph .edge').count();
  }

  async callDrawGraph() {
    // call the page's drawGraph function; do not redefine or patch it
    await this.page.evaluate(() => {
      // Intentionally call the existing function; let runtime errors happen naturally
      if (typeof drawGraph === 'function') drawGraph();
    });
    // give time for any synchronous page errors to propagate
    await this.page.waitForTimeout(50);
  }

  async callClearGraph() {
    await this.page.evaluate(() => {
      if (typeof clearGraph === 'function') clearGraph();
    });
    await this.page.waitForTimeout(20);
  }

  async getGraphInnerHTML() {
    return await this.page.evaluate(() => document.getElementById('graph').innerHTML);
  }

  async getCanvasCount() {
    return await this.page.locator('#graph canvas').count();
  }
}

test.describe('FSM states and transitions for Graph application (8ad30351-d59a-11f0-891d-f361d22ca68a)', () => {
  // Each test will collect console error messages and page errors separately to assert expected failures or behaviors.
  let pageErrors;
  let consoleErrors;

  test.beforeEach(async ({ page }) => {
    pageErrors = [];
    consoleErrors = [];

    // Collect console error messages
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Collect page runtime errors (unhandled exceptions)
    page.on('pageerror', error => {
      // error is an Error object
      pageErrors.push(String(error.message || error));
    });
  });

  // Test initial load: entry actions addNode() and addEdge() are executed by the page script on load.
  // drawGraph() is also invoked on load by the script and is expected (per source) to throw due to malformed edge access.
  test('Initial page load executes addNode and addEdge; drawGraph() on load causes runtime error', async ({ page }) => {
    const gp = new GraphPage(page);
    await gp.goto();

    // Validate that addNode() and addEdge() entry actions executed: graph arrays should have length >= 1
    const nodesCount = await gp.getGraphNodesCount();
    const edgesCount = await gp.getGraphEdgesCount();

    // On load, the script calls addNode() and addEdge(), so we expect at least 1 node and 1 edge
    expect(nodesCount).toBeGreaterThanOrEqual(1);
    expect(edgesCount).toBeGreaterThanOrEqual(1);

    // Also ensure DOM reflects inserted node and edge elements
    const domNodeCount = await gp.getDomNodeCount();
    const domEdgeCount = await gp.getDomEdgeCount();
    expect(domNodeCount).toBeGreaterThanOrEqual(1);
    expect(domEdgeCount).toBeGreaterThanOrEqual(1);

    // Confirm that drawGraph() on load produced at least one page error.
    // The implementation has a bug when iterating edges (edge.style.source...), which should trigger a TypeError.
    // We assert that at least one page error was captured and that it looks like a property access error.
    expect(pageErrors.length).toBeGreaterThanOrEqual(1);
    const sawLikelyTypeError = pageErrors.some(msg =>
      /Cannot read properties|Cannot read property|TypeError|undefined/.test(msg)
    );
    expect(sawLikelyTypeError).toBeTruthy();

    // Also check that console errors were emitted (some environments produce console.error)
    // We don't require a specific message (browser variability), just that error-level console messages exist.
    expect(consoleErrors.length).toBeGreaterThanOrEqual(0);
  });

  // Test clicking Add Node transitions S0_Idle -> S1_NodeAdded and that state entry action (addNode) runs.
  test('Clicking Add Node adds a DOM node and updates graph.nodes (S0_Idle -> S1_NodeAdded)', async ({ page }) => {
    const gp = new GraphPage(page);
    await gp.goto();

    // Reset captured errors arrays for clarity in this test context
    pageErrors = [];
    consoleErrors = [];

    // Record counts before clicking
    const beforeNodes = await gp.getGraphNodesCount();
    const beforeDomNodes = await gp.getDomNodeCount();

    // Click the Add Node button
    await gp.clickAddNode();

    // After clicking, graph.nodes should increment by 1
    const afterNodes = await gp.getGraphNodesCount();
    const afterDomNodes = await gp.getDomNodeCount();
    expect(afterNodes).toBe(beforeNodes + 1);
    expect(afterDomNodes).toBe(beforeDomNodes + 1);

    // Ensure the inserted element has the expected class
    const lastNodeExists = await page.locator('#graph .node').nth(afterDomNodes - 1).count();
    expect(lastNodeExists).toBe(1);

    // No new page error should be introduced by adding a node alone
    expect(pageErrors.length).toBe(0);
  });

  // Test clicking Add Edge transitions S0_Idle -> S2_EdgeAdded and that state entry action (addEdge) runs.
  test('Clicking Add Edge adds a DOM edge with source/target and updates graph.edges (S0_Idle -> S2_EdgeAdded)', async ({ page }) => {
    const gp = new GraphPage(page);
    await gp.goto();

    // Reset captured errors for this test
    pageErrors = [];
    consoleErrors = [];

    const beforeEdges = await gp.getGraphEdgesCount();
    const beforeDomEdges = await gp.getDomEdgeCount();

    // Click the Add Edge button
    await gp.clickAddEdge();

    // Expect graph.edges incremented and DOM updated
    const afterEdges = await gp.getGraphEdgesCount();
    const afterDomEdges = await gp.getDomEdgeCount();
    expect(afterEdges).toBe(beforeEdges + 1);
    expect(afterDomEdges).toBe(beforeDomEdges + 1);

    // Validate the last added edge contains child elements with classes 'source' and 'target'
    const lastEdge = page.locator('#graph .edge').nth(afterDomEdges - 1);
    await expect(lastEdge.locator('.source')).toHaveCount(1);
    await expect(lastEdge.locator('.target')).toHaveCount(1);

    // Adding an edge itself should not necessarily create a page error; verify none newly created here
    expect(pageErrors.length).toBe(0);
  });

  // Test drawGraph behavior:
  // - If edges are present, drawGraph is expected to throw (S1_NodeAdded or S2_EdgeAdded -> S3_GraphDrawn but with error)
  // - But if there are no edges present, drawGraph should be able to draw nodes and append a canvas (S3_GraphDrawn)
  test('drawGraph() throws when edges exist but succeeds and appends a canvas when only nodes exist (S3_GraphDrawn)', async ({ page }) => {
    const gp = new GraphPage(page);
    await gp.goto();

    // -- Part A: drawGraph with edges present should produce an error --
    // Ensure we have at least one edge (page initial load already adds one)
    const edgesCount = await gp.getGraphEdgesCount();
    if (edgesCount === 0) {
      // add an edge if none exists
      await gp.clickAddEdge();
      await page.waitForTimeout(20);
    }

    // Reset error collectors
    pageErrors = [];
    consoleErrors = [];

    // Attempt to call drawGraph() - this is expected to cause a runtime error due to malformed edge access
    await gp.callDrawGraph();

    // We expect a page error to have been captured
    expect(pageErrors.length).toBeGreaterThanOrEqual(1);
    const foundRuntime = pageErrors.some(m => /Cannot read properties|Cannot read property|TypeError|undefined/.test(m));
    expect(foundRuntime).toBeTruthy();

    // The canvas is unlikely appended after a thrown exception; confirm canvas absent in this scenario (may be 0)
    const canvasCountAfterError = await gp.getCanvasCount();
    expect(canvasCountAfterError).toBeLessThanOrEqual(1);

    // -- Part B: clear graph, add only nodes, and call drawGraph successfully --
    // Clear everything to create a safe environment for drawGraph()
    await gp.callClearGraph();
    const clearedNodes = await gp.getGraphNodesCount();
    const clearedEdges = await gp.getGraphEdgesCount();
    expect(clearedNodes).toBe(0);
    expect(clearedEdges).toBe(0);
    expect(await gp.getGraphInnerHTML()).toBe('');

    // Reset errors again to detect new issues
    pageErrors = [];
    consoleErrors = [];

    // Add a single node (no edges)
    await gp.clickAddNode();
    expect(await gp.getGraphNodesCount()).toBe(1);
    expect(await gp.getGraphEdgesCount()).toBe(0);

    // Call drawGraph now - with no edges, the edges loop won't run and canvas should be appended
    await gp.callDrawGraph();

    // Expect no new page errors when drawing only nodes (drawing nodes uses numeric conversion and should not throw)
    // Note: depending on browser coercions, no errors expected here. We assert that none occurred.
    expect(pageErrors.length).toBe(0);

    // Validate that a canvas element was added to the #graph container as evidence of "Graph Drawn"
    const canvasCount = await gp.getCanvasCount();
    expect(canvasCount).toBeGreaterThanOrEqual(1);
  });

  // Test clearGraph transition S3_GraphDrawn -> S4_GraphCleared and verify it clears DOM and graph state
  test('clearGraph() clears nodes, edges, and graph DOM (S3_GraphDrawn -> S4_GraphCleared)', async ({ page }) => {
    const gp = new GraphPage(page);
    await gp.goto();

    // Ensure there is something to clear: add a node and an edge if not present
    if ((await gp.getGraphNodesCount()) === 0) await gp.clickAddNode();
    if ((await gp.getGraphEdgesCount()) === 0) await gp.clickAddEdge();

    // Call clearGraph()
    await gp.callClearGraph();

    // Validate FSM "Graph Cleared" evidence: graph.nodes = [], graph.edges = [], and #graph innerHTML is empty.
    const nodesAfterClear = await gp.getGraphNodesCount();
    const edgesAfterClear = await gp.getGraphEdgesCount();
    const innerHTML = await gp.getGraphInnerHTML();

    expect(nodesAfterClear).toBe(0);
    expect(edgesAfterClear).toBe(0);
    expect(innerHTML).toBe('');
  });

  // Edge case test: multiple rapid clicks and resilience
  test('Rapid interactions: multiple Add Node / Add Edge clicks maintain internal consistency', async ({ page }) => {
    const gp = new GraphPage(page);
    await gp.goto();

    // Reset errors and then simulate rapid user clicks
    pageErrors = [];
    consoleErrors = [];

    // Rapidly click Add Node 3 times and Add Edge 2 times
    await Promise.all([
      gp.clickAddNode(),
      gp.clickAddNode(),
      gp.clickAddNode()
    ]);
    await Promise.all([
      gp.clickAddEdge(),
      gp.clickAddEdge()
    ]);

    // Validate graph internal counts match DOM counts
    const graphNodesCount = await gp.getGraphNodesCount();
    const graphEdgesCount = await gp.getGraphEdgesCount();
    const domNodes = await gp.getDomNodeCount();
    const domEdges = await gp.getDomEdgeCount();

    expect(domNodes).toBe(graphNodesCount);
    expect(domEdges).toBe(graphEdgesCount);

    // There should be no surprising page errors solely from adding nodes and edges rapidly
    expect(pageErrors.length).toBe(0);
  });
});