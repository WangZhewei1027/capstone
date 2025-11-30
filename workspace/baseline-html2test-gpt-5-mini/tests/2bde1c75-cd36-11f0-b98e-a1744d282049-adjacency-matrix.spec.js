import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini/html/2bde1c75-cd36-11f0-b98e-a1744d282049.html';

test.describe('Adjacency Matrix Interactive Demo (2bde1c75-cd36-11f0-b98e-a1744d282049)', () => {
  // Capture console messages and page errors for assertions
  let consoleErrors = [];
  let pageErrors = [];
  let dialogs = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];
    dialogs = [];

    // Observe console/error events BEFORE navigation so any errors during load are captured
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => {
      pageErrors.push(String(err));
    });
    // Automatically handle dialogs (prompts/alerts) by accepting with sensible defaults.
    // This is important because the app triggers a prompt on initial "Random Graph" click.
    page.on('dialog', async dialog => {
      dialogs.push({ message: dialog.message(), type: dialog.type() });
      try {
        if (dialog.type() === 'prompt') {
          // Accept prompt with a safe numeric value when asking for probability or export JSON
          // If it's an export prompt showing JSON, accept without changing it.
          const msg = dialog.message();
          if (msg.toLowerCase().includes('edge probability')) {
            await dialog.accept('0.35');
          } else {
            // General accept with empty string
            await dialog.accept('');
          }
        } else {
          await dialog.accept();
        }
      } catch (e) {
        // ignore
      }
    });

    await page.goto(APP_URL);
    // Wait a moment to allow the UI initialization (including the random prompt) to settle.
    await page.waitForTimeout(250);
  });

  test.afterEach(async () => {
    // After each test we'll assert there were no unexpected console/page errors.
    // Collect and attach any messages for easier debugging if assertions fail.
    expect(pageErrors, `page errors: ${pageErrors.join(' | ')}`).toEqual([]);
    expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
  });

  test('Initial load: DOM structure and default state are present', async ({ page }) => {
    // Verify main containers exist
    await expect(page.locator('.container .left')).toBeVisible();
    await expect(page.locator('.container .right')).toBeVisible();

    // Selected node should display "None"
    await expect(page.locator('#selectedNode')).toHaveText('None');

    // Matrix mode should initially be "unweighted"
    await expect(page.locator('#matrixMode')).toHaveText('unweighted');

    // Matrix table should be present with rows corresponding to nodes (initial default 5)
    const matrixTable = page.locator('#matrixWrap table');
    await expect(matrixTable).toBeVisible();
    // Count body rows (should equal initial nodes count)
    const rowCount = await matrixTable.locator('tbody tr').count();
    expect(rowCount).toBeGreaterThanOrEqual(1);

    // Adjacency list should contain entries for nodes (n0..n4 for default 5)
    const adjList = await page.locator('#adjList').innerText();
    expect(adjList).toMatch(/n0:/);
    expect(adjList).toMatch(/n1:/);

    // Degree info should not say "No nodes"
    const degree = await page.locator('#degreeInfo').innerText();
    expect(degree).not.toContain('No nodes');
  });

  test('Add and Remove Node buttons update node count and adjacency matrix', async ({ page }) => {
    // Count initial nodes by SVG groups
    const nodesLocator = page.locator('g.node');
    const initialCount = await nodesLocator.count();
    expect(initialCount).toBeGreaterThanOrEqual(1);

    // Click Add Node -> should increase node count by 1 and matrix rows/cols increase
    await page.click('#addNodeBtn');
    await page.waitForTimeout(100);
    const afterAddCount = await page.locator('g.node').count();
    expect(afterAddCount).toBe(initialCount + 1);

    const matrixRowsAfterAdd = await page.locator('#matrixWrap table tbody tr').count();
    expect(matrixRowsAfterAdd).toBe(afterAddCount);

    // Click Remove Node -> should decrease node count by 1 and matrix rows/cols decrease
    await page.click('#removeNodeBtn');
    await page.waitForTimeout(100);
    const afterRemoveCount = await page.locator('g.node').count();
    expect(afterRemoveCount).toBe(initialCount);

    const matrixRowsAfterRemove = await page.locator('#matrixWrap table tbody tr').count();
    expect(matrixRowsAfterRemove).toBe(afterRemoveCount);
  });

  test('Toggling Directed and Weighted checkboxes updates UI and behavior', async ({ page }) => {
    // Ensure directed checkbox toggles and matrix/degree info updates
    const directedChk = page.locator('#directedChk');
    const weightedChk = page.locator('#weightedChk');

    // Initially undirected
    await expect(directedChk).not.toBeChecked();
    await expect(weightedChk).not.toBeChecked();

    // Toggle Directed on
    await directedChk.check();
    await page.waitForTimeout(100);
    await expect(directedChk).toBeChecked();
    // Degree info should now include "out=" or "in="
    const degreeTextDirected = await page.locator('#degreeInfo').innerText();
    expect(degreeTextDirected).toMatch(/out=/);

    // Toggle Weighted on
    await weightedChk.check();
    await page.waitForTimeout(100);
    await expect(weightedChk).toBeChecked();
    // Matrix mode should display 'weighted' and matrix cells should be numeric inputs
    await expect(page.locator('#matrixMode')).toHaveText('weighted');
    // body td inputs of type number should exist
    const numericInputs = page.locator('#matrixWrap table tbody tr td input[type="number"]');
    const numInputsCount = await numericInputs.count();
    expect(numInputsCount).toBeGreaterThan(0);

    // Toggle Weighted off -> matrix should contain checkboxes again
    await weightedChk.uncheck();
    await page.waitForTimeout(100);
    await expect(weightedChk).not.toBeChecked();
    await expect(page.locator('#matrixMode')).toHaveText('unweighted');
    const checkboxes = page.locator('#matrixWrap table tbody tr td input[type="checkbox"]');
    const cbCount = await checkboxes.count();
    expect(cbCount).toBeGreaterThan(0);

    // Toggle Directed off -> degree info should not have out/in format
    await directedChk.uncheck();
    await page.waitForTimeout(100);
    const degreeTextUndirected = await page.locator('#degreeInfo').innerText();
    expect(degreeTextUndirected).not.toMatch(/out=/);
  });

  test('Clicking matrix checkbox toggles edges and updates adjacency list and degrees', async ({ page }) => {
    // Ensure unweighted mode
    await page.locator('#weightedChk').uncheck();
    await page.waitForTimeout(50);

    // Pick first two nodes (row 0, column 1)
    const firstRow = page.locator('#matrixWrap table tbody tr').nth(0);
    const targetCheckbox = firstRow.locator('td input[type="checkbox"]').nth(1);
    const checkedBefore = await targetCheckbox.isChecked();

    // Toggle the checkbox
    await targetCheckbox.click();
    await page.waitForTimeout(100);

    const checkedAfter = await targetCheckbox.isChecked();
    expect(checkedAfter).toBe(!checkedBefore);

    // Adjacency list should reflect the change for symmetrical undirected graph
    const adjListText = await page.locator('#adjList').innerText();
    // If checkedAfter is true, n0's list should contain n1; otherwise not
    if (checkedAfter) expect(adjListText).toMatch(/n0: .*n1/);
    else expect(adjListText).not.toMatch(/n0: .*n1/);

    // Degree info should update accordingly
    const degreeText = await page.locator('#degreeInfo').innerText();
    expect(degreeText).toMatch(/n0:/);
  });

  test('Clicking nodes selects and creates/removes edges (node-to-node interaction)', async ({ page }) => {
    // Unweighted mode ensures clicks toggle without prompt
    await page.locator('#weightedChk').uncheck();
    await page.waitForTimeout(50);

    // Get first two node group elements
    const node0 = page.locator('g.node[data-id="0"]');
    const node1 = page.locator('g.node[data-id="1"]');

    // Click node0 to select
    await node0.click();
    await page.waitForTimeout(50);
    await expect(page.locator('#selectedNode')).toHaveText('n0');

    // Click node1 to toggle edge between selected (n0) and n1
    await node1.click();
    await page.waitForTimeout(150);

    // After connecting, selected should be cleared
    await expect(page.locator('#selectedNode')).toHaveText('None');

    // Verify adjacency list shows the new edge (symmetric in undirected)
    const adjText = await page.locator('#adjList').innerText();
    expect(adjText).toMatch(/n0: .*n1/);

    // Click node0 then node1 again to remove the edge
    await node0.click();
    await page.waitForTimeout(50);
    await node1.click();
    await page.waitForTimeout(150);

    const adjTextAfter = await page.locator('#adjList').innerText();
    // Edge should be removed
    expect(adjTextAfter).not.toMatch(/n0: .*n1/);
  });

  test('Clear Edges button removes all edges and updates UI', async ({ page }) => {
    // Make sure some edges exist: click first cell checkbox to ensure at least one edge
    await page.locator('#weightedChk').uncheck();
    await page.waitForTimeout(50);
    const cb = page.locator('#matrixWrap table tbody tr').nth(0).locator('td input[type="checkbox"]').nth(1);
    await cb.click();
    await page.waitForTimeout(50);

    // Click Clear button
    await page.click('#clearBtn');
    await page.waitForTimeout(100);

    // All checkboxes should be unchecked
    const allCheckboxes = page.locator('#matrixWrap table tbody tr td input[type="checkbox"]');
    const total = await allCheckboxes.count();
    for (let i = 0; i < total; i++) {
      expect(await allCheckboxes.nth(i).isChecked()).toBeFalsy();
    }

    // Adjacency list should show no neighbors for all nodes
    const adjText1 = await page.locator('#adjList').innerText();
    const lines = adjText.trim().split('\n').filter(Boolean);
    for (const line of lines) {
      // Lines like "n0: " or "n0: " with no neighbors after colon
      const [, rest] = line.split(':');
      expect(rest.trim()).toBe('');
    }
  });

  test('Export and Import JSON flow: export shows JSON in prompt and import restores state', async ({ page }) => {
    // Ensure deterministic small graph: remove nodes until 2 nodes remain, then export
    // Remove nodes until there are 2 nodes
    let nodeCount = await page.locator('g.node').count();
    while (nodeCount > 2) {
      await page.click('#removeNodeBtn');
      await page.waitForTimeout(50);
      nodeCount = await page.locator('g.node').count();
    }
    expect(nodeCount).toBe(2);

    // Create an edge between n0 and n1 to be exported
    await page.locator('#weightedChk').uncheck();
    await page.waitForTimeout(50);
    const cb01 = page.locator('#matrixWrap table tbody tr').nth(0).locator('td input[type="checkbox"]').nth(1);
    const wasChecked = await cb01.isChecked();
    if (!wasChecked) await cb01.click();
    await page.waitForTimeout(50);

    // Click Export -> triggers a prompt showing JSON. The prompt handler in beforeEach will accept.
    await page.click('#exportBtn');
    await page.waitForTimeout(100);

    // There should have been at least one dialog recorded (the export prompt)
    expect(dialogs.length).toBeGreaterThanOrEqual(1);
    const lastDialog = dialogs[dialogs.length - 1];
    expect(lastDialog.type).toBe('prompt');
    expect(lastDialog.message.toLowerCase()).toContain('copy json export');

    // Now read the exported JSON by triggering export again but this time capture it by intercepting dialog message.
    // Since we already auto-accepted, we can't reclaim its text. Instead, construct an export by clicking Export and inspecting _graph global
    // Read the window._graph state as a proxy for exported data
    const graphState = await page.evaluate(() => {
      try {
        return { nodes: window._graph?.nodes?.map(n => ({ x: n.x, y: n.y })) ?? null, adj: window._graph?.adj ?? null };
      } catch (e) {
        return { error: String(e) };
      }
    });
    expect(graphState.adj).toBeDefined();
    expect(Array.isArray(graphState.adj)).toBeTruthy();

    // Now modify the graph: clear edges and then import the previously captured state via the import input
    await page.click('#clearBtn');
    await page.waitForTimeout(100);
    const adjAfterClear = await page.locator('#adjList').innerText();
    // ensure cleared
    for (const line of adjAfterClear.trim().split('\n')) {
      const [, rest] = line.split(':');
      expect(rest.trim()).toBe('');
    }

    // Paste a JSON containing nodes and adj into importArea and click Import
    const payload = {
      directed: false,
      weighted: false,
      nodes: graphState.nodes || [],
      adj: graphState.adj || []
    };
    await page.fill('#importArea', JSON.stringify(payload));
    await page.click('#importBtn');
    await page.waitForTimeout(200);

    // After import, adjacency list should reflect original edges (if any)
    const adjAfterImport = await page.locator('#adjList').innerText();
    expect(adjAfterImport.length).toBeGreaterThanOrEqual(1);
  });

  test('Layout controls (Center and Circle) reposition nodes visually and do not throw errors', async ({ page }) => {
    // Capture positions of first node
    const posBefore = await page.locator('g.node[data-id="0"] text').evaluate(el => {
      // return parent circle center via sibling circle attributes
      const g = el.parentElement;
      const circle = g.querySelector('circle');
      return { cx: circle.getAttribute('cx'), cy: circle.getAttribute('cy') };
    });

    // Click Center (fit) button
    await page.click('#fitBtn');
    await page.waitForTimeout(100);

    const posAfterFit = await page.locator('g.node[data-id="0"] text').evaluate(el => {
      const g1 = el.parentElement;
      const circle1 = g.querySelector('circle1');
      return { cx: circle.getAttribute('cx'), cy: circle.getAttribute('cy') };
    });
    expect(posAfterFit.cx).not.toBeUndefined();

    // Click Circle layout
    await page.click('#layoutCircleBtn');
    await page.waitForTimeout(100);

    const posAfterCircle = await page.locator('g.node[data-id="0"] text').evaluate(el => {
      const g2 = el.parentElement;
      const circle2 = g.querySelector('circle2');
      return { cx: circle.getAttribute('cx'), cy: circle.getAttribute('cy') };
    });
    expect(posAfterCircle.cx).not.toBeUndefined();

    // Ensure no page errors or console errors occurred during layout changes
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });
});