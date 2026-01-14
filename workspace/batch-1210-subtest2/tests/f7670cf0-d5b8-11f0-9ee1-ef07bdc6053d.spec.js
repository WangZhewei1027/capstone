import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-subtest2/html/f7670cf0-d5b8-11f0-9ee1-ef07bdc6053d.html';

class GraphPage {
  /**
   * Page object for the Graph Visualization app.
   * Encapsulates common interactions and queries used by the tests.
   */
  constructor(page) {
    this.page = page;
    this.buttonSelector = 'button[onclick="createGraph()"]';
    this.graphSelector = '#graph';
    this.nodeSelector = '.node';
    this.edgeSelector = '.edge';
  }

  async goto() {
    await this.page.goto(APP_URL);
    // Wait for the main button and graph container to be present
    await Promise.all([
      this.page.waitForSelector(this.buttonSelector, { state: 'visible' }),
      this.page.waitForSelector(this.graphSelector),
    ]);
  }

  async clickCreateGraph() {
    await this.page.click(this.buttonSelector);
  }

  // Returns the number of DOM nodes with class 'node'
  async getDomNodeCount() {
    return await this.page.$$eval(this.nodeSelector, nodes => nodes.length);
  }

  // Returns the number of DOM elements with class 'edge'
  async getDomEdgeCount() {
    return await this.page.$$eval(this.edgeSelector, edges => edges.length);
  }

  async getGraphInnerHTMLLength() {
    return await this.page.$eval(this.graphSelector, el => el.innerHTML.length);
  }

  // Get node positions and style values for visual checks
  async getNodePositions() {
    return await this.page.$$eval(this.nodeSelector, (nodes, graphSel) => {
      const graph = document.querySelector(graphSel);
      return nodes.map(n => ({
        left: parseFloat(n.style.left || getComputedStyle(n).left || 0),
        top: parseFloat(n.style.top || getComputedStyle(n).top || 0),
        width: n.clientWidth,
        height: n.clientHeight,
        text: n.textContent,
      }));
    }, this.graphSelector);
  }

  // Get graph container size
  async getGraphSize() {
    return await this.page.$eval(this.graphSelector, g => ({
      width: g.clientWidth,
      height: g.clientHeight,
    }));
  }

  // Get inline style attributes of edges for validation
  async getEdgeStyles() {
    return await this.page.$$eval(this.edgeSelector, edges =>
      edges.map(e => ({
        height: e.style.height,
        left: e.style.left,
        top: e.style.top,
        transform: e.style.transform,
      }))
    );
  }
}

