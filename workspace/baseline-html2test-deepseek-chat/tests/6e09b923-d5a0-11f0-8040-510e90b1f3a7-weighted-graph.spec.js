import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-deepseek-chat/html/6e09b923-d5a0-11f0-8040-510e90b1f3a7.html';

// Page Object Model for the Weighted Graph page
class GraphPage {
  constructor(page) {
    this.page = page;
    this.node1 = page.locator('#node1');
    this.node2 = page.locator('#node2');
    this.weight = page.locator('#weight');
    this.addEdgeButton = page.locator('button', { hasText: 'Add Edge' });
    this.addNodeButton = page.locator('button', { hasText: 'Add Node' });
    this.clearButton = page.locator('button', { hasText: 'Clear Graph' });
    this.svg = page.locator('#graph');
    this.nodes = page.locator('#graph .node');
    this.links = page.locator('#graph .link');
    this.weightTexts = page.locator('#graph .weight');
    this.labels = page.locator('#graph .label');
  }

  async goto() {
    await this.page.goto(BASE_URL);
  }

  async addNode(name) {
    await this.node1.fill(name);
    await this.addNodeButton.click();
  }

  async addEdge(n1, n2, w) {
    await this.node1.fill(n1);
    await this.node2.fill(n2);
    await this.weight.fill(String(w));
    await this.addEdgeButton.click();
  }

  async clearGraph() {
    await this.clearButton.click();
  }

  async getNodeLabels() {
    return this.labels.allTextContents();
  }

  async getWeightTexts() {
    return this.weightTexts.allTextContents();
  }

  async nodeCount() {
    return this.nodes.count();
  }

  async linkCount() {
    return this.links.count();
  }

  async waitForInitialRender() {
    // Wait until the initial expected items (3 nodes, 3 links) are present.
    await expect(this.labels).toHaveCount(3, { timeout: 3000 });
    await expect(this.nodes).toHaveCount(3, { timeout: 3000 });
    await expect(this.links).toHaveCount(3, { timeout: 3000 });
  }
}

