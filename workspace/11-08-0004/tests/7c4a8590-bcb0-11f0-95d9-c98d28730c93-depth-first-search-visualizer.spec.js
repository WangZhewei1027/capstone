import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/11-08-0004/html/7c4a8590-bcb0-11f0-95d9-c98d28730c93.html';

/**
 * Page Object for interacting with the DFS Visualizer app.
 * Encapsulates common interactions so tests focus on behavior/assertions.
 */
class VisualizerPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.svg = page.locator('#svgCanvas');
    this.controls = page.locator('.controls');
  }

  // Wait for the app to be ready
  async waitForReady() {
    await this.page.waitForSelector('#svgCanvas', { state: 'visible', timeout: 5000 });
    // Controls area should exist too
    await this.page.waitForSelector('.controls', { state: 'visible', timeout: 5000 });
  }

  // Click on the SVG canvas at coordinates (x, y) relative to the canvas top-left
  async clickCanvasAt(x, y) {
    const box = await this.svg.boundingBox();
    if (!box) throw new Error('SVG canvas bounding box not found');
    await this.page.mouse.click(box.x + x, box.y + y, { button: 'left' });
  }

  // Create a node by clicking on canvas at relative coordinates
  async createNodeAt(x, y) {
    await this.clickCanvasAt(x, y);
    // Wait for a circle or node element to appear; node creation should be synchronous but we wait briefly
    await this.page.waitForTimeout(150);
  }

  // Return number of node circle elements currently in the svg
  async getNodeCount() {
    // select common patterns: <g class="node">, <circle>
    const nodes = await this.page.locator('#svgCanvas .node, #svgCanvas circle').elementHandles();
    return nodes.length;
  }

  // Return number of edges (line/path) in the svg
  async getEdgeCount() {
    const edges = await this.page.locator('#svgCanvas .edge, #svgCanvas line, #svgCanvas path.edge, #svgCanvas path').elementHandles();
    return edges.length;
  }

  // Get locator for the nth circle or .node (0-based)
  getNodeLocator(n = 0) {
    // Prefer group with class node, fallback to circles
    return this.page.locator('#svgCanvas .node >> css=*, #svgCanvas .node, #svgCanvas circle').nth(n);
  }

  // Click on a node by index
  async clickNode(n = 0, options = {}) {
    // Try to click the circle element directly if present
    const circleLocator = this.page.locator('#svgCanvas .node circle, #svgCanvas circle').nth(n);
    if (await circleLocator.count() > 0) {
      await circleLocator.click(options);
      return;
    }
    // Last resort: click bounding box of nth top-level element inside svg
    const fallback = this.page.locator('#svgCanvas > *').nth(n);
    await fallback.click(options);
  }

  // Get bounding box center for nth node
  async getNodeCenter(n = 0) {
    // Prefer circle element
    const circ = this.page.locator('#svgCanvas .node circle, #svgCanvas circle').nth(n);
    const box1 = await circ.boundingBox();
    if (!box) {
      // Fallback to any element
      const el = this.page.locator('#svgCanvas > *').nth(n);
      const box2 = await el.boundingBox();
      if (!box2) throw new Error('Could not get node bounding box');
      return { x: box2.x + box2.width / 2, y: box2.y + box2.height / 2 };
    }
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  }

  // Drag node n by delta (dx, dy)
  async dragNodeBy(n = 0, dx = 50, dy = 0) {
    const center = await this.getNodeCenter(n);
    await this.page.mouse.move(center.x, center.y);
    await this.page.mouse.down();
    // small move to ensure dragging begins
    await this.page.mouse.move(center.x + 2, center.y + 2);
    await this.page.mouse.move(center.x + dx, center.y + dy, { steps: 10 });
    await this.page.mouse.up();
    await this.page.waitForTimeout(150);
  }

  // Start creating an edge by shift+mousedown on node n, move to node m and mouseup
  async createEdgeBetween(n = 0, m = 1) {
    const src = await this.getNodeCenter(n);
    const dst = await this.getNodeCenter(m);
    // Shift + mousedown on source
    await this.page.mouse.move(src.x, src.y);
    await this.page.mouse.down({ modifiers: ['Shift'] });
    // Move a bit then move to dest (simulate TEMP_MOUSE_MOVE)
    await this.page.mouse.move((src.x + dst.x) / 2, (src.y + dst.y) / 2, { steps: 6 });
    // Mouse up on dest to complete creation
    await this.page.mouse.move(dst.x, dst.y);
    await this.page.mouse.up();
    // allow svg update
    await this.page.waitForTimeout(200);
  }

  // Toggle a control button by its visible text (case-insensitive)
  async toggleControlByText(text) {
    // Try button, then generic text
    const btn = this.page.locator(`button:has-text("${text}")`);
    if (await btn.count() > 0) {
      await btn.first().click();
      return;
    }
    // fallback to clickable element with text
    const el1 = this.page.locator(`text="${text}"`);
    await el.first().click();
  }

  // Click Play button (tries multiple strategies)
  async clickPlay() {
    const btn1 = this.page.locator('button:has-text("Play"), button:has-text("Pause"), text=Play, text=Pause').first();
    await btn.click();
  }

  // Click Step
  async clickStep() {
    const btn2 = this.page.locator('button:has-text("Step"), text=Step').first();
    await btn.click();
  }

  // Click Reset
  async clickReset() {
    const btn3 = this.page.locator('button:has-text("Reset"), text=Reset').first();
    await btn.click();
  }

  // Click Clear
  async clickClear() {
    const btn4 = this.page.locator('button:has-text("Clear"), text=Clear').first();
    await btn.click();
  }

  // Toggle Delete Mode
  async toggleDeleteMode() {
    // look for any control with Delete in text
    const el2 = this.page.locator('button:has-text("Delete"), text=/delete/i').first();
    await el.click();
  }

  // Toggle Set Start Mode
  async toggleSetStartMode() {
    const el3 = this.page.locator('button:has-text("Start"), text=/set start|start node/i').first();
    await el.click();
  }

  // Toggle Directed
  async toggleDirected() {
    const el4 = this.page.locator('button:has-text("Directed"), text=/directed/i').first();
    await el.click();
  }

  // Helper to check if UI indicates delete mode (search for textual cue)
  async isDeleteModeActive() {
    const txt = this.page.locator('text=/delete mode|delete active|delete/i');
    return (await txt.count()) > 0;
  }

  // Helper to check if UI indicates set start mode
  async isSetStartModeActive() {
    const txt1 = this.page.locator('text=/set start|select start|start mode/i');
    return (await txt.count()) > 0;
  }

  // Helper to check if any node has "start" class or attribute data-start
  async getStartNodeIndex() {
    // Check by class "start"
    const startByClass = await this.page.locator('#svgCanvas .start, #svgCanvas g.start').first();
    if ((await startByClass.count()) > 0) {
      const all = this.page.locator('#svgCanvas .node, #svgCanvas circle');
      const handles = await all.elementHandles();
      for (let i = 0; i < handles.length; i++) {
        const cl = await handles[i].getAttribute('class');
        if (cl && cl.includes('start')) return i;
      }
      return 0;
    }
    // Check for attribute data-start on circle
    const circles = this.page.locator('#svgCanvas circle').elementHandles();
    // eslint-disable-next-line no-unused-vars
    const ch = await circles;
    for (let i = 0; i < ch.length; i++) {
      const attr = await ch[i].getAttribute('data-start');
      if (attr !== null) return i;
    }
    // not found
    return -1;
  }

  // Helper to check if any node is marked visited (class or data-visited)
  async anyNodeVisited() {
    const visitedByClass = await this.page.locator('#svgCanvas .visited, #svgCanvas circle.visited').first();
    if ((await visitedByClass.count()) > 0) return true;
    const circles1 = await this.page.locator('#svgCanvas circle').elementHandles();
    for (let i = 0; i < circles.length; i++) {
      const attr1 = await circles[i].getAttribute('data-visited');
      if (attr !== null && attr !== 'false') return true;
    }
    return false;
  }
}

