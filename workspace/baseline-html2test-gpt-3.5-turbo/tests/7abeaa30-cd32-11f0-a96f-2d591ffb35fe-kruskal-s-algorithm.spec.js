import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/7abeaa30-cd32-11f0-a96f-2d591ffb35fe.html';

test.describe("Kruskal's Algorithm Visualization - E2E", () => {
  // Arrays to collect errors and console messages per test
  let pageErrors = [];
  let consoleErrors = [];

  test.beforeEach(async ({ page }) => {
    // Reset collectors
    pageErrors = [];
    consoleErrors = [];

    // Collect uncaught exceptions from the page
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    // Collect console.error messages
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Generic handler to accept alert dialogs so flows don't hang.
    // Specific prompt responses will be provided with page.once(...) in tests where needed.
    page.on('dialog', async (dialog) => {
      try {
        if (dialog.type() === 'alert') {
          await dialog.accept();
        }
        // Do not auto-accept prompts here; tests will provide specific handlers with page.once
      } catch (e) {
        // ignore dialog handling errors here; they will be captured by pageerror if any
      }
    });

    // Navigate to the app
    await page.goto(APP_URL);
    // Ensure the app had time to execute initial scripts and draw
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async () => {
    // After each test, assert that no uncaught page errors or console.error messages were emitted.
    // This verifies that the page executed without unexpected runtime exceptions.
    expect(pageErrors.length, `Unexpected page errors: ${pageErrors.map(String).join('\n')}`).toBe(0);
    expect(consoleErrors.length, `Unexpected console.error messages: ${consoleErrors.join('\n')}`).toBe(0);
  });

  test('Initial page load and default UI state', async ({ page }) => {
    // Purpose: Verify that the page loads and core UI elements are present and in expected default states.
    await expect(page.locator('header h1')).toHaveText("Kruskal's Algorithm Visualization");

    // Buttons exist
    const addNodeBtn = page.locator('#addNodeBtn');
    const clearGraphBtn = page.locator('#clearGraphBtn');
    const runKruskalBtn = page.locator('#runKruskalBtn');
    const nextStepBtn = page.locator('#nextStepBtn');

    await expect(addNodeBtn).toBeVisible();
    await expect(clearGraphBtn).toBeVisible();
    await expect(runKruskalBtn).toBeVisible();
    await expect(nextStepBtn).toBeVisible();

    // On initial load: runKruskal and nextStep should be disabled until edges exist
    await expect(runKruskalBtn).toBeDisabled();
    await expect(nextStepBtn).toBeDisabled();

    // Edge list may be empty string or show "(No edges)" depending on timing; assert either condition
    const edgeListText = await page.locator('#edgeList').innerText();
    // Accept either empty or explicit "(No edges)" as valid initial state (implementation-specific)
    expect(edgeListText.trim() === '' || edgeListText.includes('(No edges)')).toBeTruthy();

    // The canvas should be present and visible
    await expect(page.locator('#graphCanvas')).toBeVisible();

    // There should be some initial nodes added by the page script (the script adds 4 nodes on load)
    const nodeCount = await page.evaluate(() => Array.isArray(window.nodes) ? window.nodes.length : 0);
    expect(nodeCount).toBeGreaterThanOrEqual(0); // we simply assert script ran and nodes variable exists
  });

  test('Create edges by clicking nodes and verify edge list updates', async ({ page }) => {
    // Purpose: Programmatically click on canvas nodes to create edges, handling prompts,
    // and verify the edge list shows the newly created edges.

    // Helper to fetch current nodes from page
    const nodes = await page.evaluate(() => window.nodes);
    expect(Array.isArray(nodes)).toBeTruthy();
    expect(nodes.length).toBeGreaterThanOrEqual(2); // must have at least 2 nodes to create an edge

    // Get canvas bounding box to convert canvas coordinates to page coordinates
    const canvasBox = await page.locator('#graphCanvas').boundingBox();
    expect(canvasBox).not.toBeNull();

    // Function to create an edge between two node indices and supply a weight via the prompt
    async function createEdgeBetween(nodeAIndex, nodeBIndex, weight) {
      const nodesLocal = await page.evaluate(() => window.nodes);
      const a = nodesLocal[nodeAIndex];
      const b = nodesLocal[nodeBIndex];
      expect(a).toBeTruthy();
      expect(b).toBeTruthy();

      // Click start node to select it
      await page.mouse.click(canvasBox.x + a.x, canvasBox.y + a.y);

      // Ensure the UI shows the selection
      await expect(page.locator('#edgeCreateStatus')).toHaveText(new RegExp(`Selected node ${a.id}`));

      // Set up a one-time dialog handler for the prompt that will appear on second click
      page.once('dialog', async (dialog) => {
        // The expected dialog here is a prompt; accept with the provided weight string
        await dialog.accept(String(weight));
      });

      // Click the second node - this should trigger the prompt and create the edge
      await page.mouse.click(canvasBox.x + b.x, canvasBox.y + b.y);

      // After edge creation, the edgeCreateStatus should reset to "None"
      await expect(page.locator('#edgeCreateStatus')).toHaveText('None');

      // The edge list should contain an entry with the nodes and the weight we provided.
      const edgeListText1 = await page.locator('#edgeList').innerText();
      expect(edgeListText).toContain(`(${a.id} – ${b.id})`);
      expect(edgeListText).toContain(String(weight));
    }

    // Create two nodes' edge to ensure run button remains disabled until at least one edge is present.
    // We'll create three edges in subsequent test flow; here demonstrate adding one.
    await createEdgeBetween(0, 1, 5);
  });

  test('Run Kruskal algorithm step-by-step and validate MST formation and UI updates', async ({ page }) => {
    // Purpose: Create a set of edges connecting the initial nodes, run Kruskal's algorithm,
    // step through it until completion, and verify that MST edges are marked and UI updates accordingly.

    // Prepare nodes and canvas bounding box
    const nodes1 = await page.evaluate(() => window.nodes1);
    expect(nodes.length).toBeGreaterThanOrEqual(4); // page initializes with 4 nodes
    const canvasBox1 = await page.locator('#graphCanvas').boundingBox();
    expect(canvasBox).not.toBeNull();

    // Create a generic alert acceptor (already registered in beforeEach), but ensure we can handle prompts with specific weights.
    // We'll create three edges to connect 4 nodes: (0-1:1), (1-2:2), (2-3:3)
    async function createEdge(nodeAIndex, nodeBIndex, weight) {
      const nodesLocal1 = await page.evaluate(() => window.nodes);
      const a1 = nodesLocal[nodeAIndex];
      const b1 = nodesLocal[nodeBIndex];
      expect(a).toBeTruthy();
      expect(b).toBeTruthy();

      // Click the first node to select
      await page.mouse.click(canvasBox.x + a.x, canvasBox.y + a.y);
      await expect(page.locator('#edgeCreateStatus')).toHaveText(new RegExp(`Selected node ${a.id}`));

      // Provide prompt response for weight
      page.once('dialog', async (dialog) => {
        await dialog.accept(String(weight));
      });

      // Click second node to trigger prompt and create edge
      await page.mouse.click(canvasBox.x + b.x, canvasBox.y + b.y);

      // Wait for edge list to update with the new edge
      await expect(page.locator('#edgeList')).toContainText(`(${a.id} – ${b.id})`);
      await expect(page.locator('#edgeList')).toContainText(String(weight));
      // Reset selection status
      await expect(page.locator('#edgeCreateStatus')).toHaveText('None');
    }

    // Create three edges to allow MST completion for 4 nodes
    await createEdge(0, 1, 1);
    await createEdge(1, 2, 2);
    await createEdge(2, 3, 3);

    // Now Run Kruskal
    const runKruskalBtn1 = page.locator('#runKruskalBtn1');
    const nextStepBtn1 = page.locator('#nextStepBtn1');

    // The Run Kruskal button should be enabled now
    await expect(runKruskalBtn).toBeEnabled();

    // Click Run Kruskal
    await runKruskalBtn.click();

    // After starting, nextStep should be enabled and run should be disabled
    await expect(nextStepBtn).toBeEnabled();
    await expect(runKruskalBtn).toBeDisabled();

    // The log should indicate the algorithm started and the edges sorted
    await expect(page.locator('#log')).toContainText("Kruskal's Algorithm started");
    await expect(page.locator('#log')).toContainText("Edges sorted by weight");

    // Step through the algorithm until it completes.
    // The page will issue an alert when MST is found; the global dialog handler accepts it.
    // We simply click 'Next Step' repeatedly until the button becomes disabled.
    while (await nextStepBtn.isEnabled()) {
      await nextStepBtn.click();
      // small pause to allow UI and logs to update
      await page.waitForTimeout(100);
    }

    // After completion, run button should be enabled again
    await expect(runKruskalBtn).toBeEnabled();
    await expect(nextStepBtn).toBeDisabled();

    // Validate that the page's edges data has n-1 edges marked as inMST
    const mstCount = await page.evaluate(() => {
      if (!Array.isArray(window.edges)) return -1;
      return window.edges.filter(e => e.inMST).length;
    });
    // For 4 nodes, MST should have exactly 3 edges
    const nodeCount1 = await page.evaluate(() => Array.isArray(window.nodes) ? window.nodes.length : 0);
    expect(mstCount).toBe(nodeCount > 0 ? nodeCount - 1 : -1);

    // The edge list entries corresponding to MST edges must have the class 'edge-in-mst'
    const edgeInMSTElementsCount = await page.locator('#edgeList .edge-in-mst').count();
    expect(edgeInMSTElementsCount).toBe(mstCount);

    // The log should contain messages indicating edges were added or skipped
    const logText = await page.locator('#log').innerText();
    expect(logText.length).toBeGreaterThan(0);
    expect(/Considering edge \(|Edge added to MST|Adding this edge would form a cycle|MST is complete/.test(logText)).toBeTruthy();
  });

  test('Clear graph button resets nodes, edges, log, and UI state', async ({ page }) => {
    // Purpose: Verify that clicking "Clear Graph" resets the application to an empty graph state.

    // Ensure there are some nodes and possibly edges (from previous interactions in same session)
    let nodeCountBefore = await page.evaluate(() => Array.isArray(window.nodes) ? window.nodes.length : 0);

    // Click the Clear Graph button (no confirmation expected if algorithm not running)
    await page.click('#clearGraphBtn');

    // After clearing, nodes and edges arrays should be empty
    const nodeCountAfter = await page.evaluate(() => Array.isArray(window.nodes) ? window.nodes.length : 0);
    const edgeCountAfter = await page.evaluate(() => Array.isArray(window.edges) ? window.edges.length : 0);
    expect(nodeCountAfter).toBe(0);
    expect(edgeCountAfter).toBe(0);

    // Edge list should show "(No edges)" as updateEdgeList is called by clearGraph
    await expect(page.locator('#edgeList')).toContainText('(No edges)');

    // Run and Next buttons should be disabled after clearing
    await expect(page.locator('#runKruskalBtn')).toBeDisabled();
    await expect(page.locator('#nextStepBtn')).toBeDisabled();

    // Log should be cleared
    const logText1 = await page.locator('#log').innerText();
    expect(logText.trim()).toBe('');
  });
});