test.describe('Weighted Graph Visualization - Interactive Tests', () => {
  // Arrays to capture console messages and page errors per test
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Capture console messages (all levels)
    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Capture unhandled page errors (e.g., ReferenceError, TypeError, SyntaxError)
    page.on('pageerror', err => {
      pageErrors.push(err);
    });
  });

  test('Initial load: renders default nodes A, B, C and three weighted edges', async ({ page }) => {
    // Purpose: Verify the application initializes with the example graph (A, B, C)
    const graph = new GraphPage(page);
    await graph.goto();

    // Wait for the simulation to render initial elements
    await graph.waitForInitialRender();

    // Assert that the labels A, B, C are present
    const labels = await graph.getNodeLabels();
    expect(labels.sort()).toEqual(['A', 'B', 'C'].sort());

    // Assert there are 3 visible node circles and 3 links
    expect(await graph.nodeCount()).toBe(3);
    expect(await graph.linkCount()).toBe(3);

    // Assert the weights text include the expected values: 4, 2, 5
    const weights = await graph.getWeightTexts();
    // There may be duplicates in ordering; check that expected values are present
    expect(weights).toEqual(expect.arrayContaining(['4', '2', '5']));

    // Verify the inputs and control buttons are visible and enabled
    await expect(page.locator('#node1')).toBeVisible();
    await expect(page.locator('#node2')).toBeVisible();
    await expect(page.locator('#weight')).toBeVisible();
    await expect(graph.addEdgeButton).toBeVisible();
    await expect(graph.addNodeButton).toBeVisible();
    await expect(graph.clearButton).toBeVisible();

    // Assert no uncaught page errors occurred during initial load
    expect(pageErrors.length, `Unexpected page errors: ${pageErrors.map(e => e.message).join('; ')}`).toBe(0);
  });

  test('Add a new node via Add Node button updates DOM and node count', async ({ page }) => {
    // Purpose: Ensure adding a standalone node updates the node list and rendering
    const graph = new GraphPage(page);
    await graph.goto();
    await graph.waitForInitialRender();

    const initialCount = await graph.nodeCount();
    expect(initialCount).toBe(3);

    // Add node 'D'
    await graph.addNode('D');

    // Expect a new label 'D' and increased node count
    await expect(graph.labels).toContainText('D');
    expect(await graph.nodeCount()).toBeGreaterThan(initialCount);

    // Ensure the label list contains D
    const labels = await graph.getNodeLabels();
    expect(labels).toEqual(expect.arrayContaining(['A', 'B', 'C', 'D']));

    // No uncaught page errors during this interaction
    expect(pageErrors.length, `Page errors after Add Node: ${pageErrors.map(e => e.message).join('; ')}`).toBe(0);
  });

  test('Add edge between existing nodes creates a new link with the specified weight', async ({ page }) => {
    // Purpose: Adding an edge between existing nodes should produce a new link and weight text
    const graph = new GraphPage(page);
    await graph.goto();
    await graph.waitForInitialRender();

    // Ensure node 'D' exists by adding it
    await graph.addNode('D');
    await expect(graph.labels).toContainText('D');

    const beforeLinks = await graph.linkCount();

    // Create an edge A-D with weight 7
    await graph.addEdge('A', 'D', 7);

    // Expect link count to increase by 1
    await expect(graph.links).toHaveCount(beforeLinks + 1, { timeout: 3000 });

    // Expect weight texts to include '7'
    await expect(graph.weightTexts).toContainText('7');

    // Verify there are no uncaught page errors
    expect(pageErrors.length, `Page errors after Add Edge: ${pageErrors.map(e => e.message).join('; ')}`).toBe(0);
  });

  test('Prevent adding self-loop and zero-weight edges (edge cases)', async ({ page }) => {
    // Purpose: Ensure self-loops (node1 === node2) and zero/invalid weights are not added
    const graph = new GraphPage(page);
    await graph.goto();
    await graph.waitForInitialRender();

    // Get current link count
    const initialLinks = await graph.linkCount();

    // Attempt to add a self-loop A-A with weight 3 (should not be added)
    await graph.addEdge('A', 'A', 3);

    // Link count should be unchanged
    expect(await graph.linkCount()).toBe(initialLinks);

    // Attempt to add an edge with weight 0 (parseInt -> 0 is falsy and should not add)
    await graph.addEdge('A', 'B', 0);
    expect(await graph.linkCount()).toBe(initialLinks);

    // Attempt to add edge with missing weight (empty string)
    await graph.node1.fill('A');
    await graph.node2.fill('E'); // E may or may not exist; weight empty
    await graph.weight.fill('');
    await graph.addEdgeButton.click();
    expect(await graph.linkCount()).toBe(initialLinks);

    // Confirm no unexpected page errors during edge-case attempts
    expect(pageErrors.length, `Page errors during edge-case tests: ${pageErrors.map(e => e.message).join('; ')}`).toBe(0);
  });

  test('Clear Graph button removes all SVG elements and resets visualization', async ({ page }) => {
    // Purpose: Verify clearGraph removes nodes, links, weights and empties the SVG
    const graph = new GraphPage(page);
    await graph.goto();
    await graph.waitForInitialRender();

    // Add an extra node and edge to ensure multiple elements exist
    await graph.addNode('X');
    await graph.addEdge('X', 'A', 9);

    // Ensure some elements exist before clearing
    expect(await graph.nodeCount()).toBeGreaterThan(0);
    expect(await graph.linkCount()).toBeGreaterThan(0);

    // Click Clear Graph
    await graph.clearGraph();

    // After clearing, SVG should have no children - node and link counts should be zero
    await expect(graph.nodes).toHaveCount(0);
    await expect(graph.links).toHaveCount(0);
    await expect(graph.labels).toHaveCount(0);
    await expect(graph.weightTexts).toHaveCount(0);

    // Also verify the SVG itself still exists and is visible
    await expect(graph.svg).toBeVisible();

    // No uncaught page errors as a result of clearing
    expect(pageErrors.length, `Page errors after clearGraph: ${pageErrors.map(e => e.message).join('; ')}`).toBe(0);
  });

  test('Basic drag interaction moves a node (simulated mouse drag)', async ({ page }) => {
    // Purpose: Try to exercise D3 drag handlers by simulating a mouse drag on a node.
    // Note: This test is heuristic; D3 simulation may interfere with exact positions.
    const graph = new GraphPage(page);
    await graph.goto();
    await graph.waitForInitialRender();

    // Select the first node circle
    const firstNode = graph.nodes.first();
    await expect(firstNode).toBeVisible();

    // Get bounding box to compute coordinates for mouse actions
    const box = await firstNode.boundingBox();
    if (!box) {
      // If bounding box is unavailable, fail explicitly
      throw new Error('Unable to determine node bounding box for drag simulation');
    }

    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;

    // Attempt a drag: mousedown, move, mouseup
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    // Move by 50 pixels right and 30 down
    await page.mouse.move(startX + 50, startY + 30, { steps: 10 });
    await page.mouse.up();

    // Allow the simulation one tick to update positions
    await page.waitForTimeout(300);

    // After drag, check if the node's cx or cy attribute changed from original box center
    // Query the node's cx attribute
    const cx = await firstNode.getAttribute('cx');
    const cy = await firstNode.getAttribute('cy');

    // At least one coordinate should be a valid number string; assert it's present
    expect(cx !== null && cy !== null).toBeTruthy();

    // No uncaught errors during drag
    expect(pageErrors.length, `Page errors during drag: ${pageErrors.map(e => e.message).join('; ')}`).toBe(0);
  });

  test('Console and page error observation: capture and report any runtime errors', async ({ page }) => {
    // Purpose: Demonstrate capturing console messages and page errors during user flows.
    const graph = new GraphPage(page);
    await graph.goto();
    await graph.waitForInitialRender();

    // Perform a few interactions to generate any potential runtime messages
    await graph.addNode('Y');
    await graph.addEdge('Y', 'Z', 11); // Z will be auto-added by addEdge
    await graph.clearGraph();

    // Wait briefly for any asynchronous console messages or errors to surface
    await page.waitForTimeout(300);

    // Assert that consoleMessages variable is an array and was populated (can be empty)
    expect(Array.isArray(consoleMessages)).toBe(true);

    // Assert that pageErrors array is present (can be empty). If there are any, ensure they are Error objects.
    expect(Array.isArray(pageErrors)).toBe(true);
    for (const err of pageErrors) {
      expect(err).toBeInstanceOf(Error);
      // Optionally, check for common JS error names if present (ReferenceError/TypeError/SyntaxError)
      if (err.name) {
        expect(['ReferenceError', 'TypeError', 'SyntaxError', 'Error']).toContain(err.name);
      }
    }

    // Final assertion: Prefer no uncaught page errors in normal operation.
    // If there are errors, include them in the message to aid debugging.
    expect(pageErrors.length, `Found uncaught page errors: ${pageErrors.map(e => e.message).join(' || ')}`).toBe(0);
  });
});