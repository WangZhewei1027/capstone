import { test, expect } from '@playwright/test';

// Test file for Dijkstra's Algorithm Visualization
// Filename required by the task: 39b83c61-d1d5-11f0-b49a-6f458b3a25ef-dijkstra-s-algorithm.spec.js
// This test suite verifies the interactive behavior, DOM updates, and console/page errors
// of the provided HTML application served at the given URL.

// Page Object for the graph page to encapsulate selectors and common interactions.
class GraphPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.url = 'http://127.0.0.1:5500/workspace/batch-test-1205-4o-5/html/39b83c61-d1d5-11f0-b49a-6f458b3a25ef.html';
    this.startButton = page.locator('#start-btn');
    this.nodes = page.locator('#graph-container .node');
  }

  // Navigate to the page
  async goto() {
    await this.page.goto(this.url);
  }

  // Click the Find Shortest Path button
  async clickStart() {
    await this.startButton.click();
  }

  // Get node locator by id (A..I)
  node(id) {
    return this.page.locator(`#${id}`);
  }

  // Helper to check if a node has a class
  async nodeHasClass(id, cls) {
    return this.page.locator(`#${id}`).evaluate((el, cls) => el.classList.contains(cls), cls);
  }

  // Return all node ids present in the DOM
  async allNodeIds() {
    return this.page.locator('#graph-container .node').evaluateAll(nodes => nodes.map(n => n.id));
  }

  // Count nodes that currently have the given class
  async countNodesWithClass(cls) {
    return this.page.locator(`#graph-container .node.${cls}`).count();
  }

  // Return ids of nodes that have the given class
  async nodeIdsWithClass(cls) {
    return this.page.locator(`#graph-container .node.${cls}`).evaluateAll(nodes => nodes.map(n => n.id));
  }
}

// Collect console and page errors for assertions in tests
const createErrorCollectors = (page) => {
  const consoleErrors = [];
  const pageErrors = [];

  // Listen to console messages and store errors
  page.on('console', msg => {
    try {
      if (msg.type() === 'error') {
        consoleErrors.push({
          text: msg.text(),
          location: msg.location ? msg.location() : undefined
        });
      }
    } catch (e) {
      // ignore any unexpected issues while collecting console messages
    }
  });

  // Listen to uncaught exceptions on the page
  page.on('pageerror', err => {
    pageErrors.push(err);
  });

  return { consoleErrors, pageErrors };
};

test.describe('Dijkstra\'s Algorithm Visualization - Initial Load and UI', () => {
  // Verify initial page load, presence of elements, and no JS runtime errors on load
  test('should load the page, display graph nodes and the start button without errors', async ({ page }) => {
    // Setup collectors before navigation to catch any load-time errors
    const { consoleErrors, pageErrors } = createErrorCollectors(page);
    const graph = new GraphPage(page);

    // Navigate to the application
    await graph.goto();

    // Basic page sanity checks
    await expect(page).toHaveTitle(/Dijkstra/i);

    // All nodes A..I should be present (9 nodes)
    const nodeIds = await graph.allNodeIds();
    expect(nodeIds.length).toBe(9);
    expect(nodeIds.sort()).toEqual(['A','B','C','D','E','F','G','H','I'].sort());

    // Start button should be visible and enabled
    await expect(graph.startButton).toBeVisible();
    await expect(graph.startButton).toBeEnabled();

    // Ensure initially no nodes have the 'path' class
    const pathCount = await graph.countNodesWithClass('path');
    expect(pathCount).toBe(0);

    // Ensure initially no nodes have the 'visited' class
    const visitedCount = await graph.countNodesWithClass('visited');
    expect(visitedCount).toBe(0);

    // Assert that no console errors or page errors occurred during load
    expect(consoleErrors.length, `Console error(s) found: ${consoleErrors.map(e => e.text).join(' | ')}`).toBe(0);
    expect(pageErrors.length, `Page error(s) found: ${pageErrors.map(e => e.message).join(' | ')}`).toBe(0);
  });
});

