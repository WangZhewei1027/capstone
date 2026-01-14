import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-subtest2/html/f7684570-d5b8-11f0-9ee1-ef07bdc6053d.html';

test.describe('Kruskal Visualization - FSM states and transitions', () => {
  // Shared timeout for DOM updates that are triggered by the page scripts
  const DEFAULT_TIMEOUT = 2000;

  // Helper to attach console and page error collectors to a page
  async function attachErrorCollectors(page) {
    const consoleErrors = [];
    const consoleWarnings = [];
    const consoleLogs = [];
    const pageErrors = [];

    page.on('console', (msg) => {
      const type = msg.type();
      const text = msg.text();
      if (type === 'error') consoleErrors.push(text);
      else if (type === 'warning') consoleWarnings.push(text);
      else consoleLogs.push({ type, text });
    });

    page.on('pageerror', (err) => {
      // pageerror receives an Error object
      pageErrors.push(err && err.message ? err.message : String(err));
    });

    return { consoleErrors, consoleWarnings, consoleLogs, pageErrors };
  }

  test.beforeEach(async ({ page }) => {
    // Ensure a fresh navigation for each test
    await page.goto(APP_URL, { waitUntil: 'load' });
  });

  test('S0_Idle: Initial render should show the Run button and an empty graph (Idle state)', async ({ page }) => {
    // Attach collectors for runtime issues
    const collectors = await attachErrorCollectors(page);

    // Validate page title and presence of header
    await expect(page).toHaveTitle(/Kruskal's Algorithm Visualization/);

    // Verify button with onclick exists and is visible (evidence for S0_Idle)
    const runButton = page.locator("button[onclick='runKruskal()']");
    await expect(runButton).toBeVisible();
    await expect(runButton).toHaveText("Run Kruskal's Algorithm");

    // Verify initial graph SVG exists and is empty (no nodes or edges yet)
    const svg = page.locator('#graph');
    await expect(svg).toBeVisible();
    // There should be no circle.node or line elements initially.
    await expect(page.locator('#graph circle.node')).toHaveCount(0);
    await expect(page.locator('#graph line')).toHaveCount(0);

    // No runtime errors are expected on initial load
    expect(collectors.consoleErrors).toEqual([]);
    expect(collectors.pageErrors).toEqual([]);
  });

  test('S1_Running: Clicking Run Kruskal transitions to Running and draws the MST edges', async ({ page }) => {
    // Attach console and page error collectors
    const collectors = await attachErrorCollectors(page);

    // Verify precondition: graph is empty
    await expect(page.locator('#graph line')).toHaveCount(0);
    await expect(page.locator('#graph circle.node')).toHaveCount(0);

    // Trigger the RunKruskal event (transition S0 -> S1)
    const runButton = page.locator("button[onclick='runKruskal()']");
    await runButton.click();

    // After running, drawGraph(selectedEdges) should have been called and
    // graph should contain nodes and selected edges. According to the implementation
    // and input graph, the MST should contain 4 edges and 5 nodes.
    const nodes = page.locator('#graph circle.node');
    const selectedLines = page.locator('#graph line.selected');

    // Wait for nodes to be drawn
    await expect(nodes).toHaveCount(5, { timeout: DEFAULT_TIMEOUT });

    // Expect exactly 4 selected edges as the MST for the given graph
    await expect(selectedLines).toHaveCount(4, { timeout: DEFAULT_TIMEOUT });

    // Validate that each selected line has the expected class and numeric coords
    const count = await selectedLines.count();
    for (let i = 0; i < count; i++) {
      const el = selectedLines.nth(i);
      const classAttr = await el.getAttribute('class');
      expect(classAttr).toContain('selected');
      // Coordinates should be parseable as numbers
      const x1 = await el.getAttribute('x1');
      const y1 = await el.getAttribute('y1');
      const x2 = await el.getAttribute('x2');
      const y2 = await el.getAttribute('y2');
      expect(Number.isFinite(Number(x1))).toBeTruthy();
      expect(Number.isFinite(Number(y1))).toBeTruthy();
      expect(Number.isFinite(Number(x2))).toBeTruthy();
      expect(Number.isFinite(Number(y2))).toBeTruthy();
    }

    // Confirm there are no uncaught runtime errors or console errors produced by the run
    expect(collectors.consoleErrors).toEqual([]);
    expect(collectors.pageErrors).toEqual([]);
  });

  test('Transition behavior & onExit action: running twice - second run should produce no edges (empty selectedEdges)', async ({ page }) => {
    // Attach collectors
    const collectors = await attachErrorCollectors(page);

    const runButton = page.locator("button[onclick='runKruskal()']");
    // First click -> draws MST (4 edges)
    await runButton.click();
    await expect(page.locator('#graph line.selected')).toHaveCount(4, { timeout: DEFAULT_TIMEOUT });
    await expect(page.locator('#graph circle.node')).toHaveCount(5, { timeout: DEFAULT_TIMEOUT });

    // Second click -> Because union-find state was mutated on first run,
    // no further edges should be selectable; drawGraph should be called with an empty array,
    // resulting in zero selected lines (nodes are still drawn).
    await runButton.click();

    // After second run, lines count should be 0 (drawGraph with empty selectedEdges)
    await expect(page.locator('#graph line.selected')).toHaveCount(0, { timeout: DEFAULT_TIMEOUT });

    // Nodes should still be present (drawGraph always draws nodes)
    await expect(page.locator('#graph circle.node')).toHaveCount(5);

    // No runtime errors expected
    expect(collectors.consoleErrors).toEqual([]);
    expect(collectors.pageErrors).toEqual([]);
  });

  test('Edge cases: multiple rapid clicks should not throw and should stabilize the graph state', async ({ page }) => {
    // Attach collectors
    const collectors = await attachErrorCollectors(page);

    const runButton = page.locator("button[onclick='runKruskal()']");

    // Rapidly click the button multiple times
    await Promise.all([
      runButton.click(),
      runButton.click(),
      runButton.click()
    ]);

    // The algorithm is deterministic given its internal mutated state:
    // After the first click there will be 4 selected edges, subsequent clicks result in 0 selected edges.
    // The final stable state after multiple quick clicks should be either 4 (if clicks overlapped before unions finished)
    // or 0 (if subsequent clicks ran after unions). We check that the final state is one of these expected outcomes.
    const selectedCount = await page.locator('#graph line.selected').count();
    expect([0, 4]).toContain(selectedCount);

    // Nodes should always be present after any run(s)
    await expect(page.locator('#graph circle.node')).toHaveCount(5);

    // Ensure no console.error or uncaught page errors occurred during rapid interactions
    expect(collectors.consoleErrors).toEqual([]);
    expect(collectors.pageErrors).toEqual([]);
  });

  test('Observability: capture console and page errors on load and interaction', async ({ page }) => {
    // This test demonstrates the observation of console and page errors.
    const collectors = await attachErrorCollectors(page);

    // No interaction; just wait briefly so any synchronous errors would surface
    await page.waitForTimeout(200);

    // Assert there are no page errors and no console errors on load
    expect(collectors.pageErrors).toEqual([]);
    expect(collectors.consoleErrors).toEqual([]);

    // Interact once and ensure still clean
    await page.locator("button[onclick='runKruskal()']").click();
    await page.waitForTimeout(100);

    // No runtime exceptions expected
    expect(collectors.pageErrors).toEqual([]);
    expect(collectors.consoleErrors).toEqual([]);
  });
});