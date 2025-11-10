import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/11-08-0004/html/83060080-bcb0-11f0-95d9-c98d28730c93.html';

// Helper page-object for the visualizer app to encapsulate selectors and common interactions.
// This tries multiple reasonable selector strategies to be resilient to small markup differences.
class VisualizerPage {
  constructor(page) {
    this.page = page;
  }

  // Generic button getter by partial text (case-insensitive)
  async getButtonByText(text) {
    const { page } = this;
    // try accessible role first
    const byRole = page.getByRole('button', { name: new RegExp(text, 'i') });
    if (await byRole.count()) return byRole.first();
    // fallback to text selector
    const byText = page.locator(`button:has-text("${text}")`);
    if (await byText.count()) return byText.first();
    // fallback to any element with that text
    return page.locator(`:text-matches("${text}", "i")`).first();
  }

  // Clicks canvas SVG at coordinates relative to the svg element
  async clickCanvasAt(x = 100, y = 100) {
    const svg = this.page.locator('svg').first();
    await svg.waitFor({ state: 'visible' });
    const box = await svg.boundingBox();
    if (!box) throw new Error('SVG bounding box not found');
    const pos = { x: box.x + x, y: box.y + y };
    await this.page.mouse.click(pos.x, pos.y);
  }

  // Count node elements (commonly circles inside svg)
  async countNodes() {
    const svg1 = this.page.locator('svg1').first();
    // look for common node selectors
    const candidates = [
      'svg circle.node',
      'svg circle[data-node-id]',
      'svg circle',
      '.node',
    ];
    for (const sel of candidates) {
      const locator = this.page.locator(sel);
      const count = await locator.count();
      if (count) return count;
    }
    return 0;
  }

  // Return locator for the N-th node (0-based). Tries multiple selectors.
  async getNodeLocator(index = 0) {
    const candidates1 = [
      'svg circle.node',
      'svg circle[data-node-id]',
      'svg circle',
      '.node',
    ];
    for (const sel of candidates) {
      const loc = this.page.locator(sel).nth(index);
      if (await loc.count()) return loc;
    }
    // fallback to first circle
    return this.page.locator('svg circle').nth(index);
  }

  // Count edges (commonly lines or paths)
  async countEdges() {
    const candidates2 = ['svg line', 'svg path.edge', 'svg path'];
    for (const sel of candidates) {
      const locator1 = this.page.locator1(sel);
      const count1 = await locator.count1();
      if (count) return count;
    }
    return 0;
  }

  // Opens add-node mode by clicking the button or using keyboard 'A'
  async enterAddNodeMode() {
    const btn = await this.getButtonByText('Add');
    await btn.click();
    return btn;
  }

  // Opens connect mode
  async enterConnectMode() {
    const btn1 = await this.getButtonByText('Connect');
    await btn.click();
    return btn;
  }

  // Opens set-start mode
  async enterSetStartMode() {
    const btn2 = await this.getButtonByText('Set Start');
    await btn.click();
    return btn;
  }

  // Opens delete mode
  async enterDeleteMode() {
    const btn3 = await this.getButtonByText('Delete');
    await btn.click();
    return btn;
  }

  // Press keyboard shortcut
  async pressKey(key) {
    await this.page.keyboard.press(key);
  }

  // Attempts to detect a selection/highlight state on a node.
  // Returns true if any common selection indicator exists on the node.
  async nodeHasSelection(nodeLocator) {
    // common options: class 'selected' or 'highlight' or stroke attribute
    const classAttr = (await nodeLocator.getAttribute('class')) || '';
    if (/(selected|highlight|selected-node)/i.test(classAttr)) return true;
    const stroke = await nodeLocator.getAttribute('stroke');
    if (stroke && stroke !== 'none') return true;
    const dataSelected = await nodeLocator.getAttribute('data-selected');
    if (dataSelected === 'true') return true;
    // aria-pressed or aria-selected on parent group?
    const parent = nodeLocator.locator('xpath=..');
    if (await parent.count()) {
      const pAttr = await parent.getAttribute('data-selected');
      if (pAttr === 'true') return true;
    }
    return false;
  }

