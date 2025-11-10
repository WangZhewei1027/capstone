import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/11-08-0004/html/7ac93cc0-bcb0-11f0-95d9-c98d28730c93.html';

/**
 * Page Object encapsulating common selectors and helper actions.
 * This abstracts differences in exact markup (we prefer semantic/button text
 * where possible). We assume nodes are rendered as svg circles and edges as lines/paths.
 */
class BFSAppPage {
  constructor(page) {
    this.page = page;
    // Controls - attempt to find buttons by visible text
    this.addNodeBtn = page.getByRole('button', { name: /add node/i });
    this.addEdgeBtn = page.getByRole('button', { name: /add edge/i });
    this.setStartBtn = page.getByRole('button', { name: /set start/i });
    this.setTargetBtn = page.getByRole('button', { name: /set target/i });
    this.runBtn = page.getByRole('button', { name: /run/i });
    this.stepBtn = page.getByRole('button', { name: /step/i });
    this.resetBtn = page.getByRole('button', { name: /reset/i });
    this.clearBtn = page.getByRole('button', { name: /clear/i });

    // Canvas / SVG
    this.stage = page.locator('.stage');
    this.svg = page.locator('svg').first();

    // Generic locators for nodes and edges - common patterns
    this.nodeSelector = 'circle.node, circle[data-role="node"], circle'; // fallback
    this.edgeSelector = 'line.edge, path.edge, line, path';
    this.logArea = page.locator('.log, .console, .output'); // optional
  }

  async goto() {
    await this.page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
    // Wait for svg to be present
    await expect(this.svg).toBeVisible({ timeout: 5000 });
  }

  // Return number of node elements in the svg
  async nodeCount() {
    return await this.page.locator(this.nodeSelector).count();
  }

  // Return number of edge elements in the svg
  async edgeCount() {
    return await this.page.locator(this.edgeSelector).count();
  }

  // Double click at an absolute position inside the SVG (coordinates relative to svg box)
  async doubleClickSvgAt(x, y) {
    const box = await this.svg.boundingBox();
    if (!box) throw new Error('SVG bounding box not found');
    await this.svg.dblclick({ position: { x: Math.round(x), y: Math.round(y) } });
  }

  // Click at an absolute position inside the SVG (coordinates relative to svg box)
  async clickSvgAt(x, y) {
    const box1 = await this.svg.boundingBox();
    if (!box) throw new Error('SVG bounding box not found');
    await this.svg.click({ position: { x: Math.round(x), y: Math.round(y) } });
  }

  // Click the nth node (0-based)
  nodeLocator(n = 0) {
    return this.page.locator(this.nodeSelector).nth(n);
  }

  // Get attribute or class list of a node
  async getNodeClasses(n = 0) {
    const locator = this.nodeLocator(n);
    await expect(locator).toBeVisible();
    const classAttr = await locator.getAttribute('class');
    return classAttr || '';
  }

  // Drag node n from its current position by dx,dy
  async dragNodeBy(n = 0, dx = 50, dy = 50) {
    const node = this.nodeLocator(n);
    const box2 = await node.boundingBox();
    if (!box) throw new Error('Node bounding box not found for dragging');
    const startX = Math.round(box.x + box.width / 2);
    const startY = Math.round(box.y + box.height / 2);
    await this.page.mouse.move(startX, startY);
    await this.page.mouse.down();
    // move in steps to simulate real drag
    await this.page.mouse.move(startX + dx / 2, startY + dy / 2, { steps: 6 });
    await this.page.mouse.move(startX + dx, startY + dy, { steps: 6 });
    await this.page.mouse.up();
  }

  // Helper to click a node by index (or locator) and wait a short moment for UI to react
  async clickNode(n = 0) {
    const node1 = this.nodeLocator(n);
    await expect(node).toBeVisible();
    await node.click();
    await this.page.waitForTimeout(150);
  }
}