/**
 * Tests
 */
test.describe('Depth-First Search Visualizer — FSM behavior and interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(APP_URL);
    const vp = new VisualizerPage(page);
    await vp.waitForReady();
  });

  test.afterEach(async ({ page }) => {
    // try to reset state to avoid bleed between tests
    try {
      const vp1 = new VisualizerPage(page);
      await vp.clickReset();
      await vp.clickClear();
    } catch (e) {
      // ignore
    }
  });

  test('idle: clicking on canvas adds nodes (CLICK_CANVAS_ADD_NODE)', async ({ page }) => {
    // Validate that clicking the canvas in idle mode creates nodes.
    const vp2 = new VisualizerPage(page);
    const initial = await vp.getNodeCount();
    await vp.createNodeAt(120, 120);
    await vp.createNodeAt(220, 140);
    const after = await vp.getNodeCount();
    expect(after).toBeGreaterThanOrEqual(initial + 2);
  });

  test('dragging: NODE_MOUSEDOWN_DRAG_START -> NODE_MOUSEUP_DRAG_END and CANCEL_DRAG', async ({ page }) => {
    const vp3 = new VisualizerPage(page);
    // Create a node and drag it; verify position changes and you can cancel drag with Escape
    await vp.createNodeAt(140, 160);
    const beforeCenter = await vp.getNodeCenter(0);
    // Start dragging by mousedown and move
    await vp.dragNodeBy(0, 60, 30);
    const afterCenter = await vp.getNodeCenter(0);
    // Should have moved
    expect(Math.abs(afterCenter.x - beforeCenter.x)).toBeGreaterThan(5);
    expect(Math.abs(afterCenter.y - beforeCenter.y)).toBeGreaterThan(5);

    // Now simulate a drag and cancel: mousedown, move, press Escape, mouseup
    const center1 = await vp.getNodeCenter(0);
    await page.mouse.move(center.x, center.y);
    await page.mouse.down();
    await page.mouse.move(center.x + 40, center.y + 10, { steps: 5 });
    // Cancel drag via Escape (CANCEL_DRAG)
    await page.keyboard.press('Escape');
    await page.mouse.up();
    // Give UI time
    await page.waitForTimeout(120);
    const afterCancelCenter = await vp.getNodeCenter(0);
    // Depending on implementation cancel may snap back; ensure it is not thrown into NaN and still inside canvas
    expect(Number.isFinite(afterCancelCenter.x)).toBe(true);
    expect(Number.isFinite(afterCancelCenter.y)).toBe(true);
  });

  test('creating_edge: NODE_MOUSEDOWN_SHIFT_START_EDGE -> TEMP_MOUSE_UP_ON_NODE creates an edge', async ({ page }) => {
    const vp4 = new VisualizerPage(page);
    // Create two nodes
    await vp.createNodeAt(100, 100);
    await vp.createNodeAt(300, 140);
    const beforeEdges = await vp.getEdgeCount();
    // Create an edge using Shift-drag
    await vp.createEdgeBetween(0, 1);
    const afterEdges = await vp.getEdgeCount();
    expect(afterEdges).toBeGreaterThanOrEqual(beforeEdges + 1);
  });

  test('creating_edge: CANCEL_EDGE_CREATION removes temp artifacts and does not add edge', async ({ page }) => {
    const vp5 = new VisualizerPage(page);
    await vp.createNodeAt(110, 120);
    await vp.createNodeAt(260, 220);
    const beforeEdges1 = await vp.getEdgeCount();

    // Start edge creation (shift mousedown), then press Escape to cancel
    const src1 = await vp.getNodeCenter(0);
    const midX = src.x + 10, midY = src.y + 10;
    await page.mouse.move(src.x, src.y);
    await page.mouse.down({ modifiers: ['Shift'] });
    await page.mouse.move(midX, midY, { steps: 5 });
    // Press Escape to cancel
    await page.keyboard.press('Escape');
    await page.mouse.up();
    // Wait for cleanup
    await page.waitForTimeout(200);

    const afterEdges1 = await vp.getEdgeCount();
    expect(afterEdges).toBe(beforeEdges);
  });

  test('delete_mode: TOGGLE_DELETE_MODE -> NODE_CLICK_DELETE and EDGE_CLICK_DELETE behavior', async ({ page }) => {
    const vp6 = new VisualizerPage(page);
    // Build simple graph: two nodes + edge
    await vp.createNodeAt(120, 120);
    await vp.createNodeAt(260, 120);
    await vp.createEdgeBetween(0, 1);
    let nodes1 = await vp.getNodeCount();
    const edges1 = await vp.getEdgeCount();
    expect(nodes).toBeGreaterThanOrEqual(2);
    expect(edges).toBeGreaterThanOrEqual(1);

    // Enter delete mode
    await vp.toggleDeleteMode();
    // UI should show textual cue for delete mode
    const deleteCue = await vp.isDeleteModeActive();
    expect(deleteCue).toBeTruthy();

    // Click the first node to delete it
    await vp.clickNode(0);
    // Allow DOM changes
    await page.waitForTimeout(200);
    const nodesAfter = await vp.getNodeCount();
    const edgesAfter = await vp.getEdgeCount();
    // Expect at least one node removed, and associated edge(s) removed
    expect(nodesAfter).toBeLessThan(nodes);
    expect(edgesAfter).toBeLessThanOrEqual(edges);

    // Toggle delete mode off and ensure textual cue disappears
    await vp.toggleDeleteMode();
    const deleteCueOff = await vp.isDeleteModeActive();
    expect(deleteCueOff).toBeFalsy();
  });

  test('set_start_mode: TOGGLE_SET_START_MODE -> NODE_CLICK_SET_START sets start node', async ({ page }) => {
    const vp7 = new VisualizerPage(page);
    await vp.createNodeAt(140, 140);
    await vp.createNodeAt(240, 160);
    // Enter set-start mode
    await vp.toggleSetStartMode();
    const cue = await vp.isSetStartModeActive();
    expect(cue).toBeTruthy();

    // Click node 1 to set as start
    await vp.clickNode(1);
    await page.waitForTimeout(150);

    // Verify a start node is indicated (either via class or attribute)
    const startIndex = await vp.getStartNodeIndex();
    expect(startIndex).toBeGreaterThanOrEqual(0);

    // Toggle set-start off and confirm cue disappears
    await vp.toggleSetStartMode();
    const cueOff = await vp.isSetStartModeActive();
    expect(cueOff).toBeFalsy();
  });

  test('toggle directed: TOGGLE_DIRECTED toggles a directed flag gracefully', async ({ page }) => {
    const vp8 = new VisualizerPage(page);
    // Toggle directed on and off, verify controls available and no crash
    await vp.toggleDirected();
    await page.waitForTimeout(120);
    await vp.toggleDirected();
    await page.waitForTimeout(120);
    // No direct UI state assertion guaranteed, but ensure app still has canvas and controls
    await expect(page.locator('#svgCanvas')).toBeVisible();
    await expect(page.locator('.controls')).toBeVisible();
  });

  test('playback flow: PLAY_CLICK -> TIMER_TICK_STEP -> TIMER_REACHED_END -> RESET_CLICK transitions', async ({ page }) => {
    const vp9 = new VisualizerPage(page);
    // Build a small graph that DFS can traverse
    await vp.createNodeAt(120, 120);
    await vp.createNodeAt(200, 120);
    await vp.createNodeAt(280, 120);
    await vp.createEdgeBetween(0, 1);
    await vp.createEdgeBetween(1, 2);

    // Ensure no visited nodes at start
    expect(await vp.anyNodeVisited()).toBe(false);

    // Click Play — playback should start. Play button may become Pause or indicate playing.
    await vp.clickPlay();
    // Wait for a snapshot to apply (nodes marked visited progressively)
    await page.waitForTimeout(500);
    const visitedDuringPlay = await vp.anyNodeVisited();
    expect(visitedDuringPlay).toBeTruthy();

    // Pause playback (Play button toggles)
    await vp.clickPlay(); // clicking play again should pause (PLAY_CLICK -> paused)
    await page.waitForTimeout(120);

    // Step while paused: advance one snapshot; ensure visited nodes still exist
    await vp.clickStep();
    await page.waitForTimeout(200);
    expect(await vp.anyNodeVisited()).toBeTruthy();

    // Reset playback clears traversal highlights but keeps graph in FSM (RESET_CLICK -> idle)
    await vp.clickReset();
    // Allow reset to propagate
    await page.waitForTimeout(150);
    // After reset, visited flags should be cleared
    const visitedAfterReset = await vp.anyNodeVisited();
    expect(visitedAfterReset).toBe(false);

    // Play again until end — press Play and wait some time for completion
    await vp.clickPlay();
    // Wait sufficiently long to let traversal reach the end (may vary by implementation)
    await page.waitForTimeout(1500);
    // Once done, clicking Reset should return to idle
    await vp.clickReset();
    await page.waitForTimeout(150);
    expect(await vp.getNodeCount()).toBeGreaterThanOrEqual(3); // Reset should not clear graph
  });

  test('clear action: CLEAR_CLICK removes graph elements and returns to idle', async ({ page }) => {
    const vp10 = new VisualizerPage(page);
    await vp.createNodeAt(110, 110);
    await vp.createNodeAt(220, 110);
    await vp.createEdgeBetween(0, 1);
    const nodesBefore = await vp.getNodeCount();
    expect(nodesBefore).toBeGreaterThanOrEqual(2);
    // Click Clear
    await vp.clickClear();
    await page.waitForTimeout(200);
    const nodesAfter1 = await vp.getNodeCount();
    // Implementation may remove nodes; at minimum traversal state cleared and graph possibly removed
    expect(nodesAfter).toBeLessThanOrEqual(nodesBefore);
  });

  test('window resize triggers idle and exits modal modes (WINDOW_RESIZE)', async ({ page }) => {
    const vp11 = new VisualizerPage(page);
    // Enter delete mode, verify it's active
    await vp.toggleDeleteMode();
    expect(await vp.isDeleteModeActive()).toBeTruthy();

    // Trigger a window resize
    await page.setViewportSize({ width: 800, height: 600 });
    // Small delay to allow handler
    await page.waitForTimeout(150);

    // Delete mode textual cue should be gone because resize triggers idle
    const stillDelete = await vp.isDeleteModeActive();
    expect(stillDelete).toBeFalsy();

    // Enter set-start mode, then resize, ensure it exits
    await vp.toggleSetStartMode();
    expect(await vp.isSetStartModeActive()).toBeTruthy();
    await page.setViewportSize({ width: 500, height: 700 });
    await page.waitForTimeout(150);
    const stillSetStart = await vp.isSetStartModeActive();
    expect(stillSetStart).toBeFalsy();
  });

  test('edge cases: attempting operations on empty graph does not crash and appropriate UI remains stable', async ({ page }) => {
    const vp12 = new VisualizerPage(page);
    // Ensure graph is empty by clearing
    await vp.clickClear();
    await page.waitForTimeout(120);
    // Try Play on empty graph - should not throw and UI should remain responsive
    await vp.clickPlay();
    await page.waitForTimeout(200);
    // If any visited nodes appear, that's fine; otherwise no crash
    expect(await page.locator('#svgCanvas').count()).toBeGreaterThan(0);

    // Try Step on empty/initial state
    await vp.clickStep();
    await page.waitForTimeout(120);

    // Try Reset and Clear to ensure no errors
    await vp.clickReset();
    await vp.clickClear();
    await page.waitForTimeout(120);
    // Still have controls and canvas visible
    await expect(page.locator('#svgCanvas')).toBeVisible();
    await expect(page.locator('.controls')).toBeVisible();
  });
});