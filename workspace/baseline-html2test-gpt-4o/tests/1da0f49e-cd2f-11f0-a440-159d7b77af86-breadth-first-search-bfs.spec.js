import { test, expect } from '@playwright/test';

// Test file: 1da0f49e-cd2f-11f0-a440-159d7b77af86-breadth-first-search-bfs.spec.js
// Purpose: End-to-end Playwright tests for the Breadth-First Search visualization app.
// The tests load the page as-is, observe console and page errors, and validate DOM changes and visual updates.

const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/1da0f49e-cd2f-11f0-a440-159d7b77af86.html';

// Page Object for the Graph page to encapsulate selectors and common actions
class GraphPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.graphSelector = '#graph';
    this.startButtonSelector = 'button:has-text("Start BFS")';
    this.nodeSelector = (id) => `#node-${id}`;
    this.nodeClassVisited = 'visited';
    this.nodeIds = ['A', 'B', 'C', 'D', 'E', 'F'];
  }

  // Navigate to the app URL
  async goto() {
    await this.page.goto(APP_URL);
  }

  // Return locator for a specific node by id (A..F)
  nodeLocator(id) {
    return this.page.locator(this.nodeSelector(id));
  }

  // Click the Start BFS button
  async startBFS() {
    await this.page.click(this.startButtonSelector);
  }

  // Check if a given node has the 'visited' class
  async isNodeVisited(id) {
    return await this.page.locator(this.nodeSelector(id)).evaluate((el, cls) => el.classList.contains(cls), this.nodeClassVisited);
  }

  // Wait until specific node has visited class (timeout overridden as needed)
  async waitForNodeVisited(id, timeout = 3000) {
    await this.page.waitForFunction(
      (selector, cls) => {
        const el = document.querySelector(selector);
        return !!el && el.classList.contains(cls);
      },
      this.nodeSelector(id),
      { timeout }
    );
  }

  // Get text content of a node
  async getNodeText(id) {
    return await this.page.locator(this.nodeSelector(id)).innerText();
  }
}

// Helper to attach listeners to capture console and page errors for assertions
function attachErrorCollectors(page) {
  const consoleMessages = [];
  const consoleErrors = [];
  const pageErrors = [];

  page.on('console', (msg) => {
    consoleMessages.push({ type: msg.type(), text: msg.text() });
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  page.on('pageerror', (err) => {
    // Collect uncaught exceptions that bubble up to the page
    pageErrors.push(err.message || String(err));
  });

  return { consoleMessages, consoleErrors, pageErrors };
}

test.describe('Breadth-First Search Visualization', () => {
  // Test initial page load and default state
  test('Initial load: should render graph title, nodes A-F, and no nodes visited initially', async ({ page }) => {
    // Attach collectors to observe console logs and page errors
    const { consoleMessages, consoleErrors, pageErrors } = attachErrorCollectors(page);

    const graph = new GraphPage(page);
    await graph.goto();

    // Verify the page title contains the expected text
    await expect(page).toHaveTitle(/Breadth-First Search Visualization/);

    // Verify graph container is present
    await expect(page.locator('#graph-container')).toBeVisible();

    // Verify all expected node elements are rendered and visible with correct text
    for (const id of graph.nodeIds) {
      const node = graph.nodeLocator(id);
      await expect(node).toBeVisible();
      await expect(node).toHaveText(id);
      // At initial render, no node should have the 'visited' class
      const visited = await graph.isNodeVisited(id);
      expect(visited).toBe(false);
    }

    // Verify the Start BFS button exists and is clickable
    const startButton = page.locator('button:has-text("Start BFS")');
    await expect(startButton).toBeVisible();
    await expect(startButton).toBeEnabled();

    // Assert that no uncaught page errors or console.error messages occurred during load
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);

    // (Optional) also ensure we saw some console activity but nothing in error
    // This is informational; we only assert no error-level console messages.
    // Expect at least the console messages array to be defined (non-null)
    expect(Array.isArray(consoleMessages)).toBe(true);
  });

  // Test starting BFS visualization and the timed highlighting behavior
  test('Start BFS: should highlight nodes in BFS order and eventually mark all nodes as visited', async ({ page }) => {
    const { consoleMessages, consoleErrors, pageErrors } = attachErrorCollectors(page);

    const graph = new GraphPage(page);
    await graph.goto();

    // Click the Start BFS button to begin the algorithm
    await graph.startBFS();

    // Immediately after start, the start node (A) should be highlighted synchronously
    await graph.waitForNodeVisited('A', 500);
    expect(await graph.isNodeVisited('A')).toBe(true);

    // The BFS implementation schedules timeouts for other nodes.
    // We assert that nodes are visited in BFS order with approximate timing windows.
    // B should be visited before or by ~1200ms, C by ~1600ms, D by ~2200ms, E by ~2700ms, F by ~3200ms.
    // We'll wait sequentially for each with appropriate timeouts to assert ordering.
    await graph.waitForNodeVisited('B', 1500); // B scheduled around 1000ms
    expect(await graph.isNodeVisited('B')).toBe(true);

    await graph.waitForNodeVisited('C', 2000); // C scheduled around 1500ms
    expect(await graph.isNodeVisited('C')).toBe(true);

    await graph.waitForNodeVisited('D', 2500); // D scheduled around 2000ms
    expect(await graph.isNodeVisited('D')).toBe(true);

    await graph.waitForNodeVisited('E', 3000); // E scheduled around 2500ms
    expect(await graph.isNodeVisited('E')).toBe(true);

    await graph.waitForNodeVisited('F', 3500); // F scheduled around 3000ms
    expect(await graph.isNodeVisited('F')).toBe(true);

    // As a final assertion, wait a little longer to ensure all timeouts have fired and then check all nodes visited
    await page.waitForTimeout(500); // additional buffer
    for (const id of graph.nodeIds) {
      expect(await graph.isNodeVisited(id)).toBe(true);
    }

    // Ensure that the script didn't produce any uncaught page errors or console.error messages while running
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  // Test repeated interactions and that re-running BFS does not cause errors
  test('Re-running BFS by clicking Start BFS multiple times should not throw errors and nodes remain visited', async ({ page }) => {
    const { consoleMessages, consoleErrors, pageErrors } = attachErrorCollectors(page);

    const graph = new GraphPage(page);
    await graph.goto();

    // First run
    await graph.startBFS();
    await graph.waitForNodeVisited('A', 500);
    await page.waitForTimeout(1800); // allow some propagation

    // Second run - triggers BFS again; should not cause uncaught exceptions
    await graph.startBFS();

    // Wait sufficient time for second run timeouts to complete
    await page.waitForTimeout(4000);

    // Check all nodes are visited and that no page errors or console errors occurred
    for (const id of graph.nodeIds) {
      expect(await graph.isNodeVisited(id)).toBe(true);
    }

    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);

    // The test also inspects console messages array to ensure we captured logs (if any) but no errors
    expect(Array.isArray(consoleMessages)).toBe(true);
  });

  // Edge-case test: Ensure that the application handles missing DOM gracefully.
  // Note: We must not modify the page or DOM; we only observe that the existing implementation does not throw.
  test('Edge case observation: application should not produce runtime TypeError for missing elements under normal conditions', async ({ page }) => {
    const { consoleMessages, consoleErrors, pageErrors } = attachErrorCollectors(page);

    const graph = new GraphPage(page);
    await graph.goto();

    // Trigger BFS
    await graph.startBFS();

    // Allow timeouts to run
    await page.waitForTimeout(4000);

    // Verify again that there are no uncaught errors or console.error messages
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });
});