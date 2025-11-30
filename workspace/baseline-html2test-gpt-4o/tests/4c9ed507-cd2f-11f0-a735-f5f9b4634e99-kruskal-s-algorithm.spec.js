import { test, expect } from '@playwright/test';

// Page object for the Kruskal visualization page
class KruskalPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.url = 'http://127.0.0.1:5500/workspace/html2test/html/4c9ed507-cd2f-11f0-a735-f5f9b4634e99.html';
    // Node coordinates as defined in the page script (used for building selectors)
    this.nodes = [
      { id: 0, x: 50, y: 50 },
      { id: 1, x: 450, y: 50 },
      { id: 2, x: 450, y: 450 },
      { id: 3, x: 50, y: 450 },
      { id: 4, x: 250, y: 250 }
    ];
    // Edges as defined in the page script
    this.edges = [
      { u: 0, v: 1, weight: 10 },
      { u: 0, v: 3, weight: 10 },
      { u: 0, v: 4, weight: 5 },
      { u: 1, v: 2, weight: 10 },
      { u: 1, v: 4, weight: 7 },
      { u: 2, v: 3, weight: 10 },
      { u: 2, v: 4, weight: 4 },
      { u: 3, v: 4, weight: 8 }
    ];
  }

  // Navigate to the page
  async goto() {
    await this.page.goto(this.url);
  }

  // Return the Start Kruskal button element handle
  async getStartButton() {
    return this.page.waitForSelector('button', { state: 'visible' });
  }

  // Click the Start Kruskal button
  async startKruskal() {
    const btn = await this.getStartButton();
    await btn.click();
  }

  // Wait until initial graph has rendered: expected counts: lines = edges.length, circles = nodes.length
  async waitForInitialRender() {
    await this.page.waitForSelector('svg#graph');
    await this.page.waitForFunction(
      (edgeCount, nodeCount) => {
        const svg = document.getElementById('graph');
        if (!svg) return false;
        const lines = svg.querySelectorAll('line');
        const circles = svg.querySelectorAll('circle');
        return lines.length === edgeCount && circles.length === nodeCount;
      },
      this.edges.length,
      this.nodes.length
    );
  }

  // Return the count of lines that have the 'mst' class
  async getMstLineCount() {
    return this.page.evaluate(() => {
      const svg = document.getElementById('graph');
      if (!svg) return 0;
      return Array.from(svg.querySelectorAll('line')).filter(l => l.classList.contains('mst')).length;
    });
  }

  // Check whether a specific edge (u->v) has been marked as part of the MST (i.e., line has 'mst' class)
  async isEdgeInMst(u, v) {
    const x1 = this.nodes[u].x;
    const y1 = this.nodes[u].y;
    const x2 = this.nodes[v].x;
    const y2 = this.nodes[v].y;
    // Build attribute selector identical to page's line attributes
    const selector = `line[x1="${x1}"][y1="${y1}"][x2="${x2}"][y2="${y2}"]`;
    return this.page.evaluate((sel) => {
      const el = document.querySelector(sel);
      return !!el && el.classList.contains('mst');
    }, selector);
  }

  // Helper to get computed stroke style of a particular edge line element
  async getEdgeStrokeStyle(u, v) {
    const x1 = this.nodes[u].x;
    const y1 = this.nodes[u].y;
    const x2 = this.nodes[v].x;
    const y2 = this.nodes[v].y;
    const selector = `line[x1="${x1}"][y1="${y1}"][x2="${x2}"][y2="${y2}"]`;
    return this.page.$eval(selector, (el) => {
      const style = getComputedStyle(el);
      return {
        stroke: style.stroke,
        strokeWidth: style.strokeWidth
      };
    });
  }
}

