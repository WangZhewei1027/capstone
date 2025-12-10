import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-4o-5/html/39b81551-d1d5-11f0-b49a-6f458b3a25ef.html';

class GraphPage {
  /**
   * Page object for interacting with the DFS visualization page.
   * Encapsulates common interactions and queries used by tests.
   */
  constructor(page) {
    this.page = page;
    this.nodeLocator = page.locator('#graph .node');
  }

  // Click the node element with the given data-id (e.g., 'A')
  async clickNode(id) {
    const node = this.page.locator(`#graph .node[data-id="${id}"]`);
    await expect(node).toHaveCount(1);
    await node.click();
  }

  // Return the data-ids of nodes that currently have the 'visited' class
  async getVisitedNodeIds() {
    const visited = await this.page.locator('#graph .node.visited').evaluateAll(nodes =>
      nodes.map(n => n.getAttribute('data-id'))
    );
    return visited;
  }

  // Return the data-ids of all node elements in DOM order
  async getAllNodeIds() {
    return await this.nodeLocator.evaluateAll(nodes => nodes.map(n => n.getAttribute('data-id')));
  }

  // Return the visible text content of header and subtext for basic accessibility/content checks
  async getHeaderText() {
    return await this.page.textContent('h1');
  }
  async getDescriptionText() {
    return await this.page.textContent('p');
  }
}

