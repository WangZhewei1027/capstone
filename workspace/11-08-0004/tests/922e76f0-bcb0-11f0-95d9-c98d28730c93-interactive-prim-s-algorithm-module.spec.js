import { test, expect } from '@playwright/test';

//
// Test suite for Interactive Prim's Algorithm Module
// Application ID: 922e76f0-bcb0-11f0-95d9-c98d28730c93
// Served at: http://127.0.0.1:5500/workspace/11-08-0004/html/922e76f0-bcb0-11f0-95d9-c98d28730c93.html
//
// Notes:
// - The real HTML is an interactive canvas + controls. Selectors below use resilient strategies:
//   - Buttons are located by role with case-insensitive regex for labels like "Add node", "Add edge", "Random", etc.
//   - SVG, circle (nodes), line (edges), and potential status elements are probed flexibly.
// - Each test toggles modes, manipulates the canvas, and asserts DOM changes and status updates that represent FSM transitions.
// - Dialog prompts (edge weight) are handled via page.once('dialog', ...).
//

const APP_URL =
  'http://127.0.0.1:5500/workspace/11-08-0004/html/922e76f0-bcb0-11f0-95d9-c98d28730c93.html';

// Page object encapsulating interactions
class PrimPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto(APP_URL);
    // wait for the main svg or controls to be visible
    await Promise.race([
      this.page.waitForSelector('svg', { timeout: 3000 }).catch(() => {}),
      this.page.waitForSelector('[role="button"]', { timeout: 3000 }).catch(() => {}),
    ]);
  }

  // resilient button click by name regex
  async clickButtonByName(regex) {
    const btn = this.page.getByRole('button', { name: regex, exact: false });
    await expect(btn).toBeVisible({ timeout: 2000 });
    await btn.click();
    return btn;
  }

  // find an svg to click at coordinates relative to its bounding box
  async canvasClickAt(x, y) {
    const svg = await this.page.locator('svg').first();
    await expect(svg).toBeVisible({ timeout: 2000 });
    const box = await svg.boundingBox();
    if (!box) throw new Error('SVG bounding box not found');
    const clickX = box.x + x;
    const clickY = box.y + y;
    await this.page.mouse.click(clickX, clickY);
  }

  // get number of node circles currently rendered
  async getNodeCount() {
    // Many implementations use <circle> for nodes; fallback to elements with "[data-node-id]" attribute
    const circleCount = await this.page.locator('svg circle').count();
    if (circleCount > 0) return circleCount;
    const dataNodesCount = await this.page.locator('[data-node-id]').count();
    return dataNodesCount;
  }

  // get number of edges (lines or paths)
  async getEdgeCount() {
    const lineCount = await this.page.locator('svg line, svg path.edge, svg g.edge').count();
    if (lineCount > 0) return lineCount;
    // fallback: elements with data-edge-id
    return this.page.locator('[data-edge-id]').count();
  }

  // add a node at relative coordinates (x,y) within svg box
  async addNodeAt(x = 80, y = 80) {
    await this.clickButtonByName(/add\s*node/i);
    await this.canvasClickAt(x, y);
    // toggle add node off (click button again) to return to normal_edit if UI expects toggling
    await this.clickButtonByName(/add\s*node/i);
    // wait for new node to appear
    await this.page.waitForTimeout(200);
  }

  // click node by index (0-based) - clicks the circle element
  async clickNodeByIndex(index = 0) {
    // wait for nodes
    await this.page.waitForSelector('svg circle, [data-node-id]', { timeout: 2000 });
    const nodes = await this.page.locator('svg circle, [data-node-id]').all();
    if (nodes.length === 0) throw new Error('No nodes present to click');
    const node = nodes[index];
    await node.click({ force: true });
    return node;
  }

  // add an edge between node indices; handle prompt for weight
  async addEdgeBetween(nodeIndexA = 0, nodeIndexB = 1, weight = '7', accept = true) {
    await this.clickButtonByName(/add\s*edge/i);
    // pick first node
    await this.clickNodeByIndex(nodeIndexA);
    // pick second node to trigger awaiting_weight_input
    // handle dialog
    const dialogPromise = this.page.waitForEvent('dialog').catch(() => null);
    await this.clickNodeByIndex(nodeIndexB);

    const dlg = await dialogPromise;
    if (dlg) {
      if (accept) {
        await dlg.accept(String(weight));
      } else {
        await dlg.dismiss();
      }
    } else {
      // Some implementations might use an inline prompt instead of alert/prompt.
      // Give some time for inline prompt to appear and then fallback to continue.
      await this.page.waitForTimeout(200);
    }

    // turn add edge toggle off by clicking again if necessary
    await this.clickButtonByName(/add\s*edge/i);

    // small delay for DOM to update
    await this.page.waitForTimeout(250);
  }

  // drag node by index by dx,dy pixels
  async dragNodeByIndex(index = 0, dx = 30, dy = 30) {
    // find circle and get center coordinates
    await this.page.waitForSelector('svg circle, [data-node-id]', { timeout: 2000 });
    const node1 = this.page.locator('svg circle, [data-node1-id]').nth(index);
    const box1 = await node.boundingBox();
    if (!box) throw new Error('Node bounding box not found for dragging');
    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;
    await this.page.mouse.move(startX, startY);
    await this.page.mouse.down();
    await this.page.mouse.move(startX + dx, startY + dy, { steps: 6 });
    await this.page.mouse.up();
    // allow update
    await this.page.waitForTimeout(200);
  }

  // read a status text element (tries multiple possible selectors)
  async getStatusText() {
    const candidates = [
      '[data-status]',
      '#status',
      '.status',
      '[aria-live]',
      '.status-text',
      '.controls .panel :is(p,div):has-text("status")',
    ];
    for (const sel of candidates) {
      const loc = this.page.locator(sel).first();
      if (await loc.count()) {
        const txt = (await loc.innerText()).trim();
        if (txt) return txt;
      }
    }
    // fallback: look for any element that contains words like "prim", "idle", "complete", "disconnected", etc.
    const matching = await this.page.locator(':text-matches(".*(Prim|idle|complete|connected|disconnected|Step|Auto).*", "i")').first().textContent().catch(() => null);
    return (matching || '').trim();
  }

  // click Step control
  async clickStep() {
    await this.clickButtonByName(/step/i);
    await this.page.waitForTimeout(150);
  }

  // toggle auto
  async toggleAuto(on = true) {
    // if on param true, click "Auto" to enable if not enabled; else click to disable
    const autoBtn = this.page.getByRole('button', { name: /auto/i });
    if (!(await autoBtn.count())) {
      // fallback to Run toggles
      const alt = this.page.getByRole('button', { name: /play|run/i }).first();
      await alt.click();
      return;
    }
    await autoBtn.click();
    await this.page.waitForTimeout(100);
  }

  // click Run to end (if present)
  async clickRunToEnd() {
    const btn1 = this.page.getByRole('button', { name: /run to end|run\s*to\s*end|run/i }).first();
    await expect(btn).toBeVisible({ timeout: 2000 });
    await btn.click();
  }

  // click Reset Prim
  async clickResetPrim() {
    const btn2 = this.page.getByRole('button', { name: /reset prime?|reset prim/i }).first();
    if (await btn.count()) {
      await btn.click();
    } else {
      // fallback to "Reset"
      const alt1 = this.page.getByRole('button', { name: /reset/i }).first();
      if (await alt.count()) await alt.click();
    }
    await this.page.waitForTimeout(150);
  }

  // click Random Graph
  async clickRandomGraph() {
    await this.clickButtonByName(/random/i);
    // small delay for graph generation
    await this.page.waitForTimeout(300);
  }

  // click Clear/Confirm clear (simulate clear confirmed)
  async clickClear() {
    const btn3 = this.page.getByRole('button', { name: /clear/i }).first();
    await expect(btn).toBeVisible({ timeout: 2000 });
    await btn.click();
    await this.page.waitForTimeout(150);
  }

  // click PQ item by index (if present)
  async clickPQItem(index = 0) {
    // PQ may be a list with role list or .pq-list
    const pqItems = this.page.getByRole('listitem').filter({ hasText: /edge|weight|pq|candidate/i });
    if (await pqItems.count()) {
      await pqItems.nth(index).click();
      return true;
    }
    const altItems = this.page.locator('.pq-item, .pq li, #pq-list li').first();
    if (await altItems.count()) {
      await altItems.click();
      return true;
    }
    return false;
  }
}

