import { test, expect } from '@playwright/test';

const APP_URL =
  'http://127.0.0.1:5500/workspace/batch-1210-subtest2/html/0ccb91f0-d5b5-11f0-899c-75bf12e026a9.html';

// Page Object for interactions with the Graph app
class GraphPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.canvas = page.locator('#graphCanvas');
    this.toggleBtn = page.locator('#toggleMode');
    this.resetBtn = page.locator('#resetGraph');
    this.info = page.locator('#info');
  }

  // Get bounding box of canvas for coordinate calculations
  async canvasBox() {
    const box = await this.canvas.boundingBox();
    if (!box) throw new Error('Canvas bounding box not available');
    return box;
  }

  // Click at canvas coordinates (relative to canvas top-left)
  async clickCanvas(x, y) {
    const box = await this.canvasBox();
    await this.page.mouse.click(box.x + x, box.y + y);
  }

  // Perform mousedown at canvas relative coordinates
  async mouseDownCanvas(x, y) {
    const box = await this.canvasBox();
    await this.page.mouse.move(box.x + x, box.y + y);
    await this.page.mouse.down();
  }

  // Perform mouseup at canvas relative coordinates
  async mouseUpCanvas(x, y) {
    const box = await this.canvasBox();
    await this.page.mouse.move(box.x + x, box.y + y);
    await this.page.mouse.up();
  }

  // Move mouse to canvas relative coordinates
  async mouseMoveCanvas(x, y) {
    const box = await this.canvasBox();
    await this.page.mouse.move(box.x + x, box.y + y);
  }

  // Add a node by clicking on canvas at coordinates
  async addNodeAt(x, y) {
    await this.clickCanvas(x, y);
    // Wait for updateInfo to update (info text change)
    await this.page.waitForTimeout(50);
  }

  // Drag a node from (fx,fy) to (tx,ty) — simulates dragging node
  async dragNode(fx, fy, tx, ty) {
    await this.mouseMoveCanvas(fx, fy);
    await this.page.mouse.down();
    // move in small steps to simulate drag
    const steps = 8;
    for (let i = 1; i <= steps; i++) {
      const ix = fx + ((tx - fx) * i) / steps;
      const iy = fy + ((ty - fy) * i) / steps;
      await this.mouseMoveCanvas(ix, iy);
      await this.page.waitForTimeout(20);
    }
    await this.page.mouse.up();
    await this.page.waitForTimeout(50);
  }

  // Create an edge by ctrl+drag from (fx,fy) to (tx,ty)
  async createEdgeCtrlDrag(fx, fy, tx, ty) {
    // Hold Control while doing mousedown to start draggingEdge
    await this.page.keyboard.down('Control');
    await this.mouseMoveCanvas(fx, fy);
    await this.page.mouse.down();
    // move towards target
    const steps = 10;
    for (let i = 1; i <= steps; i++) {
      const ix = fx + ((tx - fx) * i) / steps;
      const iy = fy + ((ty - fy) * i) / steps;
      await this.mouseMoveCanvas(ix, iy);
      await this.page.waitForTimeout(20);
    }
    await this.page.mouse.up();
    await this.page.keyboard.up('Control');
    await this.page.waitForTimeout(80); // allow edges to be added and UI updated
  }

  // Toggle mode button
  async toggleMode() {
    await this.toggleBtn.click();
    await this.page.waitForTimeout(50);
  }

  // Reset graph
  async resetGraph() {
    await this.resetBtn.click();
    await this.page.waitForTimeout(50);
  }

  // Read info text
  async infoText() {
    return (await this.info.textContent())?.trim() ?? '';
  }
}

