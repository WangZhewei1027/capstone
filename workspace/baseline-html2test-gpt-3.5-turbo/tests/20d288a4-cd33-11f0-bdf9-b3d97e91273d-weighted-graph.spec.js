import { test, expect } from '@playwright/test';

// Test file for: Weighted Graph Visualization
// File name requirement: 20d288a4-cd33-11f0-bdf9-b3d97e91273d-weighted-graph.spec.js
// Tests load the page as-is, observe console/page errors, and exercise UI interactions
// Note: tests intentionally do NOT patch or modify the page runtime; they observe natural behavior.

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/20d288a4-cd33-11f0-bdf9-b3d97e91273d.html';

// Page Object Model for the graph page
class GraphPage {
  constructor(page) {
    this.page = page;
    this.svg = page.locator('#graph-container svg');
    this.nodeGroups = page.locator('svg g.node'); // groups containing circle + text
    this.nodeCircles = page.locator('svg g.node circle'); // circles
    this.edges = page.locator('svg path'); // edge path elements
    this.edgeWeightTexts = page.locator('svg > g:first-child text'); // weight texts are in first g (edgesGroup)
    this.resetButton = page.locator('#resetBtn');
  }

  // Wait until the initial simulation sets path 'd' attributes for edges
  async waitForInitialLayout(timeout = 5000) {
    await this.page.waitForFunction(() => {
      const p = document.querySelector('svg path');
      return !!(p && p.getAttribute('d') && p.getAttribute('d').length > 0);
    }, null, { timeout });
    // Small pause to allow any rAF updates to settle
    await this.page.waitForTimeout(100);
  }

  async getNodeCount() {
    return this.nodeGroups.count();
  }

  async getEdgeCount() {
    return this.edges.count();
  }

  // Get transform attribute of a node group by index (0-based)
  async getNodeTransform(index) {
    const count = await this.nodeGroups.count();
    if (index < 0 || index >= count) throw new Error('node index out of range');
    return this.nodeGroups.nth(index).getAttribute('transform');
  }

  // Click an edge by index
  async clickEdge(index) {
    const edgeCount = await this.edges.count();
    if (index < 0 || index >= edgeCount) throw new Error('edge index out of range');
    // Click at the center of the path's bounding box
    const box = await this.edges.nth(index).boundingBox();
    if (!box) {
      // fallback to direct click
      await this.edges.nth(index).click({ force: true });
    } else {
      await this.page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    }
  }

  // Get stroke attribute of edge path
  async getEdgeStroke(index) {
    return this.edges.nth(index).getAttribute('stroke');
  }

  // Get stroke-width attribute of edge path
  async getEdgeStrokeWidth(index) {
    return this.edges.nth(index).getAttribute('stroke-width');
  }

  // Get fill attribute of weight text corresponding to edge index (assumes same ordering)
  async getEdgeWeightTextFill(index) {
    return this.edgeWeightTexts.nth(index).getAttribute('fill');
  }

  // Click on the SVG background (to clear highlights)
  async clickBackground() {
    // Click near top-left corner of svg (but not on nodes)
    const svgBox = await this.svg.boundingBox();
    if (!svgBox) {
      await this.page.locator('svg').click({ force: true });
    } else {
      // pick a corner inside svg with some margin
      await this.page.mouse.click(svgBox.x + 10, svgBox.y + 10);
    }
  }

  // Drag a node by index by moving mouse from its circle center by dx/dy in pixels
  async dragNodeBy(index, dx = 50, dy = 50) {
    const circle = this.nodeCircles.nth(index);
    const box1 = await circle.boundingBox();
    if (!box) throw new Error('Could not determine bounding box for node circle');
    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;
    await this.page.mouse.move(startX, startY);
    await this.page.mouse.down();
    // Move in steps for more realistic dragging
    const steps = 6;
    for (let i = 1; i <= steps; i++) {
      await this.page.mouse.move(
        startX + (dx * i) / steps,
        startY + (dy * i) / steps
      );
      // small pause between moves
      await this.page.waitForTimeout(20);
    }
    await this.page.mouse.up();
    // Allow updates to propagate
    await this.page.waitForTimeout(100);
  }

  // Click reset button
  async clickReset() {
    await this.resetButton.click();
    // Wait some time for simulation to run
    await this.page.waitForTimeout(500);
  }

