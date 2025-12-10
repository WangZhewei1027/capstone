import { test, expect } from '@playwright/test';

// Test file: 39b83c62-d1d5-11f0-b49a-6f458b3a25ef-bellman-ford-algorithm.spec.js
// Purpose: Comprehensive Playwright end-to-end tests for the Bellman-Ford Algorithm visualization.
// Notes:
// - Tests load the page exactly as-is and observe console messages and page errors.
// - We do not modify or patch the application code. We let runtime errors occur naturally and assert on them where expected.
// - Uses Page Object pattern for clearer test code organization.

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-4o-5/html/39b83c62-d1d5-11f0-b49a-6f458b3a25ef.html';

// Page object encapsulating interactions with the Bellman-Ford demo page.
class BellmanFordPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.edgeInput = page.locator('#edgeInput');
    this.addEdgeButton = page.locator('button', { hasText: 'Add Edge' });
    this.runButton = page.locator('button', { hasText: 'Run Bellman-Ford Algorithm' });
    this.resetButton = page.locator('button', { hasText: 'Reset Graph' });
    this.graphDiv = page.locator('#graph');
    this.resultDiv = page.locator('#result');
  }

  async goto() {
    await this.page.goto(APP_URL);
    // Wait for the input to be visible to ensure the page is loaded
    await expect(this.edgeInput).toBeVisible();
  }

  // Fill the edge input (replaces any existing text)
  async fillEdgeInput(text) {
    await this.edgeInput.fill(text);
  }

  // Click the "Add Edge" button
  async clickAddEdge() {
    await this.addEdgeButton.click();
  }

  // Click the "Run Bellman-Ford Algorithm" button
  async clickRun() {
    await this.runButton.click();
  }

  // Click the "Reset Graph" button
  async clickReset() {
    await this.resetButton.click();
  }

  // Convenience: add an edge via input + add click
  async addEdge(text) {
    await this.fillEdgeInput(text);
    await this.clickAddEdge();
  }

  // Read graph innerHTML text
  async graphContent() {
    return this.graphDiv.innerHTML();
  }

  // Read result innerHTML text
  async resultContent() {
    return this.resultDiv.innerHTML();
  }
}

