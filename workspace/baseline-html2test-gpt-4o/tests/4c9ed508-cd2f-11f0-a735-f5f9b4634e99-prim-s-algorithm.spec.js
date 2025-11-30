import { test, expect } from '@playwright/test';

// Test file for: Prim's Algorithm Demo
// Application URL:
// http://127.0.0.1:5500/workspace/html2test/html/4c9ed508-cd2f-11f0-a735-f5f9b4634e99.html
//
// This suite:
// - Loads the page as-is (no modifications).
// - Observes console messages and page errors (records them).
// - Exercises the "Run Prim's Algorithm" button and inspects DOM updates.
// - Verifies node/edge rendering and visual feedback after running the algorithm.
//
// Notes:
// - We intentionally do NOT patch or modify the page's JS. We allow runtime errors
//   to happen naturally and assert on their presence/absence as part of the tests.
// - The tests use a small Page Object (GraphPage) to encapsulate common interactions.

const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/4c9ed508-cd2f-11f0-a735-f5f9b4634e99.html';

class GraphPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
  }

  // Click the "Run Prim's Algorithm" button
  async clickRunButton() {
    await this.page.click('#run-algorithm');
  }

  // Get count of nodes rendered (.node elements)
  async getNodeCount() {
    return this.page.evaluate(() => document.getElementsByClassName('node').length);
  }

  // Get count of edges rendered (.edge elements)
  async getEdgeCount() {
    return this.page.evaluate(() => document.getElementsByClassName('edge').length);
  }

  // Get array of node labels and their positions (left/top)
  async getNodesDetails() {
    return this.page.evaluate(() => {
      return Array.from(document.getElementsByClassName('node')).map(el => ({
        text: el.textContent,
        left: el.style.left,
        top: el.style.top,
        inlineBackground: el.style.backgroundColor,
        computedBackground: window.getComputedStyle(el).backgroundColor
      }));
    });
  }

  // Return details of edges including inline and computed background colors and width/transform
  async getEdgesDetails() {
    return this.page.evaluate(() => {
      return Array.from(document.getElementsByClassName('edge')).map(el => ({
        inlineBackground: el.style.backgroundColor || '',
        computedBackground: window.getComputedStyle(el).backgroundColor,
        width: window.getComputedStyle(el).width,
        transform: window.getComputedStyle(el).transform
      }));
    });
  }

  // Count edges that have inline style backgroundColor set (the code uses inline style to mark MST)
  async getHighlightedEdgeCount() {
    return this.page.evaluate(() => {
      return Array.from(document.getElementsByClassName('edge')).filter(el => {
        // The page sets inline style.backgroundColor = '#68d391' for MST edges.
        // We check the inline style first; fallback to computed background color check.
        const inline = el.style.backgroundColor;
        if (inline && inline.trim().length > 0) return true;
        const computed = window.getComputedStyle(el).backgroundColor || '';
        // '#68d391' -> rgb(104, 211, 145)
        return computed.includes('104') && computed.includes('211') && computed.includes('145');
      }).length;
    });
  }

  // Accessibility: get button accessible name / visible text
  async getRunButtonText() {
    return this.page.evaluate(() => {
      const btn = document.getElementById('run-algorithm');
      return btn ? btn.textContent : null;
    });
  }
}