test.describe('Depth-First Search (DFS) Visualization - 39b81551-d1d5-11f0-b49a-6f458b3a25ef', () => {
  // Arrays to capture console log messages and page errors for each test
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Capture console.log outputs from the page
    page.on('console', msg => {
      // Only capture normal console logs (the application uses console.log to output visited nodes)
      try {
        if (msg.type() === 'log') {
          consoleMessages.push(msg.text());
        } else {
          // Still capture other console types for debugging purposes
          consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
        }
      } catch (e) {
        // ignore any console handling errors
      }
    });

    // Capture unhandled page errors (ReferenceError, TypeError, etc.)
    page.on('pageerror', error => {
      pageErrors.push(error);
    });

    // Navigate to the app page for each test
    await page.goto(APP_URL, { waitUntil: 'load' });
  });

  test.afterEach(async () => {
    // Basic sanity: ensure we didn't accumulate unexpected page errors during tests
    // Tests below also assert on pageErrors as needed
  });

  test('Initial page load shows header, description, and 7 graph nodes with none visited', async ({ page }) => {
    // Purpose: Verify initial DOM structure and default state before any interaction
    const gp = new GraphPage(page);

    // Header and description content checks
    const header = await gp.getHeaderText();
    expect(header).toBe('Depth-First Search (DFS) Visualization');

    const desc = await gp.getDescriptionText();
    expect(desc).toContain('Click on a node to start the DFS traversal from that node.');

    // There should be exactly 7 node elements with data-ids A..G
    const allNodeIds = await gp.getAllNodeIds();
    expect(allNodeIds.length).toBe(7);
    expect(allNodeIds).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G']);

    // Initially, no node should have the 'visited' class
    const visitedInitially = await gp.getVisitedNodeIds();
    expect(visitedInitially.length).toBe(0);

    // No page runtime errors should have occurred on initial load
    expect(pageErrors.length).toBe(0);
  });

  test('Clicking node A performs DFS and marks all nodes visited in expected order (A B D E G C F)', async ({ page }) => {
    // Purpose: Validate DFS traversal starting from node A:
    // - console.log outputs nodes in DFS order
    // - all nodes end up with the "visited" class
    const gp1 = new GraphPage(page);

    // Clear any pre-existing captured messages for a clean test
    consoleMessages.length = 0;

    // Click node A to start traversal
    await gp.clickNode('A');

    // The application marks nodes visited synchronously in recursion,
    // so after the click completes all nodes should have the visited class.
    // Wait and assert all nodes become visited.
    await expect(page.locator('#graph .node.visited')).toHaveCount(7, { timeout: 2000 });

    const visited1 = await gp.getVisitedNodeIds();
    // All nodes visited (order in this array is DOM order not visitation order)
    expect(new Set(visited)).toEqual(new Set(['A', 'B', 'C', 'D', 'E', 'F', 'G']));

    // The DFS function logs each visited node via console.log in the order visited.
    // We captured those console logs; assert they match expected DFS order starting from A.
    // Expected DFS order derived from graph adjacency:
    // A -> B -> D -> E -> G -> C -> F
    expect(consoleMessages.length).toBeGreaterThanOrEqual(7);
    // Filter to the first 7 plain log messages that equal single-letter node names
    const logs = consoleMessages.filter(m => /^[A-G]$/.test(m)).slice(0, 7);
    expect(logs).toEqual(['A', 'B', 'D', 'E', 'G', 'C', 'F']);

    // Ensure there were no unhandled page errors during traversal
    expect(pageErrors.length).toBe(0);
  });

  test('Clicking node E starts a fresh traversal and logs nodes in expected order (E B A C F D G)', async ({ page }) => {
    // Purpose: Ensure clicking a different start node resets traversal state and runs DFS from that node.
    const gp2 = new GraphPage(page);

    // Click E to start traversal
    consoleMessages.length = 0;
    await gp.clickNode('E');

    // All nodes should eventually be marked visited (graph is connected)
    await expect(page.locator('#graph .node.visited')).toHaveCount(7, { timeout: 2000 });
    const visited2 = await gp.getVisitedNodeIds();
    expect(new Set(visited)).toEqual(new Set(['A', 'B', 'C', 'D', 'E', 'F', 'G']));

    // Validate logged traversal order for start node E:
    // Expected: E -> B -> A -> C -> F -> D -> G
    const logs1 = consoleMessages.filter(m => /^[A-G]$/.test(m)).slice(0, 7);
    expect(logs).toEqual(['E', 'B', 'A', 'C', 'F', 'D', 'G']);

    // Confirm no page errors
    expect(pageErrors.length).toBe(0);
  });

  test('Clicking a node twice resets visited classes before second traversal (first click A, second click E)', async ({ page }) => {
    // Purpose: Confirm the implementation removes 'visited' classes before starting a new traversal.
    // Evidence: If visited set were not reset, the second traversal would skip already visited nodes and
    // console.log would not start with the second start node. We assert that second traversal logs start
    // with the new start node (E), demonstrating the reset occurred.
    const gp3 = new GraphPage(page);

    // First click: A
    consoleMessages.length = 0;
    await gp.clickNode('A');

    // Ensure first traversal completed and logged
    await expect(page.locator('#graph .node.visited')).toHaveCount(7, { timeout: 2000 });
    const firstLogs = consoleMessages.filter(m => /^[A-G]$/.test(m)).slice(0, 7);
    expect(firstLogs).toEqual(['A', 'B', 'D', 'E', 'G', 'C', 'F']);

    // Prepare for second click: clear captured messages and click E
    consoleMessages.length = 0;
    await gp.clickNode('E');

    // After second click, traversal should run anew and the first log should be the new start node 'E'
    const secondLogs = consoleMessages.filter(m => /^[A-G]$/.test(m));
    // There should be at least one log entry; the first must be the start node 'E' proving reset
    expect(secondLogs.length).toBeGreaterThan(0);
    expect(secondLogs[0]).toBe('E');

    // Final state: all nodes visited again
    await expect(page.locator('#graph .node.visited')).toHaveCount(7, { timeout: 2000 });
    expect(pageErrors.length).toBe(0);
  });

  test('Robustness: clicking each node individually results in DFS traversal that logs starting node first', async ({ page }) => {
    // Purpose: Iterate through every node as a start and ensure traversal begins with the clicked node.
    // This checks that the click handler reads the correct data-id and resets visited state each time.
    const gp4 = new GraphPage(page);

    const allNodeIds1 = await gp.getAllNodeIds();

    for (const id of allNodeIds) {
      consoleMessages.length = 0;
      pageErrors.length = 0;

      await gp.clickNode(id);

      // The first console log after clicking should be the start node itself
      const logs2 = consoleMessages.filter(m => /^[A-G]$/.test(m));
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0]).toBe(id);

      // After traversal, all nodes should be marked visited (graph connectivity)
      await expect(page.locator('#graph .node.visited')).toHaveCount(7, { timeout: 2000 });

      // No page errors during any traversal
      expect(pageErrors.length).toBe(0);
    }
  });
});