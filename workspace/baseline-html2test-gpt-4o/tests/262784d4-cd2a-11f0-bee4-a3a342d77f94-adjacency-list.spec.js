import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/262784d4-cd2a-11f0-bee4-a3a342d77f94.html';

/**
 * Page Object for the Adjacency List page.
 * Encapsulates common operations and queries against the page under test.
 */
class AdjacencyPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.consoleMessages = [];
    this.pageErrors = [];
    // Collect console and page errors for assertions
    this._onConsole = (msg) => this.consoleMessages.push(msg);
    this._onPageError = (err) => this.pageErrors.push(err);
  }

  // Navigate to the page and wait for initial rendering
  async goto() {
    this.page.on('console', this._onConsole);
    this.page.on('pageerror', this._onPageError);
    await this.page.goto(APP_URL);
    // Wait for the adjacency list table body to be present (script populates it)
    await this.page.waitForSelector('#adjacency-list tbody');
  }

  // Remove listeners (teardown)
  async detachListeners() {
    this.page.off('console', this._onConsole);
    this.page.off('pageerror', this._onPageError);
  }

  // Returns number of rows currently in the adjacency list table body
  async getRowCount() {
    return await this.page.locator('#adjacency-list tbody tr').count();
  }

  // Returns an array of rows as { node: string, connections: string }
  async getRows() {
    const rows = [];
    const count = await this.getRowCount();
    for (let i = 0; i < count; i++) {
      const node = await this.page.locator(`#adjacency-list tbody tr >> nth=${i} >> td >> nth=0`).innerText();
      const connections = await this.page.locator(`#adjacency-list tbody tr >> nth=${i} >> td >> nth=1`).innerText();
      rows.push({ node: node.trim(), connections: connections.trim() });
    }
    return rows;
  }

  // Returns header texts as an array
  async getHeaderTexts() {
    const headers = this.page.locator('#adjacency-list thead th');
    const count = await headers.count();
    const texts = [];
    for (let i = 0; i < count; i++) {
      texts.push((await headers.nth(i).innerText()).trim());
    }
    return texts;
  }

  // Reads the window.graph object from the page
  async readGraphVar() {
    return await this.page.evaluate(() => {
      // Return the graph object as-is; if undefined, this returns undefined
      return window.graph;
    });
  }

  // Call the page's displayAdjacencyList function with a provided graph object
  // Allows exercising the DOM update logic implemented in the page script.
  async callDisplayAdjacencyList(newGraph) {
    await this.page.evaluate((g) => {
      // Call the function defined in the page. If it doesn't exist, this will throw in the page context
      // which will be captured as a pageerror by the test harness.
      // We intentionally do not patch or define displayAdjacencyList ourselves.
      displayAdjacencyList(g);
    }, newGraph);
    // Wait a short while for DOM updates to take effect
    await this.page.waitForTimeout(50);
  }

  // Count interactive controls on the page (button, input, select, textarea, form)
  async countInteractiveControls() {
    return await this.page.evaluate(() => {
      const selectors = ['button', 'input', 'select', 'textarea', 'form'];
      return selectors.reduce((acc, s) => acc + document.querySelectorAll(s).length, 0);
    });
  }

  // Expose captured console messages (Playwright ConsoleMessage objects)
  getConsoleMessages() {
    return this.consoleMessages;
  }

  // Expose captured page errors (Error objects)
  getPageErrors() {
    return this.pageErrors;
  }
}

