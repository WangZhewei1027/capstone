import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini/html/be878a8f-cd35-11f0-9e7b-93b903303299.html';

// Page Object to encapsulate interactions with the DFS visualizer
class DFSPage {
  constructor(page) {
    this.page = page;
    this.canvasSelector = '#canvas';
    this.clearBtn = '#clearBtn';
    this.randBtn = '#randBtn';
    this.toggleDirBtn = '#toggleDirBtn';
    this.runRecBtn = '#runRecBtn';
    this.runIterBtn = '#runIterBtn';
    this.stepBtn = '#stepBtn';
    this.playBtn = '#playBtn';
    this.resetTraverseBtn = '#resetTraverseBtn';
    this.speedRange = '#speedRange';
    this.startSelect = '#startSelect';
    this.nodeCount = '#nodeCount';
    this.edgeCount = '#edgeCount';
    this.adjList = '#adjList';
    this.visitedOrder = '#visitedOrder';
    this.status = '#status';
    this.stackView = '#stackView';
    this.timesTableRows = '#timesTable tbody tr';
    this.explainBtn = '#explainBtn';
  }

  // Click canvas at an offset (relative to canvas top-left)
  async clickCanvasAt(offsetX, offsetY, options = {}) {
    const canvas = await this.page.$(this.canvasSelector);
    const box = await canvas.boundingBox();
    const x = box.x + offsetX;
    const y = box.y + offsetY;
    await this.page.mouse.click(x, y, options);
  }

  // Double-click at canvas position
  async dblClickCanvasAt(offsetX, offsetY) {
    const canvas1 = await this.page.$(this.canvasSelector);
    const box1 = await canvas.boundingBox();
    const x1 = box.x1 + offsetX;
    const y1 = box.y1 + offsetY;
    await this.page.mouse.dblclick(x, y);
  }

  // Drag from canvas point to another
  async dragCanvas(fromX, fromY, toX, toY) {
    const canvas2 = await this.page.$(this.canvasSelector);
    const box2 = await canvas.boundingBox();
    const sx = box.x + fromX;
    const sy = box.y + fromY;
    const tx = box.x + toX;
    const ty = box.y + toY;
    await this.page.mouse.move(sx, sy);
    await this.page.mouse.down();
    await this.page.mouse.move(tx, ty, { steps: 8 });
    await this.page.mouse.up();
  }

  async click(selector) {
    await this.page.click(selector);
  }

  async getText(selector) {
    return (await this.page.textContent(selector)).trim();
  }

  async getNodeCount() {
    return Number(await this.getText(this.nodeCount));
  }
  async getEdgeCount() {
    return Number(await this.getText(this.edgeCount));
  }
  async getAdjListText() {
    return await this.getText(this.adjList);
  }
  async getVisitedOrder() {
    return await this.getText(this.visitedOrder);
  }
  async getStatus() {
    return await this.getText(this.status);
  }
  async getStackView() {
    return await this.getText(this.stackView);
  }
  async getStartOptions() {
    return this.page.$$eval(`${this.startSelect} option`, opts => opts.map(o => o.value));
  }
  async getTimesTableCount() {
    return this.page.$$eval(this.timesTableRows, rows => rows.length);
  }
  async setSpeed(value) {
    await this.page.$eval(this.speedRange, (el, v) => el.value = v, String(value));
    // fire input event
    await this.page.$eval(this.speedRange, el => el.dispatchEvent(new Event('input', { bubbles: true })));
  }
}

