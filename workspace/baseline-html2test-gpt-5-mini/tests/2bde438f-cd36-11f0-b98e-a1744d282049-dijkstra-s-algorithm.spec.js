import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini/html/2bde438f-cd36-11f0-b98e-a1744d282049.html';

test.describe('Dijkstra\'s Algorithm — Interactive Demo (2bde438f-cd36-11f0-b98e-a1744d282049)', () => {
  // Collect console messages and page errors for assertions
  let consoleMessages = [];
  let pageErrors = [];

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Capture console and page errors
    page.on('console', msg => {
      consoleMessages.push({type: msg.type(), text: msg.text()});
    });
    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    // Navigate to the app and wait until it's idle
    await page.goto(APP_URL, { waitUntil: 'networkidle' });
    // Ensure canvas exists and page scripts have run (small wait)
    await page.waitForSelector('#canvas');
  });

  test.afterEach(async () => {
    // Nothing to teardown between tests; each test reloads page in beforeEach
  });

  test.describe('Initial page load and default state', () => {
    test('loads without runtime page errors and shows initial example graph', async ({ page }) => {
      // Confirm there were no uncaught page errors on load
      expect(pageErrors.length, `expected no page.errors, got: ${pageErrors.map(e => String(e)).join('\n')}`).toBe(0);

      // Check important UI elements exist
      await expect(page.locator('h2')).toHaveText(/Dijkstra's Algorithm/);
      await expect(page.locator('#mode-add-node')).toBeVisible();
      await expect(page.locator('#mode-add-edge')).toBeVisible();
      await expect(page.locator('#mode-move')).toBeVisible();
      await expect(page.locator('#mode-delete')).toBeVisible();

      // The initial example creates 6 nodes in initExample(); verify nodes table shows 6 entries
      const rows = page.locator('#nodes-table tbody tr');
      await expect(rows).toHaveCount(6);

      // Verify the source node (0) is present with distance 0.000 (formatted to 3 decimal places)
      const firstRowDistance = page.locator('#nodes-table tbody tr').nth(0).locator('td').nth(1);
      await expect(firstRowDistance).toHaveText('0.000');

      // Verify priority queue shows the source node entry "[0:0" (0:0.000 rendered as 0:0)
      const pqText = await page.locator('#pq').textContent();
      expect(pqText).toContain('0:0');
    });
  });

  test.describe('Graph editing controls', () => {
    test('Add Node: placing a new node increases nodes table count', async ({ page }) => {
      // Start fresh initial state: count rows
      const rowsBefore = await page.locator('#nodes-table tbody tr').count();

      // Ensure mode is "Add Node" (default), click on canvas at (100, 100)
      await page.click('#mode-add-node');
      // Click on canvas at coordinates; choose a point within likely canvas bounds
      await page.click('#canvas', { position: { x: 100, y: 120 } });

      // After placing node, nodes table length should increase by 1
      const rowsAfter = await page.locator('#nodes-table tbody tr').count();
      expect(rowsAfter).toBe(rowsBefore + 1);
    });

    test('Add Edge: creating an edge between two existing nodes increments edges array', async ({ page }) => {
      // Evaluate initial edges count
      const edgesBefore = await page.evaluate(() => edges.length);

      // Switch to add-edge mode
      await page.click('#mode-add-edge');

      // Get coordinates of node 0 and node 1 from page global variables
      const coords = await page.evaluate(() => {
        const a = nodes.find(n => n.id === 0);
        const b = nodes.find(n => n.id === 1);
        return { ax: a.x, ay: a.y, bx: b.x, by: b.y };
      });

      // Click node 0 then node 1 on canvas to add an edge (no prompt for weight - uses default weight)
      await page.click('#canvas', { position: { x: Math.round(coords.ax), y: Math.round(coords.ay) } });
      await page.click('#canvas', { position: { x: Math.round(coords.bx), y: Math.round(coords.by) } });

      // Confirm edges array length increased by 1 (duplicate edge allowed)
      const edgesAfter = await page.evaluate(() => edges.length);
      expect(edgesAfter).toBe(edgesBefore + 1);
    });

    test('Set Source and Set Target: clicking set-source and set-target then node updates state', async ({ page }) => {
      // Choose node id 2 as new source
      const coords1 = await page.evaluate(() => {
        const n = nodes.find(x => x.id === 2);
        return { x: n.x, y: n.y };
      });

      // Click Set Source control then click node 2
      await page.click('#set-source');
      await page.click('#canvas', { position: { x: Math.round(coords.x), y: Math.round(coords.y) } });

      // After setting source, pq should start with "2:0"
      const pqTextAfter = await page.locator('#pq').textContent();
      expect(pqTextAfter).toContain('2:0');

      // Now set target to node 5
      const targetCoords = await page.evaluate(() => {
        const n1 = nodes.find(x => x.id === 5);
        return { x: n.x, y: n.y };
      });
      await page.click('#set-target');
      await page.click('#canvas', { position: { x: Math.round(targetCoords.x), y: Math.round(targetCoords.y) } });

      // Verify target was set by reading window.target
      const targetId = await page.evaluate(() => target);
      expect(targetId).toBe(5);
    });

    test('Editing edge weight via double-click prompts and updates weight', async ({ page }) => {
      // Find midpoint between nodes 0 and 1 (there is an existing edge)
      const mid = await page.evaluate(() => {
        const e = edges.find(ed => (ed.from === 0 && ed.to === 1) || (ed.from === 1 && ed.to === 0));
        // compute midpoint of the first such edge found
        if (!e) return null;
        const a1 = nodes.find(n => n.id === e.from);
        const b1 = nodes.find(n => n.id === e.to);
        return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, edgeId: e.id, currentWeight: e.weight };
      });
      expect(mid).not.toBeNull();

      // Double-click at midpoint to trigger prompt; intercept dialog and provide new weight "7"
      const [dialog] = await Promise.all([
        page.waitForEvent('dialog'),
        page.dblclick('#canvas', { position: { x: Math.round(mid.x), y: Math.round(mid.y) } })
      ]);
      expect(dialog.type()).toBe('prompt');
      // Accept with new weight value
      await dialog.accept('7');

      // Verify the edge's weight updated to 7 (floating number)
      const newWeight = await page.evaluate((eid) => {
        const e1 = edges.find(z => z.id === eid);
        return e ? e.weight : null;
      }, mid.edgeId);
      // In the page code edge.weight is set as numeric; verify approx value
      expect(Number(newWeight)).toBeCloseTo(7, 6);
    });

    test('Delete Node: delete mode shows confirm and removes node and incident edges', async ({ page }) => {
      // Record counts before deletion
      const nodesBefore = await page.evaluate(() => nodes.length);
      const edgesBefore1 = await page.evaluate(() => edges.length);

      // Choose node 3 coordinates
      const coords2 = await page.evaluate(() => {
        const n2 = nodes.find(x => x.id === 3);
        return { x: n.x, y: n.y, id: n.id };
      });

      // Switch to delete mode and click node; intercept confirm and accept
      await page.click('#mode-delete');

      const confirmPromise = page.waitForEvent('dialog');
      await page.click('#canvas', { position: { x: Math.round(coords.x), y: Math.round(coords.y) } });
      const dialog = await confirmPromise;
      expect(dialog.type()).toBe('confirm');
      // Accept deletion
      await dialog.accept();

      // After deletion, nodes count should decrease by 1 and edges incident to that node be removed
      const nodesAfter = await page.evaluate(() => nodes.length);
      const edgesAfter1 = await page.evaluate(() => edges.length);
      expect(nodesAfter).toBe(nodesBefore - 1);
      // at least one edge should be removed (or equal if node had no edges)
      expect(edgesAfter).toBeLessThanOrEqual(edgesBefore);
    });

    test('Clear Graph: clicking clear triggers confirm and empties graph when accepted', async ({ page }) => {
      // Ensure graph not already empty
      const nodesBefore1 = await page.evaluate(() => nodes.length);
      expect(nodesBefore).toBeGreaterThan(0);

      // Click clear and accept confirm
      const confirmPromise1 = page.waitForEvent('dialog');
      await page.click('#clear');
      const dialog1 = await confirmPromise;
      expect(dialog.type()).toBe('confirm');
      await dialog.accept();

      // Validate nodes and edges arrays are cleared
      const nodesAfter1 = await page.evaluate(() => nodes.length);
      const edgesAfter2 = await page.evaluate(() => edges.length);
      expect(nodesAfter).toBe(0);
      expect(edgesAfter).toBe(0);

      // Table should have zero rows
      await expect(page.locator('#nodes-table tbody tr')).toHaveCount(0);
    });

    test('Random Graph: clicking Random Graph generates a new set of nodes (>=4)', async ({ page }) => {
      // Click random button
      await page.click('#random');

      // Wait for nodes array to be updated and assert count >= 4
      await page.waitForFunction(() => nodes.length >= 4);
      const nCount = await page.evaluate(() => nodes.length);
      expect(nCount).toBeGreaterThanOrEqual(4);
    });

    test('Auto Layout: clicking auto layout rearranges node positions', async ({ page }) => {
      // Grab positions before
      const beforePositions = await page.evaluate(() => nodes.map(n => ({id:n.id, x:n.x, y:n.y})));

      // Click auto layout button
      await page.click('#auto-layout');

      // Positions updated - verify at least one node changed position
      const afterPositions = await page.evaluate(() => nodes.map(n => ({id:n.id, x:n.x, y:n.y})));
      const changed = beforePositions.some((b, i) => {
        const a2 = afterPositions.find(x => x.id === b.id);
        return a && (Math.abs(a.x - b.x) > 0.1 || Math.abs(a.y - b.y) > 0.1);
      });
      expect(changed).toBeTruthy();
    });
  });

  test.describe('Algorithm controls and behavior', () => {
    test('Step: without a valid source triggers an alert', async ({ page }) => {
      // Set source to null and reset algorithm via page context
      await page.evaluate(() => { source = null; resetAlgorithm(); });

      // Click step and expect an alert dialog with specific message
      const [dialog] = await Promise.all([
        page.waitForEvent('dialog'),
        page.click('#step')
      ]);
      expect(dialog.type()).toBe('alert');
      expect(dialog.message()).toMatch(/Set a valid source node before running the algorithm/);
      await dialog.accept();
    });

    test('Run and Pause: running toggles the running state and pause stops it', async ({ page }) => {
      // Ensure source is set (initial example has source=0)
      const sourceId = await page.evaluate(() => source);
      expect(sourceId).not.toBeNull();

      // Set speed to a small interval to make test faster
      await page.fill('#speed', '100');
      // Click Run
      await page.click('#run');

      // Allow a short pause to let auto-run begin
      await page.waitForTimeout(250);

      // Confirm running flag is true in page context
      const runningDuring = await page.evaluate(() => running === true || autoTimer !== null);
      expect(runningDuring).toBeTruthy();

      // Click Pause
      await page.click('#pause');

      // Wait a bit and ensure running is false
      await page.waitForTimeout(100);
      const runningAfter = await page.evaluate(() => running);
      expect(runningAfter).toBe(false);
    });

    test('Reset Algorithm: clicking reset reinitializes dist, prev, visited and pq', async ({ page }) => {
      // Mutate some state: set source to node 2
      await page.evaluate(() => { source = 2; resetAlgorithm(); });
      // Take snapshot of pq currently (should contain 2:0)
      const pqBefore = await page.locator('#pq').textContent();
      expect(pqBefore).toContain('2:0');

      // Now click reset (should basically re-run resetAlgorithm)
      await page.click('#reset');

      // After reset ensure pq still valid for source=2
      const pqAfter = await page.locator('#pq').textContent();
      expect(pqAfter).toContain('2:0');
    });
  });

  test.describe('Accessibility and misc behaviors', () => {
    test('Keyboard shortcuts change modes and toggle run/pause via space', async ({ page }) => {
      // Press '1' to set add-node mode; verify style change by clicking and adding node
      await page.keyboard.press('1');
      await page.click('#canvas', { position: { x: 60, y: 60 } });
      // A new node was added - confirm table increased
      const countAfter1 = await page.locator('#nodes-table tbody tr').count();
      expect(countAfter1).toBeGreaterThanOrEqual(7); // initial 6 + one added

      // Press space to run (requires valid source). Ensure running toggles after pressing space
      // Make sure there is a valid source; set to 0
      await page.evaluate(() => { source = 0; resetAlgorithm(); });
      await page.keyboard.press(' ');
      // Small wait to let auto start
      await page.waitForTimeout(200);
      const runningState = await page.evaluate(() => running);
      // Space toggled running to true
      expect(runningState).toBe(true);
      // Press space again to pause
      await page.keyboard.press(' ');
      await page.waitForTimeout(100);
      const runningState2 = await page.evaluate(() => running);
      expect(runningState2).toBe(false);
    });

    test('No severe console errors (no "error" level logs) during typical interactions', async ({ page }) => {
      // Perform a couple of operations
      await page.click('#mode-add-node');
      await page.click('#canvas', { position: { x: 80, y: 140 } });
      await page.click('#mode-add-edge');

      // Grab console messages collected
      const errorLevelMessages = consoleMessages.filter(m => m.type === 'error');
      // Assert that there are no console.error messages
      expect(errorLevelMessages.length).toBe(0);
    });
  });
});