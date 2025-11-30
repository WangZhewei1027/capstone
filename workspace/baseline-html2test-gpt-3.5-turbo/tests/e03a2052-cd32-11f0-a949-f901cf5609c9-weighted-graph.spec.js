import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/e03a2052-cd32-11f0-a949-f901cf5609c9.html';

// Page object for the weighted graph page to encapsulate common queries and actions
class GraphPage {
  constructor(page) {
    this.page = page;
    this.svg = page.locator('#graph');
    this.info = page.locator('#info');
    this.nodeGroup = page.locator('#nodes');
    this.edgeGroup = page.locator('#edges');
    this.nodes = page.locator('#nodes .node');
    this.edges = page.locator('#edges .edge');
  }

  // Get the circle element for a node id (data-id)
  nodeCircle(nodeId) {
    return this.page.locator(`#nodes .node[data-id="${nodeId}"] circle`);
  }

  // Get the group element for an edge by DOM index (0-based following edges array order in source)
  edgeAt(index) {
    return this.page.locator('#edges .edge').nth(index);
  }

  // Click a node by data-id
  async clickNode(nodeId) {
    const circle = this.nodeCircle(nodeId);
    await circle.click();
  }

  // Click on empty svg background to trigger reset
  async clickBackground() {
    // Click near top-left corner of svg where nodes are not present (safe empty space).
    // Use a small offset to ensure clicking the svg element itself.
    await this.svg.click({ position: { x: 5, y: 5 } });
  }

  // Helper to read attribute of node circle
  async nodeFill(nodeId) {
    return await this.nodeCircle(nodeId).getAttribute('fill');
  }
  async nodeStroke(nodeId) {
    return await this.nodeCircle(nodeId).getAttribute('stroke');
  }

  // Helper to read edge path stroke and stroke-width
  async edgeStroke(index) {
    return await this.edgeAt(index).locator('path').getAttribute('stroke');
  }
  async edgeStrokeWidth(index) {
    return await this.edgeAt(index).locator('path').getAttribute('stroke-width');
  }

  // Helper to read edge weight text content and its fill & styles
  async edgeWeightText(index) {
    const textLocator = this.edgeAt(index).locator('text');
    const text = await textLocator.textContent();
    const fill = await textLocator.getAttribute('fill');
    const fontWeight = await textLocator.evaluate(el => el.style.fontWeight || window.getComputedStyle(el).fontWeight);
    const fontSize = await textLocator.evaluate(el => el.style.fontSize || window.getComputedStyle(el).fontSize);
    return { text: (text || '').trim(), fill, fontWeight, fontSize };
  }

  async infoText() {
    return (await this.info.textContent())?.trim();
  }

  // Count nodes and edges
  async nodeCount() {
    return await this.nodes.count();
  }
  async edgeCount() {
    return await this.edges.count();
  }
}

