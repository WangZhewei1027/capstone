import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-subtest2/html/f7681e60-d5b8-11f0-9ee1-ef07bdc6053d.html';

/**
 * Page Object for the Bellman-Ford visualization app.
 * Encapsulates common interactions and queries to keep tests readable.
 */
class BellmanFordPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.edgeInput = page.locator('#edgeInput');
    this.addEdgeButton = page.locator("button[onclick='addEdge()']");
    this.runButton = page.locator("button[onclick='runBellmanFord()']");
    this.graph = page.locator('#graph');
    this.output = page.locator('#output');
  }

  // Fill the edge input and click Add Edge.
  async addEdge(text, { handleDialog = true } = {}) {
    await this.edgeInput.fill(text);
    if (handleDialog) {
      // If an alert/prompt may appear (invalid input triggers alert), accept it.
      // Use once so it doesn't interfere with other tests.
      this.page.once('dialog', async dialog => {
        await dialog.accept();
      });
    }
    await this.addEdgeButton.click();
  }

  // Click Run Bellman-Ford and supply a source to the prompt when requested.
  // Returns the dialog message if present (for inspection), otherwise null.
  async runBellmanFordWithSource(source) {
    let dialogMessage = null;
    this.page.once('dialog', async dialog => {
      dialogMessage = dialog.message();
      await dialog.accept(source);
    });
    await this.runButton.click();
    // Give the page a chance to process the dialog & update DOM
    await this.page.waitForTimeout(100);
    return dialogMessage;
  }

  // Get graph edge texts from the DOM
  async getGraphEdges() {
    return await this.page.$$eval('#graph .edge', nodes => nodes.map(n => n.textContent.trim()));
  }

  // Get raw output HTML (the app uses innerHTML)
  async getOutputHTML() {
    return await this.output.evaluate(el => el.innerHTML);
  }

  // Get plain text content from output
  async getOutputText() {
    return await this.output.textContent();
  }

  // Get current value in the edge input field
  async getEdgeInputValue() {
    return await this.edgeInput.inputValue();
  }
}

