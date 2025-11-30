import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini/html/2bde1c74-cd36-11f0-b98e-a1744d282049.html';

test.describe('Weighted Graph — Interactive Demo (2bde1c74-cd36-11f0-b98e-a1744d282049)', () => {
  // Arrays to capture console errors and page errors for each test run
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Capture console.error messages
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push({ text: msg.text(), location: msg.location() });
      }
    });

    // Capture uncaught page errors
    page.on('pageerror', (err) => {
      pageErrors.push(String(err));
    });

    // Navigate to the application page
    await page.goto(APP_URL);
    // Wait for initial rendering (canvas and UI)
    await page.waitForSelector('#graphCanvas');
    await page.waitForSelector('#adjList');
  });

  test.afterEach(async () => {
    // Assert that there were no console errors or uncaught page errors during the test interaction
    expect(consoleErrors, 'No console.error messages should be emitted').toHaveLength(0);
    expect(pageErrors, 'No uncaught page errors should occur').toHaveLength(0);
  });

  // Helper: get current nodes (their id, label, x, y)
  async function getNodes(page) {
    return page.evaluate(() => {
      if (window._graph && Array.isArray(window._graph.nodes)) {
        // Return a shallow clone to avoid transferring functions
        return window._graph.nodes.map(n => ({ id: n.id, label: n.label, x: n.x, y: n.y }));
      }
      return [];
    });
  }

  // Helper: get current edges
  async function getEdges(page) {
    return page.evaluate(() => {
      if (window._graph && Array.isArray(window._graph.edges)) {
        return window._graph.edges.map(e => ({ id: e.id, u: e.u, v: e.v, weight: e.weight }));
      }
      return [];
    });
  }

  // Helper: click on canvas at a given node coordinate (clientX, clientY)
  async function clickCanvasAt(page, clientX, clientY, options = {}) {
    // Use page.mouse to ensure modifiers like shift work reliably
    await page.mouse.click(clientX, clientY, options);
  }

  test('Initial load: page elements and example graph are present', async ({ page }) => {
    // Verify title and core UI elements exist
    await expect(page.locator('h2')).toHaveText(/Weighted Graph/i);
    await expect(page.locator('#addEdgeBtn')).toBeVisible();
    await expect(page.locator('#randomBtn')).toBeVisible();
    await expect(page.locator('#clearBtn')).toBeVisible();

    // The initial example graph should create nodes A-E. Check adjacency list contains A(1), B(2) etc.
    const adjListText = await page.locator('#adjList').textContent();
    expect(adjListText).toBeTruthy();
    expect(adjListText).toContain('A(1)');
    expect(adjListText).toContain('B(2)');
    expect(adjListText).toContain('C(3)');
    // Ensure canvas exists and has a bounding box
    const canvas = page.locator('#graphCanvas');
    const bb = await canvas.boundingBox();
    expect(bb).not.toBeNull();
    expect(bb.width).toBeGreaterThan(10);
    expect(bb.height).toBeGreaterThan(10);
  });

  test('Selecting a node by clicking updates the Selected Node input', async ({ page }) => {
    // Grab nodes and canvas bounding rect to compute absolute click coordinates
    const nodes = await getNodes(page);
    expect(nodes.length).toBeGreaterThanOrEqual(1);
    const nodeA = nodes.find(n => n.label === 'A' || n.id === 1) || nodes[0];

    // Get canvas client bounding box
    const canvasBox = await page.locator('#graphCanvas').boundingBox();
    expect(canvasBox).toBeTruthy();

    // Click near the node position (convert node.x/y to client coords)
    const clientX = canvasBox.x + nodeA.x;
    const clientY = canvasBox.y + nodeA.y;
    await clickCanvasAt(page, clientX, clientY);

    // The selectedNodeLabel should reflect this node's label when exactly one node is selected
    const selVal = await page.locator('#selectedNodeLabel').inputValue();
    expect(selVal).toBe(nodeA.label);
  });

  test('Rename a selected node updates the adjacency list and label', async ({ page }) => {
    // Select node B
    const nodes1 = await getNodes(page);
    const nodeB = nodes.find(n => n.label === 'B' || n.id === 2) || nodes[0];
    const canvasBox1 = await page.locator('#graphCanvas').boundingBox();
    await clickCanvasAt(page, canvasBox.x + nodeB.x, canvasBox.y + nodeB.y);

    // Enter new label into the input and click rename
    const newLabel = 'B-renamed';
    const selInput = page.locator('#selectedNodeLabel');
    await selInput.fill(newLabel);
    await page.click('#renameNodeBtn');

    // The adjacency list should include the new label for that node id
    const adjListText1 = await page.locator('#adjList').textContent();
    expect(adjListText).toContain(`${newLabel}(${nodeB.id})`);
  });

  test('Create an edge between two nodes (shift-click selection + prompt) updates adjacency list', async ({ page }) => {
    // Choose two nodes that are likely not already directly connected: B(2) and E(5)
    const nodes2 = await getNodes(page);
    const nodeB1 = nodes.find(n => n.id === 2) || nodes[0];
    const nodeE = nodes.find(n => n.id === 5) || nodes[nodes.length - 1];

    const canvasBox2 = await page.locator('#graphCanvas').boundingBox();

    // Click B to select
    await clickCanvasAt(page, canvasBox.x + nodeB.x, canvasBox.y + nodeB.y);

    // Shift-click E to multi-select
    await page.mouse.click(canvasBox.x + nodeE.x, canvasBox.y + nodeE.y, { modifiers: ['Shift'] });

    // When the addEdgeBtn triggers a prompt, supply weight "3.3"
    page.once('dialog', async dialog => {
      expect(dialog.type()).toBe('prompt');
      await dialog.accept('3.3');
    });

    await page.click('#addEdgeBtn');

    // After creating the edge, adjacency list should include a connection between B and E (with weight 3.3).
    // Because adjacency list formatting is "<label>(id) -> neighborLabel(id):weight"
    const adjList = await page.locator('#adjList').textContent();
    // look for "B(...)" and "E(...):3.3"
    expect(adjList).toContain(`B(${nodeB.id})`);
    // weight may be represented as 3.3 in the string for the neighbor entry
    expect(adjList).toMatch(new RegExp(`E\\(${nodeE.id}\\):3\\.3`));
  });

  test('Compute shortest path (Dijkstra) triggers an alert and reports a distance', async ({ page }) => {
    // Select source A (id 1) and target E (id 5) in selects
    // Wait until options populate
    await page.waitForSelector('#srcSelect option[value="1"]');
    await page.selectOption('#srcSelect', '1');
    await page.selectOption('#dstSelect', '5');

    // Capture the alert produced by runDijkstraBtn
    let alertMessage = '';
    page.once('dialog', async dialog => {
      expect(dialog.type()).toBe('alert');
      alertMessage = dialog.message();
      await dialog.accept();
    });

    await page.click('#runDijkstraBtn');

    // Ensure the alert was shown and contains "Shortest path distance"
    expect(alertMessage).toContain('Shortest path distance');
    // Also ensure it includes a numeric value (distance)
    expect(alertMessage).toMatch(/Shortest path distance:\s*\d+(\.\d+)?/);
  });

  test('Show MST (Kruskal) and then clear MST without errors', async ({ page }) => {
    // Click MST button
    await page.click('#mstBtn');

    // There's no direct DOM change indicating MST edges, but the operation should not produce errors.
    // Now clear MST
    await page.click('#clearMstBtn');

    // Confirm no console or page errors occurred in afterEach
    expect(true).toBe(true);
  });

  test('Generate random graph via prompts and then clear graph via confirm', async ({ page }) => {
    // Handle the two prompts for randomBtn: number of nodes and edge probability
    let dialogCount = 0;
    page.on('dialog', async dialog => {
      dialogCount++;
      if (dialog.type() === 'prompt') {
        if (dialogCount === 1) await dialog.accept('4'); // number of nodes
        else if (dialogCount === 2) await dialog.accept('0.5'); // edge prob
      } else {
        // If any unexpected dialog appears, accept it
        await dialog.accept();
      }
    });

    await page.click('#randomBtn');

    // Wait briefly to allow random generation
    await page.waitForTimeout(250);

    // Verify nodes count is 4 now
    const nodesAfter = await getNodes(page);
    expect(nodesAfter.length).toBe(4);

    // Now clear graph: click clear and accept the confirm dialog
    page.once('dialog', async dialog => {
      expect(dialog.type()).toBe('confirm');
      await dialog.accept();
    });
    await page.click('#clearBtn');

    // After clearing, window._graph.nodes should be empty
    const nodesCleared = await getNodes(page);
    expect(nodesCleared.length).toBe(0);

    // Also adjacency list should be empty or just whitespace
    const adjListText2 = await page.locator('#adjList').textContent();
    expect(adjListText.trim()).toBe('');
  });

  test('Create a node by clicking on canvas then delete it via right-click', async ({ page }) => {
    // Find canvas position and create a node at an offset within the canvas
    const canvasBox3 = await page.locator('#graphCanvas').boundingBox();
    const sx = Math.round(canvasBox.x + canvasBox.width * 0.2);
    const sy = Math.round(canvasBox.y + canvasBox.height * 0.2);

    // Click to add node
    await clickCanvasAt(page, sx, sy);

    // Confirm a node was added (window._graph.nodes length increased)
    const nodesNow = await getNodes(page);
    expect(nodesNow.length).toBeGreaterThan(0);

    // Identify the node that is nearest to our click (should be the new node)
    const newNode = await page.evaluate((clickX, clickY) => {
      // find node closest to given click coordinates (nodes stored with x,y representing canvas-local coords)
      if (!window._graph || !window._graph.nodes) return null;
      const rect = document.getElementById('graphCanvas').getBoundingClientRect();
      let best = null;
      let bestDist = Infinity;
      for (const n of window._graph.nodes) {
        const dx = (rect.left + n.x) - clickX;
        const dy = (rect.top + n.y) - clickY;
        const d = Math.hypot(dx, dy);
        if (d < bestDist) { bestDist = d; best = n; }
      }
      return best ? { id: best.id, label: best.label } : null;
    }, sx, sy);

    expect(newNode).not.toBeNull();

    // Right-click (contextmenu) on the approximate node position to delete
    await page.mouse.click(sx, sy, { button: 'right' });

    // Allow for state updates
    await page.waitForTimeout(100);

    // Verify the node with that id no longer exists
    const nodesAfter1 = await getNodes(page);
    expect(nodesAfter.find(n => n.id === newNode.id)).toBeUndefined();
  });

  test('Create two nodes and an edge, select the edge and update its weight', async ({ page }) => {
    // Create two fresh nodes by clicking two distinct places on the canvas
    const canvasBox4 = await page.locator('#graphCanvas').boundingBox();
    const x1 = Math.round(canvasBox.x + canvasBox.width * 0.3);
    const y1 = Math.round(canvasBox.y + canvasBox.height * 0.3);
    const x2 = Math.round(canvasBox.x + canvasBox.width * 0.6);
    const y2 = Math.round(canvasBox.y + canvasBox.height * 0.6);

    // Click first node
    await clickCanvasAt(page, x1, y1);
    // Click second node with shift to select both for edge creation
    await page.mouse.click(x2, y2, { modifiers: ['Shift'] });

    // Provide weight via prompt when adding edge
    page.once('dialog', async dialog => {
      expect(dialog.type()).toBe('prompt');
      await dialog.accept('7');
    });
    await page.click('#addEdgeBtn');

    // Allow update
    await page.waitForTimeout(150);

    // Get the latest edges and choose the most recent edge
    const edges = await getEdges(page);
    expect(edges.length).toBeGreaterThan(0);
    const createdEdge = edges[edges.length - 1];

    // Click near midpoint of the edge to select it
    const nodesCurrent = await getNodes(page);
    const u = nodesCurrent.find(n => n.id === createdEdge.u);
    const v = nodesCurrent.find(n => n.id === createdEdge.v);
    expect(u).toBeDefined();
    expect(v).toBeDefined();

    // Compute client coordinates to click at midpoint
    const midX = canvasBox.x + (u.x + v.x) / 2;
    const midY = canvasBox.y + (u.y + v.y) / 2;
    await clickCanvasAt(page, midX, midY);

    // Verify that selectedEdgeWeight input now shows the weight (should be "7")
    const weightValBefore = await page.locator('#selectedEdgeWeight').inputValue();
    // Might be empty if selection logic did not set (selectedEdge present). Accept either equals '7' or the string of the created weight.
    expect(weightValBefore).toBeTruthy();

    // Set a new weight using the input and the button
    await page.locator('#selectedEdgeWeight').fill('9');
    await page.click('#setEdgeWeightBtn');

    // Verify via adjacency matrix or edges array that the weight was updated
    const updatedEdges = await getEdges(page);
    const updated = updatedEdges.find(e => e.id === createdEdge.id);
    expect(updated).toBeDefined();
    expect(Number(updated.weight)).toBe(9);
  });

});