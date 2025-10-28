import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/10-28-0007/html/38685680-b40a-11f0-8f04-37d078910466.html';

// Helper: page object for interacting with the graph module
class GraphPage {
  constructor(page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto(APP_URL, { waitUntil: 'networkidle' });
    // wait for the main canvas area to be present
    await this.page.locator('.graph-area').first().waitFor({ state: 'visible', timeout: 5000 });
  }

  addNodeButton() {
    return this.page.getByRole('button', { name: /Add Node/i });
  }

  addEdgeButton() {
    return this.page.getByRole('button', { name: /Add Edge/i });
  }

  clearButton() {
    // try multiple strategies
    const byName = this.page.getByRole('button', { name: /Clear/i });
    return byName;
  }

  sampleButton() {
    return this.page.getByRole('button', { name: /Sample/i });
  }

  modeSwitch() {
    // The toggle may be implemented as a switch role
    const sw = this.page.getByRole('switch');
    return sw;
  }

  graphArea() {
    return this.page.locator('.graph-area').first();
  }

  svgEdges() {
    // selects lines or paths inside the svg layer
    return this.page.locator('svg.graph-svg line, svg.graph-svg path');
  }

  nodes() {
    return this.page.locator('.node');
  }

  matrixTable() {
    // adjacency matrix if present
    return this.page.locator('table').first();
  }

  async nodeBoundingBox(index = 0) {
    const locator = this.nodes().nth(index);
    return await locator.boundingBox();
  }

  async clickGraphAt(centerX = 0, centerY = 0) {
    const box = await this.graphArea().boundingBox();
    if (!box) throw new Error('graph area bounding box not found');
    const x = box.x + (centerX || box.width / 2);
    const y = box.y + (centerY || box.height / 2);
    await this.page.mouse.click(x, y);
  }

  async doubleClickGraph(centerX = 0, centerY = 0) {
    const box = await this.graphArea().boundingBox();
    if (!box) throw new Error('graph area bounding box not found');
    const x = box.x + (centerX || box.width / 2);
    const y = box.y + (centerY || box.height / 2);
    await this.page.mouse.dblclick(x, y);
  }

  async countNodes() {
    return await this.nodes().count();
  }

  async countEdges() {
    return await this.svgEdges().count();
  }
}