test.describe('Dijkstra\'s Algorithm Visualization - Interactions and State Transitions', () => {
  // For each test we will collect console/page errors to ensure the page behaves without runtime errors
  test.beforeEach(async ({ page }) => {
    // nothing globally required here; collectors will be created inside each test to tie to that page instance
  });

  // Test that clicking the start button highlights the correct shortest path (A -> B -> C -> E)
  test('clicking "Find Shortest Path" highlights the shortest path nodes A -> B -> C -> E', async ({ page }) => {
    // Collect console & page errors for this test
    const { consoleErrors, pageErrors } = createErrorCollectors(page);
    const graph1 = new GraphPage(page);
    await graph.goto();

    // Confirm precondition: no path classes applied
    expect(await graph.countNodesWithClass('path')).toBe(0);

    // Click the start button to run the algorithm
    await graph.clickStart();

    // After clicking, the algorithm will compute and add 'path' classes to the shortest path nodes.
    // The expected shortest path from the hardcoded start A to target E is ['A','B','C','E'].
    const expectedPath = ['A', 'B', 'C', 'E'];

    // Wait for path nodes to be present - at least one path node should appear quickly
    await page.waitForSelector('#graph-container .node.path');

    // Verify each expected path node has the 'path' class
    for (const id of expectedPath) {
      const hasPath = await graph.nodeHasClass(id, 'path');
      expect(hasPath, `Node ${id} should have class 'path'`).toBeTruthy();
    }

    // Verify nodes not in the path do NOT have the 'path' class
    const nonPathNodes = ['D','F','G','H','I'];
    for (const id of nonPathNodes) {
      const hasPath1 = await graph.nodeHasClass(id, 'path');
      expect(hasPath, `Node ${id} should NOT have class 'path'`).toBeFalsy();
    }

    // The algorithm also marks visited nodes during processing. Ensure start and path nodes were visited.
    for (const id of expectedPath) {
      const visited = await graph.nodeHasClass(id, 'visited');
      expect(visited, `Node ${id} should have class 'visited' after algorithm runs`).toBeTruthy();
    }

    // Assert that no console errors or uncaught page errors occurred during the interaction
    expect(consoleErrors.length, `Console error(s) found during run: ${consoleErrors.map(e => e.text).join(' | ')}`).toBe(0);
    expect(pageErrors.length, `Page error(s) found during run: ${pageErrors.map(e => e.message).join(' | ')}`).toBe(0);
  });

  // Test that clicking the button multiple times clears old path classes before recomputing,
  // and that visited classes persist (they are not removed by the implementation)
  test('clicking the button multiple times clears previous path classes and reapplies the computed path', async ({ page }) => {
    const { consoleErrors, pageErrors } = createErrorCollectors(page);
    const graph2 = new GraphPage(page);
    await graph.goto();

    // First click to compute path
    await graph.clickStart();
    await page.waitForSelector('#graph-container .node.path');

    const firstRunPathIds = (await graph.nodeIdsWithClass('path')).sort();
    expect(firstRunPathIds).toEqual(['A','B','C','E'].sort());

    // Ensure visited nodes were marked after first run
    const visitedAfterFirst = (await graph.nodeIdsWithClass('visited')).sort();
    // visited set should include at least the path nodes
    for (const id of ['A','B','C','E']) {
      expect(visitedAfterFirst).toContain(id);
    }

    // Manually ensure there are no stray 'path' classes outside expected nodes
    const allPathNodes = await graph.nodeIdsWithClass('path');
    for (const id of allPathNodes) {
      expect(['A','B','C','E']).toContain(id);
    }

    // Click again to trigger removal of previous 'path' classes and recompute
    await graph.clickStart();
    await page.waitForSelector('#graph-container .node.path');

    // After second click, path nodes should still be the same computed set
    const secondRunPathIds = (await graph.nodeIdsWithClass('path')).sort();
    expect(secondRunPathIds).toEqual(['A','B','C','E'].sort());

    // Ensure that 'visited' classes were not removed by a subsequent run (implementation doesn't remove them)
    const visitedAfterSecond = (await graph.nodeIdsWithClass('visited')).sort();
    for (const id of ['A','B','C','E']) {
      expect(visitedAfterSecond).toContain(id);
    }

    // Assert that no console errors or page errors occurred during repeated interactions
    expect(consoleErrors.length, `Console error(s) found during repeated runs: ${consoleErrors.map(e => e.text).join(' | ')}`).toBe(0);
    expect(pageErrors.length, `Page error(s) found during repeated runs: ${pageErrors.map(e => e.message).join(' | ')}`).toBe(0);
  });

  // Accessibility and content checks: ensure each node is visible and displays the correct label (A..I)
  test('all nodes are visible and display the correct labels', async ({ page }) => {
    const { consoleErrors, pageErrors } = createErrorCollectors(page);
    const graph3 = new GraphPage(page);
    await graph.goto();

    const ids = await graph.allNodeIds();
    for (const id of ids) {
      const locator = graph.node(id);
      await expect(locator).toBeVisible();
      const text = await locator.textContent();
      expect(text.trim()).toBe(id);
    }

    // Ensure no console or page errors on this basic assertion
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });
});