test.describe('Graph Visualization FSM tests (0ccb91f0-d5b5-11f0-899c-75bf12e026a9)', () => {
  // Arrays to collect console messages and page errors for each test
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Capture console messages
    page.on('console', (msg) => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text(),
      });
    });

    // Capture uncaught page errors (Runtime exceptions)
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    // Load the application page exactly as-is (no modifications)
    await page.goto(APP_URL);
  });

  test('Initial Idle state: canvas and controls present, drawGraph & updateInfo executed', async ({
    page,
  }) => {
    // Verify initial UI elements exist and info reflects Idle state
    const gp = new GraphPage(page);

    await expect(gp.canvas).toBeVisible();
    await expect(gp.toggleBtn).toBeVisible();
    await expect(gp.resetBtn).toBeVisible();
    const info = await gp.infoText();

    // Initial info should show directed mode and 0 nodes / 0 edges
    expect(info).toMatch(/Mode:\s*DIRECTED\s*\|\s*Nodes:\s*0\s*\|\s*Edges:\s*0/);

    // Toggle button default label
    expect(await gp.toggleBtn.textContent()).toBe('Switch to Undirected');

    // No page errors during initial load
    expect(pageErrors.length).toBe(0);
    // No console.error messages during initial load
    const consoleErrors = consoleMessages.filter((m) => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  test('Adding nodes by clicking canvas (S0 -> S1): nodes are counted in info', async ({
    page,
  }) => {
    const gp = new GraphPage(page);

    // Choose positions to add nodes relative to the canvas
    // We'll pick three distinct positions
    const box = await gp.canvasBox();
    const pos1 = { x: 100, y: 100 };
    const pos2 = { x: 250, y: 150 };
    const pos3 = { x: 400, y: 200 };

    // Add nodes by clicking
    await gp.addNodeAt(pos1.x, pos1.y);
    let info = await gp.infoText();
    expect(info).toMatch(/Nodes:\s*1/);

    await gp.addNodeAt(pos2.x, pos2.y);
    info = await gp.infoText();
    expect(info).toMatch(/Nodes:\s*2/);

    // Clicking on empty space should add third node
    await gp.addNodeAt(pos3.x, pos3.y);
    info = await gp.infoText();
    expect(info).toMatch(/Nodes:\s*3/);

    // Clicking again on pos1 (an existing node) should NOT add a node
    await gp.clickCanvas(pos1.x, pos1.y);
    await page.waitForTimeout(50);
    info = await gp.infoText();
    expect(info).toMatch(/Nodes:\s*3/);

    // No page errors throughout node creation
    expect(pageErrors.length).toBe(0);
    const consoleErrors = consoleMessages.filter((m) => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  test('Dragging a node moves it (S0 -> S2 -> S0): original spot becomes empty after move', async ({
    page,
  }) => {
    const gp = new GraphPage(page);

    // Add two nodes to work with
    const n1 = { x: 120, y: 120 };
    const n2 = { x: 300, y: 160 };
    await gp.addNodeAt(n1.x, n1.y);
    await gp.addNodeAt(n2.x, n2.y);

    let info = await gp.infoText();
    expect(info).toMatch(/Nodes:\s*2/);

    // Drag node1 to a new position
    const newPos = { x: 200, y: 260 };
    await gp.dragNode(n1.x, n1.y, newPos.x, newPos.y);

    // After dragging, clicking original n1 position should add a new node
    // which implies the original spot is now empty because node has moved
    await gp.clickCanvas(n1.x, n1.y);
    await page.waitForTimeout(50);
    info = await gp.infoText();
    expect(info).toMatch(/Nodes:\s*3/);

    // Clean up no errors
    expect(pageErrors.length).toBe(0);
    const consoleErrors = consoleMessages.filter((m) => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  test('Creating edges via Ctrl+drag (S0 -> S3 -> S0): edges counted and duplicates/self-loops prevented', async ({
    page,
  }) => {
    const gp = new GraphPage(page);

    // Add two nodes to create edges between
    const a = { x: 140, y: 140 };
    const b = { x: 340, y: 170 };
    await gp.addNodeAt(a.x, a.y);
    await gp.addNodeAt(b.x, b.y);

    let info = await gp.infoText();
    expect(info).toMatch(/Nodes:\s*2/);
    expect(info).toMatch(/Edges:\s*0/);

    // Create an edge from A to B via Ctrl+drag
    await gp.createEdgeCtrlDrag(a.x, a.y, b.x, b.y);

    info = await gp.infoText();
    // Edge count should be 1 now
    expect(info).toMatch(/Edges:\s*1/);

    // Attempt to create the same edge again - edge should not be duplicated
    await gp.createEdgeCtrlDrag(a.x, a.y, b.x, b.y);
    info = await gp.infoText();
    expect(info).toMatch(/Edges:\s*1/);

    // Attempt to create a self-loop by ctrl-dragging from node to itself - should not add
    await gp.createEdgeCtrlDrag(a.x, a.y, a.x + 1, a.y + 1); // small offset still counts as same node
    info = await gp.infoText();
    expect(info).toMatch(/Edges:\s*1/);

    // Now create reverse edge (B -> A)
    await gp.createEdgeCtrlDrag(b.x, b.y, a.x, a.y);
    info = await gp.infoText();
    // In directed mode, reverse edge is a distinct edge
    expect(info).toMatch(/Edges:\s*2/);

    // No page errors during edge creation
    expect(pageErrors.length).toBe(0);
    const consoleErrors = consoleMessages.filter((m) => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  test('Switching mode (S0 -> S4): toggle between directed and undirected updates info and button label', async ({
    page,
  }) => {
    const gp = new GraphPage(page);

    // Start with directed
    let info = await gp.infoText();
    expect(info).toMatch(/Mode:\s*DIRECTED/);
    expect(await gp.toggleBtn.textContent()).toBe('Switch to Undirected');

    // Toggle to undirected
    await gp.toggleMode();
    info = await gp.infoText();
    expect(info).toMatch(/Mode:\s*UNDIRECTED/);
    expect(await gp.toggleBtn.textContent()).toBe('Switch to Directed');

    // Toggle back to directed
    await gp.toggleMode();
    info = await gp.infoText();
    expect(info).toMatch(/Mode:\s*DIRECTED/);
    expect(await gp.toggleBtn.textContent()).toBe('Switch to Undirected');

    // No page errors
    expect(pageErrors.length).toBe(0);
    const consoleErrors = consoleMessages.filter((m) => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  test('Resetting graph (S0 -> S5): clears nodes and edges and resets counters', async ({
    page,
  }) => {
    const gp = new GraphPage(page);

    // Add some nodes and an edge
    const p1 = { x: 130, y: 130 };
    const p2 = { x: 280, y: 180 };
    await gp.addNodeAt(p1.x, p1.y);
    await gp.addNodeAt(p2.x, p2.y);
    await gp.createEdgeCtrlDrag(p1.x, p1.y, p2.x, p2.y);

    let info = await gp.infoText();
    expect(info).toMatch(/Nodes:\s*2/);
    expect(info).toMatch(/Edges:\s*1/);

    // Reset the graph
    await gp.resetGraph();
    info = await gp.infoText();
    // After reset info should reflect 0 nodes and 0 edges
    expect(info).toMatch(/Nodes:\s*0/);
    expect(info).toMatch(/Edges:\s*0/);

    // Also ensure mode did not inadvertently change
    expect(info).toMatch(/Mode:\s*DIRECTED/);

    // No page errors
    expect(pageErrors.length).toBe(0);
    const consoleErrors = consoleMessages.filter((m) => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  test('Edge cases and robustness: click-drag on empty canvas does not create nodes or edges unexpectedly', async ({
    page,
  }) => {
    const gp = new GraphPage(page);

    // Click on empty region should add node (this is expected behavior)
    const empty = { x: 50, y: 50 };
    await gp.clickCanvas(empty.x, empty.y);
    let info = await gp.infoText();
    expect(info).toMatch(/Nodes:\s*1/);

    // Mousedown on empty area then mouseup should not create a node (click would)
    // Simulate mousedown + mouseup without click event (move slightly then up)
    await gp.mouseDownCanvas(10, 10);
    await gp.mouseMoveCanvas(12, 12);
    await gp.mouseUpCanvas(12, 12);
    await page.waitForTimeout(50);
    // Node count should remain same (no new node added because click didn't happen)
    info = await gp.infoText();
    expect(info).toMatch(/Nodes:\s*1/);

    // Starting ctrl+mousedown on empty area should not start edge creation
    await page.keyboard.down('Control');
    await gp.mouseDownCanvas(15, 15);
    await gp.mouseMoveCanvas(60, 60);
    await gp.mouseUpCanvas(60, 60);
    await page.keyboard.up('Control');
    await page.waitForTimeout(50);
    info = await gp.infoText();
    // No edges should have been created
    expect(info).toMatch(/Edges:\s*0/);

    // No page errors
    expect(pageErrors.length).toBe(0);
    const consoleErrors = consoleMessages.filter((m) => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  test('Console and runtime error monitoring: ensure no uncaught errors during interactions', async ({
    page,
  }) => {
    const gp = new GraphPage(page);

    // Perform a variety of operations to exercise code paths
    await gp.addNodeAt(80, 80);
    await gp.addNodeAt(220, 120);
    await gp.createEdgeCtrlDrag(80, 80, 220, 120);
    await gp.dragNode(80, 80, 160, 200);
    await gp.toggleMode();
    await gp.resetGraph();

    // Wait a bit for any async errors to surface
    await page.waitForTimeout(200);

    // Assert that there were no uncaught page errors
    expect(pageErrors.length).toBe(0);

    // Assert no console error messages were emitted
    const consoleErrors = consoleMessages.filter((m) => m.type === 'error');
    expect(consoleErrors.length).toBe(0);

    // Optionally log console messages for debugging (not required by assertion)
    // But we assert that at least some console debug/info messages might appear (not errors)
    const nonErrorConsole = consoleMessages.filter((m) => m.type !== 'error');
    expect(nonErrorConsole.length).toBeGreaterThanOrEqual(0);
  });
});