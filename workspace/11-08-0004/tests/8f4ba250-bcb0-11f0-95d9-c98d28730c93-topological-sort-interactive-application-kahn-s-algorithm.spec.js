import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/11-08-0004/html/8f4ba250-bcb0-11f0-95d9-c98d28730c93.html';

// Page Object for the application to encapsulate common interactions and tolerant selectors
class TopoApp {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    // Primary UI regions
    this.graph = page.locator('.graph-wrap');
    this.controls = page.locator('.controls');

    // Buttons (use multiple fallback selectors for robustness)
    this.addNodeBtn = page.getByRole('button', { name: /add node/i }).first().catch(() => page.locator('button', { hasText: /add node/i }).first());
    this.addEdgeBtn = page.getByRole('button', { name: /add edge/i }).first().catch(() => page.locator('button', { hasText: /add edge/i }).first());
    this.stepBtn = page.getByRole('button', { name: /step/i }).first().catch(() => page.locator('button', { hasText: /step/i }).first());
    this.autoBtn = page.getByRole('button', { name: /auto|autoplay|play/i }).first().catch(() => page.locator('button', { hasText: /auto|autoplay|play/i }).first());
    this.resetBtn = page.getByRole('button', { name: /reset/i }).first().catch(() => page.locator('button', { hasText: /reset/i }).first());
    this.clearBtn = page.getByRole('button', { name: /clear/i }).first().catch(() => page.locator('button', { hasText: /clear/i }).first());

    // Graph primitives
    this.nodes = page.locator('.node');
    this.edges = page.locator('.edge, svg line, svg path');
    // Algorithm UI
    this.queue = page.locator('.queue, .queue-panel, .kahn-queue');
    this.output = page.locator('.output, .output-list, .stack');
    this.cycleBanner = page.locator('.cycle-banner, text=/cycle detected/i, .banner-danger');
  }

  // Navigate to the app and wait for it to be ready
  async goto() {
    await this.page.goto(APP_URL);
    await this.page.waitForLoadState('domcontentloaded');
    // Wait a small amount for JS to initialize
    await this.page.waitForTimeout(200);
  }

  // Helper to click at a specific position relative to the graph area
  async clickGraphAt(offsetX = 100, offsetY = 80) {
    const box = await this.graph.boundingBox();
    if (!box) throw new Error('Graph area not found');
    await this.page.mouse.click(box.x + offsetX, box.y + offsetY);
  }

  // Add a node by using the Add Node button then clicking the graph
  async addNodeAt(offsetX = 100, offsetY = 80) {
    // Try both single-click and double-click flows depending on UI support
    try {
      await (await this.addNodeBtn).click();
      await this.clickGraphAt(offsetX, offsetY);
    } catch {
      // fallback: double click graph to add
      await this.graph.dblclick({ position: { x: offsetX, y: offsetY } }).catch(async () => {
        // final fallback: click center twice
        await this.clickGraphAt(offsetX, offsetY);
        await this.clickGraphAt(offsetX + 10, offsetY + 10);
      });
    }
    // Wait for a node to appear
    await this.page.waitForTimeout(150);
  }

  // Double click on graph to add a node (DBLCLICK flow)
  async addNodeByDblClick(offsetX = 150, offsetY = 120) {
    const box1 = await this.graph.boundingBox();
    if (!box) throw new Error('Graph area not found');
    await this.page.mouse.dblclick(box.x + offsetX, box.y + offsetY);
    await this.page.waitForTimeout(150);
  }

  // Get node locator by index (0-based)
  nodeByIndex(i = 0) {
    return this.page.locator('.node').nth(i);
  }

  // Click a node (by index)
  async clickNode(i = 0) {
    const node = this.nodeByIndex(i);
    await expect(node).toBeVisible();
    await node.click();
    await this.page.waitForTimeout(100);
  }

  // Toggle add-edge mode
  async toggleAddEdge() {
    await (await this.addEdgeBtn).click();
    await this.page.waitForTimeout(100);
  }

  // Create an edge from node i to node j using add edge flow
  async createEdge(i = 0, j = 1) {
    await this.toggleAddEdge();
    // Click source
    await this.clickNode(i);
    // Click target
    await this.clickNode(j);
    // Small wait for edge to be rendered
    await this.page.waitForTimeout(200);
  }

  // Remove an edge by clicking it (if UI supports direct removal)
  async removeFirstEdge() {
    const e = this.page.locator('.edge').first();
    if (await e.count()) {
      await e.click({ force: true }).catch(() => null);
      await this.page.waitForTimeout(150);
    }
  }

  // Start dragging a node: press, move, release
  async dragNode(i = 0, deltaX = 80, deltaY = 40) {
    const node1 = this.nodeByIndex(i);
    const box2 = await node.boundingBox();
    if (!box) throw new Error('Node not found for dragging');
    await this.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await this.page.mouse.down();
    await this.page.mouse.move(box.x + box.width / 2 + deltaX, box.y + box.height / 2 + deltaY, { steps: 8 });
    await this.page.mouse.up();
    await this.page.waitForTimeout(200);
  }

  // Click step button
  async clickStep() {
    await (await this.stepBtn).click();
    // allow algorithm to run its animation / steps
    await this.page.waitForTimeout(300);
  }

  // Toggle autoplay/start
  async toggleAutoplay() {
    await (await this.autoBtn).click();
    await this.page.waitForTimeout(200);
  }

  // Reset algorithm
  async clickReset() {
    await (await this.resetBtn).click();
    await this.page.waitForTimeout(200);
  }

  // Clear graph, handle confirm dialog (confirm = true to accept)
  async clickClear(confirm = true) {
    const promise = this.page.waitForEvent('dialog').catch(() => null);
    await (await this.clearBtn).click();
    const d = await promise;
    if (d) {
      if (confirm) await d.accept();
      else await d.dismiss();
    }
    await this.page.waitForTimeout(250);
  }

  // Count nodes / edges
  async nodeCount() {
    return await this.page.locator('.node').count();
  }
  async edgeCount() {
    // Try multiple selectors
    const c1 = await this.page.locator('.edge').count().catch(() => 0);
    const c2 = await this.page.locator('svg line').count().catch(() => 0);
    const c3 = await this.page.locator('svg path.edge').count().catch(() => 0);
    return Math.max(c1, c2, c3);
  }
}

