import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini/html/2bde6a90-cd36-11f0-b98e-a1744d282049.html';

test.describe('Kruskal\'s Algorithm Interactive Demo - end-to-end', () => {
  // Reusable selectors and utilities
  const sel = {
    canvas: 'canvas#canvas',
    addNodeBtn: '#addNodeBtn',
    edgeModeBtn: '#edgeModeBtn',
    clearBtn: '#clearBtn',
    genBtn: '#genBtn',
    connectBtn: '#connectBtn',
    randN: '#randN',
    randDensity: '#randDensity',
    densityVal: '#densityVal',
    resetAlgoBtn: '#resetAlgoBtn',
    stepBtn: '#stepBtn',
    runBtn: '#runBtn',
    pauseBtn: '#pauseBtn',
    edgeList: '#edgeList',
    mstWeight: '#mstWeight',
    mstCount: '#mstCount',
    neededEdges: '#neededEdges',
    ufBody: '#ufBody',
  };

  // Collect console and page errors per test
  let consoleErrors = [];
  let pageErrors = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];
    // Capture console.error messages
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push({ text: msg.text(), location: msg.location() });
      }
    });
    // Capture uncaught exceptions in the page
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    await page.goto(APP_URL);
    // Ensure canvas is visible and app loaded
    await expect(page.locator(sel.canvas)).toBeVisible({ timeout: 5000 });
    // Wait a short moment for initial generation to finish
    await page.waitForTimeout(300);
  });

  test.afterEach(async () => {
    // After each test, assert there are no uncaught page errors or console errors.
    // These assertions ensure the page runs without runtime exceptions during interactions.
    expect(pageErrors, 'No uncaught page errors should occur').toEqual([]);
    expect(consoleErrors, 'No console.error logs should be emitted').toEqual([]);
  });

  test('Initial load: UI elements present and initial graph generated', async ({ page }) => {
    // Purpose: verify that key controls and status elements are present and initial graph initialization happened.
    await expect(page.locator('h2', { hasText: "Kruskal's Algorithm Demo" })).toBeVisible();
    await expect(page.locator(sel.addNodeBtn)).toBeVisible();
    await expect(page.locator(sel.edgeModeBtn)).toBeVisible();
    await expect(page.locator(sel.clearBtn)).toBeVisible();

    // The demo generates an initial random graph; UF table should have at least 1 row
    const ufRows = page.locator(`${sel.ufBody} tr`);
    await expect(ufRows).toHaveCountGreaterThan(0);

    // neededEdges should be > 0 when nodes exist
    const neededText = await page.locator(sel.neededEdges).innerText();
    const neededNum = parseInt(neededText, 10);
    expect(Number.isFinite(neededNum)).toBeTruthy();
    expect(neededNum).toBeGreaterThanOrEqual(0);

    // Edge list should reflect sorted edges; at least 0 entries (but typically >0)
    await expect(page.locator(sel.edgeList)).toBeVisible();
  });

  test('Add Node flow: clicking "Add Node" toggles and clicking canvas adds a node', async ({ page }) => {
    // Purpose: ensure Add Node toggles the one-time add-state and clicking canvas places a node
    const addBtn = page.locator(sel.addNodeBtn);
    const ufRowsBefore = await page.locator(`${sel.ufBody} tr`).count();

    // Toggle Add Node (one-time add)
    await addBtn.click();
    await expect(addBtn).toHaveText('Click on canvas');

    // Click on canvas at a known position to add a node
    const canvas = page.locator(sel.canvas);
    const box = await canvas.boundingBox();
    // click 80px from top-left of canvas or fallback to center
    const clickX = Math.max(10, Math.min(80, Math.floor(box.width * 0.25)));
    const clickY = Math.max(10, Math.min(80, Math.floor(box.height * 0.25)));
    await canvas.click({ position: { x: clickX, y: clickY } });

    // Add Node should revert to original display text
    await expect(addBtn).toHaveText('Add Node');

    // UF table should have one more row
    const ufRowsAfter = await page.locator(`${sel.ufBody} tr`).count();
    expect(ufRowsAfter).toBeGreaterThan(ufRowsBefore);

    // neededEdges should update accordingly (nodes - 1)
    const neededText1 = await page.locator(sel.neededEdges).innerText();
    const neededNum1 = parseInt(neededText, 10);
    expect(neededNum).toBeGreaterThanOrEqual(0);
  });

  test('Clear graph, add two nodes and create an edge via Edge Mode (handling prompt)', async ({ page }) => {
    // Purpose: verify clear graph confirm, controlled node creation, edge creation using prompt for weight,
    // and that the edge appears in the sorted edge list with the supplied weight.

    // Intercept confirm triggered by Clear Graph and accept it
    page.once('dialog', async (dialog) => {
      // It should be a confirm to clear the graph
      await dialog.accept();
    });
    await page.locator(sel.clearBtn).click();
    // wait for UI update
    await page.waitForTimeout(200);

    // UF table should be empty (0 rows)
    await expect(page.locator(`${sel.ufBody} tr`)).toHaveCount(0);

    // Add first node at (100, 100)
    await page.locator(sel.addNodeBtn).click();
    await page.locator(sel.canvas).click({ position: { x: 100, y: 100 } });

    // Add second node at (200, 100)
    await page.locator(sel.addNodeBtn).click();
    await page.locator(sel.canvas).click({ position: { x: 200, y: 100 } });

    // Verify we have 2 nodes in UF table
    await expect(page.locator(`${sel.ufBody} tr`)).toHaveCount(2);

    // Toggle Edge Mode ON
    await page.locator(sel.edgeModeBtn).click();
    await expect(page.locator(sel.edgeModeBtn)).toHaveText(/Edge Mode: ON/);

    // Start connecting: click node 0 position -> this will set connectingNode in the app
    await page.locator(sel.canvas).click({ position: { x: 100, y: 100 } });

    // For the prompt that appears when finishing the edge, accept with weight '7'
    page.once('dialog', async (dialog) => {
      // prompt for weight -> accept with '7'
      await dialog.accept('7');
    });

    // Click node 1 position to complete edge and invoke prompt
    await page.locator(sel.canvas).click({ position: { x: 200, y: 100 } });

    // Wait a bit for DOM to update
    await page.waitForTimeout(200);

    // Verify an edge entry "0 — 1" exists and weight badge is '7'
    const edgeItems = page.locator(`${sel.edgeList} .edgeItem`);
    await expect(edgeItems).toHaveCountGreaterThan(0);

    // find an edge item that contains "0 — 1"
    const found = await edgeItems.filter({ hasText: '0 — 1' }).first();
    await expect(found).toBeVisible();
    // weight badge should show 7
    const weightBadge = found.locator('.weightBadge');
    await expect(weightBadge).toHaveText('7');

    // Verify MST stats: neededEdges should be 1 for 2 nodes
    await expect(page.locator(sel.neededEdges)).toHaveText('1');
  });

  test('Kruskal step and MST stats update: select edge then edit weight via Edit button (handles prompt)', async ({ page }) => {
    // Purpose: run one step of Kruskal and verify MST weight/count update; then edit the edge weight with prompt and verify recomputation.

    // Ensure we are in a controlled small graph: clear and add two nodes then edge
    page.once('dialog', async (d) => d.accept()); // clear confirm
    await page.locator(sel.clearBtn).click();
    await page.waitForTimeout(150);

    // Add nodes
    await page.locator(sel.addNodeBtn).click();
    await page.locator(sel.canvas).click({ position: { x: 120, y: 140 } });
    await page.locator(sel.addNodeBtn).click();
    await page.locator(sel.canvas).click({ position: { x: 260, y: 140 } });

    // Create edge with weight 5
    await page.locator(sel.edgeModeBtn).click(); // turn edge mode on
    await page.locator(sel.canvas).click({ position: { x: 120, y: 140 } });
    page.once('dialog', async (d) => d.accept('5'));
    await page.locator(sel.canvas).click({ position: { x: 260, y: 140 } });
    await page.waitForTimeout(200);

    // Reset algorithm state to make sure MST processing starts fresh
    await page.locator(sel.resetAlgoBtn).click();
    await page.waitForTimeout(150);

    // Step once
    await page.locator(sel.stepBtn).click();
    await page.waitForTimeout(200);

    // MST Weight should equal 5 and mstCount = 1
    await expect(page.locator(sel.mstWeight)).toHaveText('5');
    await expect(page.locator(sel.mstCount)).toHaveText('1');

    // Now edit the edge weight via the Edit button in the edge list -> change to 10
    // Locate the edge item for "0 — 1" and click its Edit smallBtn
    const targetEdge = page.locator(`${sel.edgeList} .edgeItem`, { hasText: '0 — 1' }).first();
    const editBtn = targetEdge.locator('.smallBtn', { hasText: 'Edit' }).first();

    // The Edit handler uses prompt -> intercept and provide new value '10'
    page.once('dialog', async (d) => d.accept('10'));
    await editBtn.click();
    await page.waitForTimeout(200);

    // After editing, weights are re-sorted and MST recomputed by rebuildSortedEdges and updateUI,
    // but in this tiny graph MST weight should now be 10 (edge selected earlier remains selected if it was)
    // Reset algorithm to ensure deterministic state and then run a step to select
    await page.locator(sel.resetAlgoBtn).click();
    await page.waitForTimeout(150);
    await page.locator(sel.stepBtn).click();
    await page.waitForTimeout(200);

    await expect(page.locator(sel.mstWeight)).toHaveText('10');
    await expect(page.locator(sel.mstCount)).toHaveText('1');
  });

  test('Generate random graph and ensure connectivity control update UI', async ({ page }) => {
    // Purpose: test generating a random graph via controls and making sure Ensure Connected adds edges and updates UI.

    // Set N=5 and density to 50
    await page.fill(sel.randN, '5');
    // set density slider to 50 via evaluate (fill range gives value but ensure input event)
    const densityHandle = page.locator(sel.randDensity);
    await densityHandle.evaluate((el) => { el.value = '50'; el.dispatchEvent(new Event('input')); });
    // Confirm densityVal text updated
    await expect(page.locator(sel.densityVal)).toHaveText('50');

    // Click Generate
    await page.locator(sel.genBtn).click();
    await page.waitForTimeout(400);

    // UF table should have 5 rows
    await expect(page.locator(`${sel.ufBody} tr`)).toHaveCount(5);

    // Ensure Connected: this will add edges to connect graph
    await page.locator(sel.connectBtn).click();
    await page.waitForTimeout(400);

    // After ensuring connected, neededEdges should still be 4 (n - 1)
    await expect(page.locator(sel.neededEdges)).toHaveText('4');

    // Edge list should have at least 4 edges now (since ensureConnected will add at least n-1 edges)
    const edgeCount = await page.locator(`${sel.edgeList} .edgeItem`).count();
    expect(edgeCount).toBeGreaterThanOrEqual(4);
  });

  test('Double-click on canvas adds a node (quick add)', async ({ page }) => {
    // Purpose: verify that dblclick on the canvas adds a node immediately (shortcut)
    const before = await page.locator(`${sel.ufBody} tr`).count();
    await page.locator(sel.canvas).dblclick({ position: { x: 60, y: 60 } });
    await page.waitForTimeout(150);
    const after = await page.locator(`${sel.ufBody} tr`).count();
    expect(after).toBeGreaterThan(before);
  });

  test('Run and Pause Auto Run toggles UI state', async ({ page }) => {
    // Purpose: click Run to start, expect Run hidden and Pause visible, then click Pause to stop
    // Ensure there is at least one edge to process by generating small graph
    await page.fill(sel.randN, '4');
    await page.locator(sel.genBtn).click();
    await page.waitForTimeout(300);

    // Click Run
    await page.locator(sel.runBtn).click();
    // runBtn should be hidden and pauseBtn visible
    await expect(page.locator(sel.runBtn)).toBeHidden();
    await expect(page.locator(sel.pauseBtn)).toBeVisible();

    // Click Pause
    await page.locator(sel.pauseBtn).click();
    await page.waitForTimeout(150);
    await expect(page.locator(sel.runBtn)).toBeVisible();
    await expect(page.locator(sel.pauseBtn)).toBeHidden();
  });

});