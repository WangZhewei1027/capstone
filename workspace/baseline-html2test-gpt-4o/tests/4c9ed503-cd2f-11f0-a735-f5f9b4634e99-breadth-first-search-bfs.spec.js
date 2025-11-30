import { test, expect } from '@playwright/test';

// URL of the page under test (provided in the requirements)
const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/4c9ed503-cd2f-11f0-a735-f5f9b4634e99.html';

// Page object to interact with the BFS graph page and query nodes
class GraphPage {
  constructor(page) {
    this.page = page;
  }

  // Returns a Locator for a node by its data-node attribute (e.g., 'A', 'B', ...)
  nodeLocator(nodeName) {
    return this.page.locator(`.node[data-node="${nodeName}"]`);
  }

  // Returns count of nodes with the 'visited' class
  async visitedCount() {
    return await this.page.locator('.node.visited').count();
  }

  // Returns array of node names that currently have the 'visited' class
  async visitedNodeNames() {
    const count = await this.visitedCount();
    const names = [];
    for (let i = 0; i < count; i++) {
      const el = this.page.locator('.node.visited').nth(i);
      const name = await el.getAttribute('data-node');
      names.push(name);
    }
    return names;
  }

  // Returns count of all .node elements
  async totalNodeCount() {
    return await this.page.locator('.node').count();
  }

  // Returns text content for all nodes, mapping data-node -> text
  async allNodeLabels() {
    const total = await this.totalNodeCount();
    const map = {};
    for (let i = 0; i < total; i++) {
      const el = this.page.locator('.node').nth(i);
      const key = await el.getAttribute('data-node');
      const text = (await el.textContent())?.trim();
      map[key] = text;
    }
    return map;
  }
}

test.describe('Breadth-First Search (BFS) Visualization - 4c9ed503-cd2f-11f0-a735-f5f9b4634e99', () => {
  // Arrays to capture console error messages and uncaught page errors for assertions
  let consoleErrors;
  let pageErrors;

  // Setup before each test: attach listeners to capture console and page errors,
  // then navigate to the page.
  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Capture console.error messages emitted by the page
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Capture unhandled errors thrown in the page context
    page.on('pageerror', (err) => {
      // err is usually an Error object; record its message for assertions
      pageErrors.push(err && err.message ? err.message : String(err));
    });

    // Navigate to the application page and wait for load
    await page.goto(APP_URL, { waitUntil: 'load' });
  });

  // Test initial page load and default state (before the 1s BFS timeout)
  test('Initial state: nodes exist and none are visited immediately after load', async ({ page }) => {
    // Purpose: verify the DOM structure and initial state before BFS runs (the app starts BFS after 1s)
    const graph = new GraphPage(page);

    // Ensure there are exactly 9 nodes A..I present
    const total = await graph.totalNodeCount();
    expect(total).toBe(9);

    // Verify each node has a data-node attribute and non-empty label text
    const labels = await graph.allNodeLabels();
    const expectedNodes = ['A','B','C','D','E','F','G','H','I'];
    for (const node of expectedNodes) {
      expect(labels[node]).toBe(node); // label text should match data-node (e.g., 'A')
    }

    // Immediately after load (well before the 1s timer should fire), ensure no '.visited' classes
    // We give a small short delay to let synchronous scripts settle but still be before 1s
    await page.waitForTimeout(150);
    const visitedNow = await graph.visitedCount();
    expect(visitedNow).toBe(0);

    // There should be no console.error or page error already
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Test that BFS highlights all nodes after the scheduled timeout
  test('BFS run: after scheduled execution all nodes become visited', async ({ page }) => {
    // Purpose: verify that the BFS function runs (scheduled after 1s) and marks all nodes with 'visited'
    const graph = new GraphPage(page);

    // Wait for the BFS to execute and for all nodes to obtain the 'visited' class.
    // The app schedules BFS after setTimeout(..., 1000) and then performs synchronous traversal.
    // Allow up to 3s to be robust in CI/networked environments.
    await page.waitForFunction(() => {
      return document.querySelectorAll('.node.visited').length === 9;
    }, null, { timeout: 3000 });

    // Assert that all nodes are marked visited
    const visitedCount = await graph.visitedCount();
    expect(visitedCount).toBe(9);

    // Verify the 'visited' class exists on all expected nodes individually
    const expectedNodes = ['A','B','C','D','E','F','G','H','I'];
    for (const node of expectedNodes) {
      const hasVisited = await graph.nodeLocator(node).evaluate((el) => el.classList.contains('visited'));
      expect(hasVisited).toBe(true);
    }

    // Check computed background color of a visited node corresponds to .visited CSS (#4caf50)
    // We check node 'A' as representative. The computed color should be 'rgb(76, 175, 80)'.
    const bgColor = await graph.nodeLocator('A').evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });
    expect(bgColor.replace(/\s/g, '')).toContain('rgb(76,175,80)'); // ignore whitespace differences

    // Ensure no console or page errors occurred during or after BFS run
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Test that there are no interactive controls (buttons/inputs) in this visualization
  test('No interactive controls present: the visualization is static (no buttons/inputs/forms)', async ({ page }) => {
    // Purpose: confirm the page has no interactive form controls (based on given HTML)
    const buttons = await page.locator('button').count();
    const inputs = await page.locator('input').count();
    const selects = await page.locator('select').count();
    const textareas = await page.locator('textarea').count();
    const forms = await page.locator('form').count();

    expect(buttons).toBe(0);
    expect(inputs).toBe(0);
    expect(selects).toBe(0);
    expect(textareas).toBe(0);
    expect(forms).toBe(0);

    // There should be no console errors or page errors simply due to presence/absence of controls
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Edge-case/robustness test: ensure highlightNode gracefully ignores missing elements
  // (We do not modify the app; instead we assert that calling highlightNode in the app context
  // would not have produced a runtime error during startup. Since we can't call app functions,
  // we rely on error capture to ensure no runtime exceptions happened.)
  test('No runtime errors occurred while the page initialized or while BFS executed', async ({ page }) => {
    // Purpose: validate that the page did not produce ReferenceError, TypeError, or SyntaxError
    // during load and BFS execution. We wait until BFS should have completed.
    await page.waitForFunction(() => {
      // If BFS completed and all nodes visited, then it's done; otherwise time out will fail the test.
      return document.querySelectorAll('.node.visited').length === 9;
    }, null, { timeout: 3000 });

    // Assert that Playwright did not capture any console.error messages or page errors.
    // This ensures functions like highlightNode and breadthFirstSearch executed without throwing.
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });
});