  // Get the path 'd' attribute for an edge
  async getEdgePathD(index) {
    return this.edges.nth(index).getAttribute('d');
  }

  // Get text content of weight text by index
  async getEdgeWeightTextContent(index) {
    return this.edgeWeightTexts.nth(index).textContent();
  }
}

test.describe('Weighted Graph Visualization - Interactive tests', () => {
  // Collect console and page errors for each test to make assertions about runtime errors
  test.beforeEach(async ({ page }) => {
    // Attach console and pageerror listeners BEFORE navigation
    page['_consoleMessages'] = [];
    page['_pageErrors'] = [];

    page.on('console', msg => {
      // store console messages for later assertions
      page['_consoleMessages'].push({
        type: msg.type(),
        text: msg.text()
      });
    });

    page.on('pageerror', err => {
      // store page errors for later assertions
      page['_pageErrors'].push(err);
    });

    // Navigate to the app page
    await page.goto(APP_URL);
  });

  test.afterEach(async ({ page }) => {
    // After each test we assert that there were no uncaught page errors and no console error messages.
    // This observes errors naturally without modifying runtime.
    const pageErrors = page['_pageErrors'] || [];
    const consoleMessages = page['_consoleMessages'] || [];

    // Assert no uncaught exceptions occurred (ReferenceError, TypeError, etc.)
    expect(pageErrors.length, `Expected no page errors, but found: ${pageErrors.map(e => e.message).join('; ')}`).toBe(0);

    // Assert there were no console messages of type 'error'
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length, `Expected no console.error messages, but found: ${consoleErrors.map(e => e.text).join('; ')}`).toBe(0);
  });

  test('Initial page load: SVG, nodes and edges are present and weights rendered', async ({ page }) => {
    // Purpose: Verify DOM structure on initial load and that weight labels exist for each edge.
    const graph = new GraphPage(page);

    // Wait until initial layout sets edge path data
    await graph.waitForInitialLayout();

    // Verify SVG exists and is visible
    await expect(page.locator('#graph-container svg')).toBeVisible();

    // Verify number of nodes (should be 6) and edges (should be 7)
    const nodeCount = await graph.getNodeCount();
    const edgeCount1 = await graph.getEdgeCount();
    expect(nodeCount).toBe(6);
    expect(edgeCount).toBe(7);

    // Verify that each edge has a weight text and content matches expected numeric values present in the HTML data
    const expectedWeights = ['4','2','5','10','3','4','11'];
    for (let i = 0; i < expectedWeights.length; i++) {
      const txt = (await graph.getEdgeWeightTextContent(i)).trim();
      expect(txt).toBe(expectedWeights[i]);
    }
  });

  test('Clicking an edge highlights the edge line and its weight text; clicking background clears highlight', async ({ page }) => {
    // Purpose: Ensure clicking an edge changes visual attributes and clearing works via clicking background.
    const graph1 = new GraphPage(page);

    await graph.waitForInitialLayout();

    // Click the first edge and verify stroke and weight text color change
    await graph.clickEdge(0);

    // After click we expect stroke color to be "#e91e63" and stroke-width "4"
    const stroke = await graph.getEdgeStroke(0);
    const strokeWidth = await graph.getEdgeStrokeWidth(0);
    const weightFill = await graph.getEdgeWeightTextFill(0);

    expect(stroke).toBe('#e91e63');
    expect(strokeWidth === '4' || strokeWidth === 4).toBeTruthy();
    expect(weightFill).toBe('#e91e63');

    // Clicking another edge should clear previous and highlight the new one
    await graph.clickEdge(2);
    const prevStroke = await graph.getEdgeStroke(0);
    const newStroke = await graph.getEdgeStroke(2);
    expect(prevStroke).toBe('#666'); // previous reset to default
    expect(newStroke).toBe('#e91e63');

    // Click on empty svg background to clear highlight
    await graph.clickBackground();
    // All edges should be back to default stroke "#666"
    const strokes = [];
    const ec = await graph.getEdgeCount();
    for (let i = 0; i < ec; i++) {
      strokes.push(await graph.getEdgeStroke(i));
    }
    for (const s of strokes) {
      expect(s).toBe('#666');
    }
  });

  test('Dragging a node updates its transform and connected edge paths and weight label positions', async ({ page }) => {
    // Purpose: Verify drag behavior updates node transform attribute and that edges/weights reposition.
    const graph2 = new GraphPage(page);

    await graph.waitForInitialLayout();

    // Record initial transform of first node and an edge path that connects to it (edge 0: A-B)
    const initialTransform = await graph.getNodeTransform(0);
    expect(initialTransform).toBeTruthy();

    const initialEdgeD = await graph.getEdgePathD(0);
    expect(initialEdgeD).toBeTruthy();

    // Drag first node by +80,+60 pixels
    await graph.dragNodeBy(0, 80, 60);

    // After drag, transform must have changed (different translate coordinates)
    const afterTransform = await graph.getNodeTransform(0);
    expect(afterTransform).not.toBe(initialTransform);

    // Edge path connecting this node should update its 'd' attribute (endpoints moved)
    const afterEdgeD = await graph.getEdgePathD(0);
    expect(afterEdgeD).not.toBe(initialEdgeD);

    // Also verify that the weight text for that edge has numeric coordinates (x and y attributes)
    // We check that the weight text element has x and y attributes set (i.e., it's positioned)
    const weightText = page.locator('svg > g:first-child text').first();
    const xAttr = await weightText.getAttribute('x');
    const yAttr = await weightText.getAttribute('y');
    expect(xAttr).toBeTruthy();
    expect(yAttr).toBeTruthy();
    // They should be parseable as numbers
    expect(Number.isFinite(parseFloat(xAttr))).toBeTruthy();
    expect(Number.isFinite(parseFloat(yAttr))).toBeTruthy();
  });

  test('Reset button restores nodes to the initial circular layout', async ({ page }) => {
    // Purpose: Move a node, click reset, and verify the node returns approximately to its computed initial coordinates.
    const graph3 = new GraphPage(page);

    // Get window size from the page (script used these to compute initial positions)
    const dims = await page.evaluate(() => ({ w: window.innerWidth, h: window.innerHeight }));

    await graph.waitForInitialLayout();

    // Move node 0 significantly
    await graph.dragNodeBy(0, 200, -150);

    // Confirm transform changed
    const beforeResetTransform = await graph.getNodeTransform(0);
    expect(beforeResetTransform).not.toBeNull();

    // Click reset
    await graph.clickReset();

    // After reset, nodes are repositioned back to circle positions computed in initial script:
    // x = width/2 + 150*Math.cos((2*Math.PI*i)/nodes.length)
    // y = height/2 + 150*Math.sin((2*Math.PI*i)/nodes.length)
    // We'll verify node 0 (i=0) is near expected values within a small delta.

    const expectedX = dims.w / 2 + 150 * Math.cos((2 * Math.PI * 0) / 6);
    const expectedY = dims.h / 2 + 150 * Math.sin((2 * Math.PI * 0) / 6);

    // Allow time for simulation to settle after reset
    await page.waitForTimeout(600);

    const transformAfterReset = await graph.getNodeTransform(0);
    expect(transformAfterReset).toBeTruthy();

    // Parse transform "translate(x,y)"
    const m = transformAfterReset.match(/translate\(([-0-9.]+),\s*([-0-9.]+)\)/);
    expect(m).not.toBeNull();
    const x = parseFloat(m[1]);
    const y = parseFloat(m[2]);

    const delta = 15; // allow some slack because of simulation differences
    expect(Math.abs(x - expectedX)).toBeLessThanOrEqual(delta);
    expect(Math.abs(y - expectedY)).toBeLessThanOrEqual(delta);
  });

  test('Accessibility and static text: Info panel and reset button are visible and labeled', async ({ page }) => {
    // Purpose: Basic accessibility & visibility checks for controls and info text.
    const info = page.locator('#info');
    await expect(info).toBeVisible();

    // Check heading, paragraphs and reset button exist
    await expect(info.locator('h2')).toHaveText('Weighted Graph Demo');
    await expect(info.locator('button#resetBtn')).toBeVisible();
    await expect(info.locator('button#resetBtn')).toHaveText('Reset Layout');

    // Ensure paragraphs contain expected keywords
    const pText = await info.locator('p').first().textContent();
    expect(pText.toLowerCase().includes('weighted undirected graph')).toBeTruthy();
  });
});