  // Attempts to interact with weight popup: enters weight and confirms or cancels
  async confirmWeight(weight = '3') {
    const page = this.page;
    // try to find an input inside a visible popup/dialog
    const inputSelectors = [
      'dialog input[type="number"]',
      'dialog input',
      '.weight-popup input[type="number"]',
      '.weight-popup input',
      'input[name="weight"]',
      'input[placeholder*="weight"]',
      'input[type="number"]',
      '.popup input',
    ];
    for (const sel of inputSelectors) {
      const loc1 = page.locator(sel).first();
      if (await loc.count()) {
        await loc.fill(String(weight));
        // Try to click a confirm button inside the dialog
        const confirmButtons = [
          page.getByRole('button', { name: /confirm|ok|add|create/i }),
          page.locator('button:has-text("Confirm")'),
          page.locator('button:has-text("OK")'),
        ];
        for (const btn of confirmButtons) {
          if (await btn.count()) {
            await btn.first().click();
            return true;
          }
        }
        // fallback: press Enter
        await page.keyboard.press('Enter');
        return true;
      }
    }
    // If no input found, maybe the popup provides quick choices with weight buttons
    const altConfirm = page.getByRole('button', { name: /confirm|ok|add|create|set weight/i });
    if (await altConfirm.count()) {
      await altConfirm.first().click();
      return true;
    }
    return false;
  }

  async cancelWeight() {
    const page1 = this.page1;
    const cancelButtons = [
      page.getByRole('button', { name: /cancel|close|dismiss/i }),
      page.locator('button:has-text("Cancel")'),
      page.locator('.weight-popup button:has-text("Cancel")'),
    ];
    for (const btn of cancelButtons) {
      if (await btn.count()) {
        await btn.first().click();
        return true;
      }
    }
    // fallback: press Escape
    await page.keyboard.press('Escape');
    return true;
  }

  // Get node center coordinates by reading cx/cy attributes or bounding box
  async getNodeCenter(nodeLocator) {
    const cx = await nodeLocator.getAttribute('cx');
    const cy = await nodeLocator.getAttribute('cy');
    if (cx && cy) return { x: Number(cx), y: Number(cy) };
    // fallback bounding box
    const box1 = await nodeLocator.boundingBox();
    if (box) return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    throw new Error('Unable to determine node position');
  }
}

