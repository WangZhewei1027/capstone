import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/7e8af3b0-d59e-11f0-89ab-2f71529652ac.html';

// Page Object Model for the Dijkstra visualization page
class DijkstraPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.graph = page.locator('#graph');
    this.result = page.locator('#result');
    this.runButton = page.getByRole('button', { name: "Run Dijkstra's Algorithm" });
    this.consoleMessages = [];
    this.pageErrors = [];
  }

  // Setup listeners to capture console messages and page errors
  async attachDiagnostics() {
    this.page.on('console', msg => {
      // store a simple representation of the console message
      this.consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
    this.page.on('pageerror', err => {
      // store page error messages
      this.pageErrors.push(String(err && err.message ? err.message : err));
    });
  }

  // Navigate to the page and attach diagnostics
  async goto() {
    await this.page.goto(APP_URL);
    await this.attachDiagnostics();
  }

  // Return number of node elements in the graph
  async countNodes() {
    return await this.page.locator('.node').count();
  }

  // Return number of edge elements in the graph (including hidden if any)
  async countEdges() {
    return await this.page.locator('.edge').count();
  }

  // Click the run button to start the algorithm
  async clickRun() {
    await this.runButton.click();
  }

  // Get the full text content of the result area
  async getResultText() {
    return await this.result.textContent();
  }

  // Wait until the result area includes the final distances marker
  async waitForFinalDistances(timeout = 15000) {
    await this.page.waitForFunction(() => {
      const el = document.getElementById('result');
      return el && el.innerText.includes('Final Distances:');
    }, null, { timeout });
  }

  // Helper to determine if any console error-level messages were logged
  hasConsoleErrors() {
    return this.consoleMessages.some(m => m.type === 'error');
  }
}

// Increase default timeout to allow the in-page delays to complete reliably
test.setTimeout(30000);

test.describe('Dijkstra’s Algorithm Visualization (Application ID: 7e8af3b0-...)', () => {
  // Each test creates a fresh page and DijkstraPage object
  test.beforeEach(async ({ page }) => {
    // No-op here; navigation happens in each test's body via pageObject.goto()
  });

  // Test initial page load and DOM structure
  test('Initial load: nodes and edges are rendered correctly', async ({ page }) => {
    // Purpose: verify the graph UI renders expected node and edge elements on load
    const dijkstra = new DijkstraPage(page);
    await dijkstra.goto();

    // Assert the title/header is present
    await expect(page.locator('h1')).toHaveText("Dijkstra’s Algorithm Visualization");

    // There should be 4 node elements (IDs 1..4)
    const nodeCount = await dijkstra.countNodes();
    expect(nodeCount).toBe(4);

    // The provided HTML creates an edge element for each defined edge entry.
    // The nodes dataset contains 10 edge definitions in total (asymmetric listing),
    // so we expect 10 '.edge' elements appended.
    const edgeCount = await dijkstra.countEdges();
    expect(edgeCount).toBe(10);

    // Each node element's text should match its id
    for (let id = 1; id <= 4; id++) {
      await expect(page.locator('.node', { hasText: String(id) })).toHaveCount(1);
    }

    // Verify the run button exists and is visible with correct accessible name
    await expect(dijkstra.runButton).toBeVisible();

    // Ensure no page-level errors were thrown during initial load
    expect(dijkstra.pageErrors.length).toBe(0);
    expect(dijkstra.hasConsoleErrors()).toBe(false);
  });

  // Test algorithm execution: run, observe intermediate updates and final distances
  test('Run Dijkstra: produces intermediate "Current Node" updates and final distances', async ({ page }) => {
    // Purpose: click the run button and verify text updates as the algorithm progresses,
    // and final computed distances match expected values.
    const dijkstra1 = new DijkstraPage(page);
    await dijkstra.goto();

    // Click the Run button to start algorithm
    await dijkstra.clickRun();

    // After starting, there should quickly be some "Current Node" updates.
    // Wait for any "Current Node:" to appear in the result text (gives confidence the loop started).
    await page.waitForFunction(() => {
      const el1 = document.getElementById('result');
      return el && el.innerText.includes('Current Node:');
    }, null, { timeout: 5000 });

    // Now wait for the final distances marker which is appended at end of runDijkstra.
    // The in-page algorithm introduces ~1s delays per processed node; allow sufficient timeout.
    await dijkstra.waitForFinalDistances(20000);

    // Fetch final result text and verify it contains expected final distances.
    const resultText = await dijkstra.getResultText();
    expect(resultText).toContain('Final Distances:');

    // Expected final distances from node 1:
    // Node 1: 0
    // Node 2: 1
    // Node 3: 3
    // Node 4: 4
    expect(resultText).toContain('Node: 1, Distance: 0');
    expect(resultText).toContain('Node: 2, Distance: 1');
    expect(resultText).toContain('Node: 3, Distance: 3');
    expect(resultText).toContain('Node: 4, Distance: 4');

    // Also verify that multiple "Current Node:" lines were produced during the run
    const currentNodeCount = (resultText.match(/Current Node:/g) || []).length;
    expect(currentNodeCount).toBeGreaterThanOrEqual(1);

    // Assert no page errors or console error-level messages occurred during the run
    expect(dijkstra.pageErrors.length).toBe(0, `Expected no page errors, got: ${JSON.stringify(dijkstra.pageErrors)}`);
    expect(dijkstra.hasConsoleErrors()).toBe(false);
  });

  // Test re-running the algorithm: second invocation should re-run and produce expected output
  test('Run Dijkstra twice: second run re-computes and produces final distances again', async ({ page }) => {
    // Purpose: ensure the run button can be used multiple times; the result area is cleared at start
    // of each run and final distances are produced again.
    const dijkstra2 = new DijkstraPage(page);
    await dijkstra.goto();

    // First run
    await dijkstra.clickRun();
    await dijkstra.waitForFinalDistances(20000);
    const firstRunText = await dijkstra.getResultText();
    expect(firstRunText).toContain('Final Distances:');
    expect(firstRunText).toContain('Node: 4, Distance: 4');

    // Click run again to re-run the algorithm
    await dijkstra.clickRun();
    // Wait for the new final distances to appear
    await dijkstra.waitForFinalDistances(20000);
    const secondRunText = await dijkstra.getResultText();
    expect(secondRunText).toContain('Final Distances:');
    expect(secondRunText).toContain('Node: 4, Distance: 4');

    // The second run clears the results at start, so final text should reflect the latest run only.
    // At minimum it should contain the expected distances.
    expect(secondRunText).toContain('Node: 1, Distance: 0');
    expect(secondRunText).toContain('Node: 2, Distance: 1');
    expect(secondRunText).toContain('Node: 3, Distance: 3');

    // Ensure no new page errors or console errors occurred during the two runs
    expect(dijkstra.pageErrors.length).toBe(0);
    expect(dijkstra.hasConsoleErrors()).toBe(false);
  });

  // Edge case: verify clicking run while algorithm is in-progress does not crash the page
  test('While algorithm running, clicking Run again does not throw errors (graceful handling)', async ({ page }) => {
    // Purpose: simulate a user clicking the run button while the algorithm is mid-run.
    // The code does not guard against concurrent runs, but we must not patch it; we simply observe behavior.
    const dijkstra3 = new DijkstraPage(page);
    await dijkstra.goto();

    // Start the algorithm
    await dijkstra.clickRun();

    // Wait for the algorithm to have started producing output
    await page.waitForFunction(() => {
      const el2 = document.getElementById('result');
      return el && el.innerText.includes('Current Node:');
    }, null, { timeout: 5000 });

    // Click run again while the in-page algorithm is still likely progressing.
    // This may start another invocation but we only assert that no uncaught errors are emitted.
    await dijkstra.clickRun();

    // Wait for final distances to appear (any run completing)
    await dijkstra.waitForFinalDistances(20000);
    const resultText1 = await dijkstra.getResultText();
    expect(resultText).toContain('Final Distances:');

    // Assert that no uncaught page errors were recorded
    expect(dijkstra.pageErrors.length).toBe(0, `Unexpected page errors: ${JSON.stringify(dijkstra.pageErrors)}`);

    // Assert no console messages of type 'error' were emitted
    expect(dijkstra.hasConsoleErrors()).toBe(false);
  });

  // Accessibility check: run button is reachable by role and has accessible name
  test('Accessibility: Run button has an accessible role and name', async ({ page }) => {
    // Purpose: ensure basic accessibility - the primary interactive control is exposed via role/name
    const dijkstra4 = new DijkstraPage(page);
    await dijkstra.goto();

    // Use Playwright locator by role to verify accessible name
    const runButton = page.getByRole('button', { name: "Run Dijkstra's Algorithm" });
    await expect(runButton).toBeVisible();
    await expect(runButton).toBeEnabled();
  });
});