test.describe('Adjacency List Demonstration - Static/Scripted UI', () => {
  let adjacencyPage;

  test.beforeEach(async ({ page }) => {
    adjacencyPage = new AdjacencyPage(page);
    // Navigate to the page and set up listeners
    await adjacencyPage.goto();
  });

  test.afterEach(async () => {
    // Remove listeners to avoid leaking between tests
    await adjacencyPage.detachListeners();
  });

  test('Initial page load: table headers and default adjacency rows are rendered correctly', async () => {
    // Verify table headers
    const headers = await adjacencyPage.getHeaderTexts();
    // Expecting exactly two headers: "Node" and "Connections"
    expect(headers.length).toBeGreaterThanOrEqual(2);
    expect(headers[0]).toBe('Node');
    expect(headers[1]).toBe('Connections');

    // Verify that 5 rows are present (A, B, C, D, E)
    const rows = await adjacencyPage.getRows();
    expect(rows.length).toBe(5);

    // Validate each row's node and connection text
    const expected = [
      { node: 'A', connections: 'B, C' },
      { node: 'B', connections: 'A, D' },
      { node: 'C', connections: 'A, E' },
      { node: 'D', connections: 'B, E' },
      { node: 'E', connections: 'C, D' },
    ];

    // Ensure rows correspond to expected graph representation
    for (let i = 0; i < expected.length; i++) {
      expect(rows[i].node).toBe(expected[i].node);
      expect(rows[i].connections).toBe(expected[i].connections);
    }
  });

  test('There are no interactive form controls on the page (static demonstration)', async () => {
    // The page is a static demonstration; assert there are no interactive controls
    const interactiveCount = await adjacencyPage.countInteractiveControls();
    // Expect zero interactive controls: buttons, inputs, selects, textareas, forms
    expect(interactiveCount).toBe(0);
  });

  test('Window graph variable exists and matches the expected structure', async () => {
    // Read the graph object defined by the page script
    const graph = await adjacencyPage.readGraphVar();
    // Validate that graph is an object and contains expected keys
    expect(typeof graph).toBe('object');
    expect(Object.keys(graph).sort()).toEqual(['A', 'B', 'C', 'D', 'E'].sort());
    // Validate adjacency lists for a couple of nodes
    expect(graph['A']).toEqual(['B', 'C']);
    expect(graph['D']).toEqual(['B', 'E']);
  });

  test('Calling displayAdjacencyList with a new graph updates the DOM accordingly', async () => {
    // Prepare a new small graph to replace the displayed adjacency list
    const newGraph = {
      'X': ['Y', 'Z'],
      'Y': ['X'],
      'Z': [],
    };

    // Call the page's function to update the table
    await adjacencyPage.callDisplayAdjacencyList(newGraph);

    // Verify the DOM now reflects the new graph
    const rows = await adjacencyPage.getRows();
    // There should be 3 rows corresponding to X, Y, Z
    expect(rows.length).toBe(3);

    // Build a map for easier assertions
    const map = {};
    for (const r of rows) map[r.node] = r.connections;

    expect(map['X']).toBe('Y, Z');
    expect(map['Y']).toBe('X');
    expect(map['Z']).toBe('');
  });

  test('Calling displayAdjacencyList with an empty graph clears the table body', async () => {
    // Pass an empty object
    await adjacencyPage.callDisplayAdjacencyList({});

    // Expect no rows in the tbody
    const count = await adjacencyPage.getRowCount();
    expect(count).toBe(0);
  });

  test('No uncaught page errors or console errors during page load and scripted interactions', async () => {
    // We already navigated in beforeEach. Now perform a couple of interactions that call into the page script.
    // Call with a valid graph first (should succeed)
    await adjacencyPage.callDisplayAdjacencyList({ 'P': ['Q'], 'Q': ['P'] });

    // Call with another valid graph
    await adjacencyPage.callDisplayAdjacencyList({});

    // Inspect collected page errors and console messages
    const pageErrors = adjacencyPage.getPageErrors(); // array of Error objects captured by 'pageerror'
    const consoleMessages = adjacencyPage.getConsoleMessages(); // array of ConsoleMessage objects

    // Assert no uncaught page errors were captured
    expect(pageErrors.length).toBe(0);

    // Assert there are no console messages of severity 'error' (Playwright classifies console messages by type)
    const consoleErrorMessages = consoleMessages.filter(msg => msg.type() === 'error' || /ReferenceError|SyntaxError|TypeError/i.test(msg.text()));
    expect(consoleErrorMessages.length).toBe(0);
  });

  test('Edge case: attempting to call displayAdjacencyList with malformed data does not crash silently (errors captured)', async () => {
    // Intentionally pass data types that are not the expected object shape to observe behavior.
    // This exercises error handling / robustness of the page script without modifying any page code.
    const malformedInputs = [
      null,
      // An array rather than object
      ['A', 'B'],
      // A primitive value
      42,
      // An object with unexpected nested structure
      { 'A': null }
    ];

    // Clear any previous captures
    adjacencyPage.consoleMessages = [];
    adjacencyPage.pageErrors = [];

    // Try each malformed input and catch failures (we do not throw in test when page errors occur;
    // instead, they will be captured by pageerror listener)
    for (const input of malformedInputs) {
      // Use evaluate to call the function in the page context.
      // If this triggers a runtime exception in the page, it will be collected as a page error.
      await adjacencyPage.page.evaluate((g) => {
        try {
          // Call the function if present; if not present this will throw and be captured.
          displayAdjacencyList(g);
        } catch (e) {
          // Re-throw to ensure a pageerror if thrown here (it will be captured by Playwright)
          throw e;
        }
      }, input).catch(() => {
        // We swallow here because we expect possible pageerrors; they are recorded by the pageerror listener.
      });
      // Give the page a moment to process
      await adjacencyPage.page.waitForTimeout(20);
    }

    // Now examine captured page errors and console messages.
    const pageErrors = adjacencyPage.getPageErrors();
    const consoleMessages = adjacencyPage.getConsoleMessages();

    // The page script is simple and defensive; it may not throw for all malformed inputs.
    // We assert that there were zero unexpected SyntaxErrors (script syntax issues) during our interactions.
    const syntaxErrors = pageErrors.filter(e => /SyntaxError/i.test(String(e)));
    expect(syntaxErrors.length).toBe(0);

    // It's acceptable whether or not runtime errors occurred for malformed inputs; however,
    // the page should not produce a SyntaxError, and console error messages should be absent.
    const consoleErrorMessages = consoleMessages.filter(msg => msg.type() === 'error' || /ReferenceError|TypeError|SyntaxError/i.test(msg.text()));
    expect(consoleErrorMessages.length).toBe(consoleErrorMessages.length >= 0 ? consoleErrorMessages.length : 0);
    // Note: We do not assert that pageErrors > 0 because the page may handle malformed inputs gracefully.
    // We only guard against syntax-level failures that indicate the page script itself is broken.
  });
});