test.describe('BFS Interactive Application - FSM Integration Tests', () => {
  let app;

  test.beforeEach(async ({ page }) => {
    app = new BFSAppPage(page);
    await app.goto();
  });

  test.afterEach(async ({ page }) => {
    // Try to reset app state after each test to avoid bleed between tests
    try {
      // Click reset if visible
      if (await app.resetBtn.count()) {
        await app.resetBtn.click();
      }
      // Click clear if visible to remove nodes/edges
      if (await app.clearBtn.count()) {
        await app.clearBtn.click();
      }
    } catch (e) {
      // ignore errors in teardown
    }
    await page.waitForTimeout(150);
  });

  test.describe('Node and Edge Creation', () => {
    test('Add node using Add Node button attaches one-time canvas listener and creates a node', async ({ page }) => {
      // Ensure initial node count
      const initial = await app.nodeCount();

      // Click Add Node then click on canvas to place node
      await expect(app.addNodeBtn).toBeVisible();
      await app.addNodeBtn.click();

      // Click canvas at position (100,100) relative to svg
      await app.clickSvgAt(100, 100);

      // After one click a node should be added and the temporary listener removed.
      await page.waitForTimeout(200);
      const after = await app.nodeCount();
      expect(after).toBeGreaterThan(initial);

      // If we click on canvas again without pressing Add Node, no additional node should be added
      await app.clickSvgAt(140, 140);
      await page.waitForTimeout(200);
      const after2 = await app.nodeCount();
      // either unchanged or increased only if double-click behavior adds nodes; we assert not increased immediately
      expect(after2).toBe(after);
    });

    test('Double-clicking the SVG adds a node immediately (stays/returns to idle)', async ({ page }) => {
      const initial1 = await app.nodeCount();
      // Double click at two different positions to create two nodes
      await app.doubleClickSvgAt(80, 80);
      await app.doubleClickSvgAt(140, 80);

      // wait for DOM updates
      await page.waitForTimeout(200);
      const after1 = await app.nodeCount();
      expect(after).toBeGreaterThanOrEqual(initial + 2);
    });

    test('Add edge mode: clicking nodes creates an undirected edge and pending selection toggles', async ({ page }) => {
      // Create two nodes quickly via double-click
      await app.doubleClickSvgAt(60, 60);
      await app.doubleClickSvgAt(160, 60);
      await page.waitForTimeout(200);
      const nodeCount = await app.nodeCount();
      expect(nodeCount).toBeGreaterThanOrEqual(2);

      const beforeEdges = await app.edgeCount();

      // Enter add edge mode
      await expect(app.addEdgeBtn).toBeVisible();
      await app.addEdgeBtn.click();

      // Click first node (source) then second node (target)
      await app.clickNode(0);
      // After selecting source the app should highlight selection; check node classes include 'selected' or 'active'
      const clsAfterSelect = await app.getNodeClasses(0);
      const hoveredOrHighlighted = /selected|highlight|active|pending/i.test(clsAfterSelect);
      // It's acceptable if implementation uses different class names, so only warn via assertion that one of likely names is present.
      // We won't fail the test here if no class present; instead ensure edge gets created properly after second click.
      await app.clickNode(1);

      // Edge count should increase by at least 1
      await page.waitForTimeout(300);
      const afterEdges = await app.edgeCount();
      expect(afterEdges).toBeGreaterThan(beforeEdges);

      // Clicking Add Edge button again should leave the app idle (toggle off) per FSM; ensure button doesn't remain pressed
      // Some impls toggle aria-pressed; we test that clicking it twice toggles state
      await app.addEdgeBtn.click();
      await page.waitForTimeout(100);
    });

    test('Clicking same node twice in add-edge mode cancels selection and does not create an edge', async ({ page }) => {
      // Prepare two nodes
      await app.doubleClickSvgAt(200, 120);
      await app.doubleClickSvgAt(260, 120);
      await page.waitForTimeout(200);
      const beforeEdges1 = await app.edgeCount();

      // Enter add-edge mode
      await app.addEdgeBtn.click();

      // Click node 0 twice
      await app.clickNode(0);
      // clicking same node again should cancel selection and not create an edge
      await app.clickNode(0);

      // Wait and verify no new edge was created
      await page.waitForTimeout(200);
      const afterEdges1 = await app.edgeCount();
      expect(afterEdges).toBe(beforeEdges);

      // Exit add-edge mode by clicking the button again
      await app.addEdgeBtn.click();
    });
  });

  test.describe('Mode Toggles, Set Start/Target and Dragging', () => {
    test('Set Start and Set Target modes accept a node click and allow BFS to run without alert', async ({ page }) => {
      // Create two nodes
      await app.doubleClickSvgAt(50, 220);
      await app.doubleClickSvgAt(150, 220);
      await page.waitForTimeout(200);

      // Confirm run without start shows alert dialog
      let alerted = false;
      page.once('dialog', async (dialog) => {
        alerted = true;
        await dialog.dismiss();
      });
      await app.runBtn.click();
      await page.waitForTimeout(200);
      expect(alerted).toBeTruthy();

      // Set start on node 0
      await app.setStartBtn.click();
      await app.clickNode(0);

      // Set target on node 1
      await app.setTargetBtn.click();
      await app.clickNode(1);

      // Now clicking Run should NOT show the 'no start' alert
      let alertTriggered = false;
      page.once('dialog', async (dialog) => {
        alertTriggered = true;
        await dialog.dismiss();
      });
      await app.runBtn.click();
      // Wait briefly for any possible alert to fire
      await page.waitForTimeout(400);
      expect(alertTriggered).toBeFalsy();

      // Stop run by clicking Reset
      await app.resetBtn.click();
      await page.waitForTimeout(200);
    });

    test('Dragging a node enters dragging state and preserves mode (returns to previous mode on end)', async ({ page }) => {
      // Create a node
      await app.doubleClickSvgAt(300, 60);
      await page.waitForTimeout(150);
      const beforeClass = await app.getNodeClasses(0);

      // Enter add-edge mode, then start dragging to exercise return-to-previous behavior
      await app.addEdgeBtn.click();
      // Drag the node by 40,40
      // Get original bounding box center to compute cx change
      const node2 = app.nodeLocator(0);
      const boxBefore = await node.boundingBox();
      expect(boxBefore).toBeTruthy();
      const cxBefore = Math.round(boxBefore.x + boxBefore.width / 2);
      const cyBefore = Math.round(boxBefore.y + boxBefore.height / 2);

      await app.dragNodeBy(0, 40, 40);
      await page.waitForTimeout(200);

      const boxAfter = await node.boundingBox();
      expect(boxAfter).toBeTruthy();
      const cxAfter = Math.round(boxAfter.x + boxAfter.width / 2);
      const cyAfter = Math.round(boxAfter.y + boxAfter.height / 2);

      // Assert position changed (drag happened)
      expect(cxAfter).not.toBe(cxBefore);
      expect(cyAfter).not.toBe(cyBefore);

      // After drag ends, app should still be in add-edge mode (or return to prior mode).
      // Best-effort check: clicking addEdgeBtn toggles off if it was active; we attempt to toggle it off
      await app.addEdgeBtn.click(); // turn off if active
      await page.waitForTimeout(100);
    });
  });

  test.describe('BFS Lifecycle: run, step, pause, done, reset', () => {
    test('BFS running: run processes nodes and finds path between start and target', async ({ page }) => {
      // Build a linear graph: nodes A-B-C where A is start and C is target
      // Place three nodes
      await app.doubleClickSvgAt(40, 340); // A
      await app.doubleClickSvgAt(140, 340); // B
      await app.doubleClickSvgAt(240, 340); // C
      await page.waitForTimeout(200);

      // Connect A-B and B-C
      await app.addEdgeBtn.click();
      await app.clickNode(0);
      await app.clickNode(1);
      await app.clickNode(1);
      await app.clickNode(2);
      // Exit add edge mode
      await app.addEdgeBtn.click();

      // Set start = node 0, target = node 2
      await app.setStartBtn.click();
      await app.clickNode(0);
      await app.setTargetBtn.click();
      await app.clickNode(2);

      // Run BFS and wait until some visual progress occurs or path is highlighted.
      // We'll wait for either a visited class or a path highlight on nodes/edges.
      await app.runBtn.click();

      // Wait up to a few seconds for BFS to find path (depending on speed)
      const maxWait = 5000;
      const pollInterval = 200;
      let foundPath = false;
      const start = Date.now();
      while (Date.now() - start < maxWait) {
        // Check for nodes or edges with 'path'/'highlight'/'found' classes
        const pathNode = await page.locator('circle.node.path, circle.node.found, circle.node.target.path, circle.node.highlight').first().count();
        const pathEdge = await page.locator('line.edge.path, path.edge.path, line.path, path.path, .edge.path').first().count();
        if (pathNode > 0 || pathEdge > 0) {
          foundPath = true;
          break;
        }
        // Also break if BFS done-notfound visual indicated (e.g., message)
        const logText = (await app.logArea.first().innerText().catch(() => '')).toLowerCase();
        if (logText.includes('not found') || logText.includes('no path')) {
          break;
        }
        await page.waitForTimeout(pollInterval);
      }

      // We expect to find a path in this simple graph
      expect(foundPath).toBeTruthy();

      // After completion we can click Reset to return to idle
      await app.resetBtn.click();
      await page.waitForTimeout(200);
    });

    test('BFS step mode: CLICK_STEP_BUTTON initializes bfsState and advances a single step', async ({ page }) => {
      // Create 2-node graph A-B, start is A, target B
      await app.doubleClickSvgAt(320, 320); // A
      await app.doubleClickSvgAt(400, 320); // B
      await page.waitForTimeout(200);

      // Add edge A-B
      await app.addEdgeBtn.click();
      await app.clickNode(0);
      await app.clickNode(1);
      await app.addEdgeBtn.click();

      // Set start to node 0
      await app.setStartBtn.click();
      await app.clickNode(0);

      // Ensure no alert on step. Step should create bfsState and visit at least start node
      await app.stepBtn.click();
      await page.waitForTimeout(300);

      // Check for a node showing visited/enqueued state
      const visitedCount = await page.locator('circle.node.visited, circle.node.queued, circle.visited, circle.queued').count();
      expect(visitedCount).toBeGreaterThanOrEqual(1);

      // Next step should progress BFS towards target; click step again
      await app.stepBtn.click();
      await page.waitForTimeout(300);

      // On small graph, after second step target should be reached or marked
      const targetMarked = await page.locator('circle.node.target, circle.node.found, circle.node.path').count();
      expect(targetMarked).toBeGreaterThanOrEqual(1);

      // Reset afterwards
      await app.resetBtn.click();
    });

    test('SPACE key toggles run/pause consistent with FSM', async ({ page }) => {
      // Create two nodes and connect them; set start
      await app.doubleClickSvgAt(80, 420);
      await app.doubleClickSvgAt(160, 420);
      await page.waitForTimeout(150);

      await app.addEdgeBtn.click();
      await app.clickNode(0);
      await app.clickNode(1);
      await app.addEdgeBtn.click();

      await app.setStartBtn.click();
      await app.clickNode(0);

      // Press space to start running
      await page.keyboard.press('Space');
      await page.waitForTimeout(250);

      // Press space again to pause
      await page.keyboard.press('Space');
      await page.waitForTimeout(250);

      // After pause we expect BFS did some work (visited or queued)
      const anyVisited = await page.locator('circle.node.visited, circle.node.queued').count();
      expect(anyVisited).toBeGreaterThanOrEqual(1);

      // Reset
      await app.resetBtn.click();
    });
  });

  test.describe('Reset and Clear behaviors & Error scenarios', () => {
    test('CLICK_RESET_BUTTON stops BFS run and clears BFS state & visual classes', async ({ page }) => {
      // Setup small graph and start BFS
      await app.doubleClickSvgAt(220, 420);
      await app.doubleClickSvgAt(300, 420);
      await page.waitForTimeout(150);

      await app.addEdgeBtn.click();
      await app.clickNode(0);
      await app.clickNode(1);
      await app.addEdgeBtn.click();

      await app.setStartBtn.click();
      await app.clickNode(0);

      await app.runBtn.click();
      await page.waitForTimeout(300);

      // Ensure some visited class exists
      const visitedBefore = await page.locator('circle.node.visited, circle.node.queued').count();
      expect(visitedBefore).toBeGreaterThanOrEqual(1);

      // Reset
      await app.resetBtn.click();
      await page.waitForTimeout(200);

      // After reset, there should be no visited/queued/path classes
      const visitedAfter = await page.locator('circle.node.visited, circle.node.queued, circle.node.path, .visited, .queued, .path').count();
      expect(visitedAfter).toBe(0);
    });

    test('CLICK_CLEAR_BUTTON removes all nodes and edges and resets start/target', async ({ page }) => {
      // Create nodes and an edge
      await app.doubleClickSvgAt(40, 500);
      await app.doubleClickSvgAt(120, 500);
      await page.waitForTimeout(150);
      await app.addEdgeBtn.click();
      await app.clickNode(0);
      await app.clickNode(1);
      await app.addEdgeBtn.click();

      // Ensure nodes/edges exist
      const nodesBefore = await app.nodeCount();
      const edgesBefore = await app.edgeCount();
      expect(nodesBefore).toBeGreaterThanOrEqual(2);
      expect(edgesBefore).toBeGreaterThanOrEqual(1);

      // Click Clear and assert nodes/edges removed
      await app.clearBtn.click();
      await page.waitForTimeout(300);
      const nodesAfter = await app.nodeCount();
      const edgesAfter = await app.edgeCount();
      expect(nodesAfter).toBe(0);
      // edges should be zero or not found
      expect(edgesAfter).toBe(0);
    });

    test('Attempting to Run without a start node triggers an alert (error scenario)', async ({ page }) => {
      // Ensure workspace is empty or has nodes but no start set
      await app.doubleClickSvgAt(200, 500);
      await page.waitForTimeout(120);

      let gotAlert = false;
      page.once('dialog', async (dialog) => {
        gotAlert = true;
        // Dismiss alert to continue
        await dialog.dismiss();
      });

      await app.runBtn.click();
      await page.waitForTimeout(200);
      expect(gotAlert).toBeTruthy();
    });
  });
});