test.describe('Kruskal\'s Algorithm Visualization - Integration Tests', () => {
  // Arrays to capture console error messages and page errors
  let consoleErrors = [];
  let pageErrors = [];

  // Use a new page object per test
  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Collect console messages of type 'error'
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push({
          text: msg.text(),
          location: msg.location()
        });
      }
    });

    // Collect page errors (uncaught exceptions)
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });
  });

  // Test initial page load and default state: SVG elements count, node labels, and button presence
  test('Initial load: SVG graph, nodes, edges and Start button are present', async ({ page }) => {
    const kruskal = new KruskalPage(page);
    await kruskal.goto();

    // Wait for the graph to be rendered on the page
    await kruskal.waitForInitialRender();

    // Verify header text exists and is correct
    const headerText = await page.textContent('h1');
    expect(headerText).toContain("Kruskal's Algorithm Visualization");

    // Verify number of edge lines equals the edges defined in the script
    const lines = await page.$$eval('svg#graph line', els => els.length);
    expect(lines).toBe(kruskal.edges.length);

    // Verify number of node circles equals the nodes defined in the script
    const circles = await page.$$eval('svg#graph circle', els => els.length);
    expect(circles).toBe(kruskal.nodes.length);

    // Verify each node label (text) contains the expected id
    const texts = await page.$$eval('svg#graph text', els => els.map(t => t.textContent.trim()));
    for (const node of kruskal.nodes) {
      expect(texts).toContain(String(node.id));
    }

    // Verify the Start button exists and has the expected label
    const btn = await page.$('button');
    expect(btn).not.toBeNull();
    const btnText = await btn.textContent();
    expect(btnText).toContain("Start Kruskal's Algorithm");

    // Ensure there were no unexpected console errors or page errors during initial load
    expect(consoleErrors.length, 'No console errors on initial load').toBe(0);
    expect(pageErrors.length, 'No page errors on initial load').toBe(0);
  });

  // Test that clicking the Start button triggers MST highlighting and visual style changes
  test('Clicking Start Kruskal highlights MST edges and applies visual style', async ({ page }) => {
    const kruskal = new KruskalPage(page);
    await kruskal.goto();
    await kruskal.waitForInitialRender();

    // Click the start button to run the visualization
    await kruskal.startKruskal();

    // The implementation highlights MST edges with incremental delays: 1s,2s,3s,4s -> wait a bit longer than total (5s)
    await page.waitForTimeout(5500);

    // The MST should include exactly 4 edges (nodes.length - 1)
    const mstCount = await kruskal.getMstLineCount();
    expect(mstCount).toBe(kruskal.nodes.length - 1);

    // Expected MST edges given the graph and weights (computed from script): (2,4), (0,4), (1,4), (3,4)
    const expectedMstEdges = [
      { u: 2, v: 4 },
      { u: 0, v: 4 },
      { u: 1, v: 4 },
      { u: 3, v: 4 }
    ];

    // Assert each expected edge has been marked with the 'mst' class and has green stroke as per CSS
    for (const e of expectedMstEdges) {
      const inMst = await kruskal.isEdgeInMst(e.u, e.v);
      expect(inMst, `Edge ${e.u}-${e.v} should be in MST`).toBe(true);

      // Verify computed style for stroke is green (rgb(0, 128, 0))
      const style = await kruskal.getEdgeStrokeStyle(e.u, e.v);
      // Some browsers return "rgb(0, 128, 0)" while others may return "green" resolved to rgb; test both possibilities
      expect(
        style.stroke === 'rgb(0, 128, 0)' || style.stroke.toLowerCase() === 'green',
        `Edge ${e.u}-${e.v} stroke should be green, got: ${style.stroke}`
      ).toBe(true);
    }

    // Ensure no console or page errors occurred during interaction and highlighting
    expect(consoleErrors.length, 'No console errors during MST visualization').toBe(0);
    expect(pageErrors.length, 'No page errors during MST visualization').toBe(0);
  });

  // Test clicking the Start button multiple times; should not create duplicate classes or throw errors
  test('Multiple Start clicks are idempotent and do not create duplicate MST markings or JS errors', async ({ page }) => {
    const kruskal = new KruskalPage(page);
    await kruskal.goto();
    await kruskal.waitForInitialRender();

    // Click once and wait for MST to complete
    await kruskal.startKruskal();
    await page.waitForTimeout(5500);

    // Record MST count after first run
    const mstCountAfterFirst = await kruskal.getMstLineCount();
    expect(mstCountAfterFirst).toBe(kruskal.nodes.length - 1);

    // Click the button again to ensure the code handles repeated invocations gracefully
    await kruskal.startKruskal();

    // Wait a short time to allow any additional class additions (there should be none added beyond the existing)
    await page.waitForTimeout(1500);

    // MST count should remain the same and no duplicate classes should be present
    const mstCountAfterSecond = await kruskal.getMstLineCount();
    expect(mstCountAfterSecond).toBe(mstCountAfterFirst);

    // Ensure no console or page errors occurred during the repeated click
    expect(consoleErrors.length, 'No console errors after repeated Start clicks').toBe(0);
    expect(pageErrors.length, 'No page errors after repeated Start clicks').toBe(0);
  });

  // Edge-case test: verify that non-MST edges are not inadvertently marked as part of MST
  test('Non-MST edges remain unmarked', async ({ page }) => {
    const kruskal = new KruskalPage(page);
    await kruskal.goto();
    await kruskal.waitForInitialRender();

    await kruskal.startKruskal();
    await page.waitForTimeout(5500);

    // Determine non-MST edges based on expected MST set
    const expectedMstSet = new Set(['2-4', '0-4', '1-4', '3-4']);
    for (const edge of kruskal.edges) {
      const key = `${edge.u}-${edge.v}`;
      if (!expectedMstSet.has(key)) {
        const isMst = await kruskal.isEdgeInMst(edge.u, edge.v);
        expect(isMst, `Edge ${key} should NOT be part of MST`).toBe(false);
      }
    }

    // Final sanity check: total number of MST-marked lines equals 4
    const finalMstCount = await kruskal.getMstLineCount();
    expect(finalMstCount).toBe(kruskal.nodes.length - 1);

    // Ensure still no page or console errors
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Final test to assert that no ReferenceError, SyntaxError, or TypeError occurred during any interactions
  test('No unexpected JS runtime errors (ReferenceError, SyntaxError, TypeError) observed during load and interactions', async ({ page }) => {
    const kruskal = new KruskalPage(page);
    await kruskal.goto();
    await kruskal.waitForInitialRender();

    // Perform interaction
    await kruskal.startKruskal();
    await page.waitForTimeout(5500);

    // Assert the arrays capturing errors are empty (no uncaught exceptions or console errors)
    // This validates that no ReferenceError, SyntaxError, TypeError, or other runtime errors occurred
    expect(pageErrors.length, 'No uncaught page errors like ReferenceError/TypeError/SyntaxError').toBe(0);
    expect(consoleErrors.length, 'No console.error logs indicating runtime errors').toBe(0);
  });
});