test.describe('Bellman-Ford Algorithm Visualization - Basic UI and interactions', () => {
  let pageErrors = [];
  let consoleMessages = [];

  test.beforeEach(async ({ page }) => {
    // Reset collectors for each test
    pageErrors = [];
    consoleMessages = [];

    // Collect page errors (uncaught exceptions thrown by the page)
    page.on('pageerror', (err) => {
      // store the Error object for assertions
      pageErrors.push(err);
    });

    // Collect console messages for additional diagnostics
    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
  });

  // Test initial page load and default state
  test('Initial load shows input and buttons and empty graph/result', async ({ page }) => {
    const bellman = new BellmanFordPage(page);
    // Navigate to the app
    await bellman.goto();

    // Verify the page title contains expected text
    await expect(page).toHaveTitle(/Bellman-Ford Algorithm Visualization/);

    // Verify interactive controls are visible and enabled
    await expect(bellman.edgeInput).toBeVisible();
    await expect(bellman.addEdgeButton).toBeVisible();
    await expect(bellman.runButton).toBeVisible();
    await expect(bellman.resetButton).toBeVisible();

    // Graph and result should be empty on initial load
    await expect(bellman.graphDiv).toHaveJSProperty('innerHTML', '');
    await expect(bellman.resultDiv).toHaveJSProperty('innerHTML', '');

    // Ensure no unexpected runtime ReferenceError/SyntaxError/TypeError occurred during load
    const fatalErrors = pageErrors.filter(e => ['ReferenceError', 'SyntaxError', 'TypeError'].includes(e.name));
    expect(fatalErrors.length).toBe(0);
  });

  // Test adding edges and verifying DOM updates
  test('Adding single and multiple edges updates the graph display and clears input', async ({ page }) => {
    const bellman1 = new BellmanFordPage(page);
    await bellman.goto();

    // Add a single edge and verify graph update
    await bellman.addEdge('0 1 4');

    // Graph should list the edge "0 -> 1 [4]"
    await expect(bellman.graphDiv).toContainText('0 -> 1 [4]');

    // Input should be cleared after adding
    await expect(bellman.edgeInput).toHaveValue('');

    // Add more edges
    await bellman.addEdge('1 2 3');
    await bellman.addEdge('0 2 10');

    // Graph should now include all edges in their textual representation
    const graphHtml = await bellman.graphContent();
    expect(graphHtml).toContain('0 -> 1 [4]');
    expect(graphHtml).toContain('1 -> 2 [3]');
    expect(graphHtml).toContain('0 -> 2 [10]');

    // No severe runtime errors should have been thrown while adding edges
    const fatalErrors1 = pageErrors.filter(e => ['ReferenceError', 'SyntaxError', 'TypeError'].includes(e.name));
    expect(fatalErrors.length).toBe(0);
  });

  // Test running the algorithm on a simple graph and validating the result distances
  test('Running Bellman-Ford computes shortest paths correctly for a small acyclic graph', async ({ page }) => {
    const bellman2 = new BellmanFordPage(page);
    await bellman.goto();

    // Build graph: 0->1 (4), 1->2 (3)
    await bellman.addEdge('0 1 4');
    await bellman.addEdge('1 2 3');

    // Click the Run button and wait for the resultDiv to update
    await bellman.clickRun();

    // The resultDiv should show distances: 0:0, 1:4, 2:7
    const resultHtml = await bellman.resultContent();
    expect(resultHtml).toContain('Vertex: 0, Distance from start: 0');
    expect(resultHtml).toContain('Vertex: 1, Distance from start: 4');
    expect(resultHtml).toContain('Vertex: 2, Distance from start: 7');

    // Confirm no ReferenceError/SyntaxError/TypeError occurred
    const fatalErrors2 = pageErrors.filter(e => ['ReferenceError', 'SyntaxError', 'TypeError'].includes(e.name));
    expect(fatalErrors.length).toBe(0);
  });

  // Test "done" input behavior: entering 'done' should trigger running the algorithm
  test("Entering 'done' into input triggers the algorithm run (via addEdge)", async ({ page }) => {
    const bellman3 = new BellmanFordPage(page);
    await bellman.goto();

    // Add no explicit vertices; type 'done' to trigger runBellmanFord
    await bellman.fillEdgeInput('done');

    // Click Add Edge which should detect 'done' and call runBellmanFord
    await bellman.clickAddEdge();

    // Because vertices is empty, implementation sets distances[start] = 0 -> expect Vertex: 0
    await expect(bellman.resultDiv).toContainText('Vertex: 0, Distance from start: 0');

    // Ensure no critical runtime errors occurred
    const fatalErrors3 = pageErrors.filter(e => ['ReferenceError', 'SyntaxError', 'TypeError'].includes(e.name));
    expect(fatalErrors.length).toBe(0);
  });

  // Test reset behavior clears graph and result
  test('Reset Graph button clears graph display and results', async ({ page }) => {
    const bellman4 = new BellmanFordPage(page);
    await bellman.goto();

    // Add edges and run to populate state
    await bellman.addEdge('0 1 4');
    await bellman.addEdge('1 2 3');
    await bellman.clickRun();

    // Ensure result populated
    await expect(bellman.resultDiv).not.toHaveText('');

    // Click Reset Graph and assert clearing of DOM
    await bellman.clickReset();
    await expect(bellman.graphDiv).toHaveJSProperty('innerHTML', '');
    await expect(bellman.resultDiv).toHaveJSProperty('innerHTML', '');

    // No page errors of the critical types should have occurred
    const fatalErrors4 = pageErrors.filter(e => ['ReferenceError', 'SyntaxError', 'TypeError'].includes(e.name));
    expect(fatalErrors.length).toBe(0);
  });

  // Test invalid input format triggers an alert dialog
  test('Invalid edge format triggers an alert dialog with helpful message', async ({ page }) => {
    const bellman5 = new BellmanFordPage(page);
    await bellman.goto();

    // Listen for the dialog and capture its message
    const dialogPromise = page.waitForEvent('dialog');

    // Enter invalid input
    await bellman.fillEdgeInput('invalid-format');

    // Click Add Edge to trigger alert
    await bellman.clickAddEdge();

    // Wait for the dialog and verify its message content
    const dialog = await dialogPromise;
    expect(dialog.message()).toBe('Invalid format! Please use: source destination weight');

    // Accept the alert to continue
    await dialog.accept();
  });

  // Test negative-weight cycle detection: this should cause the page to throw an uncaught Error
  test('Negative-weight cycle in graph results in an uncaught Error and a pageerror event', async ({ page }) => {
    const bellman6 = new BellmanFordPage(page);
    await bellman.goto();

    // Create a negative cycle: 0->1 (1), 1->2 (-2), 2->0 (0) => cycle sum = -1
    await bellman.addEdge('0 1 1');
    await bellman.addEdge('1 2 -2');
    await bellman.addEdge('2 0 0');

    // Click Run and await the pageerror which should be thrown by the algorithm
    const [error] = await Promise.all([
      page.waitForEvent('pageerror'),
      bellman.clickRun()
    ]);

    // The thrown Error from bellmanFord should include the message about negative-weight cycle
    expect(error).toBeTruthy();
    expect(error.message).toContain('Graph contains a negative-weight cycle');

    // Ensure that the pageerror is an Error but not a SyntaxError/ReferenceError/TypeError
    expect(['ReferenceError', 'SyntaxError', 'TypeError']).not.toContain(error.name);
  });

  // After each test, include a guard to ensure the page did not emit any fatal runtime errors we did not expect.
  test.afterEach(async ({}, testInfo) => {
    // If any unexpected fatal errors were collected, fail explicitly with diagnostics.
    const unexpected = pageErrors.filter(e => ['ReferenceError', 'SyntaxError', 'TypeError'].includes(e.name));
    if (unexpected.length > 0) {
      // Provide diagnostic output for debugging, then fail the test.
      const diagMsgs = unexpected.map(e => `${e.name}: ${e.message}`).join('\n');
      // Use Playwright's test.fail? We can't call test.fail here; instead throw to fail.
      throw new Error(`Unexpected runtime errors detected during test "${testInfo.title}":\n${diagMsgs}`);
    }
  });
});