test.describe('Graph Visualization FSM - states, transitions, and error monitoring', () => {
  // Arrays to capture console messages and page errors per test
  let consoleMessages = [];
  let pageErrors = [];

  test.beforeEach(async ({ page }) => {
    // Reset collectors for each test to isolate results
    consoleMessages = [];
    pageErrors = [];

    // Observe console messages and page errors
    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
    page.on('pageerror', err => {
      // pageerror receives an Error object from the page
      pageErrors.push(err);
    });

    // Navigate to the app
    const gp = new GraphPage(page);
    await gp.goto();
  });

  test.afterEach(async ({ page }) => {
    // Small sleep to ensure any asynchronous page errors surface (if any)
    // (not modifying environment, just waiting for events)
    await page.waitForTimeout(50);
  });

  test('Idle state (S0_Idle): initial render shows Create Graph button and empty graph', async ({ page }) => {
    /**
     * Validate the initial (Idle) state:
     * - The Create Graph button is visible
     * - The graph container exists and is empty (no node/edge DOM elements)
     * - No page-level errors were emitted during initial load/render
     */
    const gp = new GraphPage(page);

    // Button should be visible and enabled
    const button = await page.$(gp.buttonSelector);
    expect(button).not.toBeNull();
    const isVisible = await button.isVisible();
    expect(isVisible).toBe(true);

    // Graph container should exist
    const graph = await page.$(gp.graphSelector);
    expect(graph).not.toBeNull();

    // No nodes or edges should exist in Idle state
    const nodeCount = await gp.getDomNodeCount();
    const edgeCount = await gp.getDomEdgeCount();
    expect(nodeCount).toBe(0);
    expect(edgeCount).toBe(0);

    // Graph innerHTML should be empty
    const innerLen = await gp.getGraphInnerHTMLLength();
    expect(innerLen).toBe(0);

    // There should be no page errors on initial render
    expect(pageErrors.length).toBe(0);

    // There should be no console.error messages (we allow info/debug)
    const consoleErrorCount = consoleMessages.filter(m => m.type === 'error').length;
    expect(consoleErrorCount).toBe(0);
  });

  test('Transition CreateGraph (S0_Idle -> S1_GraphCreated): clicking Create Graph creates nodes and edges (DOM-level verification)', async ({ page }) => {
    /**
     * Validate the transition triggered by clicking the Create Graph button:
     * - The DOM should contain node elements equal to nodeCount (5)
     * - The graph container should be populated (innerHTML length > 0)
     * - The app should not emit page errors during the normal flow
     */
    const gp = new GraphPage(page);
    const EXPECTED_NODE_COUNT = 5;

    // Click to create graph
    await gp.clickCreateGraph();

    // Wait for nodes to appear
    await page.waitForSelector(`${gp.nodeSelector}`, { timeout: 2000 });

    // Validate number of node DOM elements
    const nodeCount = await gp.getDomNodeCount();
    expect(nodeCount).toBe(EXPECTED_NODE_COUNT);

    // Edges are created randomly; ensure we have a non-negative count and are DOM elements
    const edgeCount = await gp.getDomEdgeCount();
    expect(edgeCount).toBeGreaterThanOrEqual(0);

    // Graph innerHTML should now be non-empty
    const innerLen = await gp.getGraphInnerHTMLLength();
    expect(innerLen).toBeGreaterThan(0);

    // No page errors should have occurred during this normal interaction
    expect(pageErrors.length).toBe(0);

    // If edges exist, validate basic styling for edges
    if (edgeCount > 0) {
      const edgeStyles = await gp.getEdgeStyles();
      for (const s of edgeStyles) {
        // style.height should be set in pixels
        expect(s.height).toMatch(/^\d+px$/);
        // transform should include rotate(...) (string may vary)
        expect(s.transform).toContain('rotate');
      }
    }
  });

  test('S1_GraphCreated onEnter behavior: subsequent Create Graph clicks clear previous graph and recreate nodes', async ({ page }) => {
    /**
     * Validate that clicking Create Graph multiple times:
     * - Clears previous nodes/edges (no accumulation)
     * - Recreates nodes with (likely) different positions (visual re-render)
     * This validates the clearGraph() behavior observed in createGraph() entry actions.
     */
    const gp = new GraphPage(page);
    const EXPECTED_NODE_COUNT = 5;

    // First create
    await gp.clickCreateGraph();
    await page.waitForSelector(gp.nodeSelector, { timeout: 2000 });
    const firstCount = await gp.getDomNodeCount();
    expect(firstCount).toBe(EXPECTED_NODE_COUNT);

    // Record positions after first creation
    const firstPositions = await gp.getNodePositions();

    // Second create - should clear and recreate (not accumulate)
    await gp.clickCreateGraph();
    await page.waitForTimeout(200); // give some time for DOM changes
    const secondCount = await gp.getDomNodeCount();
    expect(secondCount).toBe(EXPECTED_NODE_COUNT);

    // Positions after second creation
    const secondPositions = await gp.getNodePositions();

    // At least one node's position should differ between runs (very high probability)
    // This is a probabilistic assertion; we don't fail the test if all are identical,
    // but we check and warn via an assertion that allows very rare collisions.
    const positionsDiffer = firstPositions.some((p, idx) => {
      const q = secondPositions[idx];
      return p.left !== q.left || p.top !== q.top;
    });
    // It's reasonable to expect a change; assert true but do not make it brittle:
    expect(positionsDiffer).toBe(true);
  });

  test('Visual placement checks: nodes are positioned within graph bounds and have expected styling', async ({ page }) => {
    /**
     * Validate visual feedback:
     * - Each node's left/top positions are within the graph container bounds
     * - Nodes have the expected class and contain the Node text label
     */
    const gp = new GraphPage(page);
    const EXPECTED_NODE_COUNT = 5;

    await gp.clickCreateGraph();
    await page.waitForSelector(gp.nodeSelector, { timeout: 2000 });

    const graphSize = await gp.getGraphSize();
    const positions = await gp.getNodePositions();

    expect(positions.length).toBe(EXPECTED_NODE_COUNT);

    for (const p of positions) {
      // left and top should be finite numbers
      expect(Number.isFinite(p.left)).toBe(true);
      expect(Number.isFinite(p.top)).toBe(true);

      // left/top should be >= 0 and within visible area (allowing node width/height)
      expect(p.left).toBeGreaterThanOrEqual(0);
      expect(p.top).toBeGreaterThanOrEqual(0);
      expect(p.left).toBeLessThanOrEqual(Math.max(0, graphSize.width));
      expect(p.top).toBeLessThanOrEqual(Math.max(0, graphSize.height));

      // Node text should start with 'Node '
      expect(p.text).toMatch(/^Node \d+/);
    }
  });

  test('Error scenarios: invoking createEdge with invalid arguments produces a TypeError (let failures happen naturally)', async ({ page }) => {
    /**
     * Intentionally invoke createEdge with invalid inputs to allow a runtime TypeError to occur.
     * We do NOT patch or define globals; we call the app's existing function and let the runtime
     * produce and emit the error. We then assert that a TypeError occurred and was captured via
     * pageerror events.
     */
    const gp = new GraphPage(page);

    // Ensure normal operations prior to intentional error produced no errors
    expect(pageErrors.length).toBe(0);

    // Attempt to call createEdge with undefined values to provoke a TypeError in the page context.
    // We catch the evaluation rejection so the test continues to inspect the captured pageErrors.
    let evalError = null;
    try {
      // This call should throw in the page context when createEdge tries to access properties on undefined
      await page.evaluate(() => {
        // Intentionally call createEdge with invalid args. createEdge is a top-level function in the page script.
        // We expect this to throw (TypeError) naturally in the page runtime.
        // Do NOT redefine or patch anything; just call the existing function.
        // eslint-disable-next-line no-undef
        return createEdge(undefined, undefined);
      });
    } catch (err) {
      evalError = err;
    }

    // The evaluation in page context should reject
    expect(evalError).not.toBeNull();

    // The page should have emitted at least one pageerror (TypeError)
    expect(pageErrors.length).toBeGreaterThanOrEqual(1);

    // Find a TypeError among captured pageErrors
    const foundTypeError = pageErrors.some(e => e && (e.name === 'TypeError' || e.message.includes('undefined')));
    expect(foundTypeError).toBe(true);
  });

  test('Error scenarios: invoking a non-existent function triggers a ReferenceError (observed via pageerror)', async ({ page }) => {
    /**
     * Intentionally call a function that does not exist to cause a ReferenceError.
     * We assert that this ReferenceError occurs naturally and is captured by page.on('pageerror').
     */
    // Ensure no pre-existing page errors
    expect(pageErrors.length).toBe(0);

    let evalError = null;
    try {
      await page.evaluate(() => {
        // This function does not exist; calling it should produce a ReferenceError in the page.
        // We intentionally do this to validate that ReferenceErrors propagate to the test harness.
        // eslint-disable-next-line no-undef
        return nonExistentFunction();
      });
    } catch (err) {
      evalError = err;
    }

    expect(evalError).not.toBeNull();

    // Ensure at least one pageerror was emitted and that one appears to be a ReferenceError
    expect(pageErrors.length).toBeGreaterThanOrEqual(1);
    const hasRefError = pageErrors.some(e => {
      if (!e) return false;
      // Some environments may not set name exactly; check message for 'not defined' or 'is not defined'
      return e.name === 'ReferenceError' || /is not defined|not defined/.test(e.message);
    });
    expect(hasRefError).toBe(true);
  });

  test('Robustness edge case: rapid repeated clicks do not accumulate nodes beyond expected count', async ({ page }) => {
    /**
     * Simulate rapid user interactions: click the Create Graph button multiple times in quick succession
     * and ensure the graph does not accumulate nodes (i.e., the implementation clears previous nodes)
     * and remains stable after rapid interactions.
     */
    const gp = new GraphPage(page);
    const EXPECTED_NODE_COUNT = 5;

    // Rapidly click the create button several times
    for (let i = 0; i < 4; i++) {
      await gp.clickCreateGraph();
    }

    // Wait for nodes to be present and stabilize
    await page.waitForSelector(gp.nodeSelector, { timeout: 2000 });
    await page.waitForTimeout(150); // small delay to allow any pending DOM operations

    const nodeCount = await gp.getDomNodeCount();
    // Implementation is expected to clear and recreate nodes each time - count should be exactly EXPECTED_NODE_COUNT
    expect(nodeCount).toBe(EXPECTED_NODE_COUNT);

    // Ensure no page-level errors were introduced by rapid clicking
    expect(pageErrors.length).toBe(0);
  });
});