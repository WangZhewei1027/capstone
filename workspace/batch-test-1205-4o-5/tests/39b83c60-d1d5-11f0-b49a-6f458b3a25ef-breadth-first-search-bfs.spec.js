import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-4o-5/html/39b83c60-d1d5-11f0-b49a-6f458b3a25ef.html';

// Page object for interacting with the BFS visualization
class GraphPage {
  constructor(page) {
    this.page = page;
  }

  // Wait for the graph grid to be present
  async waitForGraph() {
    await this.page.waitForSelector('#graph');
    // ensure nodes are created
    await this.page.waitForSelector('.node');
  }

  // Returns a selector for a node by coordinates
  nodeSelector(row, col) {
    return `.node[data-row="${row}"][data-col="${col}"]`;
  }

  // Click a node at (row, col)
  async clickNode(row, col) {
    await this.page.click(this.nodeSelector(row, col));
  }

  // Get inline style.backgroundColor for a node
  async getNodeInlineBackground(row, col) {
    return await this.page.$eval(this.nodeSelector(row, col), (el) => el.style.backgroundColor || '');
  }

  // Check whether a node has the 'visited' class
  async isNodeVisited(row, col) {
    return await this.page.$eval(this.nodeSelector(row, col), (el) => el.classList.contains('visited'));
  }

  // Count visited nodes
  async countVisitedNodes() {
    return await this.page.$$eval('.node.visited', (els) => els.length);
  }

  // Click the Start BFS button
  async clickStartBFS() {
    await this.page.click('#startBFS');
  }

  // Get total number of nodes rendered
  async totalNodes() {
    return await this.page.$$eval('.node', (els) => els.length);
  }

  // Get text content of a specific node
  async getNodeText(row, col) {
    return await this.page.$eval(this.nodeSelector(row, col), (el) => el.textContent);
  }
}