test.describe('Bellman-Ford Algorithm Visualization - FSM Coverage', () => {
  // Capture console messages and page errors for assertions
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Listen to console events and page errors to assert them later
    page.on('console', msg => {
      // record both type and text for richer assertions
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    await page.goto(APP_URL);
  });

  test.afterEach(async () => {
    // nothing special here; the Playwright fixtures handle cleanup
  });

  test('Initial state (S0_Idle): page renders components and starts idle', async ({ page }) => {
    // Validate page loaded and core components exist
    const app = new BellmanFordPage(page);

    // Input and buttons should be visible
    await expect(app.edgeInput).toBeVisible();
    await expect(app.addEdgeButton).toBeVisible();
    await expect(app.runButton).toBeVisible();

    // Graph and output should be present and empty initially
    await expect(page.locator('#graph')).toBeVisible();
    const initialEdges = await app.getGraphEdges();
    expect(initialEdges.length).toBe(0);

    const outputHTML = await app.getOutputHTML();
    // The output div should be empty at load
    expect(outputHTML.trim()).toBe('');

    // No runtime page errors should have occurred on initial render
    expect(pageErrors.length).toBe(0);

    // Console should not contain error level messages on initial load
    const consoleErrorMsgs = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrorMsgs.length).toBe(0);
  });

  test('Add Edge transition (S0_Idle -> S1_EdgeAdded): valid input updates graph and clears input', async ({ page }) => {
    // This test verifies the AddEdge event and S1 entry action (updateGraphDisplay)
    const app = new BellmanFordPage(page);

    // Add a valid edge
    await app.addEdge('0 1 4');

    // After adding, the graph should have one .edge element with expected text
    const edges = await app.getGraphEdges();
    expect(edges.length).toBe(1);
    expect(edges[0]).toContain('Edge: 0 -> 1 with weight 4');

    // The input should be cleared after adding (S1 -> S0 expected edge input cleared)
    const inputVal = await app.getEdgeInputValue();
    expect(inputVal).toBe('');

    // No page errors or console errors should be present
    expect(pageErrors.length).toBe(0);
    const consoleErrorMsgs = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrorMsgs.length).toBe(0);
  });

  test('Add Edge with invalid input triggers alert and does not clear input (edge case)', async ({ page }) => {
    // Validate error scenario handling when user enters malformed edge string
    const app = new BellmanFordPage(page);

    // Prepare to capture the alert dialog message
    let dialogSeen = null;
    page.once('dialog', async dialog => {
      dialogSeen = { type: dialog.type(), message: dialog.message() };
      await dialog.accept(); // dismiss the alert so the test can continue
    });

    // Input invalid text and click Add Edge (the page's addEdge will alert)
    await app.edgeInput.fill('invalid input');
    await app.addEdgeButton.click();

    // Give the page a short moment to process the dialog
    await page.waitForTimeout(50);

    // The alert should have been shown with the invalid input message
    expect(dialogSeen).not.toBeNull();
    expect(dialogSeen.type).toBe('alert');
    expect(dialogSeen.message).toContain("Invalid input");

    // Because input was invalid, the input field should NOT be cleared per implementation
    const inputVal = await app.getEdgeInputValue();
    expect(inputVal).toBe('invalid input');

    // Graph should still have no edges added
    const edges = await app.getGraphEdges();
    expect(edges.length).toBe(0);
  });

  test('Run Bellman-Ford (S0_Idle -> S2_BellmanFordRunning -> S3_ResultsDisplayed): results displayed for basic graph', async ({ page }) => {
    // This test validates the run flow: prompt is shown, distances computed, and results displayed
    const app = new BellmanFordPage(page);

    // Build a small graph:
    // 0 -> 1 (4), 1 -> 2 (3), 0 -> 2 (10)
    await app.addEdge('0 1 4');
    await app.addEdge('1 2 3');
    await app.addEdge('0 2 10');

    // Ensure graph shows 3 edges
    const edges = await app.getGraphEdges();
    expect(edges.length).toBe(3);

    // Run algorithm and respond to prompt with source '0'
    const promptMessage = await app.runBellmanFordWithSource('0');

    // The prompt message should ask for source vertex
    expect(promptMessage).toContain('Enter the source vertex');

    // Wait for results to be displayed in the output div
    await page.waitForFunction(() => {
      const out = document.getElementById('output');
      return out && out.innerHTML && out.innerHTML.includes('Shortest distances from the source vertex');
    });

    const outputHTML = await app.getOutputHTML();
    // Output should contain distances for vertices 0,1,2
    expect(outputHTML).toContain('Vertex 0: 0');
    expect(outputHTML).toContain('Vertex 1: 4');
    // Best path to 2 is via 1: cost 7
    expect(outputHTML).toContain('Vertex 2: 7');

    // No page errors should have occurred
    expect(pageErrors.length).toBe(0);
  });

  test('Run Bellman-Ford detects negative weight cycle and logs to console (edge case)', async ({ page }) => {
    // This test creates a negative cycle reachable from the source and asserts the console log
    const app = new BellmanFordPage(page);

    // Add edges that form a negative cycle reachable from 0:
    // 0 -> 1 (1), 1 -> 0 (-3) => cycle sum -2
    await app.addEdge('0 1 1');
    await app.addEdge('1 0 -3');

    // Reset captured console messages for this test to isolate detection log
    consoleMessages = [];
    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Run algorithm with source 0; prompt will be accepted with '0'
    await app.runBellmanFordWithSource('0');

    // Wait a bit for console logging to happen
    await page.waitForTimeout(100);

    // Look for the negative cycle detection message among console logs
    const negCycleLogs = consoleMessages.filter(m => m.text.includes('Negative weight cycle detected'));
    expect(negCycleLogs.length).toBeGreaterThanOrEqual(1);

    // The output should NOT contain the 'Shortest distances...' text because function returns early
    const outputHTML = await app.getOutputHTML();
    expect(outputHTML.trim()).toBe('');
  });

  test('Multiple addEdge transitions: input cleared each time and graph updates incrementally', async ({ page }) => {
    // This test validates repeated AddEdge transitions (S1 -> S0 -> S1 etc.)
    const app = new BellmanFordPage(page);

    // Add three edges one after another and verify behavior each time
    await app.addEdge('0 1 2');
    expect(await app.getEdgeInputValue()).toBe('');
    let edges = await app.getGraphEdges();
    expect(edges.length).toBe(1);

    await app.addEdge('1 2 3');
    expect(await app.getEdgeInputValue()).toBe('');
    edges = await app.getGraphEdges();
    expect(edges.length).toBe(2);

    await app.addEdge('2 3 4');
    expect(await app.getEdgeInputValue()).toBe('');
    edges = await app.getGraphEdges();
    expect(edges.length).toBe(3);
  });

  test('Observe console and page errors throughout interactions (sanity check)', async ({ page }) => {
    // This test just ensures normal interactions do not produce unhandled page errors
    const app = new BellmanFordPage(page);

    // Clear any previously captured messages
    consoleMessages = [];
    pageErrors = [];

    // Perform some actions
    await app.addEdge('10 11 5');
    await app.addEdge('11 12 6');
    await app.runBellmanFordWithSource('10');

    // Allow processing
    await page.waitForTimeout(100);

    // No unhandled page errors should be present
    expect(pageErrors.length).toBe(0);

    // Console may contain logs but should not contain 'error' type entries
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });
});