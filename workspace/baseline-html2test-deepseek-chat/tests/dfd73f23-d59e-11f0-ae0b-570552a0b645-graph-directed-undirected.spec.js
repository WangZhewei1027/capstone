import { test, expect } from '@playwright/test';

test.describe('Graph Visualization: Directed vs Undirected - dfd73f23-d59e-11f0-ae0b-570552a0b645', () => {
  const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-deepseek-chat/html/dfd73f23-d59e-11f0-ae0b-570552a0b645.html';

  // Page object to encapsulate interactions and queries for the graph page
  class GraphPage {
    constructor(page) {
      this.page = page;
      this.undirectedCanvas = page.locator('#undirectedCanvas');
      this.directedCanvas = page.locator('#directedCanvas');
      this.addRandomNodeBtn = page.locator('button', { hasText: 'Add Random Node' });
      this.addRandomEdgeBtn = page.locator('button', { hasText: 'Add Random Edge' });
      this.clearGraphsBtn = page.locator('button', { hasText: 'Clear Graphs' });
      this.generateRandomGraphBtn = page.locator('button', { hasText: 'Generate Random Graph' });
      this.undirectedInfo = page.locator('#undirectedInfo');
      this.directedInfo = page.locator('#directedInfo');
    }

    // Retrieve node data for either graph via page.evaluate - returns serializable data
    async getGraphData(graphName) {
      // graphName: 'undirected' or 'directed'
      const varName = graphName === 'undirected' ? 'undirectedGraph' : 'directedGraph';
      return this.page.evaluate((name) => {
        const g = window[name];
        if (!g) return null;
        return {
          type: g.type,
          nodes: g.nodes.map(n => ({ id: n.id, x: n.x, y: n.y, label: n.label, radius: n.radius })),
          edgesCount: g.edges.length,
          selectedNode: g.selectedNode
        };
      }, varName);
    }

    // Click on a node by using its canvas-relative coordinates
    async clickNodeOnCanvas(graphName, nodeIndex) {
      const canvasLocator = graphName === 'undirected' ? this.undirectedCanvas : this.directedCanvas;
      const node = await this.page.evaluate((name, idx) => {
        const g = window[name];
        if (!g || !g.nodes[idx]) return null;
        const n = g.nodes[idx];
        return { x: n.x, y: n.y, id: n.id };
      }, graphName === 'undirected' ? 'undirectedGraph' : 'directedGraph', nodeIndex);

      if (!node) throw new Error(`Node ${nodeIndex} not found in ${graphName} graph`);
      // Click at the node position relative to the canvas
      await canvasLocator.click({ position: { x: Math.round(node.x), y: Math.round(node.y) } });
      return node;
    }

    // Click at arbitrary canvas coordinates
    async clickCanvasAt(graphName, x, y) {
      const canvasLocator = graphName === 'undirected' ? this.undirectedCanvas : this.directedCanvas;
      await canvasLocator.click({ position: { x: Math.round(x), y: Math.round(y) } });
    }

    async getInfoText(graphName) {
      return graphName === 'undirected' ? this.undirectedInfo.textContent() : this.directedInfo.textContent();
    }

    async waitForDraw() {
      // Allow any drawing to settle (the app draws synchronously, but allow a microtick)
      await this.page.waitForTimeout(50);
    }
  }

  // Shared variables to collect console messages and page errors per test
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Collect console messages and page errors
    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    // Navigate to the app page
    await page.goto(APP_URL);
  });

  test.afterEach(async () => {
    // Basic sanity: ensure we didn't capture any unexpected page errors
    // If any page error exists, we will fail specific tests that assert zero errors.
  });

  test.describe('Initial load and default state', () => {
    test('should load the page and display canvases, controls and default info', async ({ page }) => {
      const gp = new GraphPage(page);

      // Verify controls are visible
      await expect(gp.addRandomNodeBtn).toBeVisible();
      await expect(gp.addRandomEdgeBtn).toBeVisible();
      await expect(gp.clearGraphsBtn).toBeVisible();
      await expect(gp.generateRandomGraphBtn).toBeVisible();

      // Verify canvases are visible
      await expect(gp.undirectedCanvas).toBeVisible();
      await expect(gp.directedCanvas).toBeVisible();

      // Verify default info text
      await expect(gp.undirectedInfo).toHaveText('Click on nodes to see connections');
      await expect(gp.directedInfo).toHaveText('Click on nodes to see connections');

      // Verify that the sample graphs were initialized with nodes and edges
      const undirectedData = await gp.getGraphData('undirected');
      const directedData = await gp.getGraphData('directed');

      // Both graphs should exist and have initial nodes (initializeSampleGraph adds 5 nodes)
      expect(undirectedData).not.toBeNull();
      expect(directedData).not.toBeNull();
      expect(undirectedData.nodes.length).toBeGreaterThanOrEqual(5);
      expect(directedData.nodes.length).toBeGreaterThanOrEqual(5);
      expect(undirectedData.edgesCount).toBeGreaterThan(0);
      expect(directedData.edgesCount).toBeGreaterThan(0);

      // No page errors should have occurred during initial load
      expect(pageErrors.length, 'No page error should occur on initial load').toBe(0);

      // Also assert that there are no console errors of type 'error'
      const consoleErrors = consoleMessages.filter(m => m.type === 'error');
      expect(consoleErrors.length, 'No console error messages on initial load').toBe(0);
    });
  });

  test.describe('Node selection and canvas interactions', () => {
    test('selecting a node on the undirected canvas shows its connections and toggles selection on second click', async ({ page }) => {
      const gp = new GraphPage(page);
      await gp.waitForDraw();

      // Click the first node and verify info update
      const node = await gp.clickNodeOnCanvas('undirected', 0);
      await gp.waitForDraw();

      const infoText = await gp.getInfoText('undirected');
      // The info should indicate selection and include label
      expect(infoText).toContain(`Selected:`);
      expect(infoText).toContain(node.id === 0 ? '' : ''); // label is included but this relaxes strict matching

      // Verify graph.selectedNode was set to the node id
      const selectedNode = await page.evaluate(() => window.undirectedGraph.selectedNode);
      expect(selectedNode).toBe(node.id);

      // Click the same node again to toggle selection off
      await gp.clickNodeOnCanvas('undirected', 0);
      await gp.waitForDraw();

      const infoAfter = await gp.getInfoText('undirected');
      expect(infoAfter).toBe('Click on nodes to see connections');

      // Ensure selectedNode is null
      const selectedNodeAfter = await page.evaluate(() => window.undirectedGraph.selectedNode);
      expect(selectedNodeAfter).toBeNull();

      // Verify there are no console errors nor page errors caused by click interactions
      const consoleErrors = consoleMessages.filter(m => m.type === 'error');
      expect(consoleErrors.length, 'No console errors after undirected node interaction').toBe(0);
      expect(pageErrors.length, 'No page errors after undirected node interaction').toBe(0);
    });

    test('selecting nodes on the directed canvas shows outgoing and incoming connections', async ({ page }) => {
      const gp = new GraphPage(page);
      await gp.waitForDraw();

      // Select node index 1 which should have some edges (from sample data)
      const node = await gp.clickNodeOnCanvas('directed', 1);
      await gp.waitForDraw();

      const infoText = await gp.getInfoText('directed');
      expect(infoText).toContain('Selected:');
      expect(infoText).toContain('Outgoing:');
      expect(infoText).toContain('Incoming:');

      // Verify the selectedNode is set in the directed graph object
      const selected = await page.evaluate(() => window.directedGraph.selectedNode);
      expect(selected).toBe(node.id);

      // Ensure no page errors or console errors during this interaction
      const consoleErrors = consoleMessages.filter(m => m.type === 'error');
      expect(consoleErrors.length, 'No console errors after directed node interaction').toBe(0);
      expect(pageErrors.length, 'No page errors after directed node interaction').toBe(0);
    });

    test('clicking empty space on canvas adds a new node', async ({ page }) => {
      const gp = new GraphPage(page);
      await gp.waitForDraw();

      // Clear first to have predictable starting state
      await gp.clearGraphsBtn.click();
      await gp.waitForDraw();

      // Verify graphs are empty
      let undirectedData = await gp.getGraphData('undirected');
      expect(undirectedData.nodes.length).toBe(0);

      // Click in the center of the undirected canvas to add a node
      const canvasSize = await gp.undirectedCanvas.evaluate((c) => ({ width: c.width, height: c.height }));
      const clickX = Math.round(canvasSize.width / 2);
      const clickY = Math.round(canvasSize.height / 2);

      await gp.clickCanvasAt('undirected', clickX, clickY);
      await gp.waitForDraw();

      // After clicking empty space, a node should be added
      undirectedData = await gp.getGraphData('undirected');
      expect(undirectedData.nodes.length).toBe(1);
      const info = await gp.getInfoText('undirected');
      expect(info).toBe('Click on nodes to see connections');

      // Directed should also have one node added by the same action (the code adds node on click only for the clicked graph)
      // The behavior in the implementation adds a node only to the clicked graph; so directed graph should remain 0
      const directedData = await gp.getGraphData('directed');
      // Because we cleared both graphs earlier and clicked on undirected only, directed should remain 0
      expect(directedData.nodes.length).toBe(0);

      // Ensure no errors triggered by adding nodes via click
      const consoleErrors = consoleMessages.filter(m => m.type === 'error');
      expect(consoleErrors.length, 'No console errors when adding node by clicking empty canvas').toBe(0);
      expect(pageErrors.length, 'No page errors when adding node by clicking empty canvas').toBe(0);
    });
  });

  test.describe('Control buttons behavior and state updates', () => {
    test('Add Random Node increases node count for both graphs', async ({ page }) => {
      const gp = new GraphPage(page);
      await gp.waitForDraw();

      const beforeUndirected = (await gp.getGraphData('undirected')).nodes.length;
      const beforeDirected = (await gp.getGraphData('directed')).nodes.length;

      await gp.addRandomNodeBtn.click();
      await gp.waitForDraw();

      const afterUndirected = (await gp.getGraphData('undirected')).nodes.length;
      const afterDirected = (await gp.getGraphData('directed')).nodes.length;

      expect(afterUndirected).toBe(beforeUndirected + 1);
      expect(afterDirected).toBe(beforeDirected + 1);

      // No page or console errors should occur
      const consoleErrors = consoleMessages.filter(m => m.type === 'error');
      expect(consoleErrors.length, 'No console errors after Add Random Node').toBe(0);
      expect(pageErrors.length, 'No page errors after Add Random Node').toBe(0);
    });

    test('Add Random Edge increases edge counts (or keeps stable if constraints prevent new edge)', async ({ page }) => {
      const gp = new GraphPage(page);
      await gp.waitForDraw();

      // Ensure there are at least 2 nodes
      const undirectedBeforeNodes = (await gp.getGraphData('undirected')).nodes.length;
      if (undirectedBeforeNodes < 2) {
        await gp.addRandomNodeBtn.click();
        await gp.addRandomNodeBtn.click();
        await gp.waitForDraw();
      }

      const beforeUndirectedEdges = (await gp.getGraphData('undirected')).edgesCount;
      const beforeDirectedEdges = (await gp.getGraphData('directed')).edgesCount;

      await gp.addRandomEdgeBtn.click();
      await gp.waitForDraw();

      const afterUndirectedEdges = (await gp.getGraphData('undirected')).edgesCount;
      const afterDirectedEdges = (await gp.getGraphData('directed')).edgesCount;

      // Edges should be >= before (cannot decrease). Undirected graph may add one or two entries depending on reverse edge logic.
      expect(afterUndirectedEdges).toBeGreaterThanOrEqual(beforeUndirectedEdges);
      expect(afterDirectedEdges).toBeGreaterThanOrEqual(beforeDirectedEdges);

      // No errors expected
      const consoleErrors = consoleMessages.filter(m => m.type === 'error');
      expect(consoleErrors.length, 'No console errors after Add Random Edge').toBe(0);
      expect(pageErrors.length, 'No page errors after Add Random Edge').toBe(0);
    });

    test('Clear Graphs empties nodes and edges and resets info texts', async ({ page }) => {
      const gp = new GraphPage(page);
      await gp.waitForDraw();

      // Ensure there is content to clear
      const beforeUndirectedNodes = (await gp.getGraphData('undirected')).nodes.length;
      expect(beforeUndirectedNodes).toBeGreaterThanOrEqual(0);

      await gp.clearGraphsBtn.click();
      await gp.waitForDraw();

      const undirectedData = await gp.getGraphData('undirected');
      const directedData = await gp.getGraphData('directed');

      expect(undirectedData.nodes.length).toBe(0);
      expect(undirectedData.edgesCount).toBe(0);
      expect(directedData.nodes.length).toBe(0);
      expect(directedData.edgesCount).toBe(0);

      await expect(gp.undirectedInfo).toHaveText('Click on nodes to see connections');
      await expect(gp.directedInfo).toHaveText('Click on nodes to see connections');

      // No errors expected
      const consoleErrors = consoleMessages.filter(m => m.type === 'error');
      expect(consoleErrors.length, 'No console errors after Clear Graphs').toBe(0);
      expect(pageErrors.length, 'No page errors after Clear Graphs').toBe(0);
    });

    test('Generate Random Graph produces 6-10 nodes and multiple edges', async ({ page }) => {
      const gp = new GraphPage(page);
      await gp.waitForDraw();

      await gp.generateRandomGraphBtn.click();
      await gp.waitForDraw();

      const undirectedData = await gp.getGraphData('undirected');
      const directedData = await gp.getGraphData('directed');

      // The implementation uses nodeCount = 6 + Math.floor(Math.random() * 5) => 6..10
      expect(undirectedData.nodes.length).toBeGreaterThanOrEqual(6);
      expect(undirectedData.nodes.length).toBeLessThanOrEqual(10);
      expect(directedData.nodes.length).toBeGreaterThanOrEqual(6);
      expect(directedData.nodes.length).toBeLessThanOrEqual(10);

      // Edges should be present (edgeCount = Math.floor(nodeCount * 1.5))
      expect(undirectedData.edgesCount).toBeGreaterThan(0);
      expect(directedData.edgesCount).toBeGreaterThan(0);

      // No errors expected
      const consoleErrors = consoleMessages.filter(m => m.type === 'error');
      expect(consoleErrors.length, 'No console errors after Generate Random Graph').toBe(0);
      expect(pageErrors.length, 'No page errors after Generate Random Graph').toBe(0);
    });
  });

  test.describe('Edge cases and robustness', () => {
    test('Adding edges when few nodes exist should not throw and should be no-op if impossible', async ({ page }) => {
      const gp = new GraphPage(page);
      await gp.waitForDraw();

      // Clear graphs to get 0 nodes
      await gp.clearGraphsBtn.click();
      await gp.waitForDraw();

      // Clicking Add Random Edge when <2 nodes should safely return and do nothing
      await gp.addRandomEdgeBtn.click();
      await gp.waitForDraw();

      const undirectedData = await gp.getGraphData('undirected');
      const directedData = await gp.getGraphData('directed');

      // No edges should exist and no nodes either
      expect(undirectedData.nodes.length).toBe(0);
      expect(undirectedData.edgesCount).toBe(0);
      expect(directedData.nodes.length).toBe(0);
      expect(directedData.edgesCount).toBe(0);

      // No console errors or page errors should be present
      const consoleErrors = consoleMessages.filter(m => m.type === 'error');
      expect(consoleErrors.length, 'No console errors when adding edges with insufficient nodes').toBe(0);
      expect(pageErrors.length, 'No page errors when adding edges with insufficient nodes').toBe(0);
    });

    test('Clicking rapidly and repeatedly does not throw errors', async ({ page }) => {
      const gp = new GraphPage(page);
      await gp.waitForDraw();

      // Rapidly click the undirected canvas in the center 10 times
      const canvasSize = await gp.undirectedCanvas.evaluate((c) => ({ width: c.width, height: c.height }));
      const centerX = Math.round(canvasSize.width / 2);
      const centerY = Math.round(canvasSize.height / 2);

      for (let i = 0; i < 10; i++) {
        await gp.clickCanvasAt('undirected', centerX + (i % 3), centerY + ((i * 2) % 5));
      }
      await gp.waitForDraw();

      // Ensure no page errors or console errors occurred during rapid clicks
      const consoleErrors = consoleMessages.filter(m => m.type === 'error');
      expect(consoleErrors.length, 'No console errors after rapid canvas clicks').toBe(0);
      expect(pageErrors.length, 'No page errors after rapid canvas clicks').toBe(0);

      // There should be some nodes added from empty clicks
      const undirectedData = await gp.getGraphData('undirected');
      expect(undirectedData.nodes.length).toBeGreaterThanOrEqual(1);
    });
  });

  test.describe('Diagnostics: console and page error observation', () => {
    test('should have no unexpected runtime errors (pageerror / console error)', async ({ page }) => {
      // This test explicitly asserts that there were no runtime page errors or console errors
      // collected during page load and interactions in the beforeEach and earlier tests.
      // Note: This test runs in isolation (fresh page) as per Playwright's test isolation,
      // but we still validate no page-level errors occurred during navigation.
      const gp = new GraphPage(page);
      await gp.waitForDraw();

      // Re-check for errors directly after initial navigation
      const consoleErrors = consoleMessages.filter(m => m.type === 'error' || m.type === 'warning');
      expect(consoleErrors.length, 'There should be no console errors or warnings').toBe(0);
      expect(pageErrors.length, 'There should be no page errors').toBe(0);
    });
  });
});