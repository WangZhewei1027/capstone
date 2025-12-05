import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini-1205/html/d80b5b60-d1c9-11f0-9efc-d1db1618a544.html';

test.describe('Dijkstra Algorithm Interactive Demo - d80b5b60...', () => {
  // Shared hooks to capture console and page errors for each test
  test.beforeEach(async ({ page }) => {
    // Collect console messages and page errors per test for assertions / debugging
    page.context()._consoleMessages = [];
    page.context()._pageErrors = [];
    page.on('console', msg => {
      // store console messages for later assertions if needed
      page.context()._consoleMessages.push(msg.text());
    });
    page.on('pageerror', err => {
      // store uncaught page errors
      page.context()._pageErrors.push(String(err && (err.message || err)));
    });

    // Navigate to the application under test
    await page.goto(APP_URL);
    // Wait for the SVG and main UI to be present
    await page.waitForSelector('svg');
    await page.waitForSelector('#startSelect');
  });

  test.afterEach(async ({ page }) => {
    // Assert no uncaught page errors were emitted during the test run
    const pageErrors = page.context()._pageErrors || [];
    expect(pageErrors, `Unexpected page errors: ${pageErrors.join(' | ')}`).toEqual([]);
  });

  test.describe('Initial load and default state', () => {
    test('loads the page and renders the example graph', async ({ page }) => {
      // Verify the document title and header are present
      await expect(page.locator('h1')).toHaveText(/Dijkstra's Algorithm/);
      // The example graph is auto-loaded in the script via exampleBtn.click()
      // Verify that node circles are present (example has 5 nodes)
      const nodeCircles = page.locator('circle.nodeCircle');
      await expect(nodeCircles).toHaveCountGreaterThan(0);
      // Ensure the start and target selectors are populated with node options
      const startOptions = await page.$$eval('#startSelect option', opts => opts.map(o => o.value));
      const targetOptions = await page.$$eval('#targetSelect option', opts => opts.map(o => o.value));
      expect(startOptions.length).toBeGreaterThan(0);
      // targetSelect contains a "None" option plus nodes
      expect(targetOptions.length).toBeGreaterThanOrEqual(startOptions.length + 0);
      // The log should contain the "Example graph loaded" entry (script logs this)
      const logText = await page.locator('#log').innerText();
      expect(logText).toMatch(/Example graph loaded/);
      // The state table should render rows equal to number of nodes
      const tableRows = await page.$$eval('#stateTable tbody tr', rows => rows.length);
      expect(tableRows).toBeGreaterThan(0);
    });
  });

  test.describe('Algorithm controls and stepping', () => {
    test('single step initializes and populates pq and distances for start node', async ({ page }) => {
      // Choose start node '1' (example graph uses nodes 1..5)
      await page.selectOption('#startSelect', '1');
      // Click the Step button to advance one generator step (init)
      await page.click('#stepBtn');
      // The log should contain initialization message
      const log = await page.locator('#log').innerText();
      expect(log).toMatch(/Initialized with start node/);
      // The state table should now show node 1 distance as 0
      const firstRowDist = await page.$eval('#stateTable tbody tr:first-child td:nth-child(2)', td => td.textContent.trim());
      // The first row might not correspond to node '1' depending on DOM order; find the row for node '1'
      const distFor1 = await page.$$eval('#stateTable tbody tr', rows => {
        for (const r of rows) {
          const node = r.children[0].textContent.trim();
          const dist = r.children[1].textContent.trim();
          if (node === '1') return dist;
        }
        return null;
      });
      expect(distFor1).toBe('0');
      // Priority queue display should include '1:0'
      const pqText = await page.locator('#pqList').innerText();
      expect(pqText).toContain('1:0');
    });

    test('running auto completes and computes expected shortest distances from node 1', async ({ page }) => {
      // Select start node 1
      await page.selectOption('#startSelect', '1');
      // Set delay to a small value for quicker test
      await page.fill('#delayInput', '50');
      // Click Auto (run) and wait until the algorithm finishes (log contains 'Algorithm finished' or 'No more reachable nodes.')
      await page.click('#runBtn');

      // Wait until the log contains 'Algorithm finished' or until generator becomes null
      await page.waitForFunction(() => {
        const log = document.getElementById('log');
        return log && /Algorithm finished|No more reachable nodes/.test(log.textContent);
      }, { timeout: 5000 });

      // After run, read distances from the table and assert expected values for the example graph:
      // Expected distances from node 1: node1=0, node2=7, node3=14, node4=9, node5=20
      const expected = { '1': '0', '2': '7', '3': '14', '4': '9', '5': '20' };
      const tableData = await page.$$eval('#stateTable tbody tr', rows => {
        const out = {};
        for (const r of rows) {
          const node = r.children[0].textContent.trim();
          const dist = r.children[1].textContent.trim();
          out[node] = dist;
        }
        return out;
      });
      for (const [node, dist] of Object.entries(expected)) {
        expect(tableData[node], `distance for node ${node}`).toBe(dist);
      }

      // Ensure PQ display is empty or contains only final states (no pending smaller-than-infinite entries)
      const pqText = await page.locator('#pqList').innerText();
      // PQ could be empty or contain stale entries; ensure it doesn't show Infinity entries
      expect(pqText).not.toContain('∞');

      // Some node circles should have 'visited' fill color (#94d4a4) or class 'visited'
      const visitedCircles = await page.$$eval('circle.nodeCircle', els => els.filter(c => c.classList.contains('visited')).length);
      expect(visitedCircles).toBeGreaterThan(0);
    });

    test('reset button clears algorithm state and logs reset message', async ({ page }) => {
      // Ensure there is a running or completed state, then click Reset
      await page.selectOption('#startSelect', '1');
      await page.click('#stepBtn'); // initialize
      await page.click('#resetBtn');
      const logText = await page.locator('#log').innerText();
      expect(logText).toMatch(/Algorithm reset to initial state/);
      // After reset, PQ should be empty
      const pqText = await page.locator('#pqList').innerText();
      expect(pqText.trim()).toBe('');
      // Distances should be reset to Infinity represented as '∞' or empty in node dist labels
      const anyNonInf = await page.$$eval('#stateTable tbody tr td:nth-child(2)', tds => tds.some(td => td.textContent.trim() !== '∞' && td.textContent.trim() !== ''));
      expect(anyNonInf).toBe(false);
    });
  });

  test.describe('Graph editing flows (add, edge creation via prompt, delete, clear)', () => {
    test('add node via Add Node mode and clicking canvas', async ({ page }) => {
      // Record initial startSelect options count
      const beforeCount = (await page.$$eval('#startSelect option', o => o.length));
      // Click Add Node mode
      await page.click('#modeAddNode');
      // Click on the SVG canvas at coordinates likely within the canvas
      // Use fixed coordinates relative to svg (50,50)
      const svgBox = await page.locator('svg').boundingBox();
      const clickX = Math.max(10, Math.min(svgBox.width - 10, 50));
      const clickY = Math.max(10, Math.min(svgBox.height - 10, 50));
      await page.mouse.click(svgBox.x + clickX, svgBox.y + clickY);
      // After adding, selectors should have one more option and the log should have Node added
      await page.waitForFunction((before) => {
        const curr = document.querySelectorAll('#startSelect option').length;
        return curr > before;
      }, beforeCount, { timeout: 2000 });

      const afterCount = (await page.$$eval('#startSelect option', o => o.length));
      expect(afterCount).toBeGreaterThan(beforeCount);

      const logText = await page.locator('#log').innerText();
      expect(logText).toMatch(/Node .* added/);
    });

    test('create an edge by selecting source and target nodes and entering weight (prompt)', async ({ page }) => {
      // Ensure we have at least two nodes; use node 1 and node 2 if present
      const nodeIds = await page.$$eval('circle.nodeCircle', els => els.map(c => c.dataset.nodeId));
      expect(nodeIds.length).toBeGreaterThanOrEqual(2);
      const sourceId = nodeIds[0];
      const targetId = nodeIds[1];

      // Intercept dialog for the prompt: provide weight '3' when prompted for edge weight
      page.once('dialog', async dialog => {
        const msg = dialog.message();
        if (/Enter weight for edge/.test(msg)) {
          await dialog.accept('3');
        } else {
          // Fallback: accept confirm dialogs
          await dialog.accept();
        }
      });

      // Switch to Add Edge mode
      await page.click('#modeAddEdge');
      // Click the source and target circles sequentially to trigger prompt flow
      await page.click(`circle[data-node-id="${sourceId}"]`);
      // Wait a short moment for internal state to set source
      await page.waitForTimeout(100);
      await page.click(`circle[data-node-id="${targetId}"]`);

      // After adding, the log should contain 'Edge' and edges in SVG should increase
      const logText = await page.locator('#log').innerText();
      expect(logText).toMatch(/Edge .* added/);

      // Verify there is at least one edge line element in the edgeLayer (line.edgeLine)
      const edgeCount = await page.$$eval('line.edgeLine', els => els.length);
      expect(edgeCount).toBeGreaterThan(0);
    });

    test('delete a node via Delete mode with confirm', async ({ page }) => {
      // Find any node to delete (prefer the last one)
      const nodeIds = await page.$$eval('circle.nodeCircle', els => els.map(c => c.dataset.nodeId));
      expect(nodeIds.length).toBeGreaterThan(0);
      const toDelete = nodeIds[nodeIds.length - 1];

      // Prepare to accept the confirmation dialog for deletion
      page.once('dialog', async dialog => {
        const msg = dialog.message();
        // Accept delete confirmation
        await dialog.accept();
      });

      // Switch to Delete mode and click the node circle
      await page.click('#modeDelete');
      await page.click(`circle[data-node-id="${toDelete}"]`);

      // Wait a moment for the deletion to process
      await page.waitForTimeout(200);

      // The node should no longer be present in startSelect options
      const selectValues = await page.$$eval('#startSelect option', opts => opts.map(o => o.value));
      expect(selectValues).not.toContain(toDelete);

      // Log should mention node deleted
      const logText = await page.locator('#log').innerText();
      expect(logText).toMatch(/Node .* deleted/);
    });

    test('clear entire graph via Clear Graph button (confirm) removes all nodes and edges', async ({ page }) => {
      // Prepare to accept the confirmation dialog for clearing the graph
      page.once('dialog', async dialog => {
        await dialog.accept();
      });

      // Click clear button
      await page.click('#clearBtn');

      // Wait for UI update
      await page.waitForTimeout(200);

      // After clearing, there should be zero node circles
      const nodeCount = await page.$$eval('circle.nodeCircle', els => els.length);
      expect(nodeCount).toBe(0);

      // Select elements should be empty
      const startOptCount = await page.$$eval('#startSelect option', opts => opts.length);
      expect(startOptCount).toBe(0);

      const logText = await page.locator('#log').innerText();
      expect(logText).toMatch(/Graph cleared/);
    });
  });

  test.describe('Accessibility and keyboard shortcuts', () => {
    test('keyboard shortcuts change modes (1=Add Node,2=Add Edge,3=Move,4=Delete)', async ({ page }) => {
      // Press '1' -> Add Node mode; verify the button gets modeBtnActive class (script toggles class modeBtnActive)
      await page.keyboard.press('1');
      // There's no explicit '.modeBtnActive' class in the HTML CSS but script toggles class name used; we can still assert mode change by clicking canvas adds node
      const before = await page.$$eval('#startSelect option', o => o.length);
      // Click canvas to add node
      const svgBox = await page.locator('svg').boundingBox();
      await page.mouse.click(svgBox.x + 30, svgBox.y + 30);
      await page.waitForFunction((b) => document.querySelectorAll('#startSelect option').length > b, before, { timeout: 2000 });

      const after = await page.$$eval('#startSelect option', o => o.length);
      expect(after).toBeGreaterThan(before);
    });
  });
});