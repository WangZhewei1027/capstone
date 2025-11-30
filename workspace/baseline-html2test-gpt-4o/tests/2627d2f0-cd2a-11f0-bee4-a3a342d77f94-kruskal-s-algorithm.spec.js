import { test, expect } from '@playwright/test';

// Test file: 2627d2f0-cd2a-11f0-bee4-a3a342d77f94-kruskal-s-algorithm.spec.js
// Application URL (served externally as specified)
const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/2627d2f0-cd2a-11f0-bee4-a3a342d77f94.html';

// Page Object encapsulating selectors and common interactions
class GraphPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.graph = page.locator('#graph');
    this.edgeList = page.locator('#edgeList');
    this.runButton = page.getByRole('button', { name: "Run Kruskal's Algorithm" });
    this.nodeSelector = '.node';
    this.edgeSelector = '.edge';
  }

  // Count node DOM elements
  async nodeCount() {
    return await this.page.$$eval(this.nodeSelector, nodes => nodes.length);
  }

  // Count edge DOM elements
  async edgeCount() {
    return await this.page.$$eval(this.edgeSelector, edges => edges.length);
  }

  // Read edge list text and split into lines for easier assertions
  async edgeListLines() {
    const text = await this.edgeList.innerText();
    // The HTML sets a bold heading and then one edge per line using <br>.
    // innerText will show lines split by newline.
    return text.split('\n').map(line => line.trim()).filter(Boolean);
  }

  // Click the Run Kruskal button
  async clickRunKruskal() {
    await this.runButton.click();
  }

  // Count highlighted edges (edges with .highlight class)
  async highlightedEdgeCount() {
    return await this.page.$$eval(`${this.edgeSelector}.highlight`, els => els.length);
  }

  // Get CSS left/top of a node with a given innerText (node id)
  async getNodePositionById(id) {
    const locator = this.page.locator(this.nodeSelector).filter({ hasText: String(id) }).first();
    return {
      left: await locator.evaluate(el => el.style.left),
      top: await locator.evaluate(el => el.style.top),
      text: await locator.innerText()
    };
  }

  // Get style.width for first edge element (sanity)
  async firstEdgeWidth() {
    return await this.page.locator(this.edgeSelector).first().evaluate(el => el.style.width);
  }
}

