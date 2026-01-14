import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-subtest2/html/f767f752-d5b8-11f0-9ee1-ef07bdc6053d.html';

// Page Object to encapsulate interactions with the Dijkstra visualization page
class DijkstraPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    // selectors inferred from the provided HTML
    this.runButton = "button[onclick='runDijkstra()']";
    this.resetButton = "button[onclick='resetGraph()']";
    this.canvas = '#canvas';
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async clickRun() {
    await this.page.click(this.runButton);
  }

  async clickReset() {
    await this.page.click(this.resetButton);
  }

  // Retrieve a snapshot of nodes (id, visited, distance) from the page's JS runtime
  async getNodesSnapshot() {
    return await this.page.evaluate(() => {
      // Expose minimal properties to the test for assertions
      if (!window.nodes) return null;
      return window.nodes.map(n => ({
        id: n.id,
        visited: Boolean(n.visited),
        distance: n.distance === Infinity ? 'Infinity' : n.distance,
        previousId: n.previous ? n.previous.id : null
      }));
    });
  }

  async getNodesCount() {
    return await this.page.evaluate(() => window.nodes ? window.nodes.length : 0);
  }

  async getCanvasSize() {
    return await this.page.evaluate(() => {
      const c = document.getElementById('canvas');
      if (!c) return null;
      return { width: c.width, height: c.height };
    });
  }

  // Helper to wait until at least one node is marked visited or timeout
  async waitForAnyNodeVisited(timeout = 5000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const snapshot = await this.getNodesSnapshot();
      if (snapshot && snapshot.some(n => n.visited)) return snapshot;
      await this.page.waitForTimeout(100);
    }
    return await this.getNodesSnapshot();
  }
}