test.describe('Weighted Graph Demo - Basic checks and interactions', () => {
  // Arrays to capture any console errors and page errors during each test
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Capture console messages of the page; collect only error-level messages for assertions
    page.on('console', msg => {
      try {
        if (msg.type() === 'error') {
          consoleErrors.push({
            text: msg.text(),
            location: msg.location()
          });
        }
      } catch (e) {
        // If reading message details fails, still record something
        consoleErrors.push({ text: 'console message capture failed' });
      }
    });

    // Capture unhandled exceptions raised in the page context
    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    // Navigate to the app page
    await page.goto(APP_URL);
  });

  test.afterEach(async ({ page }) => {
    // detach listeners by closing the page context (Playwright does this automatically),
    // leave arrays for test assertions in each test.
  });

  test('Initial load: nodes, edges and info text are present and correct', async ({ page }) => {
    // Purpose: Verify the initial state of the page — node and edge counts and default informational text.
    const gp = new GraphPage(page);

    // Wait for nodes and edges groups to exist
    await expect(gp.nodeGroup).toBeVisible();
    await expect(gp.edgeGroup).toBeVisible();

    // Assert number of nodes equals 6 (as defined in source)
    const nodeCount = await gp.nodeCount();
    expect(nodeCount).toBe(6);

    // Assert number of edges equals 9 (unique undirected edges defined)
    const edgeCount = await gp.edgeCount();
    expect(edgeCount).toBe(9);

    // Check that some known edge weight exists in the DOM (e.g., weight "7" from 0-1)
    // We will assert that at least one text node with '7' exists among edge weight texts
    const weights = [];
    for (let i = 0; i < edgeCount; i++) {
      const w = await gp.edgeWeightText(i);
      weights.push(w.text);
    }
    expect(weights).toContain('7');
    expect(weights).toContain('2'); // small weight present (edge 3-4 weight 2)

    // Check initial info text equals expected guidance
    const infoText = await gp.infoText();
    expect(infoText).toBe('Click a node to highlight its connections and see edge weights.');

    // There should not be any uncaught page errors on initial load
    expect(pageErrors.length).toBe(0);
    // There should not be console.error messages on initial load
    expect(consoleErrors.length).toBe(0);
  });

  test('Clicking a node highlights it, its connected edges and neighbor nodes; info text updates', async ({ page }) => {
    // Purpose: Validate that clicking a node (id=0 => label 'A') highlights the selected node,
    // highlights its directly connected edges and weight text, and marks neighbor nodes with a different color.
    const gp1 = new GraphPage(page);

    // Click node with data-id="0" (node 'A')
    await gp.clickNode(0);

    // Selected node circle should have the highlight fill and stroke defined in the code
    const selectedFill = await gp.nodeFill(0);
    const selectedStroke = await gp.nodeStroke(0);
    expect(selectedFill).toBe('#fbbc04');
    expect(selectedStroke).toBe('#c49000');

    // Edges connected to node 0 in the source are at indices 0 (0-1), 1 (0-5), 2 (0-3)
    // Verify those edges have stroke color '#fbbc04' and stroke-width '4'
    const connectedEdgeIndices = [0, 1, 2];
    for (const idx of connectedEdgeIndices) {
      const stroke = await gp.edgeStroke(idx);
      const width = await gp.edgeStrokeWidth(idx);
      expect(stroke).toBe('#fbbc04');
      expect(width).toBe('4');
      // Also verify weight text for these edges is highlighted (fill '#c49000', bold, larger font)
      const weightInfo = await gp.edgeWeightText(idx);
      expect(weightInfo.fill).toBe('#c49000');
      // fontWeight might be 'bold' via style; either 'bold' or computed 700; allow both
      expect(['bold', '700', 'bolder', '']).toContain(weightInfo.fontWeight);
      expect(weightInfo.fontSize).toContain('14'); // style.fontSize '14px' expected
    }

    // Neighbor nodes for node 0 are nodes 1, 5 and 3 — they should be marked with green fill '#34a853'
    const neighborIds = [1, 5, 3];
    for (const nid of neighborIds) {
      const fill1 = await gp.nodeFill(nid);
      const stroke1 = await gp.nodeStroke(nid);
      expect(fill).toBe('#34a853');
      expect(stroke).toBe('#2c8e41');
    }

    // Info text should reflect the selected node label 'A'
    const infoText1 = await gp.infoText1();
    expect(infoText).toContain('Selected node: A.');

    // No uncaught page errors or console errors should have occurred during this interaction
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  test('Clicking background SVG resets all highlights to default', async ({ page }) => {
    // Purpose: Ensure clicking empty space (svg background) resets node and edge styles and info text.
    const gp2 = new GraphPage(page);

    // Click a node first to make highlights visible
    await gp.clickNode(0);

    // Now click the svg background to reset
    await gp.clickBackground();

    // All nodes should be reset to default fill and stroke
    const defaultFill = '#4285f4';
    const defaultStroke = '#3367d6';
    const nodeCount1 = await gp.nodeCount1();
    for (let i = 0; i < nodeCount; i++) {
      const fill2 = await gp.nodeFill(i);
      const stroke2 = await gp.nodeStroke(i);
      expect(fill).toBe(defaultFill);
      expect(stroke).toBe(defaultStroke);
    }

    // All edges should be reset to default stroke and width
    const edgeCount1 = await gp.edgeCount1();
    for (let i = 0; i < edgeCount; i++) {
      const stroke3 = await gp.edgeStroke(i);
      const width1 = await gp.edgeStrokeWidth(i);
      expect(stroke).toBe('#999');
      expect(width).toBe('2');
      const weightInfo1 = await gp.edgeWeightText(i);
      expect(weightInfo.fill).toBe('#333');
      // styles are reset to normal/default
      expect(weightInfo.fontSize).toContain('12');
    }

    // Info text should be the original guidance again
    const infoText2 = await gp.infoText2();
    expect(infoText).toBe('Click a node to highlight its connections and see edge weights.');

    // Still assert no runtime errors
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  test('Clicking the same node twice does not toggle selection off (checks mismatch between UI text and behavior)', async ({ page }) => {
    // Purpose: The UI message suggests clicking the same node again resets highlights,
    // but the implementation does not toggle selection off. This test verifies actual behavior:
    // clicking the same node again leaves it highlighted (idempotent highlight).
    const gp3 = new GraphPage(page);

    // Click node 0 twice
    await gp.clickNode(0);
    // Confirm selected after first click
    let fill1 = await gp.nodeFill(0);
    expect(fill1).toBe('#fbbc04');

    // Click the same node again
    await gp.clickNode(0);
    // After second click, selection should still be highlighted (not reset)
    const fill2 = await gp.nodeFill(0);
    expect(fill2).toBe('#fbbc04');

    // Info text should still show selected node message for A
    const infoText3 = await gp.infoText3();
    expect(infoText).toContain('Selected node: A.');

    // No runtime errors introduced by repeated clicking
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  test.describe('Robustness: Console and page error monitoring', () => {
    test('No uncaught ReferenceError, TypeError, or SyntaxError occurred during interactions', async ({ page }) => {
      // Purpose: Monitor runtime errors and ensure none of the common uncaught errors occurred.
      // We'll perform a few interactions and then assert that no unexpected errors are present.
      const gp4 = new GraphPage(page);

      // Perform interactions: click a few nodes and background
      await gp.clickNode(2);
      await gp.clickNode(4);
      await gp.clickBackground();
      await gp.clickNode(3);

      // Evaluate captured errors
      // pageErrors are actual Error objects reported by the page runtime
      // consoleErrors are messages emitted via console.error from page
      // Assert that none represent ReferenceError, TypeError, or SyntaxError
      for (const err of pageErrors) {
        const name = err && err.name ? err.name : (err && err.constructor ? err.constructor.name : 'UnknownError');
        expect(['ReferenceError', 'TypeError', 'SyntaxError']).not.toContain(name);
      }

      for (const c of consoleErrors) {
        // The console error text may include error type names; ensure not present
        const text1 = (c && c.text1) ? String(c.text1) : '';
        expect(text).not.toMatch(/ReferenceError|TypeError|SyntaxError/);
      }

      // Additionally assert that there are zero pageErrors in total (there shouldn't be errors)
      expect(pageErrors.length).toBe(0);
      expect(consoleErrors.length).toBe(0);
    });
  });
});