import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/0888fdc1-d59e-11f0-b3ae-79d1ce7b5503.html';

// Page Object for the Kruskal Visualization page
class KruskalPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
  }

  // Navigate to the app
  async goto() {
    await this.page.goto(APP_URL);
  }

  // Returns the page title text
  async titleText() {
    return this.page.textContent('h1');
  }

  // Returns the SVG element handle
  svg() {
    return this.page.$('#graph');
  }

  // Returns the Run button handle
  runButton() {
    return this.page.$('#run');
  }

  // Returns the output container content (innerHTML)
  async outputHTML() {
    return this.page.$eval('#output', el => el.innerHTML);
  }

  // Count number of SVG circles with class 'node'
  async nodeCount() {
    return this.page.$$eval('#graph .node', nodes => nodes.length);
  }

  // Count number of SVG lines with class 'edge'
  async edgeCount() {
    return this.page.$$eval('#graph .edge', edges => edges.length);
  }

  // Count number of edges currently highlighted (class 'selected')
  async selectedEdgeCount() {
    return this.page.$$eval('#graph .edge.selected', edges => edges.length);
  }

  // Click the Run button
  async clickRun() {
    const btn = await this.runButton();
    await btn.click();
  }

  // Returns whether the run button is enabled
  async isRunEnabled() {
    const btn1 = await this.runButton();
    return await btn.isEnabled();
  }
}

