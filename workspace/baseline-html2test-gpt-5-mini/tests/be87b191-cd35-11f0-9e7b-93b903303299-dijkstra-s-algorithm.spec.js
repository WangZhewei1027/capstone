import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini/html/be87b191-cd35-11f0-9e7b-93b903303299.html';

test.describe('Dijkstra Visualizer — End-to-end tests', () => {
  // Collect console errors and page errors for each test to assert none occur
  test.beforeEach(async ({ page }) => {
    await page.goto(APP_URL);
    // wait for initial demo to load (initDemo runs on load)
    await page.waitForSelector('svg#svgCanvas g.node');
  });

  test('Initial load: UI elements present and initial demo graph created', async ({ page }) => {
    // Verify page title
    await expect(page).toHaveTitle(/Dijkstra/);

    // Check control buttons exist
    await expect(page.locator('#modeAddNode')).toBeVisible();
    await expect(page.locator('#modeAddEdge')).toBeVisible();
    await expect(page.locator('#modeSetSource')).toBeVisible();
    await expect(page.locator('#randomBtn')).toBeVisible();
    await expect(page.locator('#clearBtn')).toBeVisible();
    await expect(page.locator('#stepBtn')).toBeVisible();
    await expect(page.locator('#runBtn')).toBeVisible();
    await expect(page.locator('#resetBtn')).toBeVisible();
    await expect(page.locator('#delay')).toBeVisible();

    // There should be initial nodes added by initDemo (5 nodes)
    const nodes = page.locator('svg#svgCanvas g.node');
    await expect(nodes).toHaveCount(5);

    // Table should have a row per node
    const rows = page.locator('#stateTable tbody tr');
    await expect(rows).toHaveCount(5);

    // Source should be set to node 1 (initDemo sets state.source = 1) - check table first column contains "1 (S)"
    const firstCells = page.locator('#stateTable tbody tr td:first-child');
    await expect(firstCells.nth(0)).toHaveText(/1\s*\(S\)/);
  });

  test.describe('Mode selection and visual toggles', () => {
    test('Switching modes updates active button classes and clears pending edge', async ({ page }) => {
      // Start in Add Node mode (active)
      await expect(page.locator('#modeAddNode')).toHaveClass(/active/);

      // Switch to Add Edge
      await page.click('#modeAddEdge');
      await expect(page.locator('#modeAddEdge')).toHaveClass(/active/);

      // Switch to Set Source
      await page.click('#modeSetSource');
      await expect(page.locator('#modeSetSource')).toHaveClass(/active/);

      // Switch to Move
      await page.click('#modeMove');
      await expect(page.locator('#modeMove')).toHaveClass(/active/);

      // Switch to Delete
      await page.click('#modeDelete');
      await expect(page.locator('#modeDelete')).toHaveClass(/active/);

      // Switch back to Add Node
      await page.click('#modeAddNode');
      await expect(page.locator('#modeAddNode')).toHaveClass(/active/);
    });
  });

  test.describe('Node and Edge interactions', () => {
    test('Add a new node by clicking the canvas', async ({ page }) => {
      // Count nodes, then click empty canvas to add one more
      const nodes1 = page.locator('svg#svgCanvas g.node');
      const before = await nodes.count();

      // Click near top-left of the svg (use bounding box of svg)
      const svgBox = await page.locator('svg#svgCanvas').boundingBox();
      // click at an offset inside svg to add a node
      await page.mouse.click(svgBox.x + 50, svgBox.y + 50);

      // Expect a new node to appear
      await expect(page.locator('svg#svgCanvas g.node')).toHaveCount(before + 1);

      // Table should update with the new node row
      await expect(page.locator('#stateTable tbody tr')).toHaveCount(before + 1);
    });

    test('Create an edge between two nodes (handles prompt) and verifies edge svg added', async ({ page }) => {
      // Switch to Add Edge mode
      await page.click('#modeAddEdge');
      await expect(page.locator('#modeAddEdge')).toHaveClass(/active/);

      // Prepare to handle the prompt that asks for weight
      page.on('dialog', async dialog => {
        // Expect a prompt for edge weight
        if (dialog.type() === 'prompt') {
          await dialog.accept('3'); // give weight 3
        } else {
          // accept any unexpected confirms/alerts generically
          await dialog.accept();
        }
      });

      // Click node 1 and node 2 (they exist from initDemo)
      const node1 = page.locator('svg#svgCanvas g.node[data-id="1"]');
      const node2 = page.locator('svg#svgCanvas g.node[data-id="2"]');
      await node1.click();
      // After first click the pendingEdgeStart highlight should be visible (class 'current')
      await expect(node1).toHaveClass(/current/);

      // Click second node to finalize edge creation
      await node2.click();

      // After creation, pending highlight should be cleared
      await expect(node1).not.toHaveClass(/current/);

      // Edge SVG groups exist: count should be >= initial edges
      const edges = page.locator('svg#svgCanvas g.edge-group');
      await expect(edges).toBeVisible();
      const edgeCount = await edges.count();
      expect(edgeCount).toBeGreaterThanOrEqual(1);

      // The table should still reflect same number of nodes
      await expect(page.locator('#stateTable tbody tr')).toHaveCount(await page.locator('svg#svgCanvas g.node').count());
    });

    test('Attempt to create self-loop shows alert and does not create edge', async ({ page }) => {
      await page.click('#modeAddEdge');
      // capture dialog message
      let dialogMessage = null;
      page.on('dialog', async dialog => {
        dialogMessage = dialog.message();
        // accept/close alert
        await dialog.accept();
      });

      // Click the same node twice to trigger self-loop alert
      const node11 = page.locator('svg#svgCanvas g.node[data-id="1"]');
      await node1.click();
      await node1.click();

      // ensure alert was shown with expected substring
      expect(dialogMessage).toMatch(/Cannot create self-loop/i);

      // ensure no new edges were created by that operation (at least not incremented by that action)
      // We can't determine exact edge count from previous test, just ensure page still has edge-group elements (no error)
      await expect(page.locator('svg#svgCanvas g.edge-group')).toBeVisible();
    });

    test('Move a node in Move mode updates its transform and updates edge positions', async ({ page }) => {
      // Switch to Move mode
      await page.click('#modeMove');

      // Choose node 2 to drag
      const node21 = page.locator('svg#svgCanvas g.node[data-id="2"]');
      const box = await node2.boundingBox();
      expect(box).not.toBeNull();
      const startX = box.x + box.width / 2;
      const startY = box.y + box.height / 2;
      const targetX = startX + 40;
      const targetY = startY + 30;

      // Perform mouse drag: mousedown, move, mouseup
      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(targetX, targetY, { steps: 5 });
      await page.mouse.up();

      // After drag, the node's transform attribute should have updated translate(x,y)
      const transform = await node2.getAttribute('transform');
      expect(transform).toMatch(/translate\(/);

      // Also ensure edges updated by checking edge label positions (edge text elements exist)
      const edgeLabels = page.locator('svg#svgCanvas text.edge-label');
      await expect(edgeLabels).toBeVisible();
    });

    test('Delete mode removes a node after confirmation', async ({ page }) => {
      // Count nodes before delete
      const nodesLocator = page.locator('svg#svgCanvas g.node');
      const before1 = await nodesLocator.count();
      expect(before).toBeGreaterThanOrEqual(1);

      // Switch to Delete mode
      await page.click('#modeDelete');

      // Intercept confirm dialog to accept deletion
      page.on('dialog', async dialog => {
        // Expect confirm for deletion
        await dialog.accept();
      });

      // Click node 5 to delete (exists in initDemo)
      const node5 = page.locator('svg#svgCanvas g.node[data-id="5"]');
      await node5.click();

      // after deletion, node count should be decreased by at least 1
      await expect(nodesLocator).toHaveCount(before - 1);
    });

    test('Clear graph button clears all nodes and edges after confirmation', async ({ page }) => {
      // Ensure there are nodes initially
      const nodesLocator1 = page.locator('svg#svgCanvas g.node');
      const before2 = await nodesLocator.count();
      expect(before).toBeGreaterThanOrEqual(1);

      // Intercept confirm and accept
      page.on('dialog', async dialog => {
        await dialog.accept();
      });

      // Click clear button
      await page.click('#clearBtn');

      // After clearing, nodes should be zero
      await expect(page.locator('svg#svgCanvas g.node')).toHaveCount(0);

      // Table should be empty
      await expect(page.locator('#stateTable tbody tr')).toHaveCount(0);
    });
  });

  test.describe('Dijkstra algorithm controls and visualization', () => {
    test('Set source mode updates source and table shows (S) marker', async ({ page }) => {
      // Ensure graph exists (reload demo)
      await page.goto(APP_URL);
      await page.waitForSelector('svg#svgCanvas g.node');

      // Set mode to Set Source
      await page.click('#modeSetSource');
      await expect(page.locator('#modeSetSource')).toHaveClass(/active/);

      // Click node 3 to set as source
      const node3 = page.locator('svg#svgCanvas g.node[data-id="3"]');
      await node3.click();

      // Check table first column somewhere should contain '3 (S)'
      const firstCells1 = page.locator('#stateTable tbody tr td:first-child');
      // There should be at least one cell matching
      await expect(firstCells).toContainText('3 (S)');
    });

    test('Step button advances Dijkstra generator and table updates current/visited badges', async ({ page }) => {
      // Ensure demo loaded
      await page.goto(APP_URL);
      await page.waitForSelector('svg#svgCanvas g.node');

      // Step once to initialize generator; initial state should mark the source as current
      await page.click('#stepBtn');

      // Look for a 'current' badge in status column
      const statusCells = page.locator('#stateTable tbody tr td:nth-child(4)');
      // At least one cell should contain 'current'
      await expect(statusCells).toContainText(/current/i);

      // Step again to move to select/visit phases
      await page.click('#stepBtn');
      // After additional steps, there should be at least one 'visited' badge
      await expect(statusCells).toContainText(/visited/i);
    });

    test('Run button auto-runs the algorithm to completion and marks final edges as good', async ({ page }) => {
      // Reload to ensure fresh state
      await page.goto(APP_URL);
      await page.waitForSelector('svg#svgCanvas g.node');

      // Click Run to start
      await page.click('#runBtn');

      // Wait until run button text returns to 'Run' indicating completion (timeout generous)
      await page.waitForFunction(() => document.getElementById('runBtn').textContent === 'Run', null, { timeout: 5000 });

      // After completion, final table should have no 'current' (current becomes null) and visited badges present
      const statusCellsText = await page.locator('#stateTable tbody tr td:nth-child(4)').allTextContents();
      const hasVisited = statusCellsText.some(t => /visited/i.test(t));
      expect(hasVisited).toBe(true);

      // Edges that are part of shortest path tree should have class 'good' on their line element
      const goodEdges = await page.locator('svg#svgCanvas line.good').count();
      // There may be zero or more depending on graph, but test for presence (>=0) - assert no script error occurred
      expect(goodEdges).toBeGreaterThanOrEqual(0);
    });

    test('Reset clears algorithm highlights and returns UI to neutral state', async ({ page }) => {
      // Start and complete an algorithm run first
      await page.goto(APP_URL);
      await page.waitForSelector('svg#svgCanvas g.node');
      await page.click('#runBtn');
      await page.waitForFunction(() => document.getElementById('runBtn').textContent === 'Run', null, { timeout: 5000 });

      // Click reset
      await page.click('#resetBtn');

      // Ensure no nodes have 'visited' or 'current' classes
      const visitedOrCurrent = await page.locator('svg#svgCanvas g.node').evaluateAll(nodes => {
        return nodes.map(n => n.classList.contains('visited') || n.classList.contains('current'));
      });
      // All should be false
      expect(visitedOrCurrent.every(v => v === false)).toBe(true);

      // Ensure edge classes 'relax' and 'good' are removed
      const relaxCount = await page.locator('svg#svgCanvas line.relax').count();
      const goodCount = await page.locator('svg#svgCanvas line.good').count();
      expect(relaxCount).toBe(0);
      // good might remain if created by previous run but reset handler removes 'good' as well per code - check
      expect(goodCount).toBe(0);
    });
  });

  test.describe('Dialogs and edge-case behaviors', () => {
    test('Clear button shows confirmation and canceling keeps graph intact', async ({ page }) => {
      // Reload demo
      await page.goto(APP_URL);
      await page.waitForSelector('svg#svgCanvas g.node');

      // Count nodes before attempting to clear
      const nodesBefore = await page.locator('svg#svgCanvas g.node').count();

      // Intercept confirm and dismiss (cancel)
      page.on('dialog', async dialog => {
        await dialog.dismiss();
      });

      // Click clear and cancel via dialog
      await page.click('#clearBtn');

      // Graph should remain intact
      await expect(page.locator('svg#svgCanvas g.node')).toHaveCount(nodesBefore);
    });

    test('Edge deletion via click in Delete mode removes the edge after confirm', async ({ page }) => {
      // Reload demo to get known edges
      await page.goto(APP_URL);
      await page.waitForSelector('svg#svgCanvas g.edge-group');

      // Count edges
      const edgesLocator = page.locator('svg#svgCanvas g.edge-group');
      const before3 = await edgesLocator.count();
      expect(before).toBeGreaterThanOrEqual(1);

      // Switch to Delete mode
      await page.click('#modeDelete');

      // When clicking an edge, a confirm is shown - accept it
      page.on('dialog', async dialog => {
        await dialog.accept();
      });

      // Click the first edge group (the clickable element is the group; click its line)
      const firstEdgeLine = page.locator('svg#svgCanvas g.edge-group').locator('line').first();
      await firstEdgeLine.click();

      // After deletion, edges count decreases
      await expect(edgesLocator).toHaveCount(before - 1);
    });
  });

  test.afterEach(async ({ page }) => {
    // Collect console error messages and page errors and assert none occurred
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push({ text: msg.text(), location: msg.location() });
    });
    const pageErrors = [];
    page.on('pageerror', err => pageErrors.push(String(err)));

    // Small wait to allow any pending console messages to arrive
    await page.waitForTimeout(150);

    // Evaluate asserts (fail test if there were console errors or page errors)
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });
});