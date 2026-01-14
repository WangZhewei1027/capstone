import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-subtest2/html/f7684572-d5b8-11f0-9ee1-ef07bdc6053d.html';

// Page Object for the Topological Sort page
class TopoPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.sortButton = page.locator('#sortButton');
    this.result = page.locator('#result');
    this.canvasSelector = '#canvas';
  }

  async goto() {
    // Navigate to the application page
    await this.page.goto(APP_URL, { waitUntil: 'load' });
  }

  // Click the sort button
  async clickSort() {
    await this.sortButton.click();
  }

  // Get the #result innerText
  async getResultText() {
    return (await this.result.innerText()).trim();
  }

  // Get a count of non-background pixels on the canvas.
  // Background in CSS is #f9f9f9 -> RGB (249,249,249)
  async getCanvasNonBackgroundPixelCount() {
    return await this.page.evaluate(() => {
      const canvas = document.getElementById('canvas');
      const ctx = canvas.getContext('2d');
      const w = canvas.width;
      const h = canvas.height;
      const data = ctx.getImageData(0, 0, w, h).data;
      let nonBg = 0;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        // count pixel as non-background if differs from #f9f9f9
        if (!(r === 249 && g === 249 && b === 249)) nonBg++;
      }
      return nonBg;
    });
  }

  // Replace the global graph with a provided object (deep clone)
  async setGraph(graphObj) {
    await this.page.evaluate((g) => {
      window.graph = g;
    }, JSON.parse(JSON.stringify(graphObj)));
  }

  // Return a deep clone of the current graph object from page
  async getGraph() {
    return await this.page.evaluate(() => JSON.parse(JSON.stringify(window.graph)));
  }

  // Restore graph by assigning provided object
  async restoreGraph(graphObj) {
    await this.setGraph(graphObj);
  }
}

test.describe('Topological Sort Visualization - FSM validation', () => {
  // Collect console messages and page errors for assertions
  let consoleMessages = [];
  let pageErrors = [];

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Listen to console messages and page errors
    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });
  });

  test('Initial state (S0_Idle): drawGraph() is executed and canvas is rendered', async ({ page }) => {
    const topo = new TopoPage(page);

    // Navigate to app and wait for load (drawGraph is called on load)
    await topo.goto();

    // Validate there were no uncaught page errors during initial load
    expect(pageErrors.length, 'No page errors should occur on initial load').toBe(0);

    // The canvas should contain drawing (non-background pixels > 0)
    const nonBg = await topo.getCanvasNonBackgroundPixelCount();
    expect(nonBg, 'Canvas should have drawing after initial drawGraph()').toBeGreaterThan(0);

    // The result div should initially be empty (idle)
    const initialResult = await topo.getResultText();
    expect(initialResult, 'Initial result div should be empty').toBe('');

    // Ensure no console error-level messages were emitted
    const errorConsole = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsole.length, 'No console error messages on initial load').toBe(0);
  });

  test('Perform sort transition (S0_Idle -> S1_Sorting): clicking sort button shows expected result and redraws', async ({ page }) => {
    const topo = new TopoPage(page);

    await topo.goto();

    // Keep a snapshot of graph before action for later comparisons
    const originalGraph = await topo.getGraph();

    // Ensure no page errors initially
    expect(pageErrors.length).toBe(0);

    // Click sort button to trigger topological sort
    await topo.clickSort();

    // Wait briefly for UI update
    await page.waitForTimeout(100); // small wait to let handlers run

    // Validate the result text matches the expected topological ordering
    const resultText = await topo.getResultText();
    const expectedText = 'Topological Sort Result: A -> B -> C -> D -> E -> F';
    expect(resultText).toBe(expectedText);

    // Canvas should still contain drawing (redraw called)
    const nonBgAfterSort = await topo.getCanvasNonBackgroundPixelCount();
    expect(nonBgAfterSort, 'Canvas should remain drawn after sorting').toBeGreaterThan(0);

    // Validate that no uncaught page errors occurred during sorting
    expect(pageErrors.length).toBe(0);

    // There should be no console error entries
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);

    // Cleanup: restore original graph if handler mutated data (defensive)
    await topo.restoreGraph(originalGraph);
  });

  test('Edge case & error scenario (S1_Sorting -> S2_Error): induce a cycle and assert alert is shown', async ({ page }) => {
    const topo = new TopoPage(page);

    await topo.goto();

    // Capture the original graph so we can restore it after the test
    const originalGraph = await topo.getGraph();

    // Modify the graph in-page to introduce a cycle: make F depend on A -> cycle.
    const cyclicGraph = JSON.parse(JSON.stringify(originalGraph));
    // Introduce cycle
    cyclicGraph.F = ['A'];

    // Apply cyclic graph to page
    await topo.setGraph(cyclicGraph);

    // Re-draw (drawGraph is called inside click handler, but we can call it now by clicking to ensure canvas uses updated graph)
    // Intercept the dialog (alert) that should be shown by the catch block in the app
    const [dialog] = await Promise.all([
      page.waitForEvent('dialog'),
      topo.clickSort() // this click should trigger topologicalSort -> throw -> alert
    ]);

    // Assert the alert message matches expected error from thrown Error
    expect(dialog.type()).toBe('alert');
    expect(dialog.message()).toBe('Graph has at least one cycle.');

    // Accept the alert to continue
    await dialog.accept();

    // After the alert, the UI result should not show a successful sort message
    const resultAfterError = await topo.getResultText();
    // It should remain empty (since successful assignment to result happens only on success)
    expect(resultAfterError === '' || !resultAfterError.startsWith('Topological Sort Result:'), 'Result should not show successful sort after cycle error').toBeTruthy();

    // No uncaught runtime page errors should have occurred (the app catches the error and alerts)
    expect(pageErrors.length).toBe(0);

    // Restore the original acyclic graph
    await topo.restoreGraph(originalGraph);

    // Optionally, perform a successful sort again to ensure we returned to idle and can sort -> S2_Error to S0_Idle transition simulation
    await topo.clickSort();
    await page.waitForTimeout(50); // allow UI update
    const finalResult = await topo.getResultText();
    expect(finalResult).toBe('Topological Sort Result: A -> B -> C -> D -> E -> F');
  });

  test('Repeated interactions and consistency: clicking sort multiple times yields stable result', async ({ page }) => {
    const topo = new TopoPage(page);

    await topo.goto();

    // Click the sort button multiple times and ensure the same output appears each time
    for (let i = 0; i < 3; i++) {
      await topo.clickSort();
      await page.waitForTimeout(30);
      const text = await topo.getResultText();
      expect(text).toBe('Topological Sort Result: A -> B -> C -> D -> E -> F');
    }

    // Ensure no page errors after repeated interactions
    expect(pageErrors.length).toBe(0);
  });
});