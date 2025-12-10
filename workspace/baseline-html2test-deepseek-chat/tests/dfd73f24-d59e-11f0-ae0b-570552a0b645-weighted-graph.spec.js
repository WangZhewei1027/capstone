import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-deepseek-chat/html/dfd73f24-d59e-11f0-ae0b-570552a0b645.html';

// Page Object to encapsulate common interactions with the Weighted Graph page
class GraphPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.node1Input = page.locator('#node1');
    this.node2Input = page.locator('#node2');
    this.weightInput = page.locator('#weight');
    this.addEdgeButton = page.getByRole('button', { name: 'Add Edge' });
    this.addNodeButton = page.getByRole('button', { name: 'Add Node' });
    this.clearGraphButton = page.getByRole('button', { name: 'Clear Graph' });
    this.findShortestButton = page.getByRole('button', { name: 'Find Shortest Path' });
    this.startNodeInput = page.locator('#startNode');
    this.endNodeInput = page.locator('#endNode');
    this.canvas = page.locator('#graphCanvas');
  }

  // Set node1 input (will be uppercased by app on action)
  async setNode1(value) {
    await this.node1Input.fill(value);
  }

  async setNode2(value) {
    await this.node2Input.fill(value);
  }

  async setWeight(value) {
    await this.weightInput.fill(String(value));
  }

  async clickAddEdge() {
    await this.addEdgeButton.click();
  }

  async clickAddNode() {
    await this.addNodeButton.click();
  }

  async clickClearGraph() {
    await this.clearGraphButton.click();
  }

  async clickFindShortest() {
    await this.findShortestButton.click();
  }

  async setStartNode(value) {
    await this.startNodeInput.fill(value);
  }

  async setEndNode(value) {
    await this.endNodeInput.fill(value);
  }

  // Evaluate the graph object in page and return a snapshot of interest
  async graphSnapshot() {
    return this.page.evaluate(() => {
      const snapshot = {
        nodes: Array.from(window.graph ? window.graph.nodes : []),
        edges: {},
        positions: {},
        shortestPath: window.shortestPath === null ? null : Array.from(window.shortestPath)
      };
      if (window.graph) {
        for (const node of window.graph.nodes) {
          const neigh = Array.from(window.graph.edges.get(node) || []).map(([k, v]) => [k, v]);
          snapshot.edges[node] = neigh;
          const pos = window.graph.positions.get(node);
          snapshot.positions[node] = pos ? { x: pos.x, y: pos.y } : null;
        }
      }
      return snapshot;
    });
  }

  // Drag a node by name by simulating mouse events on the canvas.
  // Returns the new position of the node after dragging.
  async dragNodeByName(nodeName, deltaX = 30, deltaY = 30) {
    // Get node position and canvas bounding rect
    const data = await this.page.evaluate((name) => {
      const node = name.toUpperCase();
      const pos = window.graph && window.graph.positions.get(node);
      const canvas = document.getElementById('graphCanvas');
      if (!pos || !canvas) return null;
      const rect = canvas.getBoundingClientRect();
      return {
        pos,
        rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
      };
    }, nodeName);

    if (!data) return null;

    const startX = data.rect.left + data.pos.x;
    const startY = data.rect.top + data.pos.y;
    const endX = startX + deltaX;
    const endY = startY + deltaY;

    // Perform drag using the page.mouse API
    await this.page.mouse.move(startX, startY);
    await this.page.mouse.down();
    // intermediate move to simulate dragging
    await this.page.mouse.move((startX + endX) / 2, (startY + endY) / 2);
    await this.page.mouse.move(endX, endY);
    await this.page.mouse.up();

    // Return the updated position from page
    const newPos = await this.page.evaluate((name) => {
      const node = name.toUpperCase();
      const p = window.graph.positions.get(node);
      return p ? { x: p.x, y: p.y } : null;
    }, nodeName);

    return newPos;
  }
}