test.describe('Dijkstra Visualization - FSM tests (f767f752-d5b8-11f0-9ee1-ef07bdc6053d)', () => {
  let dijkstra;
  let consoleMessages;
  let pageErrors;

  // Setup: navigate to the page and hook console/pageerror listeners to observe runtime behavior
  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    page.on('console', msg => {
      // capture console messages for later assertions; include type and text
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    page.on('pageerror', err => {
      // capture unhandled exceptions / runtime errors
      pageErrors.push(err);
    });

    dijkstra = new DijkstraPage(page);
    await dijkstra.goto();
  });

  test.afterEach(async () => {
    // Nothing to teardown explicitly; listeners are cleaned up by Playwright per test
  });

  test.describe('State S0_Idle (Initial state validations)', () => {
    test('Initial state: initGraph() and drawGraph() executed - nodes and canvas present', async () => {
      // This test validates that on page load (S0_Idle) the graph is initialized and drawn.
      // We assert that the "nodes" array exists, has 5 nodes, and their default distances are Infinity.
      const nodesCount = await dijkstra.getNodesCount();
      expect(nodesCount).toBe(5); // initGraph should have created 5 nodes

      const snapshot = await dijkstra.getNodesSnapshot();
      expect(snapshot).toBeDefined();
      expect(snapshot.length).toBe(5);
      // All nodes should initially be unvisited and distances should be Infinity
      for (const node of snapshot) {
        expect(node.visited).toBe(false);
        expect(node.distance).toBe('Infinity');
      }

      // Canvas presence and attributes (visual element expected by the FSM)
      const canvasSize = await dijkstra.getCanvasSize();
      expect(canvasSize).toEqual({ width: 600, height: 400 });

      // Ensure no runtime page errors were emitted during initialization
      expect(pageErrors.length).toBe(0);
    });
  });

  test.describe('State S1_Running (Run Dijkstra) and transitions', () => {
    test('Transition S0 -> S1: clicking "Run Dijkstra\'s Algorithm" starts algorithm and visits nodes', async () => {
      // Comment: This test clicks the Run button, waits for visualization to mark progress,
      // and asserts that at least one node becomes visited and the start node distance is 0.
      await dijkstra.clickRun();

      // Wait until at least one node is visited (algorithm uses 500ms step delays)
      const afterRunSnapshot = await dijkstra.waitForAnyNodeVisited(5000);
      expect(afterRunSnapshot).toBeDefined();

      // At least one node should be visited during the algorithm
      const visitedCount = afterRunSnapshot.filter(n => n.visited).length;
      expect(visitedCount).toBeGreaterThanOrEqual(1);

      // The start node (A) should have distance 0 once the run starts
      const nodeA = afterRunSnapshot.find(n => n.id === 'A');
      expect(nodeA).toBeDefined();
      // The code sets startNode.distance = 0 asynchronously; allow both 0 or '0' numeric
      expect(nodeA.distance === 0 || nodeA.distance === '0').toBeTruthy();

      // No uncaught runtime errors during run
      expect(pageErrors.length).toBe(0);
    });

    test('Transition S1 -> S0: clicking "Reset Graph" during run resets the graph state', async () => {
      // Comment: Start the algorithm, then click Reset during its execution.
      // Validate that resetGraph() reinitializes the nodes array and drawGraph() runs,
      // returning the app to the Idle state shape (5 fresh nodes, unvisited).
      await dijkstra.clickRun();

      // Wait briefly so algorithm starts marking nodes (but not necessarily finishes)
      await dijkstra.page.waitForTimeout(700);

      // Now click reset
      await dijkstra.clickReset();

      // Immediately after reset, nodes should be reinitialized to 5 nodes and unvisited
      const snapshotAfterReset = await dijkstra.getNodesSnapshot();
      expect(snapshotAfterReset).toBeDefined();
      expect(snapshotAfterReset.length).toBe(5);

      const nodeA = snapshotAfterReset.find(n => n.id === 'A');
      expect(nodeA).toBeDefined();
      expect(nodeA.visited).toBe(false); // reset creates new nodes unvisited

      // Distances should be initial (Infinity)
      for (const n of snapshotAfterReset) {
        expect(n.distance).toBe('Infinity');
      }

      // Ensure no runtime exceptions were thrown during reset
      expect(pageErrors.length).toBe(0);
    });
  });

  test.describe('Edge cases and error observation', () => {
    test('Clicking Run multiple times rapidly should not throw uncaught exceptions', async () => {
      // Comment: This tests for robustness when the Run button is clicked multiple times quickly.
      // It's expected that the implementation won't crash; we capture page errors to verify this.
      await Promise.all([
        dijkstra.clickRun(),
        dijkstra.clickRun(),
        dijkstra.clickRun()
      ]);

      // Allow some time for any asynchronous errors to surface
      await dijkstra.page.waitForTimeout(1200);

      // There should be no uncaught page errors
      expect(pageErrors.length).toBe(0);

      // And at least some nodes should be visited as the algorithm progresses
      const snapshot = await dijkstra.getNodesSnapshot();
      const visited = snapshot ? snapshot.some(n => n.visited) : false;
      expect(visited).toBeTruthy();
    });

    test('Reset while running should not produce uncaught exceptions and should reinitialize nodes', async () => {
      // Comment: Start the algorithm then reset, ensuring no runtime errors and that the app
      // lands back to initial state shape (5 nodes, unvisited).
      await dijkstra.clickRun();
      await dijkstra.page.waitForTimeout(600);
      await dijkstra.clickReset();

      // Allow a moment for reinitialization
      await dijkstra.page.waitForTimeout(200);

      const snapshot = await dijkstra.getNodesSnapshot();
      expect(snapshot).toBeDefined();
      expect(snapshot.length).toBe(5);
      for (const n of snapshot) {
        expect(n.visited).toBe(false);
        expect(n.distance).toBe('Infinity');
      }

      expect(pageErrors.length).toBe(0);
    });

    test('Observe console messages and page errors (diagnostic test)', async () => {
      // Comment: Collect console messages and page errors emitted by the page.
      // This test is primarily diagnostic: it asserts that no unhandled exceptions (pageerror)
      // occurred and captures console output for debugging visibility.
      // Wait briefly to capture any late console logs
      await dijkstra.page.waitForTimeout(300);

      // Expect no unexpected runtime errors
      expect(pageErrors.length).toBe(0);

      // The application may log nothing to console; ensure we can access the messages array
      expect(Array.isArray(consoleMessages)).toBe(true);

      // For transparency, assert that important UI elements exist as a further sanity check
      const canvasSize = await dijkstra.getCanvasSize();
      expect(canvasSize).toEqual({ width: 600, height: 400 });
      const nodesCount = await dijkstra.getNodesCount();
      expect(nodesCount).toBe(5);
    });
  });
});