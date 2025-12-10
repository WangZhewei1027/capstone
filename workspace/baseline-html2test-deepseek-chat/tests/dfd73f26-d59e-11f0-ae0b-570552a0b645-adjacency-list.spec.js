import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-deepseek-chat/html/dfd73f26-d59e-11f0-ae0b-570552a0b645.html';

/**
 * Page Object for the Adjacency List visualization page.
 * Encapsulates common interactions and selectors.
 */
class AdjacencyListPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.container = page.locator('.container');
    this.nodeCountInput = page.locator('#nodeCount');
    this.graphTypeSelect = page.locator('#graphType');
    this.generateButton = page.locator('#generateGraph');
    this.resetButton = page.locator('#resetGraph');
    this.fromSelect = page.locator('#fromNode');
    this.toSelect = page.locator('#toNode');
    this.addEdgeButton = page.locator('#addEdge');
    this.graphContainer = page.locator('#graphContainer');
    this.adjacencyList = page.locator('#adjacencyList');
  }

  // Utility: count nodes in the visualization (DOM elements with .node)
  async countRenderedNodes() {
    return await this.page.locator('.node').count();
  }

  // Utility: count rendered edge elements (.edge)
  async countRenderedEdges() {
    return await this.page.locator('.edge').count();
  }

  // Utility: count adjacency list items
  async countAdjacencyItems() {
    return await this.adjacencyList.locator('.adjacency-item').count();
  }

  // Get text content of adjacency item for a given node id
  async adjacencyTextFor(nodeId) {
    const item = this.adjacencyList.locator(`.adjacency-item[data-node-id="${nodeId}"]`);
    if (await item.count() === 0) return null;
    return (await item.innerText()).trim();
  }

  // Click a node by its node id (data-node-id)
  async clickNode(nodeId) {
    const node = this.page.locator(`.node[data-node-id="${nodeId}"]`);
    await expect(node).toBeVisible();
    await node.click();
  }

  // Click an adjacency list item by node id
  async clickAdjacencyItem(nodeId) {
    const item = this.adjacencyList.locator(`.adjacency-item[data-node-id="${nodeId}"]`);
    await expect(item).toBeVisible();
    await item.click();
  }

  // Select from and to values (by numeric value) for addEdge controls
  async setFromTo(fromValue, toValue) {
    await this.fromSelect.selectOption(String(fromValue));
    await this.toSelect.selectOption(String(toValue));
  }

  // Trigger add edge and optionally handle dialog; returns dialog message if shown
  async clickAddEdgeExpectDialog(timeout = 500) {
    // Race click with a possible dialog. We'll try to wait for a dialog shortly after click.
    let dialogMessage = null;
    const dialogPromise = this.page.waitForEvent('dialog', { timeout }).then(async dialog => {
      dialogMessage = dialog.message();
      // Accept to keep the UI consistent (alerts are informative)
      await dialog.accept();
      return dialogMessage;
    }).catch(() => null);

    await this.addEdgeButton.click();
    // Wait for dialogPromise to settle
    try {
      await dialogPromise;
    } catch {
      // swallow
    }
    return dialogMessage;
  }

  async generateGraph() {
    await this.generateButton.click();
  }

  async resetGraph() {
    await this.resetButton.click();
  }

  // Change node count input value
  async setNodeCount(value) {
    await this.nodeCountInput.fill(String(value));
  }

  // Change graph type select
  async setGraphType(value) {
    await this.graphTypeSelect.selectOption(String(value));
  }

  // Get whether a given node element has the highlight class
  async nodeHasHighlight(nodeId) {
    const node = this.page.locator(`.node[data-node-id="${nodeId}"]`);
    return (await node.getAttribute('class') || '').split(/\s+/).includes('highlight');
  }

  // Get whether an adjacency item has the highlight class
  async adjacencyHasHighlight(nodeId) {
    const item = this.adjacencyList.locator(`.adjacency-item[data-node-id="${nodeId}"]`);
    return (await item.getAttribute('class') || '').split(/\s+/).includes('highlight');
  }
}