test.describe('Breadth-First Search (BFS) Visualization - UI and behavior', () => {
  let consoleErrors = [];
  let pageErrors = [];

  test.beforeEach(async ({ page }) => {
    // Capture console error messages
    consoleErrors = [];
    pageErrors = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push({
          text: msg.text(),
          location: msg.location ? msg.location() : null,
        });
      }
    });

    page.on('pageerror', (err) => {
      // pageerror delivers Error objects
      pageErrors.push({
        message: err?.message,
        stack: err?.stack,
      });
    });

    // Navigate to the application
    await page.goto(APP_URL);
  });

  test.afterEach(async () => {
    // Ensure tests can assert about console/page errors within individual tests.
    // No global assertions here; individual tests will assert expected error counts.
  });

  test('Initial page load: graph grid and controls render correctly', async ({ page }) => {
    // Purpose: Verify initial DOM structure, node count, and button presence
    const graph = new GraphPage(page);
    await graph.waitForGraph();

    // Expect 7x7 nodes = 49
    const total = await graph.totalNodes();
    expect(total).toBe(49);

    // Check top-left node text and attributes
    const topLeftText = await graph.getNodeText(0, 0);
    expect(topLeftText).toBe('0,0');

    // Ensure start button is present and visible
    const startButton = await page.$('#startBFS');
    expect(startButton).not.toBeNull();
    expect(await startButton.isVisible()).toBe(true);

    // Initially, no node should have 'visited' class
    const initialVisitedCount = await graph.countVisitedNodes();
    expect(initialVisitedCount).toBe(0);

    // Assert that there were no console errors or page errors during load
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Clicking a node toggles its inline background style (simulate adding/removing an edge)', async ({ page }) => {
    // Purpose: Verify toggleNode behavior updates inline style.backgroundColor on click
    const graph1 = new GraphPage(page);
    await graph.waitForGraph();

    // Click node (0,0) to toggle on
    await graph.clickNode(0, 0);
    const bgAfterFirstClick = await graph.getNodeInlineBackground(0, 0);
    // The inline style should reflect the toggle - expect 'lightblue' (set inline in the app)
    // It might be exactly 'lightblue' when read from element.style.backgroundColor
    expect(bgAfterFirstClick).toContain('light');

    // Click node (0,0) again to toggle off
    await graph.clickNode(0, 0);
    const bgAfterSecondClick = await graph.getNodeInlineBackground(0, 0);
    // After toggling off, inline background should be empty string
    expect(bgAfterSecondClick).toBe('');

    // No console/page errors should have occurred during toggling
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Starting BFS marks the expected connected nodes as visited from (0,0)', async ({ page }) => {
    // Purpose: Validate BFS traversal from (0,0) with the initial grid adjacency
    const graph2 = new GraphPage(page);
    await graph.waitForGraph();

    // Click Start BFS which clears visited classes and then runs bfs(0,0)
    await graph.clickStartBFS();

    // Based on the provided adjacency, starting at (0,0) should visit (0,0), (0,1), and (1,0)
    const expectedVisited = [
      [0, 0],
      [0, 1],
      [1, 0],
    ];

    // Verify each expected node has the 'visited' class
    for (const [r, c] of expectedVisited) {
      const visited = await graph.isNodeVisited(r, c);
      expect(visited).toBe(true, `Expected node ${r},${c} to be visited`);
    }

    // Verify total visited count equals expected count (3)
    const visitedCount = await graph.countVisitedNodes();
    expect(visitedCount).toBe(3);

    // Verify some non-connected node remains unvisited (e.g., (0,2) is initially 0 in adjacency)
    const nonVisited = await graph.isNodeVisited(0, 2);
    expect(nonVisited).toBe(false);

    // No console/page errors should have occurred during BFS
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Toggling a node to connect more nodes expands BFS reachable set', async ({ page }) => {
    // Purpose: Modify the grid by enabling a node and verify BFS reaches the new node
    const graph3 = new GraphPage(page);
    await graph.waitForGraph();

    // Ensure (0,2) is not visited initially after a fresh start
    await graph.clickStartBFS();
    expect(await graph.isNodeVisited(0, 2)).toBe(false);
    const visitedBefore = await graph.countVisitedNodes();
    expect(visitedBefore).toBe(3); // baseline expectation

    // Toggle node (0,2) ON so graph[0][2] becomes 1 (simulate adding an edge/node)
    await graph.clickNode(0, 2);

    // Start BFS again to pick up the change
    await graph.clickStartBFS();

    // Now (0,2) should be visited because (0,1) was visited and connects to (0,2)
    const is022Visited = await graph.isNodeVisited(0, 2);
    expect(is022Visited).toBe(true);

    // Visited count should have increased beyond the baseline of 3
    const visitedAfter = await graph.countVisitedNodes();
    expect(visitedAfter).toBeGreaterThan(3);

    // Ensure (0,0) still visited
    expect(await graph.isNodeVisited(0, 0)).toBe(true);

    // No console/page errors should have occurred during modification and BFS
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Clicking various nodes and starting BFS does not produce runtime errors (observe console/page errors)', async ({ page }) => {
    // Purpose: Exercise multiple interactions across the grid while observing for runtime errors
    const graph4 = new GraphPage(page);
    await graph.waitForGraph();

    // Click a few nodes across the grid (corners and center)
    const targets = [
      [0, 6],
      [6, 0],
      [3, 3],
      [4, 6],
    ];

    for (const [r, c] of targets) {
      await graph.clickNode(r, c);
      // briefly ensure the inline style toggled state is set/cleared correctly (at least returns a string)
      const bg = await graph.getNodeInlineBackground(r, c);
      expect(typeof bg).toBe('string');
    }

    // Start BFS
    await graph.clickStartBFS();

    // Ensure the app didn't emit any console error messages or page errors during these interactions
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Accessibility and basic attributes: nodes have dataset attributes and are focusable by selector', async ({ page }) => {
    // Purpose: Verify nodes expose dataset attributes and can be queried; check basic accessibility presence
    const graph5 = new GraphPage(page);
    await graph.waitForGraph();

    // Pick a sample node and assert dataset attributes are present and correct
    const sampleRow = 2;
    const sampleCol = 4;
    const nodeHandle = await page.$(graph.nodeSelector(sampleRow, sampleCol));
    expect(nodeHandle).not.toBeNull();

    // Evaluate attributes in page context
    const dataAttrs = await nodeHandle.evaluate((el) => {
      return {
        row: el.dataset.row,
        col: el.dataset.col,
        text: el.textContent,
        hasOnclick: typeof el.onclick === 'function',
      };
    });

    expect(dataAttrs.row).toBe(String(sampleRow));
    expect(dataAttrs.col).toBe(String(sampleCol));
    expect(dataAttrs.text).toBe(`${sampleRow},${sampleCol}`);
    // The inline script assigns onclick handlers; confirm existence (may be true)
    expect(dataAttrs.hasOnclick).toBe(true);

    // No console/page errors should have occurred
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });
});