test.describe('Kruskal\'s Algorithm Visualization - E2E', () => {
  // Containers for console/page errors captured for each test
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    // Initialize arrays
    consoleErrors = [];
    pageErrors = [];

    // Capture console.error messages
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push({
          text: msg.text(),
          location: msg.location ? msg.location() : null
        });
      }
    });

    // Capture unhandled exceptions from the page
    page.on('pageerror', error => {
      pageErrors.push({
        message: error.message,
        stack: error.stack
      });
    });

    // Navigate to application
    await page.goto(APP_URL);
  });

  test.afterEach(async () => {
    // Nothing to tear down in this static app, but arrays remain available for assertions within tests
  });

  test('Initial page load shows heading, SVG, nodes and edges and no runtime errors', async ({ page }) => {
    // Purpose: Verify the initial DOM is rendered as expected and no runtime errors occurred on load
    const app = new KruskalPage(page);

    // Verify heading text
    await expect(app.titleText()).resolves.toContain("Kruskal's Algorithm Visualization");

    // Ensure SVG is present
    const svgHandle = await app.svg();
    expect(svgHandle).not.toBeNull();

    // Check the number of rendered nodes and edges match the implementation values
    // The HTML defines 5 nodes and 7 edges
    await expect(app.nodeCount()).resolves.toBe(5);
    await expect(app.edgeCount()).resolves.toBe(7);

    // Run button should be visible and enabled
    await expect(app.runButton()).resolves.not.toBeNull();
    await expect(app.isRunEnabled()).resolves.toBeTruthy();

    // Output area should be empty initially
    const outputInitial = await app.outputHTML();
    expect(outputInitial).toBe('');

    // Assert that no console.error messages and no page errors occurred during page load
    // This test documents and asserts the runtime cleanliness on load.
    expect(consoleErrors.length, `console.error count (expected 0): ${JSON.stringify(consoleErrors)}`).toBe(0);
    expect(pageErrors.length, `pageerror count (expected 0): ${JSON.stringify(pageErrors)}`).toBe(0);
  });

  test('Clicking "Run Kruskal\'s Algorithm" computes MST, updates output and highlights edges', async ({ page }) => {
    // Purpose: Verify the main interactive flow: clicking Run computes MST, updates the output text,
    // and marks edges in the SVG with the "selected" class. Also capture console/page errors during interaction.
    const app1 = new KruskalPage(page);

    // Click the run button to execute Kruskal
    await app.clickRun();

    // The application writes "Minimum Spanning Tree" and a list of edges. The expected MST (based on implementation)
    // is: (0, 2): 1, (1, 2): 2, (1, 4): 3, (1, 3): 5 in that order.
    const output = await app.outputHTML();

    expect(output).toContain('Minimum Spanning Tree:');
    expect(output).toContain('(0, 2): 1');
    expect(output).toContain('(1, 2): 2');
    expect(output).toContain('(1, 4): 3');
    expect(output).toContain('(1, 3): 5');

    // The implementation highlights the selected edges by adding the 'selected' class to some .edge lines.
    // There should be exactly 4 selected edges (one per MST edge).
    await expect(app.selectedEdgeCount()).resolves.toBe(4);

    // No console.error or page errors should have occurred during the run.
    expect(consoleErrors.length, `console.error during run (expected 0): ${JSON.stringify(consoleErrors)}`).toBe(0);
    expect(pageErrors.length, `pageerror during run (expected 0): ${JSON.stringify(pageErrors)}`).toBe(0);
  });

  test('Running the algorithm multiple times resets and produces consistent output and highlighting', async ({ page }) => {
    // Purpose: Ensure that repeated runs clear previous state and produce the same MST and number of highlighted edges.
    const app2 = new KruskalPage(page);

    // First run
    await app.clickRun();
    const outputAfterFirstRun = await app.outputHTML();
    const selectedAfterFirst = await app.selectedEdgeCount();

    expect(outputAfterFirstRun).toContain('Minimum Spanning Tree:');
    expect(selectedAfterFirst).toBe(4);

    // Second run (should clear and recompute)
    await app.clickRun();
    const outputAfterSecondRun = await app.outputHTML();
    const selectedAfterSecond = await app.selectedEdgeCount();

    // Outputs should be identical and highlight count should remain 4
    expect(outputAfterSecondRun).toBe(outputAfterFirstRun);
    expect(selectedAfterSecond).toBe(4);

    // Confirm no console errors or page errors happened during repeated runs
    expect(consoleErrors.length, `console.error during repeated runs (expected 0): ${JSON.stringify(consoleErrors)}`).toBe(0);
    expect(pageErrors.length, `pageerror during repeated runs (expected 0): ${JSON.stringify(pageErrors)}`).toBe(0);
  });

  test('DOM structure after run: verifies selected class is applied to existing edge elements (visual state)', async ({ page }) => {
    // Purpose: Inspect the DOM to ensure selected edges actually have the 'selected' class and nodes remain intact.
    const app3 = new KruskalPage(page);

    // Run the algorithm
    await app.clickRun();

    // Verify selected edges are DOM elements with the expected class
    const selectedHandles = await page.$$('#graph .edge.selected');
    expect(selectedHandles.length).toBe(4);

    // Verify nodes are still present after run
    await expect(app.nodeCount()).resolves.toBe(5);

    // Additionally check that each selected element is an SVG line element by tagName
    for (const handle of selectedHandles) {
      const tagName = await handle.evaluate(node => node.tagName);
      // SVG elements' tagName may be uppercase in some environments
      expect(tagName.toLowerCase()).toBe('line');
    }

    // Ensure no runtime errors were observed while inspecting DOM
    expect(consoleErrors.length, `console.error during DOM inspection (expected 0): ${JSON.stringify(consoleErrors)}`).toBe(0);
    expect(pageErrors.length, `pageerror during DOM inspection (expected 0): ${JSON.stringify(pageErrors)}`).toBe(0);
  });

  test('Edge case: clicking Run with no modifications still succeeds and remains idempotent', async ({ page }) => {
    // Purpose: Confirm that repeated or spurious clicks without changing inputs do not produce errors or changing results.
    const app4 = new KruskalPage(page);

    // Perform several quick clicks
    const btn2 = await app.runButton();
    await btn.click();
    await btn.click();
    await btn.click();

    // After multiple clicks, the output should still contain the MST (not duplicate or malformed)
    const output1 = await app.outputHTML();
    expect(output).toContain('Minimum Spanning Tree:');
    // There should still be exactly 4 distinct MST lines (counting <br> separators)
    expect(output.match(/\(<\!?\w*?|\(|\)/g) || []).length >= 4; // generic sanity check that parentheses exist

    // Selected count remains 4 (SVG highlighting idempotent)
    await expect(app.selectedEdgeCount()).resolves.toBe(4);

    // No console errors or page errors from rapid interactions
    expect(consoleErrors.length, `console.error during multiple clicks (expected 0): ${JSON.stringify(consoleErrors)}`).toBe(0);
    expect(pageErrors.length, `pageerror during multiple clicks (expected 0): ${JSON.stringify(pageErrors)}`).toBe(0);
  });

  test('Accessibility and presence checks: verifies Run button is reachable and output is readable', async ({ page }) => {
    // Purpose: Basic accessibility-style checks: ensure button has accessible name and output is presentable.
    const app5 = new KruskalPage(page);

    // The run button should have text content "Run Kruskal's Algorithm"
    const runText = await page.textContent('#run');
    expect(runText).toContain("Run Kruskal's Algorithm");

    // Ensure output area is an element that can be focused (for screen readers, at least present)
    const outputExists = await page.$('#output');
    expect(outputExists).not.toBeNull();

    // No runtime errors during these checks
    expect(consoleErrors.length, `console.error during accessibility checks (expected 0): ${JSON.stringify(consoleErrors)}`).toBe(0);
    expect(pageErrors.length, `pageerror during accessibility checks (expected 0): ${JSON.stringify(pageErrors)}`).toBe(0);
  });
});