test.describe('Weighted Graph Visualization - End-to-End', () => {
  // Collect console errors and page errors for assertions
  test.beforeEach(async ({ page }) => {
    // Ensure fresh arrays for each test
    page.context()._collectedConsoleErrors = [];
    page.context()._collectedPageErrors = [];

    // Listen for console messages of type 'error'
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        page.context()._collectedConsoleErrors.push(msg.text());
      }
    });

    // Listen for unhandled page errors
    page.on('pageerror', (err) => {
      page.context()._collectedPageErrors.push(err);
    });

    // Navigate to the app
    await page.goto(APP_URL);
  });

  test.afterEach(async ({ page }) => {
    // If there are page errors, print them to test output for easier debugging
    const consoleErrors = page.context()._collectedConsoleErrors || [];
    const pageErrors = page.context()._collectedPageErrors || [];
    if (consoleErrors.length > 0) {
      console.log('Console errors captured during test:', consoleErrors);
    }
    if (pageErrors.length > 0) {
      console.log('Page errors captured during test:', pageErrors.map(e => String(e)));
    }
  });

  test('Initial load: page renders expected controls and canvas without runtime errors', async ({ page }) => {
    // Purpose: verify the page loads, key UI controls exist and there are no runtime errors logged
    const graphPage = new GraphPage(page);

    // Check title is present and correct
    await expect(page.locator('h1')).toHaveText('Weighted Graph Visualization');

    // Verify inputs and buttons are visible
    await expect(graphPage.node1Input).toBeVisible();
    await expect(graphPage.node2Input).toBeVisible();
    await expect(graphPage.weightInput).toBeVisible();
    await expect(graphPage.addEdgeButton).toBeVisible();
    await expect(graphPage.addNodeButton).toBeVisible();
    await expect(graphPage.clearGraphButton).toBeVisible();
    await expect(graphPage.findShortestButton).toBeVisible();
    await expect(graphPage.canvas).toBeVisible();

    // Assert no console error messages and no page errors were emitted on load
    const consoleErrors = page.context()._collectedConsoleErrors || [];
    const pageErrors = page.context()._collectedPageErrors || [];
    expect(consoleErrors.length, `Expected no console.error messages on load, found: ${consoleErrors.join(' | ')}`).toBe(0);
    expect(pageErrors.length, `Expected no page errors on load, found ${pageErrors.length}`).toBe(0);
  });

  test('Initial graph contains seeded nodes and edges', async ({ page }) => {
    // Purpose: verify the sample graph was initialized (A, B, C, D, E) and specific edges exist
    const graphPage = new GraphPage(page);
    const snap = await graphPage.graphSnapshot();

    // The initial script adds edges including nodes A, B, C, D, E
    expect(snap.nodes).toEqual(expect.arrayContaining(['A', 'B', 'C', 'D', 'E']));

    // Verify known edge A-B exists and weight equals 4
    const aNeighbors = snap.edges['A'] || [];
    const aToB = aNeighbors.find(([target]) => target === 'B');
    expect(aToB).toBeDefined();
    expect(aToB[1]).toBe(4);

    // Verify B-D exists with weight 5
    const bNeighbors = snap.edges['B'] || [];
    const bToD = bNeighbors.find(([target]) => target === 'D');
    expect(bToD).toBeDefined();
    expect(bToD[1]).toBe(5);

    // Ensure positions exist for nodes (visualization)
    for (const n of ['A', 'B', 'C']) {
      expect(snap.positions[n]).toBeTruthy();
      expect(typeof snap.positions[n].x).toBe('number');
      expect(typeof snap.positions[n].y).toBe('number');
    }
  });

  test('Add Node: clicking Add Node creates a new node and assigns a position', async ({ page }) => {
    // Purpose: test adding a standalone node via the UI
    const graphPage = new GraphPage(page);
    await graphPage.setNode1('X'); // will be uppercased by the app
    await graphPage.clickAddNode();

    const snap = await graphPage.graphSnapshot();
    expect(snap.nodes).toContain('X');
    expect(snap.positions['X']).toBeTruthy();
    expect(typeof snap.positions['X'].x).toBe('number');
    expect(typeof snap.positions['X'].y).toBe('number');
  });

  test('Add Edge: clicking Add Edge connects nodes with specified weight (undirected)', async ({ page }) => {
    // Purpose: test adding an edge between two nodes and verify adjacency and weight on both sides
    const graphPage = new GraphPage(page);
    await graphPage.setNode1('M');
    await graphPage.setNode2('N');
    await graphPage.setWeight(7);
    await graphPage.clickAddEdge();

    const snap = await graphPage.graphSnapshot();
    expect(snap.nodes).toContain('M');
    expect(snap.nodes).toContain('N');

    // M -> N weight should be 7
    const neighborsM = snap.edges['M'] || [];
    const mToN = neighborsM.find(([t]) => t === 'N');
    expect(mToN).toBeDefined();
    expect(mToN[1]).toBe(7);

    // N -> M weight should be 7 (undirected)
    const neighborsN = snap.edges['N'] || [];
    const nToM = neighborsN.find(([t]) => t === 'M');
    expect(nToM).toBeDefined();
    expect(nToM[1]).toBe(7);
  });

  test('Find Shortest Path: computes path and triggers an alert with the path', async ({ page }) => {
    // Purpose: verify Dijkstra's algorithm result via UI and capture the alert text
    const graphPage = new GraphPage(page);

    // Prepare to capture the alert dialog
    let dialogMessage = null;
    page.on('dialog', (dialog) => {
      dialogMessage = dialog.message();
      dialog.accept();
    });

    // Use the seeded graph: compute shortest path from A to E
    await graphPage.setStartNode('A');
    await graphPage.setEndNode('E');

    await graphPage.clickFindShortest();

    // Wait a tick to allow alert to be handled and shortestPath to be set
    await page.waitForTimeout(50);

    // Assert we received an alert describing the shortest path
    expect(dialogMessage).toBeTruthy();
    expect(dialogMessage).toMatch(/^Shortest path:/);

    // Verify the shortest path stored in the global variable matches the alert's contents
    const shortestPath = await page.evaluate(() => window.shortestPath);
    expect(Array.isArray(shortestPath)).toBe(true);
    // Expect the path to start with A and end with E
    expect(shortestPath[0]).toBe('A');
    expect(shortestPath[shortestPath.length - 1]).toBe('E');

    // Confirm the alert message contains the path joined by arrows
    const expectedString = `Shortest path: ${shortestPath.join(' → ')}`;
    expect(dialogMessage).toBe(expectedString);
  });

  test('Clear Graph: clicking Clear Graph empties nodes, edges, and positions', async ({ page }) => {
    // Purpose: ensure the clear graph action wipes all stored graph data
    const graphPage = new GraphPage(page);

    // Ensure graph initially has nodes
    const before = await graphPage.graphSnapshot();
    expect(before.nodes.length).toBeGreaterThan(0);

    // Clear
    await graphPage.clickClearGraph();

    const after = await graphPage.graphSnapshot();
    expect(after.nodes.length).toBe(0);
    expect(Object.keys(after.edges).length).toBe(0);
    // shortestPath should be null after clearing
    expect(after.shortestPath).toBeNull();
  });

  test('Find Shortest Path with missing nodes shows "No path found" alert', async ({ page }) => {
    // Purpose: verify the app handles edge case when nodes are missing or no path exists
    const graphPage = new GraphPage(page);

    // Clear graph to ensure no nodes present
    await graphPage.clickClearGraph();

    // Capture the alert dialog message
    let dialogMessage = null;
    page.on('dialog', (dialog) => {
      dialogMessage = dialog.message();
      dialog.accept();
    });

    // Set arbitrary nodes and request path
    await graphPage.setStartNode('A');
    await graphPage.setEndNode('B');
    await graphPage.clickFindShortest();

    // Small wait to ensure dialog has fired
    await page.waitForTimeout(50);

    expect(dialogMessage).toBe('No path found between the specified nodes.');

    // Ensure window.shortestPath is null in this case
    const shortestPath = await page.evaluate(() => window.shortestPath);
    expect(shortestPath).toBeNull();
  });

  test('Dragging a node updates its stored position (interactive canvas drag)', async ({ page }) => {
    // Purpose: simulate mouse drag on canvas for a specific node and assert its position changed
    const graphPage = new GraphPage(page);

    // Choose a known node (A exists in initial load)
    // Retrieve original position
    const originalSnap = await graphPage.graphSnapshot();
    expect(originalSnap.positions['A']).toBeTruthy();
    const origPos = originalSnap.positions['A'];

    // Drag the node by a delta and get new position
    const newPos = await graphPage.dragNodeByName('A', 40, 30);
    expect(newPos).toBeTruthy();

    // Position should have changed meaningfully (not exactly equal to original)
    const movedX = Math.abs(newPos.x - origPos.x);
    const movedY = Math.abs(newPos.y - origPos.y);
    expect(movedX + movedY).toBeGreaterThan(0.5); // allow tiny differences from rounding
  });

  test('No unexpected runtime errors were emitted during user interactions', async ({ page }) => {
    // Purpose: perform a set of interactions and then assert no console/page errors were emitted
    const graphPage = new GraphPage(page);

    // Prepare to capture dialogs so they don't block flow
    page.on('dialog', (d) => d.accept());

    // Perform several interactions
    await graphPage.setNode1('P');
    await graphPage.setNode2('Q');
    await graphPage.setWeight(3);
    await graphPage.clickAddEdge();

    await graphPage.setNode1('Z');
    await graphPage.clickAddNode();

    await graphPage.setStartNode('P');
    await graphPage.setEndNode('Q');
    await graphPage.clickFindShortest();

    await graphPage.clickClearGraph();

    // Short wait to flush any async errors to listeners
    await page.waitForTimeout(100);

    const consoleErrors = page.context()._collectedConsoleErrors || [];
    const pageErrors = page.context()._collectedPageErrors || [];

    // Assert that no console errors were emitted
    expect(consoleErrors.length, `Expected no console.error messages during interactions, found: ${consoleErrors.join(' | ')}`).toBe(0);

    // Assert that no unhandled page errors were emitted
    expect(pageErrors.length, `Expected no page errors during interactions, found ${pageErrors.length}`).toBe(0);
  });
});