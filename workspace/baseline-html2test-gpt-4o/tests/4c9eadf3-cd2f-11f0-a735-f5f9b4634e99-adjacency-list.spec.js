import { test, expect } from '@playwright/test';

// Test file: 4c9eadf3-cd2f-11f0-a735-f5f9b4634e99-adjacency-list.spec.js
// Tests for: Adjacency List Visualizer
// URL: http://127.0.0.1:5500/workspace/html2test/html/4c9eadf3-cd2f-11f0-a735-f5f9b4634e99.html

// Page Object Model for the Adjacency List page
class AdjacencyListPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.url = 'http://127.0.0.1:5500/workspace/html2test/html/4c9eadf3-cd2f-11f0-a735-f5f9b4634e99.html';
    this.input = page.locator('#adjacencyInput');
    this.addButton = page.locator('button', { hasText: 'Add Node' });
    this.graph = page.locator('#graph');
    this.graphNodes = page.locator('#graph .graph-node');
    this.output = page.locator('#output');
    this.adjacencyItems = page.locator('#output ul li');
    this.header = page.locator('h1');
  }

  async goto() {
    await this.page.goto(this.url);
  }

  async addNode(text) {
    await this.input.fill(text);
    await this.addButton.click();
  }

  async getGraphNodeTexts() {
    return await this.graphNodes.allTextContents();
  }

  async getAdjacencyListTexts() {
    return await this.adjacencyItems.allTextContents();
  }

  async getGraphHtml() {
    return await this.graph.innerHTML();
  }

  async getOutputHtml() {
    return await this.output.innerHTML();
  }
}

