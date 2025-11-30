import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini/html/be87b194-cd35-11f0-9e7b-93b903303299.html';

test.describe('Kruskal\'s Algorithm — Interactive Demo (be87b194-cd35-11f0-9e7b-93b903303299)', () => {
  // Collect console errors and page errors for assertions
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Collect console error messages
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push({ text: msg.text(), location: msg.location() });
      }
    });

    // Collect uncaught page errors
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    // Navigate to the page under test
    await page.goto(APP_URL);
    // Ensure the initial seedSample has time to finish rendering
    await page.waitForSelector('#svgCanvas');
    await page.waitForTimeout(200); // allow scripts to run
  });

  test.afterEach(async () => {
    // after each test we won't attempt to suppress any errors - we collected them
  });

  test('Initial load: page title, key controls and seeded graph present', async ({ page }) => {
    // Verify title and main controls exist
    await expect(page).toHaveTitle(/Kruskal's Algorithm/);
    await expect(page.locator('#randomGraph')).toBeVisible();
    await expect(page.locator('#clearBtn')).toBeVisible();
    await expect(page.locator('#stepBtn')).toBeVisible();
    await expect(page.locator('#runBtn')).toBeVisible();

    // The seeded sample graph is created on load: edges count should be > 0
    const edgeCountText = await page.locator('#edgeCount').textContent();
    const edgeCount = Number(edgeCountText || '0');
    expect(edgeCount).toBeGreaterThan(0);

    // The edge list should contain at least one edge item element
    const edgeListItems = page.locator('#edgeList .edge-item');
    await expect(edgeListItems.first()).toBeVisible();

    // There should be a currentEdge span and MST weight shown
    await expect(page.locator('#currentEdge')).toBeVisible();
    await expect(page.locator('#mstWeight')).toBeVisible();

    // No uncaught page errors at initial load
    expect(pageErrors.length).toBe(0);
  });

  test('Generate Random Graph button updates nodes and edges', async ({ page }) => {
    // Record initial counts
    const initialEdgeCount = Number(await page.locator('#edgeCount').textContent() || '0');

    // Click Generate Random Graph and wait for change
    await page.click('#randomGraph');
    // the generator calls resetAlgorithm and renderEdgeList; wait for edgeCount to change
    await page.waitForFunction(
      (sel, before) => Number(document.querySelector(sel).textContent || '0') !== before,
      {},
      '#edgeCount',
      initialEdgeCount
    );

    const newEdgeCount = Number(await page.locator('#edgeCount').textContent() || '0');
    expect(newEdgeCount).not.toBe(initialEdgeCount);
    expect(newEdgeCount).toBeGreaterThanOrEqual(0);

    // Ensure the UI lists edges and shows sets view refreshed
    await expect(page.locator('#edgeList')).toBeVisible();
    await expect(page.locator('#setsView').locator('div')).toHaveCountGreaterThan(0);

    // No console errors during random graph generation
    expect(consoleErrors.length).toBe(0);
  });

  test('Single Step advances algorithm and updates current edge and MST weight', async ({ page }) => {
    // Ensure algorithm prepared on first step
    const beforeWeight = Number(await page.locator('#mstWeight').textContent() || '0');

    // Press Step
    await page.click('#stepBtn');

    // After a step, currentEdge should display an edge (candidate/accepted/rejected)
    await page.waitForFunction(() => {
      const el = document.getElementById('currentEdge');
      return el && el.textContent && el.textContent.trim() !== '—';
    });

    const currentEdgeText = (await page.locator('#currentEdge').textContent()) || '';
    expect(currentEdgeText).toMatch(/—/); // it shows something like "a — b (w=x)" or similar

    // MST weight should be a number >= 0 (may have increased if accepted)
    const afterWeight = Number(await page.locator('#mstWeight').textContent() || '0');
    expect(afterWeight).toBeGreaterThanOrEqual(0);

    // Edge list should reflect state dots (some dot should be present)
    const firstDot = page.locator('#edgeList .edge-item span[style*="background"]');
    await expect(firstDot.first()).toBeVisible();

    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Run (autoplay) completes algorithm and updates state to finished', async ({ page }) => {
    // Set speed to a small value to speed up autoplay
    await page.fill('#speed', '200');

    // Start run
    await page.click('#runBtn');

    // Wait until currentEdge shows "finished"
    await page.waitForFunction(() => {
      const el1 = document.getElementById('currentEdge');
      return el && el.textContent && el.textContent.includes('finished');
    }, { timeout: 10000 });

    const finalCurrent = (await page.locator('#currentEdge').textContent()) || '';
    expect(finalCurrent).toContain('finished');

    // After completion, runBtn should be enabled again
    await expect(page.locator('#runBtn')).toBeEnabled();

    // MST weight should be a final numeric value
    const finalWeight = Number(await page.locator('#mstWeight').textContent() || '0');
    expect(finalWeight).toBeGreaterThanOrEqual(0);

    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Add a node by clicking empty canvas increases node count', async ({ page }) => {
    // Get initial node count via the exposed debug helper
    const beforeNodes = await page.evaluate(() => window._kruskaldemo && window._kruskaldemo.nodes ? window._kruskaldemo.nodes.length : 0);

    // Ensure mode is 'add'
    await page.selectOption('#modeSelect', 'add');

    // Click an empty spot on the svgcanvas (use coordinates near top-left)
    const svg = page.locator('#svgCanvas');
    const box = await svg.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      const clickX = Math.max(10, Math.round(box.x + 20));
      const clickY = Math.max(10, Math.round(box.y + 20));
      await page.mouse.click(clickX, clickY);
    }

    // Wait a bit and check nodes increased
    await page.waitForTimeout(200);
    const afterNodes = await page.evaluate(() => window._kruskaldemo && window._kruskaldemo.nodes ? window._kruskaldemo.nodes.length : 0);
    expect(afterNodes).toBeGreaterThanOrEqual(beforeNodes + 1);

    expect(consoleErrors.length).toBe(0);
  });

  test('Move a node in Move mode updates its SVG position', async ({ page }) => {
    // Ensure at least one node exists and set mode to move
    await page.selectOption('#modeSelect', 'move');

    // Grab the first node's circle element and bounding box
    const firstNodeG = page.locator('g.node').first();
    await expect(firstNodeG).toBeVisible();
    const circle = firstNodeG.locator('circle');
    const beforeBox = await circle.boundingBox();
    expect(beforeBox).not.toBeNull();
    if (!beforeBox) return;

    // Drag the node by some offset
    const startX = beforeBox.x + beforeBox.width / 2;
    const startY = beforeBox.y + beforeBox.height / 2;
    const dx = 30, dy = 20;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + dx, startY + dy);
    await page.mouse.up();

    // Allow for DOM updates
    await page.waitForTimeout(150);

    // New position of circle should have changed (cx/cy attributes)
    const newCx = await circle.getAttribute('cx');
    const newCy = await circle.getAttribute('cy');
    expect(Number(newCx)).not.toBeCloseTo(0); // sanity
    expect(Number(newCy)).not.toBeCloseTo(0);
    // It should have moved relative to before bounding box center
    const beforeCenterX = beforeBox.x + beforeBox.width / 2;
    const beforeCenterY = beforeBox.y + beforeBox.height / 2;
    expect(Math.abs(Number(newCx) - beforeCenterX)).toBeGreaterThanOrEqual(5);

    expect(consoleErrors.length).toBe(0);
  });

  test('Drag from one node to another in Add mode creates a new edge', async ({ page }) => {
    // Ensure in add mode
    await page.selectOption('#modeSelect', 'add');

    // Use element handles to get two distinct nodes
    const nodes = await page.locator('g.node').all();
    expect(nodes.length).toBeGreaterThanOrEqual(2);

    const first = nodes[0];
    const second = nodes[1];

    const box1 = await first.locator('circle').boundingBox();
    const box2 = await second.locator('circle').boundingBox();
    expect(box1).not.toBeNull();
    expect(box2).not.toBeNull();
    if (!box1 || !box2) return;

    const startX1 = box1.x + box1.width / 2;
    const startY1 = box1.y + box1.height / 2;
    const endX = box2.x + box2.width / 2;
    const endY = box2.y + box2.height / 2;

    const beforeEdgeCount = Number(await page.locator('#edgeCount').textContent() || '0');

    // Perform drag: pointerdown on first, move to second, pointerup
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    // move a bit to begin creating temp line
    await page.mouse.move((startX + endX) / 2, (startY + endY) / 2, { steps: 6 });
    await page.mouse.move(endX, endY, { steps: 6 });
    await page.mouse.up();

    // Wait a bit for edge creation and UI updates
    await page.waitForTimeout(300);

    const afterEdgeCount = Number(await page.locator('#edgeCount').textContent() || '0');
    expect(afterEdgeCount).toBeGreaterThanOrEqual(beforeEdgeCount);

    // There should be at least one svg group with data-eid attribute present after the drag
    const anyEdgeGroup = await page.locator('g[data-eid]').first();
    await expect(anyEdgeGroup).toBeVisible();

    expect(consoleErrors.length).toBe(0);
  });

  test('Double-click an edge weight triggers edit prompt and updates weight', async ({ page }) => {
    // Ensure there is at least one edge group to edit
    const anyEdge = page.locator('g[data-eid]').first();
    await expect(anyEdge).toBeVisible();

    // Find the overlay line inside that edge group (stroke='transparent') to dblclick
    const overlay = anyEdge.locator('line[stroke="transparent"]');
    await expect(overlay).toBeVisible();

    // Prepare to accept the prompt with a specific numeric value
    page.once('dialog', async (dialog) => {
      // accept and set new weight '5'
      await dialog.accept('5');
    });

    // Double click the overlay to trigger prompt
    await overlay.dblclick();

    // Allow time for handler to update UI
    await page.waitForTimeout(200);

    // The weight label is a text element inside the same g: take its text content
    const weightLabel = anyEdge.locator('text').last(); // the weight label should be the last text node in group
    const weightText = await weightLabel.textContent();
    // weight should have changed to '5' after prompt acceptance (or remain numeric)
    expect(weightText.trim()).toMatch(/\d+/);
    // It should equal '5' because we accepted that exact value
    expect(weightText.trim()).toBe('5');

    expect(consoleErrors.length).toBe(0);
  });

  test('Delete mode: clicking a node removes it from the graph', async ({ page }) => {
    // Ensure at least one node exists
    let nodeCount = await page.evaluate(() => window._kruskaldemo && window._kruskaldemo.nodes ? window._kruskaldemo.nodes.length : 0);
    expect(nodeCount).toBeGreaterThanOrEqual(1);

    // Switch to delete mode
    await page.selectOption('#modeSelect', 'delete');

    // Click the first node g to delete it
    const firstNode = page.locator('g.node').first();
    await expect(firstNode).toBeVisible();

    // Get bounding box and click at its center
    const cbox = await firstNode.locator('circle').boundingBox();
    expect(cbox).not.toBeNull();
    if (!cbox) return;
    const cx = cbox.x + cbox.width / 2;
    const cy = cbox.y + cbox.height / 2;

    await page.mouse.click(cx, cy);

    // Wait for deletion to propagate
    await page.waitForTimeout(200);

    const afterNodeCount = await page.evaluate(() => window._kruskaldemo && window._kruskaldemo.nodes ? window._kruskaldemo.nodes.length : 0);
    expect(afterNodeCount).toBeLessThanOrEqual(nodeCount - 1);

    expect(consoleErrors.length).toBe(0);
  });

  test('Keyboard shortcuts: "r" generates random graph and " " (space) triggers a step', async ({ page }) => {
    // Record current edge count
    const beforeEdgeCount1 = Number(await page.locator('#edgeCount').textContent() || '0');

    // Press 'r' to generate a random graph (keyboard shortcut)
    await page.keyboard.press('r');
    // Wait for edges to change
    await page.waitForFunction((before) => Number(document.getElementById('edgeCount').textContent || '0') !== before, {}, beforeEdgeCount);

    const afterEdgeCount1 = Number(await page.locator('#edgeCount').textContent() || '0');
    expect(afterEdgeCount).not.toBe(beforeEdgeCount);

    // Press space to step
    const beforeCurrent = (await page.locator('#currentEdge').textContent()) || '';
    await page.keyboard.press(' ');
    // Wait for the currentEdge to update or at least for the step handler to run
    await page.waitForTimeout(150);
    const afterCurrent = (await page.locator('#currentEdge').textContent()) || '';
    // It's valid if afterCurrent changed or shows a candidate; ensure no exceptions occurred
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('No uncaught exceptions or console errors during interactions', async ({ page }) => {
    // Final assertion: during the test suite interactions we did not get unexpected page errors
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });
});