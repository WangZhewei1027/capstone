import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-6/html/2d5658a0-d1d8-11f0-bbda-359f3f96b638.html';

test.describe('Graph Visualization FSM (Application ID: 2d5658a0-d1d8-11f0-bbda-359f3f96b638)', () => {
  // Arrays to capture runtime diagnostics for each test
  let consoleMessages;
  let pageErrors;
  let dialogs;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];
    dialogs = [];

    // Collect console messages (info/warn/error) for inspection
    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Collect page errors (uncaught exceptions)
    page.on('pageerror', error => {
      pageErrors.push(error);
    });

    // Collect dialogs (alerts) shown by the page
    page.on('dialog', async dialog => {
      dialogs.push({ type: dialog.type(), message: dialog.message() });
      await dialog.dismiss(); // dismiss so it doesn't block test
    });

    // Load the page exactly as-is
    await page.goto(APP_URL);
  });

  test.afterEach(async () => {
    // Basic sanity: ensure the diagnostic arrays exist for each test cleanup
    // (Assertions about contents are done inside tests)
  });

  test('Idle state (S0_Idle) - UI has expected controls and empty graph container', async ({ page }) => {
    // Verify buttons exist with onclick attributes as per FSM evidence
    const addButton = page.locator('button[onclick="addNode()"]');
    const toggleButton = page.locator('button[onclick="toggleEdgeType()"]');
    const generateButton = page.locator('button[onclick="generateGraph()"]');
    const graphContainer = page.locator('#graphContainer');

    await expect(addButton).toBeVisible();
    await expect(addButton).toHaveText('Add Node');

    await expect(toggleButton).toBeVisible();
    await expect(toggleButton).toHaveText('Toggle Edge Type');

    await expect(generateButton).toBeVisible();
    await expect(generateButton).toHaveText('Generate Graph');

    // On initial load, graphContainer should be present and empty
    await expect(graphContainer).toBeVisible();
    const childCount = await page.evaluate(() => document.getElementById('graphContainer').children.length);
    expect(childCount).toBe(0);

    // Ensure no runtime page errors occurred just from loading the page
    expect(pageErrors.length).toBe(0);
    // No console errors should have been logged during load
    expect(consoleMessages.filter(m => m.type === 'error').length).toBe(0);
  });

  test('Add Node transition (S0_Idle -> S1_NodeAdded) - clicking Add Node appends a node and draws it', async ({ page }) => {
    // Click the Add Node button and verify a node element is created in the DOM
    const addButton1 = page.locator('button[onclick="addNode()"]');
    await addButton.click();

    // Wait for node element to appear and assert properties
    const nodes = page.locator('.node');
    await expect(nodes).toHaveCount(1);

    // The node's innerText should be "0" for the first added node
    const firstNodeText = await nodes.nth(0).innerText();
    expect(firstNodeText).toBe('0');

    // The node should have inline styles for left and top set (drawNode assigns these)
    const left = await nodes.nth(0).evaluate(el => el.style.left);
    const top = await nodes.nth(0).evaluate(el => el.style.top);
    expect(left).toMatch(/[0-9.]+px/);
    expect(top).toMatch(/[0-9.]+px/);

    // Confirm the entry action drawNode(node) observable by DOM append
    const childCount1 = await page.evaluate(() => document.getElementById('graphContainer').children.length);
    expect(childCount).toBeGreaterThanOrEqual(1);

    // No unexpected page errors during this interaction
    expect(pageErrors.length).toBe(0);
  });

  test('Toggle Edge Type transition (S0_Idle -> S2_EdgeTypeToggled) - toggles directionality and shows alert', async ({ page }) => {
    // On initial load isDirected === true, so first toggle should show "Undirected"
    const toggleButton1 = page.locator('button[onclick="toggleEdgeType()"]');

    // Click once and capture the dialog (alert)
    await toggleButton.click();

    // The page.on('dialog') handler pushes to dialogs array and dismisses it.
    // Ensure we got one dialog with expected message
    expect(dialogs.length).toBeGreaterThanOrEqual(1);
    const firstDialog = dialogs.shift();
    expect(firstDialog.type).toBe('alert');
    expect(firstDialog.message).toBe('Edge type is now: Undirected');

    // Clicking again should switch back to Directed
    await toggleButton.click();
    expect(dialogs.length).toBeGreaterThanOrEqual(1);
    const secondDialog = dialogs.shift();
    expect(secondDialog.type).toBe('alert');
    expect(secondDialog.message).toBe('Edge type is now: Directed');

    // No page errors produced by toggling
    expect(pageErrors.length).toBe(0);
  });

  test('Generate Graph transition (S0_Idle -> S3_GraphGenerated) - generates 5 nodes and draws edges', async ({ page }) => {
    const generateButton1 = page.locator('button[onclick="generateGraph()"]');

    // Click Generate Graph
    await generateButton.click();

    // Expect 5 nodes to be created
    const nodes1 = page.locator('.node');
    await expect(nodes).toHaveCount(5);

    // Node ids should be 0..4
    const nodeTexts = await nodes.evaluateAll(els => els.map(e => e.innerText));
    expect(nodeTexts).toEqual(['0', '1', '2', '3', '4']);

    // Edges should be drawn (complete graph edges: 5 nodes => 10 edges)
    const edges = page.locator('.edge');
    // wait for at least one edge
    await expect(edges.first()).toBeVisible();
    const edgeCount = await edges.count();
    // For 5 nodes, drawEdges draws edges for each pair: 5 choose 2 = 10
    expect(edgeCount).toBeGreaterThanOrEqual(1);
    // Assert at least one edge has a non-zero inline width style
    const firstEdgeWidth = await edges.nth(0).evaluate(el => el.style.width);
    expect(firstEdgeWidth).toMatch(/[0-9.]+px/);
    // Ensure drawEdges entry action observable by presence of edges
    expect(edgeCount).toBeGreaterThanOrEqual(1);

    // No page errors during generation
    expect(pageErrors.length).toBe(0);
  });

  test('Edge case: GenerateGraph resets previous nodes and respects edge type styling', async ({ page }) => {
    const addButton2 = page.locator('button[onclick="addNode()"]');
    const toggleButton2 = page.locator('button[onclick="toggleEdgeType()"]');
    const generateButton2 = page.locator('button[onclick="generateGraph()"]');

    // Add two nodes to have a non-empty starting state
    await addButton.click();
    await addButton.click();
    await expect(page.locator('.node')).toHaveCount(2);

    // Toggle edge type to Undirected so drawEdge should not set directed border style
    await toggleButton.click();
    // dialog consumed by handler; verify message was 'Edge type is now: Undirected'
    const lastDialog = dialogs.pop();
    expect(lastDialog && lastDialog.message).toBe('Edge type is now: Undirected');

    // Now generate graph; this should clear previous nodes and create 5 new nodes
    await generateButton.click();
    await expect(page.locator('.node')).toHaveCount(5);

    // Check that edges created do not have the directed inline borderRight style because isDirected is false
    const edges1 = page.locator('.edge');
    await expect(edges.first()).toBeVisible();
    const firstEdgeBorderRight = await edges.nth(0).evaluate(el => el.style.borderRight);
    // When directed, code sets borderRight = '10px solid transparent'; when undirected it leaves it unset (empty string)
    expect(firstEdgeBorderRight === '' || firstEdgeBorderRight === undefined).toBeTruthy();

    // Confirm nodes were reset (IDs 0..4)
    const nodeTexts1 = await page.locator('.node').evaluateAll(els => els.map(e => e.innerText));
    expect(nodeTexts).toEqual(['0', '1', '2', '3', '4']);

    // No runtime page errors for this scenario
    expect(pageErrors.length).toBe(0);
  });

  test('Robustness: repeated toggles and interactions do not cause uncaught exceptions (observe console & page errors)', async ({ page }) => {
    const addButton3 = page.locator('button[onclick="addNode()"]');
    const toggleButton3 = page.locator('button[onclick="toggleEdgeType()"]');
    const generateButton3 = page.locator('button[onclick="generateGraph()"]');

    // Perform a sequence of interactions: add, toggle, generate, toggle, add
    await addButton.click();
    await toggleButton.click(); // alert dismissed by handler
    await generateButton.click();
    await toggleButton.click();
    await addButton.click();

    // Allow a moment for DOM updates
    await page.waitForTimeout(200);

    // There should be nodes present and possible edges
    const nodeCount = await page.locator('.node').count();
    expect(nodeCount).toBeGreaterThanOrEqual(1);

    // Inspect captured console messages for errors or warnings
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    // Assert there were no console errors during interactions
    expect(consoleErrors.length).toBe(0);

    // Assert there were no uncaught page errors
    expect(pageErrors.length).toBe(0);
  });

  test('Negative scenario: confirm no functions were redefined or patched by the test harness (load-only observation)', async ({ page }) => {
    // We must not redefine any globals. This test simply reads the presence of functions declared in the page
    const funcs = await page.evaluate(() => {
      return {
        hasAddNode: typeof addNode === 'function',
        hasToggleEdgeType: typeof toggleEdgeType === 'function',
        hasGenerateGraph: typeof generateGraph === 'function',
        hasDrawNode: typeof drawNode === 'function',
        hasDrawEdges: typeof drawEdges === 'function'
      };
    });

    // All functions referenced by FSM/evidence should be present
    expect(funcs.hasAddNode).toBe(true);
    expect(funcs.hasToggleEdgeType).toBe(true);
    expect(funcs.hasGenerateGraph).toBe(true);
    expect(funcs.hasDrawNode).toBe(true);
    expect(funcs.hasDrawEdges).toBe(true);

    // No runtime errors as a result of merely reading function references
    expect(pageErrors.length).toBe(0);
  });
});