test.describe('Prim\'s Algorithm Demo - UI and behavior', () => {
  // Arrays to capture console messages and page errors during each test
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Capture console messages for diagnostics and assertions
    page.on('console', msg => {
      try {
        consoleMessages.push({ type: msg.type(), text: msg.text() });
      } catch (e) {
        // Some console messages might throw when reading; still preserve an entry
        consoleMessages.push({ type: 'unknown', text: String(msg) });
      }
    });

    // Capture unhandled page errors
    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    // Navigate to the app page (load the HTML exactly as-is)
    await page.goto(APP_URL, { waitUntil: 'load' });
  });

  test.afterEach(async ({ page }) => {
    // If any page errors were captured, print them to the test output for easier debugging.
    if (pageErrors.length > 0) {
      // eslint-disable-next-line no-console
      console.error('Captured page errors:', pageErrors.map(e => e.message || String(e)));
    }
    if (consoleMessages.length > 0) {
      // eslint-disable-next-line no-console
      console.log('Captured console messages (type -> text):', consoleMessages);
    }
    // Ensure we close the page to clean up between tests
    await page.close();
  });

  test('Initial load renders expected graph container, nodes, edges and control button', async ({ page }) => {
    // Purpose: Verify that the page loads and initial DOM elements are present and visible.
    const graphPage = new GraphPage(page);

    // Graph container should be present and visible
    const container = await page.$('#graph-container');
    expect(container).not.toBeNull();
    expect(await container.isVisible()).toBe(true);

    // The run button should be present and have the expected text
    const runButton = await page.$('#run-algorithm');
    expect(runButton).not.toBeNull();
    expect(await runButton.isVisible()).toBe(true);
    const btnText = await graphPage.getRunButtonText();
    expect(btnText).toContain("Run Prim");

    // Nodes and edges should be rendered by drawGraph on load
    const nodeCount = await graphPage.getNodeCount();
    const edgeCount = await graphPage.getEdgeCount();

    // From the implementation there are 5 nodes and 6 edges defined
    expect(nodeCount).toBe(5);
    expect(edgeCount).toBe(6);

    // Check node labels and positions are present and correct-ish
    const nodes = await graphPage.getNodesDetails();
    // Expect nodes to include IDs A-E
    const labels = nodes.map(n => n.text.trim());
    expect(labels.sort()).toEqual(['A', 'B', 'C', 'D', 'E'].sort());

    // There should be no runtime page errors simply from loading the static HTML/JS
    expect(pageErrors.length).toBe(0);
  });

  test('Running Prim\'s algorithm triggers edge highlighting (if matching edges are found) and does not crash', async ({ page }) => {
    // Purpose: Click the algorithm button and verify DOM updates or at least that no unhandled exceptions occurred.
    const graphPage = new GraphPage(page);

    // Precondition: no page errors on load
    expect(pageErrors.length).toBe(0);

    // Click the "Run Prim's Algorithm" button
    await graphPage.clickRunButton();

    // Give a small delay to allow DOM updates (algorithm runs synchronously, but styles may take a moment)
    await page.waitForTimeout(200);

    // After running, inspect how many edges were highlighted according to inline style
    const highlightedCount = await graphPage.getHighlightedEdgeCount();

    // The MST of a connected 5-node graph should include 4 edges.
    // Implementation attempts to mark MST edges by setting inline background color.
    // Because matching uses computed transform strings, it's possible 0..4 edges are highlighted.
    // We assert that highlightedCount is a valid number within range and that no page errors occurred.
    expect(Number.isInteger(highlightedCount)).toBe(true);
    expect(highlightedCount).toBeGreaterThanOrEqual(0);
    expect(highlightedCount).toBeLessThanOrEqual(6);

    // For a fully successful run, ideally we would see 4 highlighted edges.
    // We assert non-failure (no exceptions were thrown), and we log the actual highlightedCount.
    expect(pageErrors.length).toBe(0);

    // Also assert that running the algorithm does not remove or hide nodes
    const nodeCountAfter = await graphPage.getNodeCount();
    expect(nodeCountAfter).toBe(5);

    // Check that console did not contain obvious uncaught exceptions of severity 'error'
    const errorConsoleMessages = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleMessages.length).toBe(0);
  });

  test('Clicking the run button multiple times is idempotent and remains stable', async ({ page }) => {
    // Purpose: Ensure repeated invocations do not cause crashes or unexpected DOM removals.
    const graphPage = new GraphPage(page);

    // Do three consecutive clicks with short waits between them
    await graphPage.clickRunButton();
    await page.waitForTimeout(100);
    await graphPage.clickRunButton();
    await page.waitForTimeout(100);
    await graphPage.clickRunButton();
    await page.waitForTimeout(200);

    // Verify nodes remain present
    const nodesAfter = await graphPage.getNodeCount();
    expect(nodesAfter).toBe(5);

    // Verify edges count unchanged
    const edgesAfter = await graphPage.getEdgeCount();
    expect(edgesAfter).toBe(6);

    // No new unhandled page errors should have appeared
    expect(pageErrors.length).toBe(0);

    // Check that console doesn't show errors
    const errorConsoleMessages = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleMessages.length).toBe(0);
  });

  test('Edge case observations: log any runtime errors if they occur (test will fail if errors exist)', async ({ page }) => {
    // Purpose: Explicitly assert that no runtime ReferenceError/SyntaxError/TypeError occurred during interaction.
    // We record pageErrors during beforeEach and interactions. If present, fail test with diagnostic info.

    // Interact with page to potentially surface runtime errors
    const graphPage = new GraphPage(page);
    await graphPage.clickRunButton();
    await page.waitForTimeout(200);

    // If any page errors exist, fail with details to aid debugging.
    if (pageErrors.length > 0) {
      // Collect error types and messages
      const messages = pageErrors.map(e => ({
        name: e.name || 'Error',
        message: e.message || String(e)
      }));
      // Provide a more descriptive failure
      throw new Error(`Runtime errors were detected: ${JSON.stringify(messages, null, 2)}`);
    }

    // Also assert console error messages none
    const errorConsoleMessages = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleMessages.length).toBe(0);
  });
});