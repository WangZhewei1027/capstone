import { test, expect } from '@playwright/test';

// Page object model for the DFS demonstration page
class DfsPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.url = 'http://127.0.0.1:5500/workspace/html2test/html/1da0f49d-cd2f-11f0-a440-159d7b77af86.html';
  }

  // Navigate to the page and wait until fully loaded
  async goto() {
    await this.page.goto(this.url);
    await this.page.waitForLoadState('load');
  }

  // Return a locator for the Start DFS button
  startButton() {
    return this.page.locator('button', { hasText: 'Start DFS' });
  }

  // Return a locator for a node by id (A, B, C, D, E)
  node(id) {
    return this.page.locator(`#${id}`);
  }

  // Click the Start DFS button
  async clickStart() {
    await this.startButton().click();
  }

  // Get list of node ids present in the graph container
  async getNodeIds() {
    const ids = await this.page.$$eval('#graph-container .node', nodes => nodes.map(n => n.id));
    return ids;
  }

  // Return which nodes currently have the 'visited' class
  async getVisitedNodeIds() {
    const visited = await this.page.$$eval('#graph-container .node', nodes =>
      nodes.filter(n => n.classList.contains('visited')).map(n => n.id)
    );
    return visited;
  }

  // Return number of 'visited' class occurrences for a given node
  // (useful to ensure class isn't duplicated)
  async getVisitedClassCount(id) {
    return await this.page.$eval(`#${id}`, el => {
      // classList is a DOMTokenList — each token appears once, but we check the class attribute
      const attr = el.getAttribute('class') || '';
      // Count occurrences of 'visited' as substring occurrences (defensive)
      return (attr.match(/visited/g) || []).length;
    });
  }
}

test.describe('Depth-First Search (DFS) Visualization', () => {
  // Use per-test variables to capture console and page errors
  let consoleMessages;
  let pageErrors;

  // Set up console and pageerror listeners for each test to observe runtime issues.
  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Collect console messages emitted by the page
    page.on('console', msg => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text()
      });
    });

    // Collect uncaught exceptions reported by the page
    page.on('pageerror', err => {
      pageErrors.push(err);
    });
  });

  // Test initial load state: nodes exist and none are marked visited
  test('Initial load: graph nodes are rendered and unvisited', async ({ page }) => {
    const app = new DfsPage(page);
    await app.goto();

    // Ensure the Start DFS button is visible and enabled
    const startBtn = app.startButton();
    await expect(startBtn).toBeVisible();
    await expect(startBtn).toBeEnabled();
    await expect(startBtn).toHaveText('Start DFS');

    // Ensure all expected nodes are present
    const nodeIds = await app.getNodeIds();
    expect(nodeIds.sort()).toEqual(['A', 'B', 'C', 'D', 'E'].sort());

    // Ensure no node has 'visited' class on initial load
    const visitedNow = await app.getVisitedNodeIds();
    expect(visitedNow).toEqual([]);

    // Ensure no console errors or page errors occurred during load
    const errors = consoleMessages.filter(m => m.type === 'error');
    expect(errors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  // Test the primary functionality: clicking Start DFS marks nodes as visited
  test('Clicking Start DFS marks all reachable nodes as visited', async ({ page }) => {
    const app = new DfsPage(page);
    await app.goto();

    // Click the start button to run DFS
    await app.clickStart();

    // The DFS implementation runs synchronously; ensure all nodes have 'visited' class
    const visited = await app.getVisitedNodeIds();
    // According to the graph, all nodes A-E should be visited starting from A
    expect(visited.sort()).toEqual(['A', 'B', 'C', 'D', 'E'].sort());

    // Verify the DOM visually reflects the 'visited' state via class presence
    for (const id of ['A', 'B', 'C', 'D', 'E']) {
      const locator = app.node(id);
      await expect(locator).toHaveClass(/visited/);
    }

    // Verify no console errors or uncaught page errors occurred during DFS run
    const errors = consoleMessages.filter(m => m.type === 'error');
    expect(errors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  // Test idempotency and repeated interactions: clicking multiple times does not break state
  test('Multiple Start DFS clicks are idempotent and maintain visited state', async ({ page }) => {
    const app = new DfsPage(page);
    await app.goto();

    // Click the button twice
    await app.clickStart();
    await app.clickStart();

    // All nodes should still be visited
    const visited = await app.getVisitedNodeIds();
    expect(visited.sort()).toEqual(['A', 'B', 'C', 'D', 'E'].sort());

    // Ensure 'visited' appears only once in the class attribute for each node (no duplication)
    for (const id of ['A', 'B', 'C', 'D', 'E']) {
      const count = await app.getVisitedClassCount(id);
      // classList uses tokens, so 'visited' should appear exactly once in class attribute
      expect(count).toBe(1);
    }

    // Confirm no runtime errors were produced by repeated interactions
    const errors = consoleMessages.filter(m => m.type === 'error');
    expect(errors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  // Edge case test: verify accessibility attributes and visibility of nodes and button
  test('Accessibility and visibility checks for interactive elements', async ({ page }) => {
    const app = new DfsPage(page);
    await app.goto();

    // Button should be reachable and have a role implicitly as 'button'
    const startBtn = app.startButton();
    await expect(startBtn).toBeVisible();
    // Ensure the button is in the tab order (has a positive or zero tabindex behavior)
    // We do this by focusing the button and asserting it becomes active
    await startBtn.focus();
    // After focusing, ensure it is the active element
    const activeId = await page.evaluate(() => document.activeElement?.outerHTML || '');
    expect(activeId).toContain('Start DFS');

    // Ensure graph container is visible and each node has textual content matching its id
    const nodeIds = await app.getNodeIds();
    for (const id of nodeIds) {
      const locator = app.node(id);
      await expect(locator).toBeVisible();
      await expect(locator).toHaveText(id);
    }

    // Confirm no console errors or page errors up to this point
    const errors = consoleMessages.filter(m => m.type === 'error');
    expect(errors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  // Final test to explicitly assert that there are no unexpected runtime errors (ReferenceError, SyntaxError, TypeError)
  test('No uncaught ReferenceError, SyntaxError, or TypeError occurred during page lifecycle', async ({ page }) => {
    const app = new DfsPage(page);
    await app.goto();

    // Run the DFS to exercise scripts
    await app.clickStart();

    // Inspect collected page errors for specific error types
    const hadReferenceError = pageErrors.some(e => e.name === 'ReferenceError' || /ReferenceError/.test(String(e)));
    const hadSyntaxError = pageErrors.some(e => e.name === 'SyntaxError' || /SyntaxError/.test(String(e)));
    const hadTypeError = pageErrors.some(e => e.name === 'TypeError' || /TypeError/.test(String(e)));

    // Assert that none of these common runtime errors occurred
    expect(hadReferenceError).toBeFalsy();
    expect(hadSyntaxError).toBeFalsy();
    expect(hadTypeError).toBeFalsy();

    // Also assert that console did not emit error-level messages
    const errors = consoleMessages.filter(m => m.type === 'error');
    expect(errors).toEqual([]);
  });
});