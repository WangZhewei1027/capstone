import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini-1205/html/d80a49f1-d1c9-11f0-9efc-d1db1618a544.html';

test.describe('Weighted Graph Interactive Demo (d80a49f1-d1c9-11f0-9efc-d1db1618a544)', () => {
  let consoleErrors = [];
  let pageErrors = [];

  // Helper to get a node's <g> locator by node id label text (the demo labels nodes by id)
  const nodeGroupById = (page, id) => page.locator('svg g', { hasText: String(id) });

  test.beforeEach(async ({ page }) => {
    // Collect console errors and page errors to assert they don't occur unexpectedly.
    consoleErrors = [];
    pageErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push({ text: msg.text(), location: msg.location() });
      }
    });
    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    // Navigate to app
    await page.goto(APP_URL);
    // Ensure SVG has loaded and seedDemo likely ran
    await expect(page.locator('#svg')).toBeVisible();
    // Wait for the status text to reflect demo graph loaded (seedDemo updates it)
    await expect(page.locator('#status')).toContainText('Mode: Move');
  });

  test.afterEach(async () => {
    // Assert no uncaught runtime errors were emitted to console or as page errors.
    // The application is loaded as-is; if errors happen naturally they will be captured here.
    expect(pageErrors.length, `Expected no page errors but got: ${pageErrors.map(e=>String(e)).join(' | ')}`).toBe(0);
    expect(consoleErrors.length, `Expected no console.error messages but got: ${consoleErrors.map(c=>c.text).join(' | ')}`).toBe(0);
  });

  test('Initial load shows demo graph and correct default UI state', async ({ page }) => {
    // Purpose: Verify initial UI text, toolbar active state, node count, and default weight display.
    await expect(page.locator('h2')).toHaveText('Weighted Graph — Interactive Demo');

    // Mode Move button should be active by default
    const moveBtn = page.locator('#mode-move');
    await expect(moveBtn).toHaveClass(/active/);

    // Status should indicate demo graph loaded by seedDemo (contains 'demo graph loaded' OR at least 'Mode: Move')
    await expect(page.locator('#status')).toBeVisible();
    await expect(page.locator('#status')).toContainText('Mode: Move');

    // Node count is shown and seedDemo adds 6 nodes initially
    const nodeCountText = await page.locator('#node-count').textContent();
    // It should be a number >= 1 (seedDemo creates 6)
    expect(Number(nodeCountText)).toBeGreaterThanOrEqual(1);

    // Default weight reflect the slider initial value of 6
    await expect(page.locator('#default-weight')).toHaveText(String(await page.locator('#weight-range').inputValue()));
  });

  test('Switching modes updates active button and status; select mode clears selection when switching away', async ({ page }) => {
    // Purpose: Verify mode toggling updates UI active states and status text; selecting then switching clears selection highlights.

    const addBtn = page.locator('#mode-add');
    const connectBtn = page.locator('#mode-connect');
    const selectBtn = page.locator('#mode-select');
    const status = page.locator('#status');

    // Click Add mode
    await addBtn.click();
    await expect(addBtn).toHaveClass(/active/);
    await expect(status).toContainText('Mode: Add');

    // Click Connect mode
    await connectBtn.click();
    await expect(connectBtn).toHaveClass(/active/);
    await expect(status).toContainText('Mode: Connect');

    // Click Select mode
    await selectBtn.click();
    await expect(selectBtn).toHaveClass(/active/);
    await expect(status).toContainText('Mode: Select');

    // Click on canvas to set source and then switch mode to Move and verify selection cleared
    // Select node 1 as source
    await nodeGroupById(page, 1).locator('circle').click();
    await expect(status).toContainText('Source');

    // Now switch to Move and selection should clear
    await page.locator('#mode-move').click();
    await expect(page.locator('#status')).toContainText('Mode: Move');
    // After switching away from select, the status should not contain "Source set" anymore
    const statusText = await page.locator('#status').textContent();
    expect(statusText).not.toContain('Source set');
  });

  test('Add node by clicking the canvas in Add mode increases node count', async ({ page }) => {
    // Purpose: Ensure Add Node mode creates a node when clicking the SVG canvas.
    const initialCount = Number(await page.locator('#node-count').textContent());

    // Switch to Add mode
    await page.locator('#mode-add').click();
    await expect(page.locator('#status')).toContainText('Mode: Add');

    // Click the SVG center to add a node
    const svg = page.locator('#svg');
    const box = await svg.boundingBox();
    // click near center
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

    // Node count should increase by 1
    const newCount = Number(await page.locator('#node-count').textContent());
    expect(newCount).toBe(initialCount + 1);
  });

  test('Connect two nodes in Connect mode creates a new edge (increases edge line count)', async ({ page }) => {
    // Purpose: Verify connecting two nodes that are not already directly connected creates an edge (a new <line> appears).

    // We'll first count existing <line> elements (edges), then connect two nodes that are unlikely to be connected already.
    const lineCountBefore = await page.locator('svg line').count();

    // Switch to Connect mode
    await page.locator('#mode-connect').click();
    await expect(page.locator('#status')).toContainText('Mode: Connect');

    // Choose two nodes that initially are likely not connected directly.
    // From seedDemo edges list, nodes 5 and 6 are not directly connected; click node 5 then node 6.
    const node5 = nodeGroupById(page, 5);
    const node6 = nodeGroupById(page, 6);
    await expect(node5).toBeVisible();
    await expect(node6).toBeVisible();

    // Click node 5 then node 6
    await node5.locator('circle').click();
    await node6.locator('circle').click();

    // After connecting, the number of line elements should increase by at least 1.
    const lineCountAfter = await page.locator('svg line').count();
    expect(lineCountAfter).toBeGreaterThanOrEqual(lineCountBefore + 1);

    // The status should be back to Connect mode
    await expect(page.locator('#status')).toContainText('Mode: Connect');
  });

  test('Delete mode removes a node and updates node count', async ({ page }) => {
    // Purpose: Verify Delete mode removes the clicked node and its associated edges, updating the UI node count.

    // Ensure there is at least one node to delete
    let beforeCount = Number(await page.locator('#node-count').textContent());
    expect(beforeCount).toBeGreaterThan(0);

    // Switch to Add mode then add a node so we have a node we can safely delete (to avoid deleting seeded structure)
    await page.locator('#mode-add').click();
    const svg = page.locator('#svg');
    const box = await svg.boundingBox();
    // add a node at bottom-right to be able to target it reliably
    await page.mouse.click(box.x + box.width * 0.85, box.y + box.height * 0.85);

    // New node count
    const afterAddCount = Number(await page.locator('#node-count').textContent());
    expect(afterAddCount).toBe(beforeCount + 1);

    // Find the highest-numbered node label (should be nextNodeId-1). We'll approximate by locating any node that appears at the bottom-right by coordinate.
    // Simpler: find all node <g> groups, pick the last (the newest node was appended last in DOM).
    const nodeGroups = page.locator('svg > g').nth(2).locator('g'); // nodes are under the third top-level <g> (edgesGroup, weightsGroup, nodesGroup)
    // If that selection does not exist in some environments, fallback to selecting any node group with a circle and click it.
    let lastNodeCircle;
    try {
      // Try to get the last child of nodesGroup
      const nodesGroup = page.locator('svg').locator('g').nth(2);
      const count = await nodesGroup.locator('g').count();
      if (count > 0) {
        lastNodeCircle = nodesGroup.locator('g').nth(count - 1).locator('circle');
      } else {
        // fallback: pick node '1' as a removable candidate, but ensure not to break graph connectivity
        lastNodeCircle = nodeGroupById(page, 1).locator('circle');
      }
    } catch {
      lastNodeCircle = nodeGroupById(page, 1).locator('circle');
    }

    // Switch to Delete mode and click the node to delete
    await page.locator('#mode-delete').click();
    await lastNodeCircle.click();

    // Expect node count decreased by 1 from afterAddCount
    const finalCount = Number(await page.locator('#node-count').textContent());
    expect(finalCount).toBe(afterAddCount - 1);
  });

  test('Select S/T and compute Dijkstra shortest path updates status and highlights', async ({ page }) => {
    // Purpose: Verify selecting source and target then clicking Dijkstra updates status and highlights a path.

    // Switch to Select mode
    await page.locator('#mode-select').click();

    // Choose two connected nodes from seed demo: 1 and 3 are connected (path exists)
    await nodeGroupById(page, 1).locator('circle').click();
    await expect(page.locator('#status')).toContainText('Source set');

    await nodeGroupById(page, 3).locator('circle').click();
    await expect(page.locator('#status')).toContainText('Target set');

    // Click Dijkstra button
    await page.locator('#btn-dijkstra').click();

    // The app sets status with 'Shortest path' on success
    await expect(page.locator('#status')).toContainText('Shortest path');

    // Highlighting is applied by changing line stroke color; ensure at least one line's stroke attribute changed to the green path color '#10b981'
    // We'll check that at least one <line> element has stroke attribute equal to '#10b981' OR stroke-width increased (4)
    const lines = page.locator('svg line');
    const count = await lines.count();
    let found = false;
    for (let i = 0; i < count; i++) {
      const stroke = await lines.nth(i).getAttribute('stroke');
      const strokeWidth = await lines.nth(i).getAttribute('stroke-width');
      if (stroke === '#10b981' || Number(strokeWidth) >= 4) {
        found = true;
        break;
      }
    }
    expect(found).toBeTruthy();
  });

  test('Kruskal MST button highlights MST and updates status with total weight', async ({ page }) => {
    // Purpose: Verify clicking MST button highlights MST edges and updates status text.

    // Click MST button
    await page.locator('#btn-mst').click();

    // Status should start with 'MST total weight'
    await expect(page.locator('#status')).toContainText('MST total weight');

    // MST highlight uses '#ffb020' color; check that at least one <line> has that stroke color
    const lines = page.locator('svg line');
    const count = await lines.count();
    let found = false;
    for (let i = 0; i < count; i++) {
      const stroke = await lines.nth(i).getAttribute('stroke');
      if (stroke === '#ffb020') { found = true; break; }
    }

    expect(found).toBeTruthy();
  });

  test('Editing an edge weight via prompt updates the weight label', async ({ page }) => {
    // Purpose: Double-click a weight label, accept a new numeric value in the prompt, and confirm the weight label updates.

    // Find a weight text element to edit (weight labels have class 'weight-label')
    const weightTextLocator = page.locator('text.weight-label').first();
    await expect(weightTextLocator).toBeVisible();

    // Prepare to accept the prompt with a new weight value
    const newWeight = '12';
    page.once('dialog', async dialog => {
      // Ensure prompt type is prompt and provide value
      await dialog.accept(newWeight);
    });

    // Double click the weight label (this triggers the prompt in the app)
    await weightTextLocator.dblclick();

    // After accepting prompt, the UI should reflect the new weight value at least once
    await expect(page.locator(`text.weight-label:has-text("${newWeight}")`)).toBeVisible();
  });

  test('Generate random graph uses input values and updates node count accordingly', async ({ page }) => {
    // Purpose: Change random generator inputs and verify node count matches requested n after generation.

    // Set rand-n to 5 and rand-p to 50 then click Generate
    const randN = page.locator('#rand-n');
    const randP = page.locator('#rand-p');
    await randN.fill('5');
    await randP.fill('50');

    // Click generate
    await page.locator('#btn-random').click();

    // After generation, node-count should be 5
    await expect(page.locator('#node-count')).toHaveText('5');
  });

  test('Clear graph button removes all nodes/edges after confirming', async ({ page }) => {
    // Purpose: Click Clear, accept confirmation, and verify the graph is emptied and node count is zero.

    // Setup dialog handler to accept the confirm
    page.once('dialog', async dialog => {
      expect(dialog.type()).toBe('confirm'); // ensure it's a confirm
      await dialog.accept();
    });

    // Click clear button
    await page.locator('#btn-clear').click();

    // Node count should be 0 and SVG should have no node groups (node-count displayed)
    await expect(page.locator('#node-count')).toHaveText('0');

    // Also ensure no weight labels or lines remain
    await expect(page.locator('text.weight-label')).toHaveCount(0);
    await expect(page.locator('svg line')).toHaveCount(0);
  });
});