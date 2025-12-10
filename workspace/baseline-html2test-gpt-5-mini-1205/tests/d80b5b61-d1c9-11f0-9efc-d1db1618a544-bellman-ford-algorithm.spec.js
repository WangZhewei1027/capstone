import { test, expect } from '@playwright/test';

const URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini-1205/html/d80b5b61-d1c9-11f0-9efc-d1db1618a544.html';

test.describe('Bellman-Ford Algorithm Interactive Demo - d80b5b61...', () => {
  // Arrays to collect console errors and page errors for each test
  let consoleErrors;
  let pageErrors;

  // Setup before each test: navigate to page and attach listeners to capture console/page errors
  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    page.on('console', (msg) => {
      // Collect only console messages of type 'error' for assertions
      if (msg.type() === 'error') {
        consoleErrors.push({ text: msg.text(), location: msg.location() });
      }
    });

    page.on('pageerror', (err) => {
      pageErrors.push(err.message);
    });

    // Navigate to the application page
    await page.goto(URL);
    // Wait for main elements to ensure page has initialized
    await expect(page.locator('#controls h2')).toHaveText('Bellman-Ford Algorithm Demo');
    // A brief wait for the sample graph creation to finish and draw
    await page.waitForTimeout(100); // small delay to allow initial messages and drawing
  });

  // Teardown: after each test assert there were no console errors or page errors
  test.afterEach(async () => {
    // Assert that no console errors (runtime errors) occurred
    expect(consoleErrors.length, `Console errors: ${JSON.stringify(consoleErrors, null, 2)}`).toBe(0);
    expect(pageErrors.length, `Page errors: ${JSON.stringify(pageErrors, null, 2)}`).toBe(0);
  });

  test('Initial load shows sample graph, controls and initial status', async ({ page }) => {
    // Verify primary UI elements exist and have expected initial text/state
    const message = page.locator('#message');
    await expect(message).toBeVisible();
    await expect(message).toContainText('Sample graph created');

    // Source select should contain the sample nodes N1..N5
    const sourceSelect = page.locator('#sourceSelect');
    await expect(sourceSelect).toBeVisible();
    const options = await sourceSelect.locator('option').allTextContents();
    // Expect at least the default "(none)" and N1 present
    expect(options.some(t => t.includes('(none)'))).toBeTruthy();
    expect(options.some(t => t.trim() === 'N1')).toBeTruthy();
    expect(options.some(t => t.trim() === 'N5')).toBeTruthy();

    // Edge list should contain several edges from the sample (E1..E9)
    const edgeList = page.locator('#edgeList');
    await expect(edgeList).toBeVisible();
    const edgeItems = await edgeList.locator('.edgeItem').allTextContents();
    expect(edgeItems.length).toBeGreaterThanOrEqual(5);
    expect(edgeItems.some(t => t.includes('E1:'))).toBeTruthy();
    expect(edgeItems.some(t => t.includes('E9:'))).toBeTruthy();

    // Table of nodes should list multiple nodes
    const tableWrap = page.locator('#tableWrap');
    await expect(tableWrap).toBeVisible();
    const rows = await tableWrap.locator('tr').allTextContents();
    // header + 5 nodes => at least 6 rows
    expect(rows.length).toBeGreaterThanOrEqual(6);

    // Algorithm status should mention iterations and edges
    const algoStatus = page.locator('#algoStatus');
    await expect(algoStatus).toBeVisible();
    await expect(algoStatus).toContainText('Iteration: 0');
  });

  test('Set source via select + Apply updates message and distances (N1 → distance 0)', async ({ page }) => {
    // Choose source N1 and apply
    await page.selectOption('#sourceSelect', 'N1');
    await page.click('#applySourceBtn');

    // Expect a message that source was set
    await expect(page.locator('#message')).toContainText('Source set to N1');

    // Table should show N1 distance as 0
    const rows = page.locator('#tableWrap table tr');
    // find the row for N1
    const rowCount = await rows.count();
    let found = false;
    for (let i = 1; i < rowCount; i++) {
      const rowText = await rows.nth(i).innerText();
      if (rowText.startsWith('N1')) {
        // row looks like "N1\t0\t-"
        expect(rowText).toMatch(/N1\s+0/);
        found = true;
        break;
      }
    }
    expect(found).toBeTruthy();

    // Algo status should show V-1 = 4 for sample graph (5 nodes)
    await expect(page.locator('#algoStatus')).toContainText('Iteration: 0 / 4');
  });

  test('Step button relaxes first edge (N1 → N2 with weight 6) and updates table', async ({ page }) => {
    // Ensure source is set to N1
    await page.selectOption('#sourceSelect', 'N1');
    await page.click('#applySourceBtn');
    await expect(page.locator('#message')).toContainText('Source set to N1');

    // Click Step
    await page.click('#stepBtn');

    // After one step, edgeIndex should have advanced to 1 (Edge: 1 / E)
    await expect(page.locator('#algoStatus')).toContainText('Edge: 1 /');

    // Verify that N2 distance was relaxed to 6 based on sample edges order
    // The table contains a plain '6' (not formatted), so check for 'N2' row containing '6'
    const tableText = await page.locator('#tableWrap').innerText();
    expect(tableText).toMatch(/N2[\s\S]*6/);

    // Message should reflect some action (relaxed or tried)
    await expect(page.locator('#message')).toBeVisible();
  });

  test('Run Full (instant mode) completes algorithm with no negative cycle on sample graph', async ({ page }) => {
    // Set source
    await page.selectOption('#sourceSelect', 'N1');
    await page.click('#applySourceBtn');
    await expect(page.locator('#message')).toContainText('Source set to N1');

    // Set animation speed to 0 to trigger runInstantly
    await page.fill('#speedInput', '0');
    await page.click('#runBtn');

    // Expect completion message about no negative cycles
    await expect(page.locator('#message')).toContainText('Completed: no negative cycle detected.');

    // After run, mode should be finished and table updated; confirm some distances are finite
    const tableText = await page.locator('#tableWrap').innerText();
    // Expect at least one node distance to be a finite number (not all ∞)
    expect(tableText).not.toContain('∞\nN1'); // N1 should be 0, so table should not show ∞ for N1
    await expect(page.locator('#algoStatus')).toContainText('Iteration:');
  });

  test('Adding an edge that creates a negative cycle is detected by algorithm', async ({ page }) => {
    // Helper to get canvas click coordinates for a node id
    async function getNodeClientPosition(nodeId) {
      return await page.evaluate((id) => {
        const canvas = document.getElementById('canvas');
        const rect = canvas.getBoundingClientRect();
        // window.__demo.nodes is exposed by the page
        const nodes = (window.__demo && window.__demo.nodes) || [];
        const n = nodes.find(x => x.id === id);
        if (!n) return null;
        // The code uses pointer coordinates as clientX - rect.left equals node.x
        return { x: rect.left + n.x, y: rect.top + n.y };
      }, nodeId);
    }

    // We'll create an extra strongly negative edge from N3 -> N1 with weight -20 to force a negative cycle
    // Click Add Edge button to enter addEdge mode
    await page.click('#addEdgeBtn');

    // Get positions for N3 and N1 to click on canvas
    const posN3 = await getNodeClientPosition('N3');
    const posN1 = await getNodeClientPosition('N1');
    expect(posN3).not.toBeNull();
    expect(posN1).not.toBeNull();

    // First click selects source N3
    await page.mouse.click(posN3.x, posN3.y);

    // Second click targets N1 and triggers a prompt for weight; handle the dialog
    page.once('dialog', async dialog => {
      // Provide a large negative weight to create a negative cycle
      await dialog.accept('-20');
    });
    await page.mouse.click(posN1.x, posN1.y);

    // Wait for edge to be added (edgeList updates)
    await page.waitForTimeout(100); // small delay for DOM update

    // Confirm an edge referencing N3 → N1 exists in edge list text
    const edgeListText = await page.locator('#edgeList').innerText();
    expect(edgeListText).toMatch(/N3\s+→\s+N1/);

    // Now set source to N1 and run instantly (speed 0) to detect negative cycle
    await page.selectOption('#sourceSelect', 'N1');
    await page.click('#applySourceBtn');
    await expect(page.locator('#message')).toContainText('Source set to N1');

    await page.fill('#speedInput', '0');
    await page.click('#runBtn');

    // Expect a negative cycle detection message
    await expect(page.locator('#message')).toContainText('Negative cycle detected');

    // The message should include a cycle sequence (node ids separated by →)
    const finalMsg = await page.locator('#message').innerText();
    expect(finalMsg).toMatch(/Negative cycle detected reachable from source:/);
  });

  test('UI modes toggle and mode label updates when switching Add Node / Add Edge / Set Source', async ({ page }) => {
    const modeLabel = page.locator('#modeLabel');

    // Default mode at load is Add Node
    await expect(modeLabel).toContainText('Add Node');

    // Switch to Add Edge mode
    await page.click('#addEdgeBtn');
    await expect(modeLabel).toContainText('Add Edge');

    // Switch to Set Source mode
    await page.click('#setSourceBtn');
    await expect(modeLabel).toContainText('Set Source');

    // Back to Add Node
    await page.click('#addNodeBtn');
    await expect(modeLabel).toContainText('Add Node');
  });

  test('Interactive canvas: adding a node increases node list and updates select options', async ({ page }) => {
    // Count current nodes in sourceSelect
    const beforeOptions = await page.locator('#sourceSelect option').allTextContents();
    const beforeCount = beforeOptions.length;

    // Click canvas at a position to add a node (mode should be Add Node by default)
    const canvasRect = await page.locator('#canvas').boundingBox();
    expect(canvasRect).not.toBeNull();
    const cx = canvasRect.x + canvasRect.width / 2;
    const cy = canvasRect.y + canvasRect.height / 2;

    // Click the canvas to add node
    await page.mouse.click(cx, cy);

    // Wait a moment for the node to be added and UI updated
    await page.waitForTimeout(100);

    const afterOptions = await page.locator('#sourceSelect option').allTextContents();
    expect(afterOptions.length).toBeGreaterThanOrEqual(beforeCount + 1);

    // Table should now include an extra row for the new node id (last node)
    const tableRows = await page.locator('#tableWrap table tr').allTextContents();
    expect(tableRows.length).toBeGreaterThanOrEqual(beforeCount + 1);
  });

  test('Pause button stops running animation if running (no crash) and shows paused message', async ({ page }) => {
    // Set source
    await page.selectOption('#sourceSelect', 'N1');
    await page.click('#applySourceBtn');

    // Ensure speed > 0 to start animated run
    await page.fill('#speedInput', '50');
    await page.click('#runBtn');

    // Wait briefly to allow run to start
    await page.waitForTimeout(120);

    // Click pause; should set algorithm to paused state and message to 'Paused.'
    await page.click('#pauseBtn');

    // The message should include 'Paused' (the code sets message('Paused.') )
    await expect(page.locator('#message')).toContainText('Paused');
  });
});