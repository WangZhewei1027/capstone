import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini/html/2bde1c73-cd36-11f0-b98e-a1744d282049.html';

test.describe('Interactive Graph (Directed / Undirected) - 2bde1c73-cd36-11f0-b98e-a1744d282049', () => {
  // Capture console errors and page errors for each test
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // collect console error messages
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push({ text: msg.text(), location: msg.location() });
    });

    // collect uncaught page errors
    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    // Navigate to the app and wait for initial rendering
    await page.goto(APP_URL, { waitUntil: 'load' });
    // Wait a bit to allow initial randomGraph/export operations to complete
    await page.waitForTimeout(500);
  });

  test.afterEach(async () => {
    // After each test we expect no uncaught page errors. This assertion is intentional:
    // we observe page errors during the test run and fail if any uncaught exceptions occurred.
    expect(pageErrors.length, `Page errors were logged: ${pageErrors.map(e => e.message).join('; ')}`).toBe(0);
    // Also expect no console.error entries from the page
    expect(consoleErrors.length, `Console errors were logged: ${consoleErrors.map(e => e.text).join('; ')}`).toBe(0);
  });

  // Helper: parse the JSON from the export textarea
  async function getExportJSON(page) {
    const raw = await page.$eval('#jsonOut', el => el.value);
    try {
      return JSON.parse(raw);
    } catch (err) {
      return null;
    }
  }

  // Helper: compute client coordinates for a node by id (returns {x,y} in viewport pixels)
  async function clientPosForNode(page, nodeId) {
    return await page.evaluate((nid) => {
      const canvas = document.getElementById('c');
      const rect = canvas.getBoundingClientRect();
      const raw1 = document.getElementById('jsonOut').value;
      let obj;
      try { obj = JSON.parse(raw); } catch (e) { return null; }
      if (!obj || !obj.nodes) return null;
      const node = obj.nodes.find(n => n.id === nid);
      if (!node) return null;
      // node.x/node.y are in canvas pixel coordinates (canvas.width / canvas.height)
      // map to client coordinates:
      const clientX = rect.left + (node.x / canvas.width) * rect.width;
      const clientY = rect.top + (node.y / canvas.height) * rect.height;
      return { x: clientX, y: clientY };
    }, nodeId);
  }

  test('Initial load: page structure, default mode and counts are present', async ({ page }) => {
    // Check title and header text
    await expect(page.locator('strong')).toHaveText('Interactive Graph');

    // Mode label should reflect the current mode
    const modeLabel = page.locator('#modeLabel');
    await expect(modeLabel).toBeVisible();
    await expect(modeLabel).toHaveText(/Add Node|Add Edge|Move/);

    // Counts should be numbers and non-zero since randomGraph runs on init
    const nodesText = await page.locator('#countNodes').innerText();
    const edgesText = await page.locator('#countEdges').innerText();
    expect(Number(nodesText)).toBeGreaterThanOrEqual(0);
    expect(Number(edgesText)).toBeGreaterThanOrEqual(0);

    // The JSON export textarea should contain a nodes array and edges array
    const exported = await getExportJSON(page);
    expect(exported).toBeTruthy();
    expect(Array.isArray(exported.nodes)).toBe(true);
    expect(Array.isArray(exported.edges)).toBe(true);
  });

  test('Toggle Directed checkbox updates internal state and exported JSON', async ({ page }) => {
    // Read initial exported JSON directed value
    let exported1 = await getExportJSON(page);
    const initialDirected = !!exported.directed;

    // Toggle the directed checkbox
    await page.click('#directedToggle');
    // allow re-render
    await page.waitForTimeout(200);

    exported = await getExportJSON(page);
    // The exported directed flag should now be the inverse of initial
    expect(exported.directed).toBe(!initialDirected);

    // Toggle back
    await page.click('#directedToggle');
    await page.waitForTimeout(200);
    exported = await getExportJSON(page);
    expect(exported.directed).toBe(initialDirected);
  });

  test('Add node via double-click in Add Node mode increases node count', async ({ page }) => {
    // Ensure mode is 'addNode'
    await page.selectOption('#mode', 'addNode');
    await page.waitForTimeout(100);
    await expect(page.locator('#modeLabel')).toHaveText(/Add Node/);

    // Get counts before adding
    const before = Number(await page.locator('#countNodes').innerText());

    // Double-click center of canvas to add a node
    const canvas1 = await page.locator('#c');
    const rect1 = await canvas.boundingBox();
    if (!rect) throw new Error('Canvas bounding box not available');

    const cx = rect.x + rect.width / 2;
    const cy = rect.y + rect.height / 2;
    await page.mouse.move(cx, cy);
    await page.mouse.dblclick(cx, cy);

    // Allow the UI to update
    await page.waitForTimeout(300);

    const after = Number(await page.locator('#countNodes').innerText());
    expect(after).toBe(before + 1);
  });

  test('Add Edge between two nodes in Add Edge mode with specified weight', async ({ page }) => {
    // Parse exported JSON to get two existing node ids
    let exported2 = await getExportJSON(page);
    expect(exported.nodes.length).toBeGreaterThanOrEqual(2);

    // Choose two different nodes
    const aId = exported.nodes[0].id;
    const bId = exported.nodes[1].id;

    // Switch to addEdge mode
    await page.selectOption('#mode', 'addEdge');
    await expect(page.locator('#modeLabel')).toHaveText(/Add Edge/);

    // Set a custom weight
    await page.fill('#edgeWeight', '3');

    // Get counts before
    const beforeEdges = Number(await page.locator('#countEdges').innerText());

    // Compute client positions and click source then target
    const aPos = await clientPosForNode(page, aId);
    const bPos = await clientPosForNode(page, bId);
    if (!aPos || !bPos) throw new Error('Failed to compute node positions');

    // Click source then target to create an edge
    await page.mouse.click(aPos.x, aPos.y);
    // small wait to emulate user
    await page.waitForTimeout(100);
    await page.mouse.click(bPos.x, bPos.y);

    // Allow updates
    await page.waitForTimeout(400);

    // Re-parse exported JSON and check edge count increased and an edge with weight 3 exists
    exported = await getExportJSON(page);
    const afterEdges = exported.edges.length;
    expect(afterEdges).toBeGreaterThanOrEqual(beforeEdges + 1);

    // Find at least one edge matching from aId to bId with weight 3 (or w equals "3")
    const found = exported.edges.some(e => e.from === aId && e.to === bId && Number(e.w) === 3);
    expect(found).toBe(true);
  });

  test('Move (drag) a node and then delete selected node via Delete Selected button', async ({ page }) => {
    // Ensure move mode
    await page.selectOption('#mode', 'move');
    await expect(page.locator('#modeLabel')).toHaveText(/Move/);

    // Get exported JSON and choose a node
    let exported3 = await getExportJSON(page);
    const beforeNodes = exported.nodes.length;
    expect(beforeNodes).toBeGreaterThanOrEqual(1);
    const nodeId = exported.nodes[0].id;
    const startPos = await clientPosForNode(page, nodeId);
    if (!startPos) throw new Error('Cannot determine node position for drag');

    // Drag the node by 40 pixels to the right and 20 down
    await page.mouse.move(startPos.x, startPos.y);
    await page.mouse.down();
    await page.mouse.move(startPos.x + 40, startPos.y + 20, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(300);

    // Select the node by clicking on it (in move mode clicking selects)
    const newPos = await clientPosForNode(page, nodeId);
    // After drag, position recorded in exported JSON may have changed. Use returned coords if present.
    if (newPos) {
      await page.mouse.click(newPos.x, newPos.y);
    } else {
      await page.mouse.click(startPos.x + 40, startPos.y + 20);
    }
    await page.waitForTimeout(150);

    // Click Delete Selected
    await page.click('#btnDelete');
    await page.waitForTimeout(300);

    // After deletion, exported JSON should have one fewer node
    exported = await getExportJSON(page);
    expect(exported.nodes.length).toBe(beforeNodes - 1);
  });

  test('Show adjacency list and matrix produce expected formatted output', async ({ page }) => {
    // Make a small deterministic graph by loading JSON:
    const smallGraph = {
      directed: true,
      nodes: [
        { id: 101, x: 100, y: 100 },
        { id: 102, x: 200, y: 100 },
        { id: 103, x: 300, y: 100 }
      ],
      edges: [
        { id: 201, from: 101, to: 102, w: 1 },
        { id: 202, from: 102, to: 103, w: 2 }
      ]
    };
    // Set textarea and click load
    await page.fill('#jsonOut', JSON.stringify(smallGraph, null, 2));
    await page.click('#btnLoad');
    await page.waitForTimeout(300);

    // Click adjacency list button and verify output contains mapping lines
    await page.click('#btnAdjList');
    await page.waitForTimeout(200);
    const adjListText = await page.locator('#adjOutput').innerText();
    expect(adjListText).toContain('101');
    expect(adjListText).toContain('102');
    expect(adjListText).toContain('103');
    // Should show 101 -> 102
    expect(adjListText).toMatch(/101\s*→\s*102/);

    // Click adjacency matrix and verify header includes node ids 101,102,103
    await page.click('#btnAdjMatrix');
    await page.waitForTimeout(200);
    const adjMatrixText = await page.locator('#adjOutput').innerText();
    expect(adjMatrixText).toContain('101\t102\t103');
    // Row for 101 should have a 1 in 102 column (since weight 1)
    expect(adjMatrixText).toMatch(/101\t[0-9\t]*1/);
  });

  test('Compute shortest path (BFS when weights=1, Dijkstra when weights differ)', async ({ page }) => {
    // First test BFS: simple chain 1->2->3 with all weights 1
    const bfsGraph = {
      directed: true,
      nodes: [
        { id: 1, x: 60, y: 60 },
        { id: 2, x: 160, y: 60 },
        { id: 3, x: 260, y: 60 }
      ],
      edges: [
        { id: 11, from: 1, to: 2, w: 1 },
        { id: 12, from: 2, to: 3, w: 1 }
      ]
    };
    await page.fill('#jsonOut', JSON.stringify(bfsGraph, null, 2));
    await page.click('#btnLoad');
    await page.waitForTimeout(300);

    // Select from=1, to=3 and click Compute Shortest Path
    await page.selectOption('#fromNode', String(1));
    await page.selectOption('#toNode', String(3));
    // Prepare to catch any alert - should not appear
    page.on('dialog', async dialog => {
      // if an alert appears unexpectedly, fail the test by dismissing and throwing
      const msg = dialog.message();
      await dialog.dismiss();
      throw new Error('Unexpected dialog during BFS shortest path: ' + msg);
    });
    await page.click('#btnPath');
    await page.waitForTimeout(300);
    let adjOutputText = await page.locator('#adjOutput').innerText();
    expect(adjOutputText).toContain('Path: 1 → 2 → 3');

    // Now test Dijkstra: create graph where direct path has higher cost than alternate
    const dijkstraGraph = {
      directed: true,
      nodes: [
        { id: 10, x: 60, y: 60 },
        { id: 20, x: 160, y: 60 },
        { id: 30, x: 260, y: 60 }
      ],
      edges: [
        // direct expensive path 10->30 weight 10
        { id: 101, from: 10, to: 30, w: 10 },
        // cheaper path 10->20->30 weight 1 + 1 = 2
        { id: 102, from: 10, to: 20, w: 1 },
        { id: 103, from: 20, to: 30, w: 1 }
      ]
    };
    await page.fill('#jsonOut', JSON.stringify(dijkstraGraph, null, 2));
    await page.click('#btnLoad');
    await page.waitForTimeout(300);

    await page.selectOption('#fromNode', String(10));
    await page.selectOption('#toNode', String(30));
    await page.click('#btnPath');
    await page.waitForTimeout(300);

    adjOutputText = await page.locator('#adjOutput').innerText();
    expect(adjOutputText).toContain('Path: 10 → 20 → 30');
  });

  test('Export and Load JSON reflect the same structure and preserve directed flag', async ({ page }) => {
    // Create a test JSON and load it
    const testGraph = {
      directed: false,
      nodes: [
        { id: 501, x: 50, y: 50 },
        { id: 502, x: 150, y: 50 }
      ],
      edges: [
        { id: 601, from: 501, to: 502, w: 7 }
      ]
    };
    await page.fill('#jsonOut', JSON.stringify(testGraph, null, 2));
    await page.click('#btnLoad');
    await page.waitForTimeout(300);

    // Export JSON by clicking Export
    await page.click('#btnExport');
    await page.waitForTimeout(200);

    const exported4 = await getExportJSON(page);
    expect(exported.directed).toBe(false);
    expect(exported.nodes.length).toBe(2);
    expect(exported.edges.length).toBe(1);
    expect(exported.edges[0].w).toBe(7);
  });

});