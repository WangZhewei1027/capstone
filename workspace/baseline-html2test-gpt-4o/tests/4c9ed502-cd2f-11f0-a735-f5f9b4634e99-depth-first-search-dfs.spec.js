import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/4c9ed502-cd2f-11f0-a735-f5f9b4634e99.html';

// Page Object for the DFS Graph page
class GraphPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.graph = page.locator('#graph');
    this.nodeSelector = '.node';
  }

  // Navigate to the application URL
  async goto() {
    await this.page.goto(APP_URL);
  }

  // Click the center of the graph area to trigger the DFS (document click handler)
  async clickGraphCenter() {
    const box = await this.graph.boundingBox();
    if (!box) throw new Error('Graph element not found or not visible');
    await this.page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  }

  // Click a particular node by id (e.g., '#C')
  async clickNode(id) {
    await this.page.click(`#${id}`);
  }

  // Return an array of node ids that currently have the 'visited' class
  async getVisitedNodeIds() {
    return await this.page.evaluate(() => {
      const visited = Array.from(document.querySelectorAll('.node.visited'));
      return visited.map(n => n.id);
    });
  }

  // Return an array of all node ids present on the page
  async getAllNodeIds() {
    return await this.page.evaluate(() => {
      return Array.from(document.querySelectorAll('.node')).map(n => n.id);
    });
  }

  // Wait until at least expectedCount nodes have the 'visited' class (timeout ms optional)
  async waitForVisitedCount(expectedCount, timeout = 5000) {
    await this.page.waitForFunction(
      (sel, count) => document.querySelectorAll(sel + '.visited').length >= count,
      this.nodeSelector,
      expectedCount,
      { timeout }
    );
  }

  // Get computed background-color of a node by id (e.g., '#A')
  async getNodeBackgroundColor(id) {
    return await this.page.evaluate((nodeId) => {
      const el = document.getElementById(nodeId);
      if (!el) return null;
      return window.getComputedStyle(el).backgroundColor;
    }, id);
  }

  // Read adjacencyList from the page (if available)
  async getAdjacencyList() {
    return await this.page.evaluate(() => {
      // Return undefined if not present to avoid throwing
      return typeof adjacencyList !== 'undefined' ? adjacencyList : null;
    });
  }
}