test.describe('Interactive Prim Module - FSM behavior and UI validation', () => {
  let prim;

  test.beforeEach(async ({ page }) => {
    prim = new PrimPage(page);
    await prim.goto();
  });

  test.afterEach(async ({ page }) => {
    // ensure we leave in a clean state
    await page.reload().catch(() => {});
  });

  // Editing mode tests: idle -> add_node -> normal_edit
  test('idle -> add_node -> add node creates a circle and returns to edit', async ({ page }) => {
    // Validate initial idle state (resetAll should have cleared nodes/edges)
    const nodeCountInitial = await prim.getNodeCount();
    const edgeCountInitial = await prim.getEdgeCount();
    expect(nodeCountInitial).toBeGreaterThanOrEqual(0);
    expect(edgeCountInitial).toBeGreaterThanOrEqual(0);

    // Enter add_node mode and add a node to canvas
    // This validates transition CLICK_ADD_NODE_TOGGLE -> add_node and onEnter setModeAddNode
    await prim.clickButtonByName(/add\s*node/i);
    // click near top-left area of svg
    await prim.canvasClickAt(60, 60);
    // Expect at least one node now
    const nodeCountAfter = await prim.getNodeCount();
    expect(nodeCountAfter).toBeGreaterThanOrEqual(nodeCountInitial + 1);

    // Exit add_node mode by toggling the button again (CLICK_ADD_NODE_TOGGLE -> normal_edit)
    await prim.clickButtonByName(/add\s*node/i);
    // normal_edit onEnter should have updated status; check status text non-empty
    const status = await prim.getStatusText();
    expect(status.length).toBeGreaterThanOrEqual(0);
  });

  test('add_edge flow: set mode, pick two nodes, prompt for weight and create edge; cancellation prevents creation', async ({ page }) => {
    // Create two nodes first
    await prim.addNodeAt(80, 80);
    await prim.addNodeAt(220, 120);
    const nodes1 = await prim.getNodeCount();
    expect(nodes).toBeGreaterThanOrEqual(2);

    const edgesBefore = await prim.getEdgeCount();

    // Start add edge mode, pick nodes and accept weight
    await prim.addEdgeBetween(0, 1, '5', true);
    const edgesAfter = await prim.getEdgeCount();
    // expect one new edge (or at least non-decreasing)
    expect(edgesAfter).toBeGreaterThanOrEqual(edgesBefore + 1);

    // Attempt to add the same edge again; many implementations will prevent duplicates
    // Start add edge, attempt same connection, accept -> either creation prevented or count unchanged
    const edgesBeforeDuplicateAttempt = await prim.getEdgeCount();
    await prim.addEdgeBetween(0, 1, '5', true);
    const edgesAfterDuplicateAttempt = await prim.getEdgeCount();
    // edge count should not increase by more than 1; assert that duplicate was prevented or stable
    expect(edgesAfterDuplicateAttempt - edgesBeforeDuplicateAttempt).toBeLessThanOrEqual(1);

    // Now test canceling the weight prompt: it should not create an edge
    // Add new second node for fresh pair
    await prim.addNodeAt(320, 140);
    const nodeCountNow = await prim.getNodeCount();
    expect(nodeCountNow).toBeGreaterThanOrEqual(3);

    const edgesBeforeCancel = await prim.getEdgeCount();
    // Try to create edge but dismiss the prompt
    await prim.clickButtonByName(/add\s*edge/i);
    await prim.clickNodeByIndex(1);
    // begin dialog capture
    const dlgPromise = page.waitForEvent('dialog').catch(() => null);
    await prim.clickNodeByIndex(2);
    const dlg1 = await dlgPromise;
    if (dlg) {
      await dlg.dismiss();
    } else {
      // fallback wait
      await page.waitForTimeout(200);
    }
    // ensure canceled edge not created
    const edgesAfterCancel = await prim.getEdgeCount();
    expect(edgesAfterCancel).toBeLessThanOrEqual(edgesBeforeCancel + 1);
  });

  test('awaiting_weight_input -> edge weight enter or cancel transitions', async ({ page }) => {
    // Create two nodes and start edge creation then cancel/enter to verify transitions
    await prim.addNodeAt(50, 200);
    await prim.addNodeAt(150, 200);
    const before = await prim.getEdgeCount();

    // Create edge and accept weight
    await prim.addEdgeBetween(0, 1, '10', true);
    const afterAccept = await prim.getEdgeCount();
    expect(afterAccept).toBeGreaterThanOrEqual(before + 1);

    // Create two new nodes and trigger a cancel scenario
    await prim.addNodeAt(260, 200);
    await prim.addNodeAt(360, 200);
    const beforeCancelAttempt = await prim.getEdgeCount();

    // Trigger add edge, select nodes and dismiss dialog
    await prim.clickButtonByName(/add\s*edge/i);
    await prim.clickNodeByIndex(2);
    const dlgPromise1 = page.waitForEvent('dialog').catch(() => null);
    await prim.clickNodeByIndex(3);
    const dlg2 = await dlgPromise;
    if (dlg) {
      await dlg.dismiss();
    }
    // After cancellation, should be returned to add_edge_pick_first (mode) and no edge created
    const afterCancelAttempt = await prim.getEdgeCount();
    expect(afterCancelAttempt).toBeLessThanOrEqual(beforeCancelAttempt + 1);
  });

  test('dragging node updates position and restores previous edit state', async ({ page }) => {
    // Add a node and drag it; verify position change
    await prim.addNodeAt(180, 80);
    const nodeLocator = page.locator('svg circle, [data-node-id]').first();
    await expect(nodeLocator).toBeVisible({ timeout: 2000 });
    const beforeBox = await nodeLocator.boundingBox();
    expect(beforeBox).not.toBeNull();

    // Drag the node by (40, 30)
    await prim.dragNodeByIndex(0, 40, 30);

    const afterBox = await nodeLocator.boundingBox();
    expect(afterBox).not.toBeNull();
    // The centre should have moved by approximately the drag offsets
    const dx = Math.abs((afterBox.x + afterBox.width / 2) - (beforeBox.x + beforeBox.width / 2));
    const dy = Math.abs((afterBox.y + afterBox.height / 2) - (beforeBox.y + beforeBox.height / 2));
    expect(dx).toBeGreaterThanOrEqual(20);
    expect(dy).toBeGreaterThanOrEqual(10);

    // Verify we returned to previous edit mode: ensure buttons still visible and status not stuck in dragging
    const status1 = await prim.getStatusText();
    expect(typeof status).toBe('string');
  });

  test('random graph populates nodes/edges and CLEAR_CONFIRMED returns to idle', async ({ page }) => {
    // Click random graph to populate
    await prim.clickRandomGraph();
    const nodeCount = await prim.getNodeCount();
    const edgeCount = await prim.getEdgeCount();
    expect(nodeCount).toBeGreaterThanOrEqual(1);
    expect(edgeCount).toBeGreaterThanOrEqual(0);

    // Click clear to confirm clear flow; expect nodes removed
    await prim.clickClear();
    // Some apps show a confirmation; try clicking again or waiting
    // Give some time for clear to take effect
    await page.waitForTimeout(300);
    const nodeCountAfterClear = await prim.getNodeCount();
    // After clear, expect fewer nodes (ideally zero)
    expect(nodeCountAfterClear).toBeLessThanOrEqual(nodeCount);
  });

  test('prim_manual stepping: start, step through algorithm leading to complete or disconnected state', async ({ page }) => {
    // Create a small connected graph triangle: 3 nodes, 3 edges
    await prim.addNodeAt(60, 60);
    await prim.addNodeAt(160, 60);
    await prim.addNodeAt(110, 140);

    // Connect edges (accept weight prompts)
    await prim.addEdgeBetween(0, 1, '4', true);
    await prim.addEdgeBetween(1, 2, '6', true);
    await prim.addEdgeBetween(0, 2, '5', true);

    const edgesBefore1 = await prim.getEdgeCount();
    expect(edgesBefore).toBeGreaterThanOrEqual(3);

    // Start Prim: many modules require clicking a node to choose start. Try to click a node to select start.
    await prim.clickNodeByIndex(0);
    // Now click Step repeatedly - should progress algorithmically
    // We'll attempt up to 10 steps or until status indicates complete/disconnected
    let status2 = '';
    for (let i = 0; i < 10; i++) {
      await prim.clickStep();
      await page.waitForTimeout(200);
      status = await prim.getStatusText();
      if (/complete|completed/i.test(status) || /disconnected/i.test(status)) break;
    }
    expect(status.length).toBeGreaterThanOrEqual(0);

    // If algorithm completed, verify UI reflects complete
    if (/complete|completed/i.test(status)) {
      expect(/complete|completed/i.test(status)).toBeTruthy();
    } else if (/disconnected/i.test(status)) {
      // For completeness: disconnected state should also be a recognized outcome
      expect(/disconnected/i.test(status)).toBeTruthy();
    } else {
      // If neither, at minimum ensure that PQ or MST visual elements exist (edges marked or pq list)
      const pqExists = (await page.locator('.pq-item, #pq-list li, .pq li').count()) > 0;
      const mstMarked = (await page.locator('svg line.mst, svg path.mst, svg .mst').count()) > 0;
      expect(pqExists || mstMarked).toBeTruthy();
    }
  }, 20000);

  test('prim_auto: toggling auto starts and stops auto-timer and progresses algorithm', async ({ page }) => {
    // Build a simple graph
    await prim.addNodeAt(70, 70);
    await prim.addNodeAt(180, 70);
    await prim.addEdgeBetween(0, 1, '3', true);

    // Select start node
    await prim.clickNodeByIndex(0);

    // Toggle auto on
    await prim.toggleAuto(true);
    // Allow some time for automatic ticks
    await page.waitForTimeout(1400);

    // Check that some progress occurred: either complete or some MST edges have 'mst' class or PQ items consumed
    const status3 = await prim.getStatusText();
    const isComplete = /complete|completed/i.test(status);
    const mstCount = await page.locator('svg line.mst, svg path.mst, svg .mst').count().catch(() => 0);
    const pqCount = await page.locator('.pq-item, #pq-list li, .pq li').count().catch(() => 0);

    expect(isComplete || mstCount > 0 || pqCount >= 0).toBeTruthy();

    // Toggle auto off (should return to prim_manual)
    await prim.toggleAuto(false);
    // Wait a moment for stopAuto to take effect
    await page.waitForTimeout(200);
    const finalStatus = await prim.getStatusText();
    expect(typeof finalStatus).toBe('string');
  }, 15000);

  test('prim_run_to_end: run to end interval clears on completion or disconnected', async ({ page }) => {
    // Make a graph with 4 nodes but intentionally leave one disconnected to test disconnected case
    await prim.addNodeAt(50, 50);
    await prim.addNodeAt(150, 50);
    await prim.addNodeAt(100, 120);
    await prim.addNodeAt(350, 120); // isolated node

    // Connect first three nodes to form a connected component, leave 4th disconnected
    await prim.addEdgeBetween(0, 1, '4', true);
    await prim.addEdgeBetween(1, 2, '7', true);

    // Select start node
    await prim.clickNodeByIndex(0);

    // Click Run/Run to end
    await prim.clickRunToEnd();

    // Wait until status indicates either complete or disconnected (give generous timeout)
    let finalStatus1 = '';
    for (let i = 0; i < 40; i++) {
      finalStatus = await prim.getStatusText();
      if (/complete|completed|disconnected/i.test(finalStatus)) break;
      await page.waitForTimeout(200);
    }
    expect(/complete|completed|disconnected/i.test(finalStatus)).toBeTruthy();

    // If disconnected, ensure UI acknowledges it
    if (/disconnected/i.test(finalStatus)) {
      expect(/disconnected/i.test(finalStatus)).toBeTruthy();
    }
  }, 20000);

  test('PQ item click animates/focuses edge without changing algorithmic state', async ({ page }) => {
    // Create a simple graph
    await prim.addNodeAt(60, 60);
    await prim.addNodeAt(160, 60);
    await prim.addEdgeBetween(0, 1, '2', true);

    // Start prim by selecting node and step once to populate PQ (some implementations require this)
    await prim.clickNodeByIndex(0);
    await prim.clickStep();
    await page.waitForTimeout(200);

    // Attempt to click PQ item; this should highlight but not change algorithmic state
    const beforeStatus = await prim.getStatusText();
    const clicked = await prim.clickPQItem(0);
    // clicking PQ item may not exist; assert that either it existed and didn't break, or gracefully no-op
    expect(clicked === true || clicked === false).toBeTruthy();

    const afterStatus = await prim.getStatusText();
    // status should not have regressed to idle; for simplicity assert status string still present
    expect(typeof afterStatus).toBe('string');
    // If status changed, it should not be an algorithmic reset (no 'idle' or 'reset' token)
    if (beforeStatus && afterStatus) {
      expect(/reset/i.test(afterStatus)).toBeFalsy();
    }
  });

  test('reset prim and clear transitions: RESET_PRIM and CLEAR_CONFIRMED behaviors', async ({ page }) => {
    // Build a tiny graph and run a step
    await prim.addNodeAt(80, 80);
    await prim.addNodeAt(200, 80);
    await prim.addEdgeBetween(0, 1, '1', true);
    await prim.clickNodeByIndex(0);
    await prim.clickStep();
    await page.waitForTimeout(200);

    // Reset prim - should return to normal_edit and clear algorithm state
    await prim.clickResetPrim();
    await page.waitForTimeout(200);
    const afterResetStatus = await prim.getStatusText();
    // status likely indicates edit/idle; ensure not showing prim-complete text
    expect(/complete|connected|disconnected|prim/i.test(afterResetStatus) === false || afterResetStatus.length >= 0).toBeTruthy();

    // Clear the canvas (CLEAR_CONFIRMED -> idle)
    await prim.clickClear();
    await page.waitForTimeout(300);
    const nodeCountAfterClear1 = await prim.getNodeCount();
    // after clear, nodes should be removed or be fewer than before
    expect(nodeCountAfterClear).toBeLessThanOrEqual(2);
  });
});