test.describe('Adjacency List Visualization - End-to-End', () => {
  let consoleMessages = [];
  let pageErrors = [];

  test.beforeEach(async ({ page }) => {
    // Reset collectors
    consoleMessages = [];
    pageErrors = [];

    // Collect console messages and page errors for assertions later
    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    // Navigate to the app and wait for it to initialize
    await page.goto(APP_URL, { waitUntil: 'load' });

    // Wait for the main container to be visible as a proxy for app readiness
    await page.locator('.container').waitFor({ state: 'visible' });
  });

  test.afterEach(async () => {
    // Basic assertion: there should be no uncaught page errors
    expect(pageErrors.length).toBe(0);
    // Assert there are no console messages of severity "error"
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  test('Initial load shows default controls and renders nodes and adjacency list', async ({ page }) => {
    // Purpose: Verify default state after page load: default inputs, nodes rendered, adjacency items present
    const app = new AdjacencyListPage(page);

    // Default nodeCount input value should be "5"
    await expect(app.nodeCountInput).toHaveValue('5');

    // Default graph type should be 'directed'
    await expect(app.graphTypeSelect).toHaveValue('directed');

    // There should be nodes rendered matching the default node count (5)
    const nodesCount = await app.countRenderedNodes();
    expect(nodesCount).toBeGreaterThanOrEqual(2); // at least 2; randomness may cause differences, but generation uses nodeCount
    // Adjacency list should contain an item per node (nodeCount items)
    const adjCount = await app.countAdjacencyItems();
    // We expect adjacency list items to be equal to the number of nodes (the implementation creates adjacency item per node)
    expect(adjCount).toBe(nodesCount);
  });

  test('Generate graph with custom node count and graph type updates DOM accordingly', async ({ page }) => {
    // Purpose: Change node count and graph type, click Generate and verify nodes/selects/adjacency update
    const app = new AdjacencyListPage(page);

    // Set node count to 3 and graph type to undirected then generate
    await app.setNodeCount(3);
    await app.setGraphType('undirected');
    await app.generateGraph();

    // Verify input/select reflect chosen values
    await expect(app.nodeCountInput).toHaveValue('3');
    await expect(app.graphTypeSelect).toHaveValue('undirected');

    // Expect 3 nodes rendered and 3 adjacency items
    const nodesCount = await app.countRenderedNodes();
    expect(nodesCount).toBe(3);
    const adjCount = await app.countAdjacencyItems();
    expect(adjCount).toBe(3);

    // The from/to selects should have 3 options each
    const fromOptions = await app.fromSelect.locator('option').count();
    const toOptions = await app.toSelect.locator('option').count();
    expect(fromOptions).toBe(3);
    expect(toOptions).toBe(3);
  });

  test('Add connection: handle both successful addition and duplicate edge alert', async ({ page }) => {
    // Purpose: Try to add a connection between node 0 and 1.
    // The test is robust to both cases: if the edge already exists an alert is shown,
    // otherwise the adjacency list will update to include the new neighbor.
    const app = new AdjacencyListPage(page);

    // Ensure we have at least 2 nodes
    await app.setNodeCount(4);
    await app.setGraphType('directed');
    await app.generateGraph();

    // Choose from=0 to=1
    await app.setFromTo(0, 1);

    // Click add and capture an alert if it appears
    const dialogMessage = await app.clickAddEdgeExpectDialog(700);

    if (dialogMessage) {
      // If a dialog appeared, it should be one of the expected messages
      const possibleMessages = [
        'This edge already exists!',
        'Self-loops are not allowed in this visualization'
      ];
      // The code uses alert for duplicates and self-loop prevention. Ensure we observed one of them.
      expect(possibleMessages.some(m => dialogMessage.includes(m))).toBeTruthy();
    } else {
      // No dialog -> the edge was added. Verify adjacency list updated.
      const node0Text = await app.adjacencyTextFor('0');
      expect(node0Text).toBeDefined();
      // The edge 1 should appear in Node 0 adjacency representation (format: "Node 0: [1, ...]")
      expect(node0Text.includes('1')).toBeTruthy();
    }
  });

  test('Add connection prevents self-loop and shows an alert', async ({ page }) => {
    // Purpose: Attempt to add a self-loop (from==to) and assert that an alert with the expected message appears.
    const app = new AdjacencyListPage(page);

    // Ensure there is at least one node to select
    await app.setNodeCount(3);
    await app.setGraphType('directed');
    await app.generateGraph();

    // Select a self-loop: from=0 to=0
    await app.setFromTo(0, 0);

    // Expect an alert dialog about self-loops
    const dialogMessage = await app.clickAddEdgeExpectDialog(700);
    expect(dialogMessage).toBeTruthy();
    expect(dialogMessage).toContain('Self-loops are not allowed in this visualization');
  });

  test('Reset graph clears nodes, edges and adjacency list', async ({ page }) => {
    // Purpose: Clicking Reset should clear the rendered nodes and adjacency list items
    const app = new AdjacencyListPage(page);

    // Ensure there is a graph
    await app.setNodeCount(4);
    await app.setGraphType('directed');
    await app.generateGraph();

    // Ensure some nodes exist before reset
    expect(await app.countRenderedNodes()).toBeGreaterThan(0);
    expect(await app.countAdjacencyItems()).toBeGreaterThan(0);

    // Click reset
    await app.resetGraph();

    // After reset, there should be no node elements and adjacency list should be empty
    await expect(app.graphContainer.locator('.node')).toHaveCount(0);
    await expect(app.adjacencyList.locator('.adjacency-item')).toHaveCount(0);
    // Graph container should be empty (no edges either)
    await expect(app.graphContainer.locator('.edge')).toHaveCount(0);
  });

  test('Clicking a node highlights the node and its adjacency list entry', async ({ page }) => {
    // Purpose: Verify that clicking a node adds the "highlight" class to the node and its adjacency item
    const app = new AdjacencyListPage(page);

    // Prepare a stable small graph
    await app.setNodeCount(5);
    await app.setGraphType('directed');
    await app.generateGraph();

    // Pick node 0 and click it
    const nodeExists = await page.locator('.node[data-node-id="0"]').count();
    expect(nodeExists).toBeGreaterThan(0);

    await app.clickNode(0);

    // The node element should have the highlight class
    const nodeHighlighted = await app.nodeHasHighlight('0');
    expect(nodeHighlighted).toBeTruthy();

    // The adjacency list item for node 0 should also be highlighted
    const adjacencyHighlighted = await app.adjacencyHasHighlight('0');
    expect(adjacencyHighlighted).toBeTruthy();

    // Any outgoing edges from this node (if present) should have the highlight class
    const outgoingEdges = page.locator('.edge').filter({ has: page.locator('[data-from]') });
    // We cannot guarantee there are outgoing edges; but if edges exist that originate from node 0,
    // they should be highlighted after the click. We'll iterate edges with dataset.from === "0".
    const edges = await page.locator('.edge').elementHandles();
    for (const el of edges) {
      const from = await el.getAttribute('data-from');
      if (from === '0') {
        const classAttr = await el.getAttribute('class');
        expect((classAttr || '').split(/\s+/)).toContain('highlight');
      }
    }
  });

  test('Console and page error monitoring: no uncaught errors or console.error messages', async ({ page }) => {
    // Purpose: Explicit test to assert that no uncaught page errors or console.error messages were produced during page lifecycle.
    // Note: This test relies on beforeEach and afterEach listeners that record messages.
    // We'll perform a few simple interactions and then assert that no errors were collected.

    const app = new AdjacencyListPage(page);

    // Perform a couple of interactions
    await app.setNodeCount(3);
    await app.setGraphType('directed');
    await app.generateGraph();

    // Click a node if exists
    const hasNode0 = await page.locator('.node[data-node-id="0"]').count();
    if (hasNode0) {
      await app.clickNode(0);
    }

    // Try addEdge between 0 and 1 (handle possible alert)
    await app.setFromTo(0, 1);
    await app.clickAddEdgeExpectDialog(700);

    // After interactions, the afterEach hook will assert there are no pageErrors and no console.error messages.
    // To make that explicit here too, we check the current collected arrays:
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });
});