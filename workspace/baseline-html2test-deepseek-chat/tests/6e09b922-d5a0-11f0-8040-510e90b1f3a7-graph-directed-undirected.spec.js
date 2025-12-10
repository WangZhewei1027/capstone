import { test, expect } from '@playwright/test';

test.describe('Graph Theory: Directed vs Undirected - E2E', () => {
  // Collect console and page errors for assertion in afterEach
  let consoleErrors = [];
  let pageErrors = [];

  // URL for the HTML file under test
  const PAGE_URL =
    'http://127.0.0.1:5500/workspace/baseline-html2test-deepseek-chat/html/6e09b922-d5a0-11f0-8040-510e90b1f3a7.html';

  // Helper: wait until demo graphs have been initialized
  async function waitForGraphs(page) {
    await page.waitForFunction(() => {
      return !!window.undirectedGraph && !!window.directedGraph &&
             window.undirectedGraph.nodes && window.directedGraph.nodes;
    });
    // Also wait for demo nodes to be created (demo creates 3 nodes each)
    await page.waitForFunction(() => {
      return window.undirectedGraph.nodes.length >= 3 && window.directedGraph.nodes.length >= 3;
    });
  }

  // Helper: get canvas center coordinates in page (absolute) for a given canvas id
  async function getCanvasCenter(page, canvasId) {
    const handle = await page.$(`#${canvasId}`);
    const box = await handle.boundingBox();
    return {
      x: box.x + box.width / 2,
      y: box.y + box.height / 2,
      box
    };
  }

  // Helper: get graph data from page
  async function getGraphData(page, type) {
    return page.evaluate((t) => {
      const g = window[t + 'Graph'] || window[`${t}edGraph`] || window[`${t}Graph`];
      // fallback: they are created as undirectedGraph / directedGraph
      const graph = window[`${t}Graph`] || window[`${t}edGraph`] || null;
      if (!graph) return null;
      return {
        nodes: graph.nodes.map(n => ({ id: n.id, x: n.x, y: n.y })),
        edgesCount: graph.edges.length,
        selectedNodeId: graph.selectedNode ? graph.selectedNode.id : null,
        edgeStartId: graph.edgeStart ? graph.edgeStart.id : null
      };
    }, type);
  }

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Collect console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push({ text: msg.text(), location: msg.location() });
      }
    });

    // Collect page uncaught exceptions
    page.on('pageerror', (err) => {
      pageErrors.push(err.message);
    });

    // Navigate to the application page and wait for demo initialization
    await page.goto(PAGE_URL);
    await waitForGraphs(page);
  });

  test.afterEach(async () => {
    // After each test assert there are no console errors or uncaught page errors.
    // This validates the runtime executed without throwing unexpected errors.
    expect(consoleErrors, `Console errors were emitted: ${JSON.stringify(consoleErrors)}`).toEqual([]);
    expect(pageErrors, `Page errors were emitted: ${JSON.stringify(pageErrors)}`).toEqual([]);
  });

  test('Initial load: page structure and demo graphs are present', async ({ page }) => {
    // Verify page title and headings are present
    await expect(page.locator('h1')).toHaveText(/Graph Theory: Directed vs Undirected/);
    await expect(page.locator('h2', { hasText: 'Undirected Graph' })).toBeVisible();
    await expect(page.locator('h2', { hasText: 'Directed Graph' })).toBeVisible();

    // Canvases exist
    const undirectedCanvas = page.locator('#undirectedCanvas');
    const directedCanvas = page.locator('#directedCanvas');
    await expect(undirectedCanvas).toBeVisible();
    await expect(directedCanvas).toBeVisible();

    // Verify demo graphs have initial nodes and edges as per initialization routine
    const undirectedData = await page.evaluate(() => {
      return {
        nodes: window.undirectedGraph.nodes.length,
        edges: window.undirectedGraph.edges.length
      };
    });
    const directedData = await page.evaluate(() => {
      return {
        nodes: window.directedGraph.nodes.length,
        edges: window.directedGraph.edges.length
      };
    });

    // Demo adds 3 nodes to each graph
    expect(undirectedData.nodes).toBeGreaterThanOrEqual(3);
    expect(directedData.nodes).toBeGreaterThanOrEqual(3);

    // Undirected demo added 3 undirected edges -> stored as 6 directed entries (pairs)
    expect(undirectedData.edges).toBeGreaterThanOrEqual(6);

    // Directed demo added 3 directed edges -> stored as 3 entries
    expect(directedData.edges).toBeGreaterThanOrEqual(3);
  });

  test('Add Node buttons increment node counts for both graphs', async ({ page }) => {
    // Capture current node counts
    const initialCounts = await page.evaluate(() => {
      return {
        undirectedNodes: window.undirectedGraph.nodes.length,
        directedNodes: window.directedGraph.nodes.length
      };
    });

    // Click undirected 'Add Node' button
    await page.click('div.graph-section:has(h2:has-text("Undirected Graph")) >> text=Add Node');
    // Click directed 'Add Node' button
    await page.click('div.graph-section:has(h2:has-text("Directed Graph")) >> text=Add Node');

    // Read updated node counts
    const updatedCounts = await page.evaluate(() => {
      return {
        undirectedNodes: window.undirectedGraph.nodes.length,
        directedNodes: window.directedGraph.nodes.length
      };
    });

    // Each graph should have one additional node
    expect(updatedCounts.undirectedNodes).toBe(initialCounts.undirectedNodes + 1);
    expect(updatedCounts.directedNodes).toBe(initialCounts.directedNodes + 1);
  });

  test('Clear buttons remove all nodes and edges', async ({ page }) => {
    // Ensure there are nodes to clear
    const before = await page.evaluate(() => ({
      uNodes: window.undirectedGraph.nodes.length,
      uEdges: window.undirectedGraph.edges.length,
      dNodes: window.directedGraph.nodes.length,
      dEdges: window.directedGraph.edges.length
    }));
    expect(before.uNodes).toBeGreaterThan(0);
    expect(before.dNodes).toBeGreaterThan(0);

    // Click Clear for undirected and directed
    await page.click('div.graph-section:has(h2:has-text("Undirected Graph")) >> text=Clear');
    await page.click('div.graph-section:has(h2:has-text("Directed Graph")) >> text=Clear');

    // Verify cleared
    const after = await page.evaluate(() => ({
      uNodes: window.undirectedGraph.nodes.length,
      uEdges: window.undirectedGraph.edges.length,
      dNodes: window.directedGraph.nodes.length,
      dEdges: window.directedGraph.edges.length
    }));

    expect(after.uNodes).toBe(0);
    expect(after.uEdges).toBe(0);
    expect(after.dNodes).toBe(0);
    expect(after.dEdges).toBe(0);
  });

  test('Create an undirected edge by selecting nodes and using Add Edge', async ({ page }) => {
    // Start with a cleared undirected graph to ensure predictable behavior
    await page.click('div.graph-section:has(h2:has-text("Undirected Graph")) >> text=Clear');

    const undCanvasHandle = await page.$('#undirectedCanvas');
    const box = await undCanvasHandle.boundingBox();

    // Add two nodes by clicking at two distinct positions on the canvas
    const firstPos = { x: Math.round(box.x + 60), y: Math.round(box.y + 60) };
    const secondPos = { x: Math.round(box.x + box.width - 60), y: Math.round(box.y + 60) };

    // Click on empty space to add node 1
    await page.mouse.click(firstPos.x, firstPos.y);
    // Click on empty space to add node 2
    await page.mouse.click(secondPos.x, secondPos.y);

    // Verify 2 nodes present
    const nodesAfterAdd = await page.evaluate(() => window.undirectedGraph.nodes.length);
    expect(nodesAfterAdd).toBe(2);

    // Select the first node by clicking approximately at its coordinates (which matches where we created it)
    await page.mouse.click(firstPos.x, firstPos.y);

    // Click the 'Add Edge' button to set edgeStart to selectedNode
    await page.click('div.graph-section:has(h2:has-text("Undirected Graph")) >> text=Add Edge');

    // Now click the second node to complete the edge
    await page.mouse.click(secondPos.x, secondPos.y);

    // After edge creation in undirected mode, edges should be 2 (both directions)
    const edgeCount = await page.evaluate(() => window.undirectedGraph.edges.length);
    expect(edgeCount).toBe(2);

    // Verify the edges reference the two distinct nodes in both directions
    const edgePairs = await page.evaluate(() => {
      return window.undirectedGraph.edges.map(e => [e.from.id, e.to.id]);
    });
    // Expect both [1,2] and [2,1] (ids may be 1 and 2 as we created two nodes)
    const ids = new Set(edgePairs.map(p => p.join('-')));
    expect(ids.has('1-2') || ids.has('2-1')).toBeTruthy();
    expect(edgePairs.length).toBe(2);
  });

  test('Dragging (mouse move after selecting) updates node coordinates', async ({ page }) => {
    // Clear the directed graph and create a single node
    await page.click('div.graph-section:has(h2:has-text("Directed Graph")) >> text=Clear');

    const directedCanvas = await page.$('#directedCanvas');
    const box = await directedCanvas.boundingBox();

    // Add a single node at a known location (center-left)
    const start = { x: Math.round(box.x + 80), y: Math.round(box.y + box.height / 2) };
    await page.mouse.click(start.x, start.y);

    // Ensure node exists and capture its id and coordinates
    const nodeInfoBefore = await page.evaluate(() => {
      const node = window.directedGraph.nodes[0];
      return { id: node.id, x: node.x, y: node.y };
    });

    // Select that node by clicking on it (the canvas listener uses click)
    await page.mouse.click(start.x, start.y);

    // Move the mouse to a new position within the canvas to simulate dragging (no mousedown needed in this implementation)
    const newPos = { x: Math.round(box.x + box.width - 80), y: Math.round(box.y + box.height / 2) };
    await page.mouse.move(newPos.x, newPos.y, { steps: 10 });

    // Small wait for the mousemove handler to process
    await page.waitForTimeout(100);

    // Read node coordinates after move
    const nodeInfoAfter = await page.evaluate(() => {
      const node = window.directedGraph.nodes[0];
      return { id: node.id, x: node.x, y: node.y };
    });

    // Coordinates should have changed from the initial values
    expect(nodeInfoAfter.x).not.toBe(nodeInfoBefore.x);
    expect(nodeInfoAfter.y).not.toBe(nodeInfoBefore.y);

    // The node id should remain the same
    expect(nodeInfoAfter.id).toBe(nodeInfoBefore.id);
  });

  test('Directed edge creation results in single directed entry (no automatic reverse)', async ({ page }) => {
    // Clear directed graph
    await page.click('div.graph-section:has(h2:has-text("Directed Graph")) >> text=Clear');

    const directedCanvasHandle = await page.$('#directedCanvas');
    const box = await directedCanvasHandle.boundingBox();

    // Add two nodes by clicking
    const posA = { x: Math.round(box.x + 80), y: Math.round(box.y + 80) };
    const posB = { x: Math.round(box.x + box.width - 80), y: Math.round(box.y + 80) };
    await page.mouse.click(posA.x, posA.y);
    await page.mouse.click(posB.x, posB.y);

    // Select first node
    await page.mouse.click(posA.x, posA.y);
    // Click Add Edge (should set edgeStart)
    await page.click('div.graph-section:has(h2:has-text("Directed Graph")) >> text=Add Edge');
    // Click second node to finalize directed edge
    await page.mouse.click(posB.x, posB.y);

    // Directed graph should have exactly 1 edge (no automatic reverse)
    const edgesCount = await page.evaluate(() => window.directedGraph.edges.length);
    expect(edgesCount).toBe(1);

    // Verify that the single edge has from->to mapping consistent with our selection
    const edgePair = await page.evaluate(() => {
      const e = window.directedGraph.edges[0];
      return { from: e.from.id, to: e.to.id };
    });
    expect(edgePair.from).not.toBe(edgePair.to);
  });
});