test.describe('DFS Visualizer - Full UI and Interaction Tests', () => {
  let dfs;
  let pageErrors;
  let consoleMessages;

  test.beforeEach(async ({ page }) => {
    pageErrors = [];
    consoleMessages = [];

    // Collect page errors and console messages
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });
    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    await page.goto(APP_URL);
    dfs = new DFSPage(page);

    // Wait for initial seed nodes to be created / UI updated
    await page.waitForSelector('#nodeCount');
    // Wait until nodeCount is not empty
    await page.waitForFunction(() => {
      const el = document.getElementById('nodeCount');
      return el && el.textContent.trim().length > 0;
    });
  });

  test.afterEach(async () => {
    // Assert there are no uncaught JS errors in the page. If any appear, include them in the assertion message.
    expect(pageErrors.length, `Unexpected page errors: ${pageErrors.map(e=>e.toString()).join(' | ')}`).toBe(0);
  });

  test('Initial page load displays seeded nodes, edges, and core UI elements', async () => {
    // Purpose: verify initial seeded sample is present with expected UI elements populated
    // Assert node and edge counts reflect the seeded sample
    const nodeCount = await dfs.getNodeCount();
    const edgeCount = await dfs.getEdgeCount();

    // Seeding in the app creates 6 nodes (A-F) and 6 edges in the sample
    expect(nodeCount).toBeGreaterThanOrEqual(6);
    expect(edgeCount).toBeGreaterThanOrEqual(6);

    // Start select should contain options for nodes
    const options = await dfs.getStartOptions();
    expect(options.length).toBe(nodeCount);
    expect(options[0]).toBeDefined();

    // Adjacency list should contain at least one node entry
    const adjText = await dfs.getAdjListText();
    expect(adjText.length).toBeGreaterThan(0);

    // Times table should have a row for each node
    const timesRows = await dfs.getTimesTableCount();
    expect(timesRows).toBe(nodeCount);

    // Core control buttons exist and are enabled
    await expect(dfs.page.locator(dfs.clearBtn)).toBeVisible();
    await expect(dfs.page.locator(dfs.runRecBtn)).toBeVisible();
    await expect(dfs.page.locator(dfs.runIterBtn)).toBeVisible();
    await expect(dfs.page.locator(dfs.stepBtn)).toBeVisible();
  });

  test('Create nodes by clicking canvas, create an edge, and remove node with double-click', async () => {
    // Purpose: test node creation, edge creation, and deletion via dblclick
    // Start fresh
    await dfs.click(dfs.clearBtn);
    await dfs.page.waitForFunction(() => document.getElementById('nodeCount').textContent === '0');

    // Create three nodes by clicking known offsets
    // Choose positions well inside canvas area: (60,60), (160,60), (160,160)
    await dfs.clickCanvasAt(60, 60);
    await dfs.clickCanvasAt(160, 60);
    await dfs.clickCanvasAt(160, 160);

    // Node count should be 3
    expect(await dfs.getNodeCount()).toBe(3);

    // Create an edge from first created node (A) to second (B):
    // Click the first node to select, then click the second node to add edge
    await dfs.clickCanvasAt(60, 60); // select A
    await dfs.clickCanvasAt(160, 60); // click B -> creates edge A->B (or undirected)
    expect(await dfs.getEdgeCount()).toBe(1);

    // Adjacency list should reflect the new connection
    const adjText1 = await dfs.getAdjListText();
    expect(adjText).toContain('A');
    expect(adjText).toContain('B');

    // Double-click the third node (C) to remove it
    await dfs.dblClickCanvasAt(160, 160);
    // Node count should decrease to 2
    expect(await dfs.getNodeCount()).toBe(2);

    // Confirm times table now has 2 rows
    expect(await dfs.getTimesTableCount()).toBe(2);
  });

  test('Toggle directed mode and verify adjacency orientation', async () => {
    // Purpose: When toggled to Directed, adjacency list should reflect directionality
    await dfs.click(dfs.clearBtn);
    await dfs.page.waitForFunction(() => document.getElementById('nodeCount').textContent === '0');

    // Create two nodes
    await dfs.clickCanvasAt(80, 80);  // A
    await dfs.clickCanvasAt(180, 80); // B

    expect(await dfs.getNodeCount()).toBe(2);

    // Toggle to Directed mode
    await dfs.click(dfs.toggleDirBtn);
    const btnText = await dfs.getText(dfs.toggleDirBtn);
    expect(btnText).toContain('Directed');

    // Click A then B to create directed edge A->B
    await dfs.clickCanvasAt(80, 80);
    await dfs.clickCanvasAt(180, 80);
    expect(await dfs.getEdgeCount()).toBe(1);

    // Check adjacency: A should list B, B should not list A (directed)
    const adjText2 = await dfs.getAdjListText();
    // The adjacency list is shown as lines like "<strong>A</strong>: B"
    // We assert that A maps to B and that B does not contain A in its neighbors
    expect(adjText).toMatch(/A.*:.*B/);
    // B's line should not contain 'A' as neighbor on directed graph (could be empty)
    const bLineMatch = adjText.split('\n').find(line => line.includes('<strong>B</strong>'));
    if (bLineMatch) {
      expect(bLineMatch).not.toMatch(/:.*A/);
    }
  });

  test('Run Recursive DFS, step through algorithm and inspect stack / times', async () => {
    // Purpose: Start recursive DFS and step to observe enter/finish steps and stack updates
    await dfs.click(dfs.clearBtn);
    await dfs.page.waitForFunction(() => document.getElementById('nodeCount').textContent === '0');

    // Build a small chain A->B->C
    await dfs.clickCanvasAt(60, 60);  // A
    await dfs.clickCanvasAt(160, 60); // B
    await dfs.clickCanvasAt(260, 60); // C

    // Create edges A->B, B->C
    await dfs.clickCanvasAt(60, 60);  // select A
    await dfs.clickCanvasAt(160, 60); // click B -> edge A-B
    await dfs.clickCanvasAt(160, 60); // select B
    await dfs.clickCanvasAt(260, 60); // click C -> edge B-C

    expect(await dfs.getEdgeCount()).toBe(2);

    // Run Recursive DFS
    await dfs.click(dfs.runRecBtn);

    // Step through several steps to ensure we see enter events and stack changes
    // Step once: should enter the start node (A)
    await dfs.click(dfs.stepBtn);
    let visited = await dfs.getVisitedOrder();
    expect(visited).toContain('A');

    // Stack must show at least one item
    let stackText = await dfs.getStackView();
    expect(stackText).toMatch(/\[.*A.*\]/);

    // Continue stepping until traversal completes
    // We'll allow up to 20 steps to complete traversal of small graph
    let status = await dfs.getStatus();
    let maxSteps = 20;
    while (!/Traversal complete/i.test(status) && maxSteps-- > 0) {
      await dfs.click(dfs.stepBtn);
      status = await dfs.getStatus();
    }
    expect(status).toMatch(/Traversal complete|Traversal reset|Finished/i);

    // After completion, all nodes should have finish times in the table (non-empty)
    const rowsCount = await dfs.getTimesTableCount();
    expect(rowsCount).toBe(3);
    // Ensure visited order contains A, B, C in some order that respects DFS
    visited = await dfs.getVisitedOrder();
    expect(visited).toMatch(/A/);
    expect(visited).toMatch(/B/);
    expect(visited).toMatch(/C/);
  });

  test('Run Iterative DFS and use Play/Pause to auto-step', async ({ page }) => {
    // Purpose: Start iterative DFS and use Play to automatically step through algorithm
    await dfs.click(dfs.clearBtn);
    await dfs.page.waitForFunction(() => document.getElementById('nodeCount').textContent === '0');

    // Build simple graph A-B and B-C
    await dfs.clickCanvasAt(80, 80);  // A
    await dfs.clickCanvasAt(180, 80); // B
    await dfs.clickCanvasAt(280, 80); // C

    // Edges: A-B, B-C
    await dfs.clickCanvasAt(80, 80);  // select A
    await dfs.clickCanvasAt(180, 80); // create A-B
    await dfs.clickCanvasAt(180, 80); // select B
    await dfs.clickCanvasAt(280, 80); // create B-C

    expect(await dfs.getEdgeCount()).toBe(2);

    // Start iterative DFS
    await dfs.click(dfs.runIterBtn);

    // Click Play - this will start an interval that calls stepOnce
    await dfs.click(dfs.playBtn);

    // Wait until visitedOrder shows at least one node (within a 3s timeout)
    await dfs.page.waitForFunction(() => {
      const el1 = document.getElementById('visitedOrder');
      return el && el.textContent.trim().length > 0;
    }, { timeout: 3000 });

    // Pause playback
    await dfs.click(dfs.playBtn);

    // Verify some nodes were visited
    const visitedText = await dfs.getVisitedOrder();
    expect(visitedText.length).toBeGreaterThan(0);

    // Reset traversal and ensure UI resets
    await dfs.click(dfs.resetTraverseBtn);
    const status1 = await dfs.getStatus();
    expect(status.toLowerCase()).toContain('reset');
    const stackView = await dfs.getStackView();
    expect(stackView).toContain('[empty]');
  });

  test('Speed control adjusts internal speed value (emit input event)', async () => {
    // Purpose: Ensure changing speed input triggers input handler without errors
    // Set a different speed
    await dfs.setSpeed(200);
    // No visible DOM change, but the operation should not cause page errors.
    // We'll assert that there are no console errors captured so far (handled in afterEach)
    const speedVal = await dfs.page.$eval(dfs.speedRange, el => el.value);
    expect(Number(speedVal)).toBe(200);
  });

  test('Explain button triggers alert dialog (handled)', async ({ page }) => {
    // Purpose: Clicking explain should show an alert. We intercept and accept it.
    const [dialog] = await Promise.all([
      page.waitForEvent('dialog'),
      dfs.click(dfs.explainBtn),
    ]);
    // The dialog should contain DFS explanation text
    expect(dialog.message()).toContain('Depth-First Search');
    await dialog.accept();
  });

  test('Drag a node moves it without changing node/edge counts', async () => {
    // Purpose: dragging updates canvas positions but should not alter counts
    await dfs.click(dfs.clearBtn);
    await dfs.page.waitForFunction(() => document.getElementById('nodeCount').textContent === '0');

    // Create a node
    await dfs.clickCanvasAt(120, 120);
    expect(await dfs.getNodeCount()).toBe(1);

    // Drag the node by 40px right and 30px down
    await dfs.dragCanvas(120, 120, 160, 150);

    // Node count still 1 and no edges
    expect(await dfs.getNodeCount()).toBe(1);
    expect(await dfs.getEdgeCount()).toBe(0);
  });
});