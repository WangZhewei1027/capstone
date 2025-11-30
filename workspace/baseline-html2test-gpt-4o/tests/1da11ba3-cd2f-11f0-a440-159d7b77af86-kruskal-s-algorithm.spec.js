import { test, expect } from '@playwright/test';

// Page Object for the Kruskal visualization page
class KruskalPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.url = 'http://127.0.0.1:5500/workspace/html2test/html/1da11ba3-cd2f-11f0-a440-159d7b77af86.html';
    this.canvasSelector = '#graphCanvas';
    this.buttonSelector = 'button:has-text("Run Kruskal")';
    this.headerSelector = 'h1';
    this.descriptionSelector = 'p';
  }

  async goto() {
    await this.page.goto(this.url, { waitUntil: 'load' });
  }

  async clickRunButton() {
    await this.page.click(this.buttonSelector);
  }

  async getCanvasElementHandle() {
    return this.page.$(this.canvasSelector);
  }

  async getButtonElementHandle() {
    return this.page.$(this.buttonSelector);
  }

  // Returns the MST produced by the page's kruskalMST function
  async evaluateKruskalMST() {
    return this.page.evaluate(() => {
      // Return a serializable structure for assertions
      const result = typeof kruskalMST === 'function' ? kruskalMST() : null;
      return result;
    });
  }

  async getNodesAndEdges() {
    return this.page.evaluate(() => {
      return {
        nodes: typeof nodes !== 'undefined' ? nodes : null,
        edges: typeof edges !== 'undefined' ? edges : null
      };
    });
  }
}