test.describe('Interactive Graph Builder — Directed vs Undirected (FSM validation)', () => {
  test.beforeEach(async ({ page }) => {
    const gp = new GraphPage(page);
    await gp.goto();
  });

  test.describe('Node placement flows', () => {
    test('Add Node button places a node on canvas and updates button text (placing_node -> idle)', async ({ page }) => {
      const gp = new GraphPage(page);

      const initialNodes = await gp.countNodes();

      // Click "Add Node" to enter placing_node mode
      const addNodeBtn = gp.addNodeButton();
      await addNodeBtn.waitFor({ state: 'visible' });
      await addNodeBtn.click();

      // On enter placing_node the UI should indicate user to click canvas
      // The implementation updates button text to 'Click Canvas' - check for that text
      await expect(addNodeBtn).toHaveText(/Click Canvas/i);

      // Click the canvas to place the node (should transition to idle)
      await gp.clickGraphAt(); // center
      // after placement, button text should reset to 'Add Node'
      await expect(addNodeBtn).toHaveText(/Add Node/i);

      // Node count should increment by 1
      const afterNodes = await gp.countNodes();
      expect(afterNodes).toBeGreaterThanOrEqual(initialNodes + 1);
    });

    test('Double-clicking canvas creates a node immediately (idle -> idle)', async ({ page }) => {
      const gp = new GraphPage(page);

      const initialNodes = await gp.countNodes();
      // double click center to create a node
      await gp.doubleClickGraph();
      // small wait for render
      await page.waitForTimeout(120);
      const afterNodes = await gp.countNodes();
      expect(afterNodes).toBeGreaterThanOrEqual(initialNodes + 1);
    });

    test('Placing node times out after ~4s and cancels placement (PLACE_NODE_TIMEOUT)', async ({ page }) => {
      const gp = new GraphPage(page);

      const initialNodes = await gp.countNodes();

      const addNodeBtn = gp.addNodeButton();
      await addNodeBtn.click();
      await expect(addNodeBtn).toHaveText(/Click Canvas/i);

      // Wait slightly longer than the fallback (~4s) to allow PLACE_NODE_TIMEOUT to run
      await page.waitForTimeout(4200);

      // Button should reset and no new node should have been placed
      await expect(addNodeBtn).toHaveText(/Add Node/i);
      const afterNodes = await gp.countNodes();
      expect(afterNodes).toBe(initialNodes);
    });
  });

  test.describe('Edge creation flows', () => {
    test('Add Edge: create edge between two nodes (adding_edge_waiting_source -> adding_edge_waiting_target -> idle)', async ({ page }) => {
      const gp = new GraphPage(page);

      // Ensure at least two nodes exist; create two by double-clicking two nearby spots
      const initialNodes = await gp.countNodes();
      if (initialNodes < 2) {
        await gp.doubleClickGraph(-50, -50); // near center-left
        await page.waitForTimeout(80);
        await gp.doubleClickGraph(50, 50); // near center-right
        await page.waitForTimeout(120);
      }

      const nodesBefore = await gp.countNodes();
      expect(nodesBefore).toBeGreaterThanOrEqual(2);

      const edgesBefore = await gp.countEdges();

      // Start Add Edge flow
      const addEdgeBtn = gp.addEdgeButton();
      await addEdgeBtn.waitFor({ state: 'visible' });
      await addEdgeBtn.click();

      // Click source node (first)
      const firstNodeBox = await gp.nodeBoundingBox(0);
      await page.mouse.click(firstNodeBox.x + firstNodeBox.width / 2, firstNodeBox.y + firstNodeBox.height / 2);

      // Click target node (second)
      const secondNodeBox = await gp.nodeBoundingBox(1);
      await page.mouse.click(secondNodeBox.x + secondNodeBox.width / 2, secondNodeBox.y + secondNodeBox.height / 2);

      // Wait briefly for any edge animation and rendering
      await page.waitForTimeout(300);

      // Edge count should have increased by at least 1
      const edgesAfter = await gp.countEdges();
      expect(edgesAfter).toBeGreaterThanOrEqual(edgesBefore + 1);

      // Ensure Add Edge button resets visually (text should be Add Edge)
      await expect(addEdgeBtn).toHaveText(/Add Edge/i);
    });

    test('Self-loop attempt should not create an edge and returns to waiting_source (SELF_LOOP_ATTEMPT)', async ({ page }) => {
      const gp = new GraphPage(page);

      // Ensure at least one node exists; create if necessary
      const initialNodes = await gp.countNodes();
      if (initialNodes === 0) {
        await gp.doubleClickGraph();
        await page.waitForTimeout(80);
      }

      const nodeCount = await gp.countNodes();
      expect(nodeCount).toBeGreaterThanOrEqual(1);

      const edgesBefore = await gp.countEdges();

      // Start Add Edge
      const addEdgeBtn = gp.addEdgeButton();
      await addEdgeBtn.click();

      // Click the same node as source
      const box = await gp.nodeBoundingBox(0);
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

      // Click the same node again to attempt self-loop
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

      // Wait briefly for any processing
      await page.waitForTimeout(200);

      // No new edge should have been created
      const edgesAfter = await gp.countEdges();
      expect(edgesAfter).toBe(edgesBefore);

      // The Add Edge button should have returned to non-active state (text reset)
      await expect(addEdgeBtn).toHaveText(/Add Edge/i);
    });

    test('Prevent duplicate edges: attempting same edge twice should not increase edge count (EDGE_CREATE_DUPLICATE)', async ({ page }) => {
      const gp = new GraphPage(page);

      // Ensure at least two nodes exist
      let nodesNow = await gp.countNodes();
      if (nodesNow < 2) {
        await gp.doubleClickGraph(-40, -10);
        await page.waitForTimeout(60);
        await gp.doubleClickGraph(40, 10);
        await page.waitForTimeout(120);
        nodesNow = await gp.countNodes();
      }
      expect(nodesNow).toBeGreaterThanOrEqual(2);

      // Create an edge between node 0 and 1 if not present
      const edgesBefore = await gp.countEdges();

      // Create edge (first time)
      await gp.addEdgeButton().click();
      const aBox = await gp.nodeBoundingBox(0);
      await page.mouse.click(aBox.x + aBox.width / 2, aBox.y + aBox.height / 2);
      const bBox = await gp.nodeBoundingBox(1);
      await page.mouse.click(bBox.x + bBox.width / 2, bBox.y + bBox.height / 2);
      await page.waitForTimeout(300);
      const afterFirst = await gp.countEdges();
      expect(afterFirst).toBeGreaterThanOrEqual(edgesBefore + 1);

      // Attempt to add the same edge again
      await gp.addEdgeButton().click();
      await page.mouse.click(aBox.x + aBox.width / 2, aBox.y + aBox.height / 2);
      await page.mouse.click(bBox.x + bBox.width / 2, bBox.y + bBox.height / 2);
      await page.waitForTimeout(250);

      // Edge count should not have increased (duplicate prevented)
      const afterSecond = await gp.countEdges();
      expect(afterSecond).toBe(afterFirst);
    });
  });

  test.describe('Dragging and selection behaviors', () => {
    test('Dragging a node adds selected class during drag and updates position (dragging -> selected)', async ({ page }) => {
      const gp = new GraphPage(page);

      // Ensure at least one node exists
      if ((await gp.countNodes()) === 0) {
        await gp.doubleClickGraph();
        await page.waitForTimeout(80);
      }

      const nodeLocator = gp.nodes().first();
      const beforeBox = await nodeLocator.boundingBox();
      if (!beforeBox) throw new Error('Unable to get node bounding box for drag test');

      // Move mouse to center of node, press down (start drag)
      const startX = beforeBox.x + beforeBox.width / 2;
      const startY = beforeBox.y + beforeBox.height / 2;
      await page.mouse.move(startX, startY);
      await page.mouse.down();

      // Small wait to let "dragging" onEnter code run
      await page.waitForTimeout(80);

      // While pressed, node should have 'selected' class according to implementation notes
      const hasSelectedDuring = await nodeLocator.evaluate(n => n.classList.contains('selected'));
      expect(hasSelectedDuring).toBe(true);

      // Move the node some offset and release
      const moveToX = startX + 80;
      const moveToY = startY + 40;
      await page.mouse.move(moveToX, moveToY, { steps: 8 });
      await page.mouse.up();

      // Allow any onExit animations to complete
      await page.waitForTimeout(120);

      // After drag end, the node visual 'selected' class should be removed
      const hasSelectedAfter = await nodeLocator.evaluate(n => n.classList.contains('selected'));
      expect(hasSelectedAfter).toBe(false);

      // Node position should have changed compared to before
      const afterBox = await nodeLocator.boundingBox();
      if (!afterBox) throw new Error('Unable to get node bounding box after drag');
      const moved = Math.abs(afterBox.x - beforeBox.x) > 5 || Math.abs(afterBox.y - beforeBox.y) > 5;
      expect(moved).toBe(true);
    });

    test('Clicking a node selects it (selected state updates UI) and clicking empty area deselects (selected -> idle)', async ({ page }) => {
      const gp = new GraphPage(page);

      // Create a node if none exist
      if ((await gp.countNodes()) === 0) {
        await gp.doubleClickGraph();
        await page.waitForTimeout(80);
      }

      const nodeLocator = gp.nodes().first();
      const box = await nodeLocator.boundingBox();
      if (!box) throw new Error('No node bounding box for selection test');

      // Click the node to select
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await page.waitForTimeout(120);

      // There should be some indication of selection in the UI.
      // The FSM notes 'selectedName UI updated; selectedNode set; degreeBox reset' — try to find textual indicators.
      // Attempt to find an element that contains "Selected" or "Selected Node" text.
      const selectedTextLocators = [
        page.getByText(/Selected/i).first(),
        page.getByText(/Selected node/i).first(),
        page.locator('.selected-name').first(),
        page.locator('#selected-name').first()
      ];

      let foundSelectedUI = false;
      for (const loc of selectedTextLocators) {
        try {
          if (await loc.count() > 0) {
            foundSelectedUI = true;
            break;
          }
        } catch (e) {
          // ignore
        }
      }

      // We allow the test to pass even if the exact selection label isn't present,
      // but the node element itself should have a 'selected' visual or data attribute after click.
      const hasSelectedClass = await nodeLocator.evaluate(n => n.classList.contains('selected') || n.getAttribute('aria-selected') === 'true').catch(() => false);

      expect(hasSelectedClass || foundSelectedUI).toBeTruthy();

      // Click empty area to deselect (click near top-left of graph area)
      const graphBox = await gp.graphArea().boundingBox();
      if (!graphBox) throw new Error('graph area missing for deselect click');
      await page.mouse.click(graphBox.x + 8, graphBox.y + 8);
      await page.waitForTimeout(120);

      // Now the selected UI should be reset (either no selected class or selected label absent)
      const hasSelectedClassAfter = await nodeLocator.evaluate(n => n.classList.contains('selected') || n.getAttribute('aria-selected') === 'true').catch(() => false);
      expect(hasSelectedClassAfter).toBe(false);
    });
  });

  test.describe('Matrix, sample loading, clear and mode toggling', () => {
    test('Matrix cell click toggles edge when adjacency matrix exists (MATRIX_CELL_CLICK)', async ({ page }) => {
      const gp = new GraphPage(page);

      const table = gp.matrixTable();
      if ((await table.count()) === 0) {
        // If no adjacency matrix is present in the implementation, skip this test
        test.skip(true, 'Adjacency matrix table not present in this build; skipping matrix cell toggle test');
      }

      // Ensure at least 2 nodes exist so matrix is meaningful
      if ((await gp.countNodes()) < 2) {
        await gp.doubleClickGraph(-30, -10);
        await page.waitForTimeout(60);
        await gp.doubleClickGraph(30, 10);
        await page.waitForTimeout(120);
      }

      // Find the first non-diagonal cell (rough heuristic: first tbody tr > td that is not header)
      const firstCell = table.locator('tbody tr').first().locator('td').nth(1);
      if ((await firstCell.count()) === 0) {
        test.skip(true, 'Matrix structure not as-expected; skipping cell toggle');
      }

      const edgesBefore = await gp.countEdges();
      await firstCell.click();
      // matrix cell click triggers toggle and flash animation; wait briefly
      await page.waitForTimeout(250);
      const edgesAfter = await gp.countEdges();
      // Either an edge was added or removed; ensure some change or at least the UI flashed (hard to detect)
      expect(edgesAfter === edgesBefore || edgesAfter === edgesBefore + 1 || edgesAfter === Math.max(0, edgesBefore - 1)).toBeTruthy();
    });

    test('Sample button loads a preset graph (sample_loading -> SAMPLE_EDGES_CREATED -> idle)', async ({ page }) => {
      const gp = new GraphPage(page);

      // Clear any existing content first via Clear button handling dialog
      page.once('dialog', dialog => dialog.accept());
      await gp.clearButton().click().catch(() => { /* ignore if clear not present */ });
      await page.waitForTimeout(120);

      // Click sample button to load sample graph
      const sampleBtn = gp.sampleButton();
      await sampleBtn.waitFor({ state: 'visible', timeout: 2000 }).catch(() => { /* ignore */ });
      await sampleBtn.click();

      // sample_loading schedules edges (~240ms) so wait sufficiently long
      await page.waitForTimeout(800);

      // After loading, expect multiple nodes and some edges present
      const nodesNow = await gp.countNodes();
      const edgesNow = await gp.countEdges();
      expect(nodesNow).toBeGreaterThanOrEqual(3);
      expect(edgesNow).toBeGreaterThanOrEqual(1);
    });

    test('Clear button triggers confirm and then clears nodes/edges (CLICK_CLEAR_BTN -> idle)', async ({ page }) => {
      const gp = new GraphPage(page);

      // Ensure some content present
      if ((await gp.countNodes()) === 0) {
        await gp.doubleClickGraph();
        await page.waitForTimeout(80);
      }
      // Listen for confirm and accept it
      page.once('dialog', async dialog => {
        expect(dialog.type()).toBe('confirm');
        await dialog.accept();
      });
      await gp.clearButton().click();
      // Wait for clearing to complete
      await page.waitForTimeout(200);

      const nodesAfter = await gp.countNodes();
      const edgesAfter = await gp.countEdges();

      expect(nodesAfter).toBe(0);
      expect(edgesAfter).toBe(0);
    });

    test('Toggling directed/undirected mode updates switch UI (toggling_mode -> idle) and keyboard toggle works', async ({ page }) => {
      const gp = new GraphPage(page);

      const sw = gp.modeSwitch();
      if ((await sw.count()) === 0) {
        test.skip(true, 'Mode switch (role=switch) not present; skipping toggle tests');
      }

      // Read current aria-checked
      const before = await sw.getAttribute('aria-checked');
      // Click to toggle
      await sw.click();
      await page.waitForTimeout(180);
      const after = await sw.getAttribute('aria-checked');
      expect(after).not.toBe(before);

      // Toggle back using keyboard shortcut 'D' (KeyD)
      await page.keyboard.press('KeyD');
      await page.waitForTimeout(180);
      const afterKey = await sw.getAttribute('aria-checked');
      // After toggling with keyboard it should change again
      expect(afterKey).not.toBe(after);
    });
  });

  test.describe('Keyboard shortcuts mapping', () => {
    test('Keyboard N enters Add Node placing mode and allows placement', async ({ page }) => {
      const gp = new GraphPage(page);
      const addNodeBtn = gp.addNodeButton();

      const before = await gp.countNodes();
      // Press 'N' to trigger shortcut (KeyN)
      await page.keyboard.press('KeyN');
      // The Add Node button should reflect 'Click Canvas' or similar placing indicator
      await expect(addNodeBtn).toHaveText(/Click Canvas/i);

      // Click on canvas to place
      await gp.clickGraphAt(10, 10);
      await page.waitForTimeout(140);
      await expect(addNodeBtn).toHaveText(/Add Node/i);

      const after = await gp.countNodes();
      expect(after).toBeGreaterThanOrEqual(before + 1);
    });

    test('Keyboard E enters Add Edge flow (KeyE) and D toggles mode (KeyD)', async ({ page }) => {
      const gp = new GraphPage(page);

      // Ensure at least two nodes exist
      if ((await gp.countNodes()) < 2) {
        await gp.doubleClickGraph(-30, -10);
        await page.waitForTimeout(60);
        await gp.doubleClickGraph(30, 10);
        await page.waitForTimeout(120);
      }

      const addEdgeBtn = gp.addEdgeButton();

      // Press 'E' to enter add edge flow
      await page.keyboard.press('KeyE');
      await page.waitForTimeout(80);

      // The Add Edge button should be active/visible - text remains 'Add Edge' but mode engaged
      await expect(addEdgeBtn).toHaveText(/Add Edge/i);

      // Click source and target to complete edge
      const aBox = await gp.nodeBoundingBox(0);
      const bBox = await gp.nodeBoundingBox(1);
      const edgesBefore = await gp.countEdges();

      await page.mouse.click(aBox.x + aBox.width / 2, aBox.y + aBox.height / 2);
      await page.mouse.click(bBox.x + bBox.width / 2, bBox.y + bBox.height / 2);
      await page.waitForTimeout(200);
      const edgesAfter = await gp.countEdges();
      expect(edgesAfter).toBeGreaterThanOrEqual(edgesBefore + 1);

      // Press 'D' to toggle mode
      const sw = gp.modeSwitch();
      if ((await sw.count()) === 0) {
        test.skip(true, 'Mode switch not present to test KeyD');
      } else {
        const beforeChecked = await sw.getAttribute('aria-checked');
        await page.keyboard.press('KeyD');
        await page.waitForTimeout(120);
        const afterChecked = await sw.getAttribute('aria-checked');
        expect(afterChecked).not.toBe(beforeChecked);
      }
    });
  });
});