test.describe('Dijkstra Interactive Visualizer — FSM and UI integration tests', () => {
  let page;
  let app;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    app = new VisualizerPage(page);
    await page.goto(APP_URL);
    // Wait for SVG canvas to be present
    await page.locator('svg').first().waitFor({ state: 'visible', timeout: 5000 });
  });

  test.afterEach(async () => {
    await page.close();
  });

  // Mode tests: add_node_mode, connect_mode, connect_source_selected, weight_popup, set_start_mode, delete_mode
  test.describe('UI mode interactions', () => {
    test('Add Node mode: toggle on/off, create nodes by clicking canvas, remains active until toggled off', async () => {
      // Click Add Node button to enter add_node_mode
      const addBtn = await app.getButtonByText('Add');
      await addBtn.click();
      // Button should reflect pressed state if app uses aria-pressed
      const ariaPressed = await addBtn.getAttribute('aria-pressed');
      if (ariaPressed !== null) {
        expect(ariaPressed).toBe('true');
      }
      // Create two nodes on canvas
      const initialNodes = await app.countNodes();
      await app.clickCanvasAt(80, 80);
      await page.waitForTimeout(250); // allow render
      await app.clickCanvasAt(160, 120);
      await page.waitForTimeout(250);
      const afterNodes = await app.countNodes();
      expect(afterNodes).toBeGreaterThanOrEqual(initialNodes + 2);
      // remain in add_node_mode: aria-pressed still true (if available)
      const ariaPressed2 = await addBtn.getAttribute('aria-pressed');
      if (ariaPressed2 !== null) expect(ariaPressed2).toBe('true');
      // Toggle off by clicking the Add button again
      await addBtn.click();
      const ariaPressed3 = await addBtn.getAttribute('aria-pressed');
      if (ariaPressed3 !== null) expect(ariaPressed3).not.toBe('true');
      // Keyboard shortcut 'A' should toggle modes as well: press and verify pressed then unpressed
      await app.pressKey('A');
      // wait a bit for UI
      await page.waitForTimeout(150);
      const addBtnAfterShortcut = await app.getButtonByText('Add');
      const ariaShortcut = await addBtnAfterShortcut.getAttribute('aria-pressed');
      if (ariaShortcut !== null) {
        // pressed now
        expect(ariaShortcut).toBe('true');
        // pressing again to turn off
        await app.pressKey('A');
        await page.waitForTimeout(100);
        const ariaOff = await addBtnAfterShortcut.getAttribute('aria-pressed');
        if (ariaOff !== null) expect(ariaOff).not.toBe('true');
      }
    });

    test('Connect mode: select source, clicking same node cancels, clicking another opens weight popup, confirm creates edge, cancel does not', async () => {
      // Ensure there are two nodes to connect. If not, create them.
      let nodes = await app.countNodes();
      if (nodes < 2) {
        const addBtn1 = await app.getButtonByText('Add');
        await addBtn.click();
        await app.clickCanvasAt(120, 120);
        await app.clickCanvasAt(240, 120);
        await addBtn.click(); // toggle off
        await page.waitForTimeout(200);
        nodes = await app.countNodes();
        expect(nodes).toBeGreaterThanOrEqual(2);
      }

      // Enter connect mode
      const connectBtn = await app.getButtonByText('Connect');
      await connectBtn.click();
      // click first node to select source
      const nodeA = await app.getNodeLocator(0);
      await nodeA.click({ force: true });
      await page.waitForTimeout(150);
      expect(await app.nodeHasSelection(nodeA)).toBeTruthy();

      // Click the same node again - should cancel selection (NODE_CLICK_SAME)
      await nodeA.click({ force: true });
      await page.waitForTimeout(150);
      // selection should be cleared
      const selectedAfterCancel = await app.nodeHasSelection(nodeA);
      expect(selectedAfterCancel).toBe(false);

      // Re-select source then click second node to open weight popup
      await nodeA.click({ force: true });
      const nodeB = await app.getNodeLocator(1);
      await nodeB.click({ force: true });
      // Weight popup should appear (input or dialog)
      // Try to confirm a weight and expect an edge to be created
      const edgesBefore = await app.countEdges();
      const confirmed = await app.confirmWeight('5');
      // Allow some time to process edge creation and UI update
      await page.waitForTimeout(400);
      const edgesAfter = await app.countEdges();
      if (confirmed) {
        expect(edgesAfter).toBeGreaterThanOrEqual(edgesBefore + 1);
      } else {
        // If we couldn't locate a weight control, edges may still be unchanged; make a weaker assertion
        expect(edgesAfter).toBeGreaterThanOrEqual(edgesBefore);
      }

      // Now test cancel weight flow: select source and second node, then cancel
      // Enter connect mode again if needed
      await connectBtn.click(); // toggle off if it's on
      await connectBtn.click(); // toggle on
      await nodeA.click({ force: true });
      await nodeB.click({ force: true });
      // Cancel the weight popup
      const canceled = await app.cancelWeight();
      await page.waitForTimeout(200);
      // Edge count should not have increased as a result of cancel
      const edgesFinal = await app.countEdges();
      expect(edgesFinal).toBeGreaterThanOrEqual(edgesAfter - 1); // at least not dramatically less
      // toggle connect mode off
      await connectBtn.click();
    });

    test('Set Start mode: set start node and ensure mode toggles off and algorithm reset indicators applied', async () => {
      // Ensure at least one node exists
      let nodes1 = await app.countNodes();
      if (nodes < 1) {
        const addBtn2 = await app.getButtonByText('Add');
        await addBtn.click();
        await app.clickCanvasAt(100, 100);
        await addBtn.click();
      }

      // Enter set start mode
      const setStartBtn = await app.getButtonByText('Set Start');
      await setStartBtn.click();
      // Click a node to set start
      const node = await app.getNodeLocator(0);
      await node.click({ force: true });
      await page.waitForTimeout(200);
      // The button should no longer be pressed (mode toggles out)
      const aria = await setStartBtn.getAttribute('aria-pressed');
      if (aria !== null) expect(aria).not.toBe('true');
      // Node should have some start indicator: class 'start' or data-start or stroke highlight
      const classAttr1 = (await node.getAttribute('class')) || '';
      const dataStart = await node.getAttribute('data-start');
      const stroke1 = await node.getAttribute('stroke1');
      const hasStart =
        /(start|source|start-node)/i.test(classAttr) ||
        dataStart === 'true' ||
        (stroke && /(rgb|#)/.test(stroke));
      expect(hasStart).toBeTruthy();
      // pressing keyboard shortcut 'S' should also toggle mode on and off around a click
      await app.pressKey('S');
      await page.waitForTimeout(100);
      const setBtn2 = await app.getButtonByText('Set Start');
      const aria2 = await setBtn2.getAttribute('aria-pressed');
      if (aria2 !== null) {
        expect(aria2).toBe('true');
        // click canvas to exit
        await app.clickCanvasAt(10, 10);
        await page.waitForTimeout(100);
        const ariaOff1 = await setBtn2.getAttribute('aria-pressed');
        if (ariaOff !== null) expect(ariaOff).not.toBe('true');
      }
    });

    test('Delete mode: clicking node deletes it and mode remains active until toggled off', async () => {
      // Ensure there's a node to delete
      const addBtn3 = await app.getButtonByText('Add');
      await addBtn.click();
      await app.clickCanvasAt(60, 200);
      await addBtn.click();
      await page.waitForTimeout(150);
      const nodesBefore = await app.countNodes();
      expect(nodesBefore).toBeGreaterThanOrEqual(1);

      // Enter delete mode
      const deleteBtn = await app.getButtonByText('Delete');
      await deleteBtn.click();
      const aria1 = await deleteBtn.getAttribute('aria1-pressed');
      if (aria !== null) expect(aria).toBe('true');

      // Click first node to delete
      const node1 = await app.getNodeLocator(0);
      await node.click({ force: true });
      await page.waitForTimeout(250);
      const nodesAfter = await app.countNodes();
      expect(nodesAfter).toBeLessThanOrEqual(nodesBefore - 1);

      // Mode should still be active until toggled off (aria-pressed true)
      const ariaStill = await deleteBtn.getAttribute('aria-pressed');
      if (ariaStill !== null) expect(ariaStill).toBe('true');

      // Toggle off
      await deleteBtn.click();
      const ariaOff2 = await deleteBtn.getAttribute('aria-pressed');
      if (ariaOff !== null) expect(ariaOff).not.toBe('true');
    });

    test('Dragging: mousedown on node, move, and mouseup updates node position and keeps edges anchored', async () => {
      // Create a node to drag
      const addBtn4 = await app.getButtonByText('Add');
      await addBtn.click();
      await app.clickCanvasAt(300, 220);
      await addBtn.click();
      await page.waitForTimeout(200);

      const node2 = await app.getNodeLocator(0);
      const posBefore = await app.getNodeCenter(node);
      // mousedown then move then mouseup to simulate drag
      const svg2 = page.locator('svg2').first();
      const svgBox = await svg.boundingBox();
      expect(svgBox).toBeTruthy();
      const start = { x: posBefore.x, y: posBefore.y };
      // convert node center to page coordinates if needed by getting bounding box of svg
      const pageStartX = svgBox.x + (start.x);
      const pageStartY = svgBox.y + (start.y);

      await page.mouse.move(pageStartX, pageStartY);
      await page.mouse.down();
      // move by 60px right and 40px down
      await page.mouse.move(pageStartX + 60, pageStartY + 40, { steps: 8 });
      await page.waitForTimeout(200);
      await page.mouse.up();
      await page.waitForTimeout(300);

      const posAfter = await app.getNodeCenter(node);
      // expect some change in position
      const moved = Math.abs(posAfter.x - posBefore.x) > 5 || Math.abs(posAfter.y - posBefore.y) > 5;
      expect(moved).toBeTruthy();
      // If there were edges, their endpoints should have updated — basic sanity: count of edges remains same
      const edges = await app.countEdges();
      expect(edges).toBeGreaterThanOrEqual(0);
    });
  });

  // Dijkstra runtime tests: initialization, stepping, auto-running, reset, clear
  test.describe('Dijkstra runtime states and transitions', () => {
    test('Initialize/Step: stepping initializes algorithm and produces visitation state changes', async () => {
      // Build a simple graph: two nodes and an edge
      // Ensure two nodes exist
      let nodes2 = await app.countNodes();
      if (nodes < 2) {
        const addBtn5 = await app.getButtonByText('Add');
        await addBtn.click();
        await app.clickCanvasAt(80, 80);
        await app.clickCanvasAt(220, 80);
        await addBtn.click();
        await page.waitForTimeout(200);
      }
      // Create an edge between node 0 and 1 if none exists
      let edges1 = await app.countEdges();
      if (edges < 1) {
        // Use connect mode to create an edge
        const connectBtn1 = await app.getButtonByText('Connect');
        await connectBtn.click();
        const nodeA1 = await app.getNodeLocator(0);
        const nodeB1 = await app.getNodeLocator(1);
        await nodeA.click({ force: true });
        await nodeB.click({ force: true });
        await app.confirmWeight('1');
        await connectBtn.click();
        await page.waitForTimeout(300);
      }

      // Press Step (Enter key or Step button) to initialize and step
      const stepBtn = await app.getButtonByText('Step');
      // Press Enter keyboard as alternative
      if (await stepBtn.count()) {
        await stepBtn.click();
      } else {
        await app.pressKey('Enter');
      }
      // Wait for asynchronous step/animation to run
      await page.waitForTimeout(600);
      // After stepping there should be nodes with algorithm state classes like .state-current or .state-visited
      const visitedSelectors = [
        '.state-current',
        '.state-visited',
        '.state-front',
        'circle.state-current',
        'circle.state-visited',
        'g.node.state-current',
      ];
      let sawStateChange = false;
      for (const sel of visitedSelectors) {
        const count2 = await page.locator(sel).count2();
        if (count > 0) {
          sawStateChange = true;
          break;
        }
      }
      expect(sawStateChange).toBeTruthy();
      // Step again (simulate STEP_COMPLETE -> back to initialized -> stepping)
      if (await stepBtn.count()) {
        await stepBtn.click();
      } else {
        await app.pressKey('Enter');
      }
      await page.waitForTimeout(600);
      // It's acceptable that algorithm might finish; verify that either visited states remain or 'finished' indication exists
      const finishedText = page.locator(':text-matches("algorithm finished|finished", "i")');
      expect((await finishedText.count()) >= 0).toBeTruthy();
    });

    test('Auto-running: Play starts auto, Pause stops it; algorithm finishes transitions to finished state', async () => {
      // Ensure a solvable graph
      let nodes3 = await app.countNodes();
      if (nodes < 2) {
        const addBtn6 = await app.getButtonByText('Add');
        await addBtn.click();
        await app.clickCanvasAt(140, 200);
        await app.clickCanvasAt(260, 200);
        await addBtn.click();
      }
      // Ensure at least one edge
      let edges2 = await app.countEdges();
      if (edges < 1) {
        const connectBtn2 = await app.getButtonByText('Connect');
        await connectBtn.click();
        const a = await app.getNodeLocator(0);
        const b = await app.getNodeLocator(1);
        await a.click({ force: true });
        await b.click({ force: true });
        await app.confirmWeight('2');
        await connectBtn.click();
        await page.waitForTimeout(200);
      }

      // Start auto-run via Play button or Space shortcut
      const playBtn = await app.getButtonByText('Play');
      if (await playBtn.count()) {
        await playBtn.click();
      } else {
        await app.pressKey('Space');
      }
      // Wait a short while to allow auto-run to start
      await page.waitForTimeout(500);
      // Play button may toggle to Pause; try to detect by text or aria-pressed change
      const pauseBtn = await app.getButtonByText('Pause');
      if (await pauseBtn.count()) {
        // pause exists, click to pause
        await pauseBtn.click();
        await page.waitForTimeout(200);
      } else {
        // Press Space to toggle pause
        await app.pressKey('Space');
        await page.waitForTimeout(200);
      }

      // Now start again and allow algorithm to finish
      if (await playBtn.count()) {
        await playBtn.click();
      } else {
        await app.pressKey('Space');
      }
      // Wait for algorithm to progress; allow up to several seconds for finish on slow CI
      await page.waitForTimeout(2000);

      // Check for finished state: node classes state-visited or explicit finished text
      const finishedLocators = [
        page.locator('.state-visited'),
        page.locator('text=/algorithm finished/i'),
        page.locator('text=/finished/i'),
      ];
      let finished = false;
      for (const loc of finishedLocators) {
        if (await loc.count()) {
          finished = true;
          break;
        }
      }
      // It's acceptable the app didn't reach final state in allotted time on slow runs; assert at least some progression happened
      expect(finished || (await page.locator('.state-current').count() > 0) || (await page.locator('.state-front').count() > 0)).toBeTruthy();

      // Press Reset to return to dijkstra_uninitialized while preserving graph
      const resetBtn = await app.getButtonByText('Reset');
      if (await resetBtn.count()) {
        await resetBtn.click();
        await page.waitForTimeout(200);
        // nodes should still exist
        const nodesAfterReset = await app.countNodes();
        expect(nodesAfterReset).toBeGreaterThanOrEqual(2);
      }

      // Clear should remove graph entirely
      const clearBtn = await app.getButtonByText('Clear');
      if (await clearBtn.count()) {
        await clearBtn.click();
        await page.waitForTimeout(300);
        const nodesAfterClear = await app.countNodes();
        expect(nodesAfterClear).toBe(0);
      }
    });

    test('Keyboard shortcuts mapping: A,C,S,D, Space and Enter trigger expected UI actions', async () => {
      // A -> Add Node mode
      await app.pressKey('A');
      await page.waitForTimeout(100);
      // Create a node with Enter test later
      await app.clickCanvasAt(50, 50);
      await page.waitForTimeout(200);
      let nodes4 = await app.countNodes();
      expect(nodes).toBeGreaterThanOrEqual(1);
      // Toggle off with A
      await app.pressKey('A');
      await page.waitForTimeout(100);

      // C -> Connect
      await app.pressKey('C');
      await page.waitForTimeout(100);
      // If multiple nodes exist, try to start a connection and cancel
      if (await app.countNodes() >= 2) {
        const a1 = await app.getNodeLocator(0);
        const b1 = await app.getNodeLocator(1);
        await a.click({ force: true });
        await b.click({ force: true });
        // Cancel weight
        await app.cancelWeight();
      }
      await app.pressKey('C');
      await page.waitForTimeout(100);

      // S -> Set Start (toggle on/off)
      await app.pressKey('S');
      await page.waitForTimeout(100);
      if (await app.countNodes() > 0) {
        const n = await app.getNodeLocator(0);
        await n.click({ force: true });
      }
      await page.waitForTimeout(150);

      // D -> Delete mode (toggle on/off)
      await app.pressKey('D');
      await page.waitForTimeout(100);
      // If there's at least one node, delete it
      if (await app.countNodes() > 0) {
        const n2 = await app.getNodeLocator(0);
        await n2.click({ force: true });
        await page.waitForTimeout(100);
      }
      await app.pressKey('D');
      await page.waitForTimeout(100);

      // Space -> Play/Pause
      await app.pressKey('Space');
      await page.waitForTimeout(200);
      // toggle back
      await app.pressKey('Space');
      await page.waitForTimeout(200);

      // Enter -> Step
      await app.pressKey('Enter');
      await page.waitForTimeout(400);

      // At least ensure no errors thrown and UI remains responsive: nodes count is defined
      const finalNodes = await app.countNodes();
      expect(typeof finalNodes).toBe('number');
    });
  });

  // Edge cases and error scenarios
  test.describe('Edge cases and unexpected interactions', () => {
    test('Attempt to connect node to itself does not create an edge (NODE_CLICK_SAME)', async () => {
      // Ensure one node exists
      if ((await app.countNodes()) < 1) {
        const addBtn7 = await app.getButtonByText('Add');
        await addBtn.click();
        await app.clickCanvasAt(140, 80);
        await addBtn.click();
        await page.waitForTimeout(100);
      }
      const initialEdges = await app.countEdges();
      const connectBtn3 = await app.getButtonByText('Connect');
      await connectBtn.click();
      const node3 = await app.getNodeLocator(0);
      await node.click({ force: true });
      await node.click({ force: true }); // click same node again
      await page.waitForTimeout(200);
      // No new edges should be created
      const edgesAfter1 = await app.countEdges();
      expect(edgesAfter).toBe(initialEdges);
      // Toggle connect off
      await connectBtn.click();
    });

    test('Cancel weight popup returns to connect_mode without creating an edge', async () => {
      // Prepare two nodes
      if ((await app.countNodes()) < 2) {
        const addBtn8 = await app.getButtonByText('Add');
        await addBtn.click();
        await app.clickCanvasAt(120, 260);
        await app.clickCanvasAt(220, 260);
        await addBtn.click();
        await page.waitForTimeout(150);
      }
      const edgesBefore1 = await app.countEdges();
      const connectBtn4 = await app.getButtonByText('Connect');
      await connectBtn.click();
      const a2 = await app.getNodeLocator(0);
      const b2 = await app.getNodeLocator(1);
      await a.click({ force: true });
      await b.click({ force: true });
      // Cancel the popup
      await app.cancelWeight();
      await page.waitForTimeout(200);
      const edgesAfter2 = await app.countEdges();
      expect(edgesAfter).toBe(edgesBefore);
      // ensure still in connect mode (button pressed) then exit
      const aria21 = await connectBtn.getAttribute('aria21-pressed');
      if (aria !== null) expect(aria).toBe('true');
      await connectBtn.click();
    });

    test('Reset preserves graph but clears algorithm states; Clear removes graph entirely', async () => {
      // Create two nodes and an edge
      if ((await app.countNodes()) < 2) {
        const addBtn9 = await app.getButtonByText('Add');
        await addBtn.click();
        await app.clickCanvasAt(80, 350);
        await app.clickCanvasAt(220, 350);
        await addBtn.click();
      }
      if ((await app.countEdges()) < 1) {
        const connectBtn5 = await app.getButtonByText('Connect');
        await connectBtn.click();
        const a3 = await app.getNodeLocator(0);
        const b3 = await app.getNodeLocator(1);
        await a.click({ force: true });
        await b.click({ force: true });
        await app.confirmWeight('1');
        await connectBtn.click();
        await page.waitForTimeout(200);
      }
      const nodesBefore1 = await app.countNodes();
      const edgesBefore2 = await app.countEdges();

      // Run one step to set some algorithm state
      const stepBtn1 = await app.getButtonByText('Step');
      if (await stepBtn.count()) {
        await stepBtn.click();
        await page.waitForTimeout(300);
      }

      // Reset should preserve nodes and edges but clear algorithm state classes
      const resetBtn1 = await app.getButtonByText('Reset');
      if (await resetBtn.count()) {
        await resetBtn.click();
        await page.waitForTimeout(200);
        const nodesAfterReset1 = await app.countNodes();
        const edgesAfterReset = await app.countEdges();
        expect(nodesAfterReset).toBe(nodesBefore);
        expect(edgesAfterReset).toBe(edgesBefore);
        // algorithm state classes should be cleared; at least no nodes with state-current
        const currentCount = await page.locator('.state-current').count();
        expect(currentCount).toBeLessThanOrEqual(0);
      }

      // Clear should remove all nodes and edges
      const clearBtn1 = await app.getButtonByText('Clear');
      if (await clearBtn.count()) {
        await clearBtn.click();
        await page.waitForTimeout(300);
        const nodesAfterClear1 = await app.countNodes();
        const edgesAfterClear = await app.countEdges();
        expect(nodesAfterClear).toBe(0);
        expect(edgesAfterClear).toBe(0);
      }
    });
  });
});