import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-6/html/2d5658a1-d1d8-11f0-bbda-359f3f96b638.html';

test.describe('Weighted Graph Visualization - FSM and UI integration tests', () => {
  // Will hold captured console messages and page errors for each test
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Capture console events
    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Capture uncaught exceptions on the page
    page.on('pageerror', error => {
      pageErrors.push(error);
    });

    // Navigate to the application page
    await page.goto(APP_URL, { waitUntil: 'load' });
  });

  test.afterEach(async () => {
    // Nothing special to teardown per test; listeners are attached to the page instance and will be removed by Playwright
  });

  test('Initial Idle state: page loads and exposes expected components with no runtime errors', async ({ page }) => {
    // Validate presence of UI elements described in FSM (Idle evidence)
    const addEdgeButton = page.locator("button[onclick='addEdge()']");
    const edgeInput = page.locator('#edgeInput');
    const canvas = page.locator('#graphCanvas');

    await expect(addEdgeButton).toBeVisible();
    await expect(addEdgeButton).toHaveText('Add Edge');
    await expect(edgeInput).toBeVisible();
    await expect(edgeInput).toHaveAttribute('placeholder', 'Node1-Node2-Weight');
    await expect(canvas).toBeVisible();

    // Assert that there were no uncaught page errors on initial load
    expect(pageErrors.length, `Expected no page errors on load, got: ${pageErrors.map(e => e.message).join(' | ')}`).toBe(0);

    // Assert that there are no console error-level messages on load
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length, `Expected no console.error messages on load, found: ${JSON.stringify(consoleErrors)}`).toBe(0);
  });

  test('Invalid input triggers alert and stays in Idle state (no edge added)', async ({ page }) => {
    // This test validates the input validation branch in addEdge()
    const addEdgeButton1 = page.locator("button[onclick='addEdge()']");
    const edgeInput1 = page.locator('#edgeInput1');

    // Set invalid input (not in Node1-Node2-Weight format)
    await edgeInput.fill('invalid-format');

    // Wait for the dialog that addEdge() triggers for invalid format
    const dialogPromise = page.waitForEvent('dialog');
    await addEdgeButton.click();
    const dialog = await dialogPromise;
    // Verify the alert message content
    expect(dialog.message()).toContain('Please input the edge in the format: Node1-Node2-Weight');
    await dialog.accept();

    // Verify application state: no edges were added and nodes object is empty
    const edgesLength = await page.evaluate(() => window.edges ? window.edges.length : undefined);
    const nodesKeys = await page.evaluate(() => window.nodes ? Object.keys(window.nodes) : undefined);

    // edges should be an array (or undefined if something went wrong). We expect it to be defined and length 0
    expect(edgesLength).toBe(0);
    expect(nodesKeys).toEqual([]);
  });

  test('Add Edge event transitions from Idle to EdgeAdded: valid input results in an edge and canvas updates', async ({ page }) => {
    // This test validates the main FSM transition: S0_Idle -> S1_EdgeAdded via AddEdge event
    const addEdgeButton2 = page.locator("button[onclick='addEdge()']");
    const edgeInput2 = page.locator('#edgeInput2');

    // Capture canvas state before adding an edge (data URL)
    const beforeDataUrl = await page.evaluate(() => {
      const canvas1 = document.getElementById('graphCanvas');
      return canvas.toDataURL();
    });

    // Enter a valid edge and click the Add Edge button
    await edgeInput.fill('A-B-5');
    await addEdgeButton.click();

    // After the click, check edges and nodes in the page context
    const edges = await page.evaluate(() => window.edges ? window.edges.slice() : null);
    const nodes = await page.evaluate(() => window.nodes ? JSON.parse(JSON.stringify(window.nodes)) : null);
    const inputValue = await edgeInput.inputValue();

    // Expect one edge to have been added with correct properties
    expect(edges).not.toBeNull();
    expect(edges.length).toBeGreaterThanOrEqual(1);
    const added = edges[edges.length - 1];
    expect(added).toHaveProperty('from', 'A');
    expect(added).toHaveProperty('to', 'B');
    expect(added).toHaveProperty('weight', 5);

    // Expect nodes A and B to exist
    expect(nodes).not.toBeNull();
    expect(Object.keys(nodes)).toContain('A');
    expect(Object.keys(nodes)).toContain('B');

    // Expect input to be cleared after adding
    expect(inputValue).toBe('');

    // Capture canvas state after adding and assert it changed (drawGraph invoked visually)
    const afterDataUrl = await page.evaluate(() => {
      const canvas2 = document.getElementById('graphCanvas');
      return canvas.toDataURL();
    });

    expect(afterDataUrl).not.toEqual(beforeDataUrl);
  });

  test('EdgeAdded entry action drawGraph() influences canvas pixels (visual verification)', async ({ page }) => {
    // This test asserts that after adding an edge, the canvas has non-empty drawing (some pixels changed)
    const addEdgeButton3 = page.locator("button[onclick='addEdge()']");
    const edgeInput3 = page.locator('#edgeInput3');

    // Ensure canvas is initially blank data URL
    const blankDataUrl = await page.evaluate(() => {
      const canvas3 = document.getElementById('graphCanvas');
      return canvas.toDataURL();
    });

    // Add an edge
    await edgeInput.fill('X-Y-10');
    await addEdgeButton.click();

    // Grab data URL after drawing
    const drawnDataUrl = await page.evaluate(() => {
      const canvas4 = document.getElementById('graphCanvas');
      return canvas.toDataURL();
    });

    // The drawn canvas should differ from the initial blank canvas
    expect(drawnDataUrl).not.toEqual(blankDataUrl);
  });

  test('Adding edge with non-numeric weight results in NaN stored in edges (edge case)', async ({ page }) => {
    // This test validates how the implementation handles non-numeric weights (parseInt -> NaN)
    const addEdgeButton4 = page.locator("button[onclick='addEdge()']");
    const edgeInput4 = page.locator('#edgeInput4');

    // Add edge with non-numeric weight
    await edgeInput.fill('C-D-abc');
    await addEdgeButton.click();

    // Inspect last edge weight
    const lastEdgeWeightIsNaN = await page.evaluate(() => {
      if (!window.edges || window.edges.length === 0) return null;
      const last = window.edges[window.edges.length - 1];
      return Number.isNaN(last.weight);
    });

    // Expect that the weight was parsed as NaN and stored
    expect(lastEdgeWeightIsNaN).toBe(true);
  });

  test('Multiple edges can be added sequentially and edges array grows accordingly', async ({ page }) => {
    // This test ensures repeated transitions to EdgeAdded work and state accumulates
    const addEdgeButton5 = page.locator("button[onclick='addEdge()']");
    const edgeInput5 = page.locator('#edgeInput5');

    // Get initial edges count
    const initialCount = await page.evaluate(() => window.edges ? window.edges.length : 0);

    // Add two edges
    await edgeInput.fill('M-N-1');
    await addEdgeButton.click();
    await edgeInput.fill('N-O-2');
    await addEdgeButton.click();

    const finalCount = await page.evaluate(() => window.edges ? window.edges.length : 0);
    expect(finalCount).toBe(initialCount + 2);

    // Validate that the last two edges match the ones we added
    const lastTwo = await page.evaluate(() => {
      const arr = window.edges.slice(-2);
      return arr;
    });
    expect(lastTwo[0]).toMatchObject({ from: 'M', to: 'N' });
    expect(lastTwo[1]).toMatchObject({ from: 'N', to: 'O' });
  });

  test('Runtime console and page errors captured and reported (test will fail if any unexpected errors exist)', async ({ page }) => {
    // This test collects and asserts that there are no unexpected runtime exceptions or console.error messages during interactions.
    // It performs a couple of interactions to trigger potential runtime issues, then asserts no errors were captured.

    const addEdgeButton6 = page.locator("button[onclick='addEdge()']");
    const edgeInput6 = page.locator('#edgeInput6');

    // Perform interactions: invalid then valid add
    // invalid triggers alert (we accept)
    const dialogPromise1 = page.waitForEvent('dialog');
    await edgeInput.fill('bad');
    await addEdgeButton.click();
    const dialog1 = await dialogPromise;
    await dialog.accept();

    // valid add
    await edgeInput.fill('P-Q-7');
    await addEdgeButton.click();

    // After interactions, assert no uncaught page errors
    const capturedPageErrors = pageErrors.map(e => e.message);
    const consoleErrs = consoleMessages.filter(m => m.type === 'error').map(m => m.text);

    // If any errors exist, fail with details to aid debugging
    expect(capturedPageErrors.length, `Uncaught page errors were found: ${capturedPageErrors.join(' | ')}`).toBe(0);
    expect(consoleErrs.length, `Console.error messages were found: ${consoleErrs.join(' | ')}`).toBe(0);
  });
});