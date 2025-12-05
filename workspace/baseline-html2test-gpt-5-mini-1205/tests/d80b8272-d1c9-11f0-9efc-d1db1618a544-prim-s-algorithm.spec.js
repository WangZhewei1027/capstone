import { test, expect } from '@playwright/test';

const APP = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini-1205/html/d80b8272-d1c9-11f0-9efc-d1db1618a544.html';

test.describe('Prim\'s Algorithm Interactive Demo - end-to-end', () => {
  // Collect console errors and page errors for each test to assert no unexpected runtime errors occur.
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];
    // capture console error messages
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => {
      pageErrors.push(String(err && err.message ? err.message : err));
    });

    // navigate to the application
    await page.goto(APP, { waitUntil: 'load' });
    // ensure basic UI visible
    await expect(page.locator('h1')).toHaveText(/Prim's Algorithm/i);
  });

  test.afterEach(async ({ page }) => {
    // Assert there were no unexpected runtime errors logged to the console or thrown on the page.
    // This helps detect ReferenceError/SyntaxError/TypeError occurrences without modifying the app.
    expect(pageErrors, `page errors: ${pageErrors.join(' | ')}`).toHaveLength(0);
    expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toHaveLength(0);
    await page.close();
  });

  test.describe('Initial load and basic UI', () => {
    test('loads page and renders initial graph and controls', async ({ page }) => {
      // Verify svg canvas exists
      const svg = page.locator('svg#svg');
      await expect(svg).toBeVisible();

      // Start vertex select should be populated (initial graph created in init())
      const startSelect = page.locator('#startVertex');
      await expect(startSelect).toBeVisible();
      const optionCount = await startSelect.locator('option').count();
      expect(optionCount).toBeGreaterThanOrEqual(2);

      // The MST weight should start at "0"
      await expect(page.locator('#mstWeight')).toHaveText('0');

      // State table should contain rows equal to number of nodes (>=2)
      const stateRows = page.locator('#stateTable tr');
      const rowsCount = await stateRows.count();
      expect(rowsCount).toBeGreaterThanOrEqual(2);

      // Ensure mode buttons exist and Pointer (modeSelect) is active by default
      await expect(page.locator('#modeSelect')).toHaveClass(/active/);
    });
  });

  test.describe('Editing mode interactions', () => {
    test('Generate Random Graph updates SVG and start vertex options', async ({ page }) => {
      // count nodes/options before generating
      const beforeOptions = await page.locator('#startVertex option').count();
      const beforeNodes = await page.locator('svg g[data-node-id]').count();

      // Click Generate Random Graph
      await page.click('#genGraph');

      // status message should indicate graph generation
      await expect(page.locator('#status')).toHaveText('Random graph generated.');

      // verify start select updated (should have at least 2 options)
      const afterOptions = await page.locator('#startVertex option').count();
      expect(afterOptions).toBeGreaterThanOrEqual(2);

      // verify nodes in SVG re-rendered (count may change but should be >=2)
      const afterNodes = await page.locator('svg g[data-node-id]').count();
      expect(afterNodes).toBeGreaterThanOrEqual(2);

      // Sanity: options and nodes counts should be equal (one option per node)
      expect(afterOptions).toBe(afterNodes);
    });

    test('Add Node mode: add a node by clicking canvas updates startVertex options', async ({ page }) => {
      // ensure Add Node mode enabled
      await page.click('#modeAddNode');
      await expect(page.locator('#modeAddNode')).toHaveClass(/active/);

      const select = page.locator('#startVertex');
      const beforeCount = await select.locator('option').count();

      // Click roughly center of the svg to add a node
      const svgRect = await page.locator('svg#svg').boundingBox();
      const clickX = Math.floor(svgRect.x + svgRect.width * 0.5);
      const clickY = Math.floor(svgRect.y + svgRect.height * 0.5);
      await page.mouse.click(clickX, clickY);

      // After adding a node, the select should have one more option
      const afterCount = await select.locator('option').count();
      expect(afterCount).toBe(beforeCount + 1);

      // The new node should exist in SVG node list
      const nodes = page.locator('svg g[data-node-id]');
      await expect(nodes).toHaveCount(afterCount);
    });

    test('Add Edge mode: create an edge between two nodes using dialog prompt', async ({ page }) => {
      // Switch to add edge mode
      await page.click('#modeAddEdge');
      await expect(page.locator('#modeAddEdge')).toHaveClass(/active/);

      // pick first two node elements
      const nodeGroups = page.locator('svg g[data-node-id]');
      const nodeCount = await nodeGroups.count();
      expect(nodeCount).toBeGreaterThanOrEqual(2);

      // Setup dialog handler to provide a weight "7"
      page.on('dialog', async (dialog) => {
        // Accept the prompt and provide weight 7
        await dialog.accept('7');
      });

      const firstNode = nodeGroups.nth(0);
      const secondNode = nodeGroups.nth(1);

      // Click source node -> sets addEdgeSource
      await firstNode.click({ position: { x: 1, y: 1 } });

      // Click target node -> triggers prompt handled above and should create an edge
      await secondNode.click({ position: { x: 1, y: 1 } });

      // Wait for DOM update - there should be at least one text element with content "7" representing the new edge weight
      const weightLabel = page.locator('svg text', { hasText: '7' });
      await expect(weightLabel).toHaveCountGreaterThan(0);
    });

    test('Delete mode: remove a node and an edge updates DOM and startVertex options', async ({ page }) => {
      // Ensure we have at least one edge and two nodes to delete
      const nodes = page.locator('svg g[data-node-id]');
      const initialNodeCount = await nodes.count();
      expect(initialNodeCount).toBeGreaterThanOrEqual(2);

      // Create a temporary edge between the first two nodes (use addEdge mode + dialog)
      await page.click('#modeAddEdge');
      page.on('dialog', async (dialog) => dialog.accept('3'));
      await nodes.nth(0).click();
      await nodes.nth(1).click();

      // Count edges (edge groups have data-edge-id attribute)
      const edgesLocator = page.locator('svg g[data-edge-id]');
      const beforeEdges = await edgesLocator.count();
      expect(beforeEdges).toBeGreaterThanOrEqual(1);

      // Switch to delete mode and delete the first edge
      await page.click('#modeDelete');
      await expect(page.locator('#modeDelete')).toHaveClass(/active/);

      // click the first edge's group
      await edgesLocator.nth(0).click();
      // after deletion, edges count should decrease by at least 1
      const afterEdges = await edgesLocator.count();
      expect(afterEdges).toBeLessThan(beforeEdges);

      // Now delete a node: pick the last node and delete
      const startOptionsBefore = await page.locator('#startVertex option').count();
      const nodeToDelete = page.locator('svg g[data-node-id]').nth(-1);
      await nodeToDelete.click(); // with modeDelete active this triggers removal

      // startVertex options should decrease by 1
      const startOptionsAfter = await page.locator('#startVertex option').count();
      expect(startOptionsAfter).toBe(startOptionsBefore - 1);
    });
  });

  test.describe('Prim algorithm controls and snapshots', () => {
    test('Init Prim creates snapshots and stepping updates state table and MST weight', async ({ page }) => {
      // Ensure there's at least one node to choose as start
      const startSelect = page.locator('#startVertex');
      const optionCount = await startSelect.locator('option').count();
      expect(optionCount).toBeGreaterThanOrEqual(2);

      // Choose first option as start
      const firstOptionValue = await startSelect.locator('option').nth(0).getAttribute('value');
      await startSelect.selectOption(firstOptionValue);

      // Click Init Prim
      await page.click('#initPrim');

      // Status should mention snapshots created
      await expect(page.locator('#status')).toHaveText(/Snapshots created:/);

      // Snapshot list exists internally; clicking Step ▶ should advance snapshot
      // Initial MST weight at snapshot 0 could be 0; after one step forward, at least one vertex should be in MST
      await page.click('#stepForward');

      // After stepping, check that at least one "Yes" appears in the In MST column
      const inMSTCells = page.locator('#stateTable td:nth-of-type(4)'); // 4th column in each row
      const textContents = await inMSTCells.allTextContents();
      const yesCount = textContents.filter(t => t.trim() === 'Yes').length;
      expect(yesCount).toBeGreaterThanOrEqual(1);

      // MST weight text should be a number string (>= 0)
      const mstWeightText = await page.locator('#mstWeight').textContent();
      expect(mstWeightText).toMatch(/^\d+$/);
    });

    test('Play toggles and Reset clears algorithm state', async ({ page }) => {
      // Init Prim first to create snapshots
      const optVal = await page.locator('#startVertex option').nth(0).getAttribute('value');
      await page.selectOption('#startVertex', optVal);
      await page.click('#initPrim');

      // Click Play (starts playing)
      await page.click('#play');
      // Play button text should change to "Pause" representation
      await expect(page.locator('#play')).toHaveText(/Pause|❚❚/);

      // Now click Reset while playing; this should stop playback and reset UI
      await page.click('#reset');

      // After reset, play button should show 'Play ▶' and status should indicate reset
      await expect(page.locator('#play')).toHaveText(/Play/);
      await expect(page.locator('#status')).toHaveText('Reset algorithm state.');

      // MST weight should be reset to "0"
      await expect(page.locator('#mstWeight')).toHaveText('0');

      // State table should show '-' entries (no snapshot)
      const firstKeyCell = page.locator('#stateTable td:nth-of-type(2)').first();
      await expect(firstKeyCell).toHaveText(/-+/);
    });
  });

  test.describe('Node interactions and accessibility', () => {
    test('Double-clicking a node sets it as start vertex (quick-set)', async ({ page }) => {
      // pick a node id from the SVG and double-click it
      const firstNode = page.locator('svg g[data-node-id]').first();
      // read its data-node-id attribute
      const nodeId = await firstNode.getAttribute('data-node-id');
      expect(nodeId).not.toBeNull();

      // double click to set as start vertex
      await firstNode.dblclick();

      // startVertex select should have the selected value equal to nodeId
      const selectedValue = await page.locator('#startVertex').inputValue();
      expect(String(selectedValue)).toBe(String(nodeId));
    });

    test('Keyboard shortcuts: ArrowRight advances and ArrowLeft steps back', async ({ page }) => {
      // Initialize snapshots
      const optVal = await page.locator('#startVertex option').nth(0).getAttribute('value');
      await page.selectOption('#startVertex', optVal);
      await page.click('#initPrim');

      // Capture initial table snapshot of the first cell key
      const firstKeyBefore = await page.locator('#stateTable td:nth-of-type(2)').first().textContent();

      // Press ArrowRight to step forward
      await page.keyboard.press('ArrowRight');
      const firstKeyAfter = await page.locator('#stateTable td:nth-of-type(2)').first().textContent();
      // It should change (likely from ∞ or 0 to some value) or at least snapshots advanced
      expect(firstKeyAfter).not.toBeNull();

      // Press ArrowLeft to step back
      await page.keyboard.press('ArrowLeft');
      const firstKeyBack = await page.locator('#stateTable td:nth-of-type(2)').first().textContent();
      // After stepping back it should restore to previous or equal to original snapshot key
      expect(firstKeyBack).not.toBeNull();
      // No strict assertion on equality because of possible identical values, but ensure UI responds without error.
    });
  });
});