test.describe('Adjacency List Visualizer - end-to-end', () => {
  // Collect console and page errors for each test to assert on them.
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Capture console.error messages
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push({ text: msg.text(), location: msg.location() });
      }
    });

    // Capture uncaught page errors (exceptions)
    page.on('pageerror', error => {
      // error is an Error object
      pageErrors.push(error);
    });
  });

  // Test initial page load and default state
  test('Initial load shows headings and empty graph/adjacency list', async ({ page }) => {
    const app = new AdjacencyListPage(page);
    await app.goto();

    // Verify main heading is visible and correct
    await expect(app.header).toBeVisible();
    await expect(app.header).toHaveText('Adjacency List Visualizer');

    // Graph container should contain the H2 and no graph-node entries initially
    await expect(app.graph.locator('h2')).toHaveText('Graph Nodes');
    await expect(app.graphNodes).toHaveCount(0);

    // Output container should contain the H2 and no UL initially
    await expect(app.output.locator('h2')).toHaveText('Adjacency List');
    // There may be no ul appended until a node is added
    await expect(app.adjacencyItems).toHaveCount(0);

    // Assert that no console errors or page errors occurred during initial load
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Test adding a single node and verifying DOM updates
  test('Adding a single node with multiple connections updates graph and adjacency list', async ({ page }) => {
    const app = new AdjacencyListPage(page);
    await app.goto();

    // Add a node "A" with connections "B" and "C"
    await app.addNode('A:B,C');

    // Verify the graph shows the node with correct formatting
    const graphTexts = await app.getGraphNodeTexts();
    expect(graphTexts.length).toBe(1);
    expect(graphTexts[0]).toBe('A: B, C');

    // Verify the adjacency list shows the entry in the output
    const adjacencyTexts = await app.getAdjacencyListTexts();
    expect(adjacencyTexts.length).toBe(1);
    expect(adjacencyTexts[0]).toBe('A -> B, C');

    // Ensure there were no console or page errors during the interaction
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Test adding multiple nodes and verifying order and content
  test('Adding multiple nodes produces corresponding graph nodes and adjacency list items', async ({ page }) => {
    const app = new AdjacencyListPage(page);
    await app.goto();

    // Add node B and C
    await app.addNode('B:A');
    await app.addNode('C:A,B');

    // Check graph nodes count and contents
    const graphTexts = await app.getGraphNodeTexts();
    expect(graphTexts.length).toBe(2);
    // Because insertion iterates over adjacencyList keys, order will be insertion order
    expect(graphTexts).toContain('B: A');
    expect(graphTexts).toContain('C: A, B');

    // Check adjacency list items
    const adjacencyTexts = await app.getAdjacencyListTexts();
    expect(adjacencyTexts.length).toBe(2);
    expect(adjacencyTexts).toContain('B -> A');
    expect(adjacencyTexts).toContain('C -> A, B');

    // No unexpected console/page errors
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Test malformed input: no colon -> should not add node
  test('Malformed input without colon does not add a node and does not throw errors', async ({ page }) => {
    const app = new AdjacencyListPage(page);
    await app.goto();

    // Add a well-formed node first to have baseline
    await app.addNode('X:Y');
    let graphTexts = await app.getGraphNodeTexts();
    expect(graphTexts.length).toBe(1);
    expect(graphTexts[0]).toBe('X: Y');

    // Try to add malformed input (no colon)
    await app.addNode('MalformedInputWithoutColon');

    // The malformed input should be ignored, so graph should remain unchanged
    graphTexts = await app.getGraphNodeTexts();
    expect(graphTexts.length).toBe(1);
    expect(graphTexts[0]).toBe('X: Y');

    // And adjacency list should remain with the single original entry
    const adjacencyTexts = await app.getAdjacencyListTexts();
    expect(adjacencyTexts.length).toBe(1);
    expect(adjacencyTexts[0]).toBe('X -> Y');

    // Assert no console or page errors occurred during malformed input handling
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Test edge case: entry with empty connections after colon (e.g., "E:") should not be added
  test('Input with empty connections (E:) is ignored and does not modify state', async ({ page }) => {
    const app = new AdjacencyListPage(page);
    await app.goto();

    // Baseline: add a node to ensure state exists
    await app.addNode('Base:Conn');
    let graphCount = await app.graphNodes.count();
    expect(graphCount).toBe(1);

    // Try to add node with empty connections
    await app.addNode('E:');

    // Should still be only the baseline node
    graphCount = await app.graphNodes.count();
    expect(graphCount).toBe(1);

    // Adjacency list unchanged
    const adjacencyTexts = await app.getAdjacencyListTexts();
    expect(adjacencyTexts.length).toBe(1);
    expect(adjacencyTexts[0]).toBe('Base -> Conn');

    // No errors
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Test that whitespace in node and connections is preserved (demonstrates lack of trimming in implementation)
  test('Whitespace in input is preserved in nodes and connections (no trimming behavior)', async ({ page }) => {
    const app = new AdjacencyListPage(page);
    await app.goto();

    // Intentionally include spaces around node and connections
    // Implementation does not trim, so we expect spaces to be part of the text nodes
    await app.addNode(' F : G , H ');

    // Validate graph entry preserves whitespace exactly as the script produces it
    const graphTexts = await app.getGraphNodeTexts();
    expect(graphTexts.length).toBe(1);
    // The implementation sets textContent to `${node}: ${connections}`
    // node will be ' F ' and connections join will be ' G , H ' (spaces preserved)
    expect(graphTexts[0]).toBe(' F :  G , H ');

    // Validate adjacency list item likewise
    const adjacencyTexts = await app.getAdjacencyListTexts();
    expect(adjacencyTexts.length).toBe(1);
    expect(adjacencyTexts[0]).toBe(' F  ->  G , H ');

    // Confirm no runtime errors occurred
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Test clicking Add Node with empty input does nothing
  test('Clicking Add Node with empty input does not change DOM and causes no errors', async ({ page }) => {
    const app = new AdjacencyListPage(page);
    await app.goto();

    // Ensure input is empty
    await expect(app.input).toHaveValue('');

    // Click Add Node with empty input
    await app.addButton.click();

    // No nodes should be present
    await expect(app.graphNodes).toHaveCount(0);
    await expect(app.adjacencyItems).toHaveCount(0);

    // No errors captured
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Final test to explicitly assert that console and page error lists remain empty
  test('Page did not emit console errors or uncaught exceptions during tests', async ({ page }) => {
    // This test exists to explicitly document and assert that no runtime errors were observed.
    const app = new AdjacencyListPage(page);
    await app.goto();

    // Perform a few interactions
    await app.addNode('M:N,O');
    await app.addNode('N:M');

    // Verify content has been updated
    const adjacencyTexts = await app.getAdjacencyListTexts();
    expect(adjacencyTexts).toContain('M -> N, O');
    expect(adjacencyTexts).toContain('N -> M');

    // Assert there were no console.error messages or page errors
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });
});