test.describe('Kruskal\'s Algorithm Visualization - End-to-End Tests', () => {
  let kruskalPage;
  let consoleErrors;
  let pageErrors;

  // Set up a fresh page for each test and capture console/page errors
  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Collect console.error messages
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Collect uncaught exceptions from the page
    page.on('pageerror', err => {
      // err is an Error object from the page context
      pageErrors.push(err && err.message ? err.message : String(err));
    });

    kruskalPage = new KruskalPage(page);
    await kruskalPage.goto();
  });

  test.afterEach(async () => {
    // After each test ensure there were no unexpected page errors recorded.
    // This asserts that no uncaught exceptions occurred during the test.
    expect(pageErrors, `Page had uncaught errors: ${pageErrors.join(' | ')}`).toEqual([]);
    expect(consoleErrors, `Console had error-level messages: ${consoleErrors.join(' | ')}`).toEqual([]);
  });

  test.describe('Initial page load and DOM structure', () => {
    test('Page loads, title and headers are present, canvas and button exist', async ({ page }) => {
      // Purpose: Verify initial DOM elements and their visible text/content
      await expect(page).toHaveTitle(/Kruskal's Algorithm Visualization/);

      const header = await page.locator(kruskalPage.headerSelector);
      await expect(header).toHaveText("Kruskal's Algorithm Visualization");

      const description = await page.locator(kruskalPage.descriptionSelector);
      await expect(description).toContainText('Click the button to visualize Kruskal');

      const canvas = await kruskalPage.getCanvasElementHandle();
      expect(canvas, 'Canvas element should exist on the page').not.toBeNull();

      const button = await kruskalPage.getButtonElementHandle();
      expect(button, 'Run Kruskal button should exist').not.toBeNull();
      await expect(page.locator(kruskalPage.buttonSelector)).toHaveText('Run Kruskal\'s Algorithm');
    });

    test('Initial graph data structures (nodes and edges) are defined and correct', async () => {
      // Purpose: Verify the page defines the expected nodes and edges data
      const { nodes, edges } = await kruskalPage.getNodesAndEdges();

      expect(Array.isArray(nodes)).toBeTruthy();
      expect(Array.isArray(edges)).toBeTruthy();

      // Expect 5 nodes and 8 edges as per the implementation
      expect(nodes.length).toBe(5);
      expect(edges.length).toBe(8);

      // Basic checks on first node and edge shape
      expect(nodes[0]).toHaveProperty('x');
      expect(nodes[0]).toHaveProperty('y');
      expect(edges[0]).toHaveProperty('from');
      expect(edges[0]).toHaveProperty('to');
      expect(edges[0]).toHaveProperty('weight');
    });
  });

  test.describe('Kruskal algorithm correctness and interaction', () => {
    test('kruskalMST returns the expected number of edges and minimal total weight', async () => {
      // Purpose: Verify algorithmic output: MST has (n-1) edges and minimal total weight
      const mst = await kruskalPage.evaluateKruskalMST();
      expect(mst, 'kruskalMST should return an array').toBeInstanceOf(Array);

      // For 5 nodes expect 4 edges in the MST
      expect(mst.length).toBe(4);

      // Calculate total weight and check it equals expected minimal total (1+2+3+4 = 10)
      const totalWeight = mst.reduce((sum, e) => sum + (e && e.weight ? e.weight : 0), 0);
      expect(totalWeight).toBe(10);
    });

    test('Clicking Run Kruskal button runs algorithm without errors and MST remains consistent', async ({ page }) => {
      // Purpose: Trigger the UI flow (user click) and ensure no runtime errors,
      // and the algorithm produces the same MST as direct invocation.
      const mstBefore = await kruskalPage.evaluateKruskalMST();
      await kruskalPage.clickRunButton();

      // Wait a brief moment to allow UI draw operations to happen
      await page.waitForTimeout(200);

      const mstAfter = await kruskalPage.evaluateKruskalMST();

      // Assert that the MST computed does not change because of the UI click
      expect(mstAfter).toEqual(mstBefore);

      // Validate the MST properties again
      expect(mstAfter.length).toBe(4);
      const totalWeight = mstAfter.reduce((sum, e) => sum + e.weight, 0);
      expect(totalWeight).toBe(10);
    });

    test('Canvas exists and is accessible for drawing operations (2D context present)', async () => {
      // Purpose: Ensure canvas 2D rendering context is present (indirectly verifying drawGraph calls didn't error)
      const hasContext = await kruskalPage.page.evaluate(() => {
        const c = document.getElementById('graphCanvas');
        if (!c) return false;
        return !!(c.getContext && c.getContext('2d'));
      });
      expect(hasContext).toBeTruthy();
    });
  });

  test.describe('Edge cases and robustness', () => {
    test('kruskalMST handles an empty edge list gracefully (returns empty array)', async ({ page }) => {
      // Purpose: Mutate the edges array to be empty and verify the algorithm handles it
      const result = await page.evaluate(() => {
        // Temporarily clear edges array defined on page and run algorithm
        if (typeof edges !== 'undefined') {
          window.__saved_edges_for_test = edges.slice();
          edges.length = 0;
        }
        let r = typeof kruskalMST === 'function' ? kruskalMST() : null;
        // restore edges for page stability (we will reload page later by test setup)
        if (window.__saved_edges_for_test) {
          window.edges = window.__saved_edges_for_test;
          delete window.__saved_edges_for_test;
        }
        return r;
      });

      // When there are no edges, the MST should be an empty array
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(0);
    });

    test('kruskalMST ignores self-loops and still returns valid MST', async ({ page }) => {
      // Purpose: Add a self-loop and a duplicate edge to ensure they do not break MST generation
      const mst = await page.evaluate(() => {
        // Add a self-loop and a duplicate low-weight edge
        const duplicate = { from: 0, to: 1, weight: 1 }; // lower weight duplicate
        const selfLoop = { from: 2, to: 2, weight: 0 };
        edges.push(duplicate);
        edges.push(selfLoop);

        const result = kruskalMST();

        // Clean up the mutations to avoid affecting other tests (page will be reloaded next test)
        edges.pop();
        edges.pop();

        return result;
      });

      // Even with those additions, MST should still have 4 edges and total weight should be plausible (<= 10)
      expect(Array.isArray(mst)).toBeTruthy();
      expect(mst.length).toBe(4);
      const total = mst.reduce((s, e) => s + e.weight, 0);
      // With a duplicate lower weight edge introduced, total weight could be <= 10 but must be finite and positive
      expect(total).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(total)).toBeTruthy();
    });
  });

  test.describe('Accessibility and UI checks', () => {
    test('Run button is reachable and has accessible name', async ({ page }) => {
      // Purpose: Basic accessibility check - button has role and name
      const button = page.locator(kruskalPage.buttonSelector);
      await expect(button).toBeVisible();
      // Ensure the accessible name contains "Run Kruskal"
      const accessibleName = await button.getAttribute('innerText');
      expect(accessibleName).toContain('Run Kruskal');
    });
  });
});