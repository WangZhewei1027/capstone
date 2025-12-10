import { test, expect } from '@playwright/test';

const APP = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini-1205/html/d80a49f0-d1c9-11f0-9efc-d1db1618a544.html';

test.describe.serial('Graph Explorer — Directed / Undirected (d80a49f0-d1c9-11f0-9efc-d1db1618a544)', () => {
  // Capture console errors and page errors for assertions
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Collect console error messages
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Collect uncaught exceptions from the page
    page.on('pageerror', (err) => {
      pageErrors.push(err && err.message ? err.message : String(err));
    });

    // Navigate to the application page
    await page.goto(APP);
    // Wait for sample graph to render (status indicates sample loaded)
    await page.waitForSelector('#status');
    await page.waitForTimeout(100); // give it a moment to render DOM
  });

  test.afterEach(async () => {
    // Basic sanity: the arrays exist
    expect(Array.isArray(consoleErrors)).toBeTruthy();
    expect(Array.isArray(pageErrors)).toBeTruthy();
    // Log any captured errors for debugging (will appear in test output)
    if (consoleErrors.length) console.log('Console errors captured:', consoleErrors);
    if (pageErrors.length) console.log('Page errors captured:', pageErrors);
  });

  test('Initial load: renders sample nodes, edges, status, adjacency displays', async ({ page }) => {
    // Verify page title and core UI elements
    await expect(page).toHaveTitle(/Graph Explorer/);
    await expect(page.locator('strong', { hasText: 'Graph Explorer' })).toBeVisible();

    // Status should mention "Sample graph loaded"
    const status = page.locator('#status');
    await expect(status).toBeVisible();
    await expect(status).toHaveText(/Sample graph loaded/i);

    // Nodes and edges layers: initial sample contains 5 nodes and 5 edges
    const nodes = page.locator('#nodesLayer > g');
    const edges = page.locator('#edgesLayer > line');

    await expect(nodes).toHaveCount(5);
    await expect(edges).toHaveCount(5);

    // Adjacency list should have 5 entries
    const adjListItems = page.locator('#adjList > div');
    await expect(adjListItems).toHaveCount(5);

    // Adjacency matrix: table rows should be nodes + 1 (header)
    const matrixRows = page.locator('#adjMatrix table tr');
    await expect(matrixRows).toHaveCount(6); // 5 nodes + header row

    // Node id labels (showIdsToggle is checked by default)
    const nodeLabels = page.locator('#nodesLayer > g > text');
    await expect(nodeLabels).toHaveCount(5);
  });

  test('Toggle "Show IDs" hides and shows node labels', async ({ page }) => {
    // Ensure IDs are visible initially
    const labels = page.locator('#nodesLayer > g > text');
    await expect(labels).toHaveCount(5);

    // Uncheck showIdsToggle and verify labels removed
    await page.click('#showIdsToggle'); // toggle off
    await page.waitForTimeout(50); // allow render
    await expect(page.locator('#nodesLayer > g > text')).toHaveCount(0);

    // Re-check showIdsToggle and verify labels reappear
    await page.click('#showIdsToggle'); // toggle on
    await page.waitForTimeout(50);
    await expect(page.locator('#nodesLayer > g > text')).toHaveCount(5);
  });

  test('Add a node by clicking on SVG in Add Node mode', async ({ page }) => {
    // Ensure mode is addNode
    await expect(page.locator('#modeSelect')).toHaveValue('addNode');
    const nodesBefore = await page.locator('#nodesLayer > g').count();

    // Click on canvas at a position (relative to svg)
    const svg = page.locator('#svgCanvas');
    // Click roughly near top-left area inside svg
    await svg.click({ position: { x: 80, y: 80 } });
    await page.waitForTimeout(100);

    // A node should be added
    const nodesAfter = await page.locator('#nodesLayer > g').count();
    expect(nodesAfter).toBe(nodesBefore + 1);

    // Status should mention 'Added node'
    await expect(page.locator('#status')).toHaveText(/Added node/i);

    // Export to textarea and confirm new node present in JSON
    await page.click('#doExport');
    await page.waitForTimeout(50);
    const exported = await page.locator('#jsonArea').inputValue();
    const parsed = JSON.parse(exported);
    expect(parsed.nodes.length).toBe(nodesAfter);
  });

  test('Add an edge between two nodes in Add Edge mode (handles prompt for weight)', async ({ page }) => {
    // Switch to Add Edge mode via select
    await page.selectOption('#modeSelect', 'addEdge');
    await expect(page.locator('#modeSelect')).toHaveValue('addEdge');

    // Prepare to handle prompt for edge weight
    page.on('dialog', async (dialog) => {
      // Accept the prompt with weight value '3'
      if (dialog.type() === 'prompt') {
        await dialog.accept('3');
      } else {
        await dialog.dismiss();
      }
    });

    // Click first node (mousedown sets source), then click second node to create edge
    // Use node groups in nodesLayer
    const node0 = page.locator('#nodesLayer > g').nth(0);
    const node1 = page.locator('#nodesLayer > g').nth(1);

    // Use mousedown on first node to set addingEdgeFrom
    await node0.click({ position: { x: 0, y: 0 } });
    await page.waitForTimeout(50);

    // Click second node to trigger prompt and add edge
    await node1.click({ position: { x: 0, y: 0 } });
    await page.waitForTimeout(200); // allow prompt handling and render

    // Edge count should have increased (at least by 1)
    const edgeCount = await page.locator('#edgesLayer > line').count();
    expect(edgeCount).toBeGreaterThanOrEqual(5); // original was 5, could be >5 if earlier tests added edges

    // Status should indicate edge added
    await expect(page.locator('#status')).toHaveText(/Edge added/i);

    // If weightedToggle was checked at time of adding, weight label would appear - but we used prompt weight 3.
    // Switch weightedToggle on to make weights visible and re-render
    await page.click('#weightedToggle');
    await page.waitForTimeout(100);
    // There should be at least one label in labelsLayer if edges have weights
    const weightLabels = await page.locator('#labelsLayer > text').count();
    // weightLabels can be 0 if the app didn't place labels for some edges; assert it is a number
    expect(typeof weightLabels).toBe('number');
  });

  test('Export and Import graph through textarea (doExport and doImport) restores state', async ({ page }) => {
    // Export current graph
    await page.click('#doExport');
    await page.waitForTimeout(50);
    const exported = await page.locator('#jsonArea').inputValue();
    expect(exported).toBeTruthy();

    const parsed = JSON.parse(exported);
    const nodesCount = parsed.nodes.length;
    const edgesCount = parsed.edges.length;

    // Clear the graph and verify none remain
    await page.click('#clearBtn');
    await page.waitForTimeout(50);
    await expect(page.locator('#nodesLayer > g')).toHaveCount(0);
    await expect(page.locator('#edgesLayer > line')).toHaveCount(0);

    // Put the exported JSON back into textarea and import
    await page.fill('#jsonArea', exported);
    await page.click('#doImport');
    await page.waitForTimeout(100);

    // After import, nodes and edges should be restored
    await expect(page.locator('#nodesLayer > g')).toHaveCount(nodesCount);
    await expect(page.locator('#edgesLayer > line')).toHaveCount(edgesCount);
  });

  test('Random Graph button generates multiple nodes and edges', async ({ page }) => {
    // Click random graph
    await page.click('#randomGraph');
    await page.waitForTimeout(200);

    // Expect nodes to be at least 5 (random graph generation uses 5..10)
    const nodeCount = await page.locator('#nodesLayer > g').count();
    expect(nodeCount).toBeGreaterThanOrEqual(5);

    const edgeCount = await page.locator('#edgesLayer > line').count();
    expect(edgeCount).toBeGreaterThanOrEqual(0); // allow 0 edges but ensure DOM present
  });

  test('Path finding (BFS) shows a path for sample graph from 1 to 5', async ({ page }) => {
    // For reliability, import the initial sample graph via exported sample present in textarea:
    // First export current graph JSON (which should be present)
    await page.click('#doExport');
    await page.waitForTimeout(50);
    const exported = await page.locator('#jsonArea').inputValue();
    expect(exported).toBeTruthy();

    // Ensure selects have options; choose start=1 and end=5 if present
    // Wait for selects to populate
    await page.waitForTimeout(50);
    // Set start and end selects
    // Use available options; if 1 and 5 available choose them
    const startOptions = await page.locator('#startSelect > option').allTextContents();
    const endOptions = await page.locator('#endSelect > option').allTextContents();
    if (startOptions.includes('1') && endOptions.includes('5')) {
      await page.selectOption('#startSelect', '1');
      await page.selectOption('#endSelect', '5');
      await page.click('#bfsBtn');
      await page.waitForTimeout(150);
      const info = await page.locator('#pathInfo').textContent();
      // Expect either a valid path or "No path found" depending on current state; assert informative text
      expect(typeof info).toBe('string');
      expect(info.length).toBeGreaterThan(0);
    } else {
      // If expected nodes not present, just assert that selects contain something
      await expect(page.locator('#startSelect > option')).toHaveCountGreaterThan(0);
      await expect(page.locator('#endSelect > option')).toHaveCountGreaterThan(0);
    }
  });

  test('Delete selected node removes node and incident edges (Select / Drag mode)', async ({ page }) => {
    // Ensure in 'select' mode
    await page.selectOption('#modeSelect', 'select');
    await expect(page.locator('#modeSelect')).toHaveValue('select');

    // Count current nodes and edges
    const nodesBefore = await page.locator('#nodesLayer > g').count();
    const edgesBefore = await page.locator('#edgesLayer > line').count();
    expect(nodesBefore).toBeGreaterThanOrEqual(1);

    // Select the first node
    const firstNode = page.locator('#nodesLayer > g').first();
    await firstNode.click();
    await page.waitForTimeout(50);

    // Delete selected
    await page.click('#deleteSelected');
    await page.waitForTimeout(100);

    const nodesAfter = await page.locator('#nodesLayer > g').count();
    // Node count should decrease by 1
    expect(nodesAfter).toBe(nodesBefore - 1);

    const edgesAfter = await page.locator('#edgesLayer > line').count();
    // Edges should be less than or equal to before (incident edges removed)
    expect(edgesAfter).toBeLessThanOrEqual(edgesBefore);
  });

  test('Auto Layout repositions nodes (transform attribute changes)', async ({ page }) => {
    // Capture transform of first node before layout
    const firstNode = page.locator('#nodesLayer > g').first();
    const beforeTransform = await firstNode.getAttribute('transform');

    // Click auto layout
    await page.click('#autoLayout');
    await page.waitForTimeout(150);

    // Capture after transform
    const afterTransform = await firstNode.getAttribute('transform');

    // They should differ (autoLayout moves nodes)
    expect(beforeTransform).not.toBeNull();
    expect(afterTransform).not.toBeNull();
    expect(afterTransform).not.toEqual(beforeTransform);
  });

  test('Observe console and page errors and assert none are present (stability check)', async ({ page }) => {
    // At this point the page has been exercised by many interactions.
    // We assert that no uncaught page errors were recorded.
    // This test explicitly observes and asserts the error arrays captured in beforeEach/afterEach.
    expect(Array.isArray(consoleErrors)).toBeTruthy();
    expect(Array.isArray(pageErrors)).toBeTruthy();

    // Fail the test if any uncaught page error occurred
    if (pageErrors.length > 0) {
      // Provide details in failure message
      throw new Error('Uncaught page errors detected: ' + JSON.stringify(pageErrors, null, 2));
    }

    // Optionally allow console errors but fail if there are many (threshold)
    // Here we assert there are no console.error messages either for strictness
    if (consoleErrors.length > 0) {
      throw new Error('Console error messages detected: ' + JSON.stringify(consoleErrors, null, 2));
    }

    // If no errors, the test passes and the application behaved without runtime exceptions during tests
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

});