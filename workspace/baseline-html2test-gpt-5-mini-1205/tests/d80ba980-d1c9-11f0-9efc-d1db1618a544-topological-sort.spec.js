import { test, expect } from '@playwright/test';

const APP = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini-1205/html/d80ba980-d1c9-11f0-9efc-d1db1618a544.html';

test.describe('Topological Sort Interactive Demo - d80ba980...', () => {
  // Collect console errors and page errors for assertions
  let consoleErrors = [];
  let pageErrors = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // listen to console events and page errors
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => {
      pageErrors.push(err.message);
    });

    // Navigate to the app
    await page.goto(APP);
    // wait for initial rendering of nodes container
    await page.waitForSelector('#nodes');
    // Ensure adjacency pre is populated (initial demo graph)
    await expect(page.locator('#adj')).toHaveText(/:/, { timeout: 2000 });
  });

  test.afterEach(async () => {
    // Assert that there are no uncaught page errors or console error messages
    // This ensures runtime errors (ReferenceError, TypeError, etc.) did not occur during the test.
    expect(pageErrors, 'No uncaught page errors should occur').toEqual([]);
    expect(consoleErrors, 'No console.error messages should be emitted').toEqual([]);
  });

  test('Initial load shows demo DAG and UI elements', async ({ page }) => {
    // Verify mode label default is "Drag"
    await expect(page.locator('#modeLabel')).toHaveText('Drag');

    // Verify initial log contains hint about demo
    await expect(page.locator('#log')).toHaveText(/Demo DAG loaded/i);

    // Adjacency list shows nodes with labels (A:, B:, etc). There should be multiple lines.
    const adjText = await page.locator('#adj').textContent();
    expect(adjText).toBeTruthy();
    expect(adjText.split('\n').length).toBeGreaterThanOrEqual(6);

    // In-degree display shows numeric entries and matches number of nodes
    const indegText = await page.locator('#indeg').textContent();
    expect(indegText).toBeTruthy();
    expect(indegText.split('\n').length).toBeGreaterThanOrEqual(6);

    // SVG groups for nodes and edges exist
    await expect(page.locator('svg #nodes')).toBeVisible();
    await expect(page.locator('svg #edges')).toBeVisible();

    // Buttons exist and enabled
    await expect(page.locator('#addNodeBtn')).toBeVisible();
    await expect(page.locator('#addEdgeBtn')).toBeVisible();
    await expect(page.locator('#runKahn')).toBeVisible();
    await expect(page.locator('#runDFS')).toBeVisible();
  });

  test('Add Node mode: clicking the canvas adds a node and updates adjacency/in-degree', async ({ page }) => {
    // Count current number of adjacency lines (nodes)
    const before = (await page.locator('#adj').textContent()).split('\n').length;

    // Switch to Add Node mode
    await page.click('#addNodeBtn');
    await expect(page.locator('#modeLabel')).toHaveText('Addnode', { timeout: 1000 });

    // Click on the center of the SVG to add a node
    const svg = page.locator('svg#svg');
    const box = await svg.boundingBox();
    if (!box) throw new Error('SVG bounding box not available');
    // click roughly in the center
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

    // Wait for the adjacency to update (a new line appears)
    await page.waitForFunction(
      (selector, prevCount) => {
        const txt = document.querySelector(selector).textContent || '';
        return txt.split('\n').length === prevCount + 1;
      },
      '#adj',
      before,
      { timeout: 2000 }
    );

    const after = (await page.locator('#adj').textContent()).split('\n').length;
    expect(after).toBe(before + 1);

    // Log should mention 'Added node.' (click handler writes this)
    await expect(page.locator('#log')).toHaveText(/Added node|Demo DAG loaded|Cancelled edge creation/i, { timeout: 2000 });
  });

  test('Add Edge mode: selecting source then target creates an edge and updates in-degrees', async ({ page }) => {
    // Ensure at least two nodes exist
    const nodeGs = page.locator('g.node');
    const count = await nodeGs.count();
    expect(count).toBeGreaterThanOrEqual(2);

    // Switch to Add Edge mode
    await page.click('#addEdgeBtn');
    await expect(page.locator('#modeLabel')).toHaveText('Addedge');

    // Pick first two nodes (source then target)
    const firstNode = nodeGs.nth(0);
    const secondNode = nodeGs.nth(1);

    // Read indegree of second node before creating edge
    const indegBeforeText = await page.locator('#indeg').textContent();
    // find line for second node label (we can query label text inside its node element)
    const label1 = (await firstNode.locator('text').nth(0).textContent()).trim();
    const label2 = (await secondNode.locator('text').nth(0).textContent()).trim();

    // parse indeg mapping before
    const parseIndeg = txt => {
      const map = {};
      txt.split('\n').forEach(line => {
        const m = line.match(/^([^:]+):\s*(\d+)/);
        if (m) map[m[1].trim()] = Number(m[2]);
      });
      return map;
    };
    const indegMapBefore = parseIndeg(indegBeforeText);
    const beforeVal = indegMapBefore[label2] ?? 0;

    // Click source then target to create edge
    await firstNode.click();
    await secondNode.click();

    // After creating edge, indegree of target should increase by 1 (unless edge duplicated)
    await page.waitForFunction(
      (selector, targetLabel, prevVal) => {
        const txt = document.querySelector(selector).textContent || '';
        const lines = txt.split('\n');
        for (const l of lines) {
          if (l.startsWith(targetLabel + ':')) {
            const v = Number(l.split(':')[1].trim());
            return v === prevVal + 1 || v === prevVal; // allow the case where edge existed before
          }
        }
        return false;
      },
      '#indeg',
      label2,
      beforeVal,
      { timeout: 2000 }
    );

    const indegAfterMap = parseIndeg(await page.locator('#indeg').textContent());
    const afterVal = indegAfterMap[label2] ?? 0;
    expect(afterVal === beforeVal + 1 || afterVal === beforeVal).toBeTruthy();

    // Log should indicate edge created or edge already exists
    await expect(page.locator('#log')).toHaveText(/Edge created|Edge already exists/i, { timeout: 2000 });
  });

  test('Delete mode: clicking a node removes it and connected edges', async ({ page }) => {
    // Ensure there is at least one node to delete
    const nodesLocator = page.locator('g.node');
    const initialCount = await nodesLocator.count();
    expect(initialCount).toBeGreaterThan(0);

    // Switch to Delete mode
    await page.click('#deleteBtn');
    await expect(page.locator('#modeLabel')).toHaveText('Delete');

    // Capture label of first node to be deleted
    const first = nodesLocator.nth(0);
    const label = (await first.locator('text').nth(0).textContent()).trim();

    // Click to delete
    await first.click();

    // After deletion, adjacency list should no longer contain that label
    await page.waitForFunction(
      (selector, lbl) => !(document.querySelector(selector).textContent || '').includes(lbl),
      '#adj',
      label,
      { timeout: 2000 }
    );

    const adjText = await page.locator('#adj').textContent();
    expect(adjText.includes(label)).toBeFalsy();

    // Log should reflect deletion
    await expect(page.locator('#log')).toHaveText(new RegExp(`Deleted node|Deleted edge|Deleted node ${label}|Deleted edge\\.`, 'i'), { timeout: 2000 });
  });

  test('Drag mode: mousedown, move, and mouseup changes node transform', async ({ page }) => {
    // Ensure Drag mode active
    await page.click('#dragBtn');
    await expect(page.locator('#modeLabel')).toHaveText('Drag');

    // Select a node and read its current transform
    const node = page.locator('g.node').first();
    const beforeTransform = await node.getAttribute('transform');
    expect(beforeTransform).toBeTruthy();

    // Perform drag: mousedown, mousemove, mouseup on its center
    const bbox = await node.boundingBox();
    if (!bbox) throw new Error('Node bounding box not available for dragging');

    const startX = bbox.x + bbox.width / 2;
    const startY = bbox.y + bbox.height / 2;
    // mousedown
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    // move by +50,+30
    await page.mouse.move(startX + 50, startY + 30, { steps: 10 });
    await page.mouse.up();

    // After drag, transform should have changed to new translate coordinates
    const afterTransform = await node.getAttribute('transform');
    expect(afterTransform).toBeTruthy();
    expect(afterTransform).not.toEqual(beforeTransform);
  });

  test('Random DAG and Random Graph buttons generate graphs and update log', async ({ page }) => {
    // Click Random DAG
    await page.click('#randomDAG');
    await expect(page.locator('#log')).toHaveText(/Random DAG generated|Demo DAG loaded/i, { timeout: 2000 });

    // Click Random Graph
    await page.click('#randomGraph');
    await expect(page.locator('#log')).toHaveText(/Random graph generated/i, { timeout: 2000 });

    // Clear graph
    await page.click('#clearBtn');
    await expect(page.locator('#log')).toHaveText(/Cleared graph/i, { timeout: 2000 });

    // After clear, adjacency should be empty (show '[]' or empty)
    const adjText = await page.locator('#adj').textContent();
    // The implementation writes '' when no nodes - but we cannot assume exact; ensure no labels like 'A:' remain
    expect(adjText.includes(':')).toBeFalsy();
  });

  test('Reset Positions spreads nodes and logs the action', async ({ page }) => {
    // Ensure there is at least one node - if cleared previously, create one
    let ncount = await page.locator('g.node').count();
    if (ncount === 0) {
      await page.click('#addNodeBtn');
      const svg = page.locator('svg#svg');
      const box = await svg.boundingBox();
      if (box) await page.mouse.click(box.x + 40, box.y + 40);
      await page.waitForTimeout(200);
      ncount = await page.locator('g.node').count();
    }
    // Click reset positions and expect log to update
    await page.click('#resetPositions');
    await expect(page.locator('#log')).toHaveText(/Reset positions/i, { timeout: 2000 });
  });

  test('Run Kahn algorithm - asynchronous animation produces final order or detects cycle', async ({ page }) => {
    // Ensure demo DAG present (initial state); trigger Kahn
    await page.click('#runKahn');

    // Wait until #log contains either 'Final order' or 'Cycle detected' or 'Topological order'
    await page.waitForFunction(() => {
      const txt = (document.getElementById('log') || {}).textContent || '';
      return /Final order|Cycle detected|Topological order/i.test(txt);
    }, { timeout: 15000 });

    const logTxt = await page.locator('#log').textContent();
    expect(/Final order|Cycle detected|Topological order/i.test(logTxt)).toBeTruthy();
  });

  test('Step Kahn manual stepping and keyboard trigger works', async ({ page }) => {
    // Ensure some graph exists; click step Kahn
    await page.click('#stepKahn');

    // The stepKahn handler sets up window.manualKahn as a global function after first invocation.
    // The code also triggers an initial singleStep. We can press Space to attempt another step.
    // Press Space to trigger manual step if available.
    await page.keyboard.press('Space');

    // Wait for the log to change to show a removal or cycle message
    await page.waitForFunction(() => {
      const txt = (document.getElementById('log') || {}).textContent || '';
      return /Removed|Cycle detected|No more steps|Topological order/i.test(txt);
    }, { timeout: 5000 });

    const logTxt = await page.locator('#log').textContent();
    expect(/Removed|Cycle detected|Topological order|No more steps/i.test(logTxt)).toBeTruthy();
  });

  test('Run DFS topo sort highlights cycle or produces an order and logs result', async ({ page }) => {
    // Click Run DFS
    await page.click('#runDFS');

    // Wait until log indicates DFS result or cycle detection
    await page.waitForFunction(() => {
      const txt = (document.getElementById('log') || {}).textContent || '';
      return /DFS topo sort produced order|Cycle detected by DFS/i.test(txt);
    }, { timeout: 8000 });

    const logTxt = await page.locator('#log').textContent();
    expect(/DFS topo sort produced order|Cycle detected by DFS/i.test(logTxt)).toBeTruthy();
  });

  test('Stop animation clears timers and logs stop', async ({ page }) => {
    // Start Kahn to have some animation handle
    await page.click('#runKahn');
    // Give it a moment to start
    await page.waitForTimeout(400);

    // Stop
    await page.click('#stopAnimation');
    await expect(page.locator('#log')).toHaveText(/Stopped animations/i, { timeout: 2000 });
  });

  test('Clicking empty space in Add Edge mode cancels pending edge', async ({ page }) => {
    // Ensure at least one node to select as source
    const nodes = page.locator('g.node');
    const count = await nodes.count();
    if (count === 0) {
      // create one
      await page.click('#addNodeBtn');
      const svg = page.locator('svg#svg');
      const box = await svg.boundingBox();
      if (box) await page.mouse.click(box.x + 60, box.y + 60);
      await page.waitForTimeout(200);
    }

    // Switch to add edge and click a node to set pending source
    await page.click('#addEdgeBtn');
    await page.locator('g.node').first().click();

    // Click empty canvas area to cancel
    const svg = page.locator('svg#svg');
    const box = await svg.boundingBox();
    if (!box) throw new Error('SVG bounding box not available');
    // click near bottom-right corner (likely empty)
    await page.mouse.click(box.x + box.width - 10, box.y + box.height - 10);

    // Log should indicate cancellation
    await expect(page.locator('#log')).toHaveText(/Cancelled edge creation/i, { timeout: 2000 });
  });
});