test.describe('Kruskal\'s Algorithm Visualization - Basic UI and Behavior', () => {
  // Shared per-test objects
  let page;
  let graphPage;
  let pageErrors;
  let consoleErrors;

  test.beforeEach(async ({ browser }) => {
    // Create a fresh context+page for isolation
    const context = await browser.newContext();
    page = await context.newPage();

    // Setup collectors for page errors and console error messages
    pageErrors = [];
    consoleErrors = [];
    page.on('pageerror', err => {
      // capture the Error object for assertions later
      pageErrors.push(err);
    });
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    // Navigate to the application
    await page.goto(APP_URL);
    graphPage = new GraphPage(page);
  });

  test.afterEach(async () => {
    // close page/context to clean up
    await page.close();
  });

  test('Initial load: graph container, nodes, edges, and edge list are rendered', async () => {
    // Purpose: Verify that the static graph is drawn on page load and edge list shows all edges.

    // Graph container should be visible
    await expect(graphPage.graph).toBeVisible();

    // Expect nodes to be present (5 nodes defined in the HTML)
    const nodes = await graphPage.nodeCount();
    expect(nodes).toBe(5);

    // Expect edges to be present (8 edges defined in the HTML)
    const edges = await graphPage.edgeCount();
    expect(edges).toBe(8);

    // Edge list text should contain the heading and at least one known edge entry
    const lines = await graphPage.edgeListLines();
    // First line should be the heading text (innerText extracts HTML stripped)
    expect(lines[0].toLowerCase()).toContain('edges (u, v, weight):');
    // Check that a specific edge from the initial data is present
    expect(lines.some(l => l.includes('(0, 1, 10)'))).toBeTruthy();
    expect(lines.length).toBeGreaterThanOrEqual(1);
  });

  test('Nodes have positions matching the defined coordinates', async () => {
    // Purpose: Ensure nodes are positioned using inline styles reflecting the node coordinates.

    // Node with id 0 should have left/top as defined (50px, 50px)
    const pos0 = await graphPage.getNodePositionById(0);
    expect(pos0.text).toBe('0');
    expect(pos0.left).toBe('50px');
    expect(pos0.top).toBe('50px');

    // Node with id 2 should exist and have top/left per definition (350px, 350px)
    const pos2 = await graphPage.getNodePositionById(2);
    expect(pos2.text).toBe('2');
    expect(pos2.left).toBe('350px');
    expect(pos2.top).toBe('350px');
  });

  test('Edges have CSS widths and no highlights initially', async () => {
    // Purpose: Verify edges are rendered with a width and there are no highlighted edges initially.

    const firstEdgeWidth = await graphPage.firstEdgeWidth();
    // width should be set as a non-empty string like '300px' (not empty)
    expect(firstEdgeWidth).toBeTruthy();
    expect(firstEdgeWidth).not.toBe('0px');

    // No edge should have the highlight class at initial load
    const highlightedBefore = await graphPage.highlightedEdgeCount();
    expect(highlightedBefore).toBe(0);
  });

  test('Clicking "Run Kruskal\'s Algorithm" triggers a runtime error and prevents edge list update', async () => {
    // Purpose:
    // - Validate that clicking the Run button executes the algorithm code.
    // - Observe that the implementation throws a runtime error (TypeError) during DOM manipulations.
    // - Assert that because of the error the edge list is NOT updated to the MST (remains full edges).
    //
    // NOTE: Per test instructions we must not patch the page; we must let errors happen and assert them.

    // Ensure no page errors yet
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);

    // Sanity check: edge list shows the full set (8) before clicking
    const beforeLines = await graphPage.edgeListLines();
    expect(beforeLines.length).toBeGreaterThanOrEqual(1);
    // Count number of lines that look like edges "(u, v, weight)"
    const beforeEdgeEntries = beforeLines.filter(l => l.startsWith('('));
    expect(beforeEdgeEntries.length).toBe(8);

    // Perform the click and wait for a pageerror to be emitted.
    // The code inside runKruskal has a bug that should produce a TypeError when trying to add classList to undefined.
    const errorPromise = page.waitForEvent('pageerror');
    await graphPage.clickRunKruskal();
    const pageErr = await errorPromise;

    // Assert that a page error occurred and it is a TypeError (or mentions classList / undefined)
    expect(pageErr).toBeTruthy();
    // The Error object message should mention inability to read property 'classList' or 'undefined' reading.
    // Different Chromium versions can produce slightly different messages; check inclusions.
    const msg = pageErr.message || String(pageErr);
    expect(typeof msg).toBe('string');
    // We assert that it's indeed a TypeError by checking likely substrings.
    const msgLower = msg.toLowerCase();
    const indicatesTypeError = msgLower.includes('classlist') || msgLower.includes('cannot read') || msgLower.includes('reading');
    expect(indicatesTypeError).toBeTruthy();

    // Because runKruskal threw before completing updateEdgeList(result),
    // the visible edge list should remain unchanged and still contain 8 edges.
    const afterLines = await graphPage.edgeListLines();
    const afterEdgeEntries = afterLines.filter(l => l.startsWith('('));
    expect(afterEdgeEntries.length).toBe(8);

    // And there should still be no highlighted edges added
    const highlightedAfter = await graphPage.highlightedEdgeCount();
    expect(highlightedAfter).toBe(0);

    // Also check that console captured at least one error message (optional, if emitted)
    // If there is a console error, ensure it mentions similar content.
    if (consoleErrors.length > 0) {
      const ce = consoleErrors.join(' ').toLowerCase();
      expect(ce.includes('classlist') || ce.includes('cannot read') || ce.includes('reading')).toBeTruthy();
    }
  });

  test('Clicking the run button repeatedly generates additional runtime errors (consistent faulty behavior)', async () => {
    // Purpose: Ensure that multiple invocations re-trigger the same failing behavior and emit page errors.

    // First click -> capture first pageerror
    const firstErrPromise = page.waitForEvent('pageerror');
    await graphPage.clickRunKruskal();
    const firstErr = await firstErrPromise;
    expect(firstErr).toBeTruthy();

    // Second click should also cause a pageerror; capture it again
    const secondErrPromise = page.waitForEvent('pageerror');
    await graphPage.clickRunKruskal();
    const secondErr = await secondErrPromise;
    expect(secondErr).toBeTruthy();

    // The messages should be present and similar
    const m1 = String(firstErr.message || firstErr).toLowerCase();
    const m2 = String(secondErr.message || secondErr).toLowerCase();
    expect(m1.length).toBeGreaterThan(0);
    expect(m2.length).toBeGreaterThan(0);
  });

  test('Accessibility and control existence: Run button is reachable by role and labeled correctly', async () => {
    // Purpose: Verify that the primary control is discoverable via accessibility queries.

    await expect(graphPage.runButton).toBeVisible();
    await expect(graphPage.runButton).toHaveText(/run kruskal/i);

    // Ensure clicking via the role-based locator triggers the same behavior (we expect an error again)
    const errPromise = page.waitForEvent('pageerror');
    await graphPage.runButton.click();
    const err = await errPromise;
    expect(err).toBeTruthy();
  });
});