test.describe('Depth-First Search (DFS) Visualization - interactive tests', () => {
  let pageErrors;
  let consoleMessages;

  // Attach listeners for console and page errors before each test so we capture them during load and interaction
  test.beforeEach(async ({ page }) => {
    pageErrors = [];
    consoleMessages = [];

    page.on('pageerror', (err) => {
      // Capture uncaught exceptions (ReferenceError, TypeError, etc.)
      pageErrors.push(err);
    });

    page.on('console', (msg) => {
      // Capture console messages of any type
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
  });

  // Test initial page load and default state
  test('Initial load: all nodes present and none are marked visited, computed styles match unvisited state', async ({ page }) => {
    // Purpose: Verify the default state of the graph before any interaction.
    const gp = new GraphPage(page);
    await gp.goto();

    // Ensure all expected nodes are present
    const nodeIds = await gp.getAllNodeIds();
    // Expect 6 nodes A-F
    expect(nodeIds.sort()).toEqual(['A', 'B', 'C', 'D', 'E', 'F'].sort());

    // Ensure none are visited initially
    const visitedInitially = await gp.getVisitedNodeIds();
    expect(visitedInitially.length).toBe(0);

    // Verify the default background color corresponds to the unvisited color (#6200ea -> rgb(98, 0, 234))
    const bgA = await gp.getNodeBackgroundColor('A');
    expect(bgA).toBeTruthy();
    expect(bgA).toContain('rgb(98, 0, 234)'); // unvisited color

    // There should be no uncaught page errors on initial load
    expect(pageErrors.length).toBe(0);
    // There should be no console.error messages on initial load
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  // Test the primary interaction: clicking triggers DFS and nodes are marked over time
  test('Clicking the graph starts DFS: nodes are marked visited progressively and all nodes become visited', async ({ page }) => {
    // Purpose: Validate that a document-level click triggers DFS traversal starting at 'A'
    const gp = new GraphPage(page);
    await gp.goto();

    // Start traversal by clicking the center of the graph
    await gp.clickGraphCenter();

    // Immediately after click, 'A' should be marked visited synchronously by dfs('A')
    await page.waitForFunction(() => document.getElementById('A').classList.contains('visited'), { timeout: 1000 });
    const visitedAfterImmediate = await gp.getVisitedNodeIds();
    expect(visitedAfterImmediate).toContain('A');

    // Other nodes are scheduled with setTimeout. Wait for all nodes to be visited (expected within ~2 seconds).
    await gp.waitForVisitedCount(6, 5000);
    const allVisited = await gp.getVisitedNodeIds();
    expect(allVisited.length).toBe(6);
    // Verify visually that visited nodes have the visited background color (#03dac6 -> rgb(3, 218, 198))
    for (const id of allVisited) {
      const bg = await gp.getNodeBackgroundColor(id);
      expect(bg).toContain('rgb(3, 218, 198)');
    }

    // Validate there were no uncaught exceptions during the interaction
    expect(pageErrors.length).toBe(0);
    // Also ensure there were no console.error messages during or after traversal
    const errorsFromConsole = consoleMessages.filter(m => m.type === 'error');
    expect(errorsFromConsole.length).toBe(0);
  });

  // Test reset behavior when clicking again: classes removed then traversal restarts
  test('Clicking again resets visited states and restarts traversal (resetGraph + dfs)', async ({ page }) => {
    // Purpose: Ensure subsequent clicks clear previous visited state and re-run the DFS from 'A'
    const gp = new GraphPage(page);
    await gp.goto();

    // First click to complete traversal
    await gp.clickGraphCenter();
    await gp.waitForVisitedCount(6, 5000);
    let visited = await gp.getVisitedNodeIds();
    expect(visited.length).toBe(6);

    // Second click: according to the implementation resetGraph() runs first (removes 'visited'), then dfs('A') adds 'visited' to A synchronously.
    await gp.clickGraphCenter();

    // Immediately after second click, only 'A' should be visited (others should have been cleared by resetGraph)
    // Use a short timeout since behavior is synchronous for reset + A
    await page.waitForFunction(() => document.getElementById('A').classList.contains('visited'), { timeout: 500 });
    const visitedImmediatelyAfterSecondClick = await gp.getVisitedNodeIds();
    // A must be present
    expect(visitedImmediatelyAfterSecondClick).toContain('A');
    // At this precise moment, other nodes should not yet be visited (they are scheduled)
    const othersVisited = visitedImmediatelyAfterSecondClick.filter(id => id !== 'A');
    expect(othersVisited.length).toBe(0);

    // Give traversal time to complete again and confirm all nodes visited
    await gp.waitForVisitedCount(6, 5000);
    visited = await gp.getVisitedNodeIds();
    expect(visited.length).toBe(6);

    // Ensure no page errors occurred during reset + re-run
    expect(pageErrors.length).toBe(0);
    const consoleErrs = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrs.length).toBe(0);
  });

  // Test that clicking on any DOM element (e.g., a specific node) also triggers DFS because the listener is on document
  test('Clicking a specific node triggers DFS (document click listener) and behaves identically', async ({ page }) => {
    // Purpose: Verify the global click handler triggers regardless of click target.
    const gp = new GraphPage(page);
    await gp.goto();

    // Click node 'C' directly
    await gp.clickNode('C');

    // Confirm 'A' still gets marked visited immediately (because dfs('A') is called on document click, not dfs('C') — but the handler always calls dfs('A'))
    // Important: Implementation attaches a document.click handler that always calls dfs('A'), so clicking node C should start traversal at A
    await page.waitForFunction(() => document.getElementById('A').classList.contains('visited'), { timeout: 1000 });
    const visitedNow = await gp.getVisitedNodeIds();
    expect(visitedNow).toContain('A');

    // Wait for traversal to finish
    await gp.waitForVisitedCount(6, 5000);
    const allVisited = await gp.getVisitedNodeIds();
    expect(allVisited.length).toBe(6);

    // Confirm adjacencyList exists and contains expected keys (sanity check of internal data)
    const adjacency = await gp.getAdjacencyList();
    expect(adjacency).not.toBeNull();
    expect(Object.keys(adjacency).sort()).toEqual(['A', 'B', 'C', 'D', 'E', 'F'].sort());
    // Spot-check a couple of neighbor relations
    expect(adjacency['A']).toEqual(['B', 'C']);
    expect(adjacency['D']).toEqual(['C']);

    // Confirm no uncaught page errors
    expect(pageErrors.length).toBe(0);
    const consoleErr = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErr.length).toBe(0);
  });

  // Comprehensive check: ensure there are no ReferenceError / SyntaxError / TypeError or console.error across page lifecycle and interactions
  test('No runtime exceptions (ReferenceError, SyntaxError, TypeError) or console.error messages during lifecycle and interactions', async ({ page }) => {
    // Purpose: Monitor for any runtime errors or console.error outputs during navigation and typical interactions.
    const gp = new GraphPage(page);

    await gp.goto();

    // Perform a couple of interactions
    await gp.clickGraphCenter();
    await gp.waitForVisitedCount(6, 5000);
    await gp.clickGraphCenter();
    // After second click wait for re-completion
    await gp.waitForVisitedCount(6, 5000);

    // Assert that no page errors (uncaught exceptions) occurred
    // If any ReferenceError/TypeError/... happened they would have been captured in pageErrors
    expect(pageErrors.length).toBe(0);

    // Assert there are no console error messages
    const consoleErrorMessages = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrorMessages.length).toBe(0);
  });
});