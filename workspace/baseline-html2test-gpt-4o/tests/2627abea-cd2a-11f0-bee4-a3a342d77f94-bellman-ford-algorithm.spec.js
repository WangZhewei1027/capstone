import { test, expect } from '@playwright/test';

// Page Object Model for the Bellman-Ford visualization page
class BellmanFordPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.url = 'http://127.0.0.1:5500/workspace/html2test/html/2627abea-cd2a-11f0-bee4-a3a342d77f94.html';
    this.selectors = {
      graph: '#graph',
      nodes: '.node',
      nodeById: (id) => `#${id}`,
      button: 'button',
      result: '#result'
    };
  }

  // Navigate to the application page
  async load() {
    await this.page.goto(this.url);
  }

  // Click the Calculate button
  async clickCalculate() {
    await this.page.click(this.selectors.button);
  }

  // Get visible text content of the result container
  async getResultText() {
    return (await this.page.locator(this.selectors.result).innerText()).trim();
  }

  // Get raw innerHTML of the result container (to verify <br> usage)
  async getResultHTML() {
    return (await this.page.locator(this.selectors.result).innerHTML()).trim();
  }

  // Get text of all nodes in the graph (as an array of strings)
  async getNodesText() {
    const nodes = this.page.locator(this.selectors.nodes);
    const count = await nodes.count();
    const texts = [];
    for (let i = 0; i < count; i++) {
      texts.push((await nodes.nth(i).innerText()).trim());
    }
    return texts;
  }

  // Check whether a node with a particular id exists
  async nodeExists(id) {
    return await this.page.locator(this.selectors.nodeById(id)).count() > 0;
  }
}

// Group related tests for the Bellman-Ford visualization
test.describe('Bellman-Ford Algorithm Visualization - Interactive Tests', () => {
  // Arrays to collect console messages and page errors for assertions
  let consoleMessages;
  let pageErrors;

  // Attach listeners before each test and navigate to the page
  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Capture console messages for later assertions
    page.on('console', (msg) => {
      try {
        // We push a serializable representation
        consoleMessages.push({ type: msg.type(), text: msg.text() });
      } catch {
        consoleMessages.push({ type: 'unknown', text: String(msg) });
      }
    });

    // Capture page errors (unhandled exceptions)
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });
  });

  // Test initial page load and default state
  test('Initial load: graph nodes, button, and empty result are present', async ({ page }) => {
    const app = new BellmanFordPage(page);
    // Load page
    await app.load();

    // Verify graph container exists and nodes are visible
    const graphLocator = page.locator(app.selectors.graph);
    await expect(graphLocator).toBeVisible();

    // There should be 4 node elements labeled 0..3
    const nodeTexts = await app.getNodesText();
    // Expect exactly four nodes and the expected labels
    expect(nodeTexts.length).toBe(4);
    expect(nodeTexts).toEqual(['0', '1', '2', '3']);

    // Check each node exists by id
    for (let i = 0; i < 4; i++) {
      expect(await app.nodeExists(`node${i}`)).toBe(true);
    }

    // The calculate button should be visible and accessible
    const button = page.locator(app.selectors.button);
    await expect(button).toBeVisible();
    await expect(button).toHaveText(/Calculate Shortest Paths/i);

    // The result container should be present but empty initially
    const resultLocator = page.locator(app.selectors.result);
    await expect(resultLocator).toBeVisible();
    const initialResult = (await resultLocator.innerText()).trim();
    expect(initialResult).toBe('');

    // Assert that no unhandled page errors occurred during initial load
    expect(pageErrors.length).toBe(0);

    // Assert there are no console error-level messages
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  // Test that clicking the button computes expected shortest path distances
  test('Clicking "Calculate Shortest Paths" displays correct distances', async ({ page }) => {
    const app = new BellmanFordPage(page);
    await app.load();

    // Click the calculate button and wait for the result to appear
    await app.clickCalculate();

    // The result text should include distances for nodes 0..3
    const resultText = await app.getResultText();

    // Expected distances derived from the provided graph:
    // Node 0: 0
    // Node 1: 1
    // Node 2: -2 (via 0->1->2 with weight 1 + -3)
    // Node 3: 1 (via 0->1->2->3 yields -2 + 3 = 1)
    expect(resultText).toContain('Distance from Node 0 to Node 0: 0');
    expect(resultText).toContain('Distance from Node 0 to Node 1: 1');
    expect(resultText).toContain('Distance from Node 0 to Node 2: -2');
    expect(resultText).toContain('Distance from Node 0 to Node 3: 1');

    // Verify the innerHTML uses <br> separators (checks visual formatting)
    const resultHTML = await app.getResultHTML();
    expect(resultHTML).toMatch(/<br>/);

    // Ensure no runtime page errors were thrown during the calculation
    expect(pageErrors.length).toBe(0);

    // Ensure no console.error messages were emitted during calculation
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  // Test idempotency: repeated clicks produce the same result and do not create errors
  test('Multiple clicks are idempotent and do not cause errors', async ({ page }) => {
    const app = new BellmanFordPage(page);
    await app.load();

    // Click the calculate button multiple times
    await app.clickCalculate();
    const firstResult = await app.getResultText();

    await app.clickCalculate();
    const secondResult = await app.getResultText();

    // Results after multiple clicks should be identical
    expect(secondResult).toBe(firstResult);

    // No page errors and no console errors should have occurred
    expect(pageErrors.length).toBe(0);
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  // Test that the application does not (incorrectly) detect a negative-weight cycle for this graph
  test('Application correctly reports absence of negative weight cycle for the provided graph', async ({ page }) => {
    const app = new BellmanFordPage(page);
    await app.load();

    // Compute shortest paths
    await app.clickCalculate();

    // The result should NOT state that the graph contains a negative weight cycle
    const resultText = await app.getResultText();
    expect(resultText).not.toContain('Graph contains a negative weight cycle.');

    // Confirm expected distances are still present
    expect(resultText).toContain('Distance from Node 0 to Node 2: -2');

    // Ensure there are no unhandled exceptions
    expect(pageErrors.length).toBe(0);
  });

  // Accessibility and ARIA-related checks where relevant
  test('Accessibility: calculate button is keyboard accessible and focuses correctly', async ({ page }) => {
    const app = new BellmanFordPage(page);
    await app.load();

    const button = page.locator(app.selectors.button);

    // Focus the button via keyboard (tab)
    await page.keyboard.press('Tab');
    // The focused element should be the button (it is the first focusable element)
    await expect(button).toBeFocused();

    // Activate the button via Enter key and verify result updates
    await page.keyboard.press('Enter');
    const resultText = await app.getResultText();
    expect(resultText.length).toBeGreaterThan(0);

    // No runtime errors should have been produced by keyboard interaction
    expect(pageErrors.length).toBe(0);
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });
});