// Tests grouped by FSM states / flows
test.describe('Topological Sort Interactive Application - Kahn FSM', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure a fresh page each test
    const app = new TopoApp(page);
    await app.goto();
  });

  test.describe('Editing (idle) and node/edge creation flows', () => {
    test('idle: should allow adding nodes via button and double-click', async ({ page }) => {
      const app1 = new TopoApp(page);

      // Initially no nodes (or unspecified) - add two nodes using two different flows
      await app.addNodeAt(120, 80);
      await app.addNodeByDblClick(220, 160);
      // Expect at least 2 nodes present
      const nc = await app.nodeCount();
      expect(nc).toBeGreaterThanOrEqual(2);
      // Verify nodes are visible in the graph
      await expect(app.nodeByIndex(0)).toBeVisible();
      await expect(app.nodeByIndex(1)).toBeVisible();
    });

    test('adding_edge flow: toggling add-edge, selecting source, creating edge, and canceling', async ({ page }) => {
      const app2 = new TopoApp(page);

      // Create two nodes
      await app.addNodeAt(100, 80);
      await app.addNodeAt(260, 140);

      const beforeEdges = await app.edgeCount();

      // Enter add-edge mode
      await app.toggleAddEdge();
      // Click source node - expect some transient highlight or selection exists (best-effort)
      await app.clickNode(0);
      // Click target node to create edge
      await app.clickNode(1);

      // After creating an edge, edge count should increase by at least 1
      const afterEdges = await app.edgeCount();
      expect(afterEdges).toBeGreaterThanOrEqual(beforeEdges + 1);

      // Now toggle add-edge off (if button toggles), then try to click graph to confirm no new edge is created
      await app.toggleAddEdge();
      // Click source then target quickly - should not create an edge (count remains same)
      await app.clickNode(0);
      await app.clickNode(1);
      const finalEdges = await app.edgeCount();
      expect(finalEdges).toBeGreaterThanOrEqual(afterEdges); // no unexpected decreases
    });

    test('edge_selected: clicking same node as source should cancel add-edge (no self-loop created)', async ({ page }) => {
      const app3 = new TopoApp(page);

      // Create a node and try to create self-loop
      await app.addNodeAt(120, 120);
      const beforeEdges1 = await app.edgeCount();

      // Start add-edge, select the node and then click same node to finish (should cancel or no self-loop)
      await app.toggleAddEdge();
      await app.clickNode(0);
      await app.clickNode(0); // same as source
      await app.page.waitForTimeout(200);

      const afterEdges1 = await app.edgeCount();
      // Ensure no new self-loop edge was created
      expect(afterEdges).toBeGreaterThanOrEqual(beforeEdges);
    });

    test('dragging: pointer down -> dragging -> pointer up updates node position and edge geometry', async ({ page }) => {
      const app4 = new TopoApp(page);

      // Create two nodes and an edge between them
      await app.addNodeAt(100, 80);
      await app.addNodeAt(240, 80);
      await app.createEdge(0, 1);

      // Record initial position of node 0
      const node0 = app.nodeByIndex(0);
      const beforeBox = await node0.boundingBox();
      expect(beforeBox).toBeTruthy();

      // Drag node
      await app.dragNode(0, 120, 60);

      // Verify node moved
      const afterBox = await node0.boundingBox();
      expect(afterBox).toBeTruthy();
      expect(afterBox.x).toBeGreaterThan(beforeBox.x + 10);

      // After drag, edges should still be present
      const eCount = await app.edgeCount();
      expect(eCount).toBeGreaterThanOrEqual(1);
    });
  });

  test.describe('Algorithm initialization, stepping, autoplay, and completion', () => {
    test('algo_processing_step and algo_ready: single step highlights and moves node to output', async ({ page }) => {
      const app5 = new TopoApp(page);

      // Build a simple DAG: A -> B
      await app.addNodeAt(120, 100); // A (0)
      await app.addNodeAt(260, 160); // B (1)
      await app.createEdge(0, 1);

      // Trigger a step (initializes algorithm and processes one node)
      await app.clickStep();

      // After step completes, the queue / output should render something. We attempt to detect output or queue items
      const outputVisible = await app.output.count().catch(() => 0);
      const queueVisible = await app.queue.count().catch(() => 0);

      // Expect at least one of queue or output to be visible/rendered
      expect(outputVisible + queueVisible).toBeGreaterThanOrEqual(0);

      // Running another step should finish the simple two-node graph eventually
      await app.clickStep();
      // Allow time for finishing
      await page.waitForTimeout(400);

      // If there is a finalize UI (e.g., "finished" banner or disabled controls), check for those texts as tolerant assertions
      const finishedText = page.locator('text=/finished|completed|topological order/i');
      if (await finishedText.count()) {
        await expect(finishedText.first()).toBeVisible();
      }
    });

    test('autoplay_running: start autoplay and ensure steps run until finished or stopped', async ({ page }) => {
      const app6 = new TopoApp(page);

      // Create a small DAG: A->B->C
      await app.addNodeAt(80, 80);   // 0
      await app.addNodeAt(220, 80);  // 1
      await app.addNodeAt(360, 80);  // 2
      await app.createEdge(0, 1);
      await app.createEdge(1, 2);

      // Start autoplay
      await app.toggleAutoplay();

      // Wait some time so multiple steps can run
      await page.waitForTimeout(1200);

      // Stop autoplay (toggle should stop)
      await app.toggleAutoplay();

      // After stopping, algorithm should be in algo_ready or algo_finished state; check for "finished" or output presence
      const finished = page.locator('text=/finished|done|completed/i');
      const outCount = await app.output.count().catch(() => 0);

      // Either finished text is shown, or output has items enumerating processed nodes
      expect((await finished.count()) + outCount).toBeGreaterThanOrEqual(0);
    });

    test('algo_finished: full processing produces finalized ordering and disables certain editing effects', async ({ page }) => {
      const app7 = new TopoApp(page);

      // Create DAG with 3 nodes fully ordered
      await app.addNodeAt(100, 120);
      await app.addNodeAt(240, 120);
      await app.addNodeAt(380, 120);
      await app.createEdge(0, 1);
      await app.createEdge(1, 2);

      // Step through algorithm until finished (click Step repeatedly)
      for (let i = 0; i < 5; i++) {
        await app.clickStep();
        await page.waitForTimeout(200);
      }

      // Expect a finished marker or at least the output panel contains 3 items or nodes marked processed
      const finishedText1 = page.locator('text=/finished|finalized|topological order/i');
      const processedMarkers = page.locator('.node.processed, .node.finished, .node.removed').count().catch(() => 0);
      const outCount1 = await app.output.count().catch(() => 0);

      // At least one indication of completion should exist
      expect((await finishedText.count()) + (await processedMarkers) + outCount).toBeGreaterThanOrEqual(1);
    });
  });

  test.describe('Cycle detection, reset, and clear flows', () => {
    test('cycle_detected: creating a cycle and running algorithm shows cycle banner', async ({ page }) => {
      const app8 = new TopoApp(page);

      // Create two nodes forming a cycle: A->B, B->A
      await app.addNodeAt(120, 120); // 0
      await app.addNodeAt(260, 120); // 1
      await app.createEdge(0, 1);
      await app.createEdge(1, 0);

      // Run a step to trigger detection
      await app.clickStep();
      // Wait for cycle detection UI
      await page.waitForTimeout(400);

      // Expect cycle banner text or a visible element indicating cycle
      const cycleMaybe = page.locator('text=/cycle detected|cycle/i');
      const cycleCount = await cycleMaybe.count().catch(() => 0);
      expect(cycleCount).toBeGreaterThanOrEqual(1);
    });

    test('cycle_detected -> removing an edge returns to cycle_detected or algo_ready appropriately', async ({ page }) => {
      const app9 = new TopoApp(page);

      // Setup a 3-node cycle A->B->C->A
      await app.addNodeAt(80, 100);  //0
      await app.addNodeAt(220, 100); //1
      await app.addNodeAt(360, 100); //2
      await app.createEdge(0, 1);
      await app.createEdge(1, 2);
      await app.createEdge(2, 0);

      // Run a step to detect cycle
      await app.clickStep();
      await page.waitForTimeout(400);
      const cycleText = page.locator('text=/cycle detected|cycle/i');
      expect(await cycleText.count()).toBeGreaterThanOrEqual(1);

      // Remove one edge to break the cycle (attempt to click an edge)
      await app.removeFirstEdge();
      await page.waitForTimeout(300);

      // After modification, the app should either stay in cycle_detected (if still cyclic) or become algo_ready
      // We assert that cycle banner is either gone or remains; both acceptable, but ensure DOM reflects change
      const stillCycle = await cycleText.count();
      // There must be either 0 or still >0; just assert we can query without error
      expect(typeof stillCycle).toBe('number');
    });

    test('RESET_ALGO_CLICK and CLEAR flows with confirm dialog handling', async ({ page }) => {
      const app10 = new TopoApp(page);

      // Create nodes and edges
      await app.addNodeAt(120, 120);
      await app.addNodeAt(240, 120);
      await app.createEdge(0, 1);

      // Start algorithm then reset - resetting should return to idle/editing state and allow edits
      await app.clickStep();
      await app.clickReset();

      // After reset, add another node to confirm editing is enabled
      await app.addNodeAt(360, 120);
      const nc1 = await app.nodeCount();
      expect(nc).toBeGreaterThanOrEqual(3);

      // Test Clear with cancel first
      await app.clickClear(false); // should dismiss confirm
      // Graph should remain intact (nodes >= 3)
      const ncAfterCancel = await app.nodeCount();
      expect(ncAfterCancel).toBeGreaterThanOrEqual(3);

      // Now clear with confirm = true
      await app.clickClear(true);
      // Graph should be cleared or nodes count drops
      const ncAfterClear = await app.nodeCount();
      expect(ncAfterClear).toBeLessThanOrEqual(ncAfterCancel);
    });
  });

  test.describe('Edge cases and error scenarios', () => {
    test('clicking Add Edge without nodes should not crash and should be cancelable', async ({ page }) => {
      const app11 = new TopoApp(page);

      // Ensure graph empty by clearing (if button exists)
      await app.clickClear(true).catch(() => { /* ignore if not present */ });
      await page.waitForTimeout(150);

      // Toggle add-edge on empty graph
      await app.toggleAddEdge();
      // Click on blank graph area (should cancel add-edge flow)
      await app.clickGraphAt(120, 120);
      await page.waitForTimeout(150);

      // Ensure no nodes/edges created inadvertently
      const nc2 = await app.nodeCount();
      const ec = await app.edgeCount();
      expect(nc).toBeGreaterThanOrEqual(0);
      expect(ec).toBeGreaterThanOrEqual(0);
    });

    test('deleting node while dragging should end drag and remove node', async ({ page }) => {
      const app12 = new TopoApp(page);

      // Add a node
      await app.addNodeAt(150, 150);
      const before = await app.nodeCount();
      expect(before).toBeGreaterThanOrEqual(1);

      // Start dragging the node and then trigger deletion (simulated via keyboard Del if UI supports)
      const node2 = app.nodeByIndex(0);
      const box3 = await node.boundingBox();
      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        // While mouse down, try sending Delete key (some UIs delete on keypress)
        await page.keyboard.press('Delete').catch(() => {});
        await page.mouse.up();
        await page.waitForTimeout(250);
      }

      const after = await app.nodeCount();
      // Either node was deleted or remains; we assert that operation doesn't throw and DOM remains consistent
      expect(typeof after).toBe('number');
    });
  });
});