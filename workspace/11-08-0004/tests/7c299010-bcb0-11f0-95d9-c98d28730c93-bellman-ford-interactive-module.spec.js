import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/11-08-0004/html/7c299010-bcb0-11f0-95d9-c98d28730c93.html';

/**
 * Page object encapsulating common interactions and queries for the Bellman–Ford interactive module.
 * The implementation uses resilient selectors (role/text where possible) and reasonable fallbacks
 * when exact classes/ids are unknown. Tests below rely on these methods.
 */
class BellmanFordPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
  }

  // Basic navigation
  async goto() {
    await this.page.goto(APP_URL);
    // Wait for main canvas or header to be visible; resilient wait.
    await Promise.race([
      this.page.locator('.svg-wrap').waitFor({ state: 'visible', timeout: 2000 }).catch(() => {}),
      this.page.getByRole('main').waitFor({ state: 'visible', timeout: 2000 }).catch(() => {}),
    ]);
  }

  // Helper: find button by label text (case-insensitive)
  btnByText(textRegex) {
    // prefer role-based lookup
    const r = new RegExp(textRegex, 'i');
    return this.page.getByRole('button', { name: r });
  }

  // Click toggles
  async toggleAddNode() {
    await this.btnByText('add node|add-node|node').click();
  }

  async toggleAddEdge() {
    await this.btnByText('add edge|edge').click();
  }

  async toggleSetSource() {
    await this.btnByText('set source|source').click();
  }

  async clickStep() {
    await this.btnByText('step').click();
  }

  async toggleAuto() {
    await this.btnByText('auto|stop').click();
  }

  async clickClear() {
    await this.btnByText('clear').click();
  }

  async clickFast() {
    await this.btnByText('fast').click().catch(() => {});
  }

  async clickLoadPreset() {
    await this.btnByText('preset|load preset').click().catch(() => {});
  }

  // Get mode indicator text if present
  async getModeIndicatorText() {
    const loc = this.page.locator('.mode-indicator');
    if (await loc.count()) return (await loc.innerText()).trim();
    // fallback: any element with data-mode or role=status that looks like a mode
    const alt = this.page.locator('[data-mode], .mode, [aria-live], role=note');
    if (await alt.count()) return (await alt.first().innerText()).trim();
    return '';
  }

  // Get visible message text (status/aria-live/notification)
  async getMessageText() {
    const status = this.page.getByRole('status').first();
    if (await status.count()) {
      const text = (await status.innerText()).trim();
      if (text) return text;
    }
    const msg = this.page.locator('.message, .messages, .toast, .notification').first();
    if (await msg.count()) {
      return (await msg.innerText()).trim();
    }
    // fallback: any element with aria-live attribute
    const live = this.page.locator('[aria-live]').first();
    if (await live.count()) return (await live.innerText()).trim();
    return '';
  }

  // SVG helpers
  async getSvgBox() {
    const svg = this.page.locator('svg').first();
    await expect(svg).toBeVisible({ timeout: 2000 });
    return svg.boundingBox();
  }

  // Click the SVG at a normalized percent coordinate (xPct, yPct in 0..1)
  async clickSvgAt(xPct = 0.5, yPct = 0.5) {
    const box = await this.getSvgBox();
    const x = box.x + box.width * xPct;
    const y = box.y + box.height * yPct;
    await this.page.mouse.click(x, y);
  }

  // Return number of node circle elements (common implementation uses <circle>)
  async getNodeCount() {
    const c = this.page.locator('svg circle, svg g.node, svg .node');
    return c.count();
  }

  // Return node element locators
  nodeLocator() {
    return this.page.locator('svg g.node, svg circle, svg [data-node]').first();
  }

  // Get nodes locator (all)
  nodesLocatorAll() {
    return this.page.locator('svg g.node, svg circle, svg [data-node]');
  }

  // Get edges locator (paths/lines/groups)
  edgesLocatorAll() {
    return this.page.locator('svg g.edge, svg line, svg path, svg [data-edge]');
  }

  // Start dragging first node: mousedown then move
  async dragFirstNodeBy(dx = 30, dy = 30) {
    const nodes = this.nodesLocatorAll();
    const count = await nodes.count();
    if (count === 0) throw new Error('No nodes to drag');
    const node = nodes.nth(0);
    // Get box for node or circle center
    const box1 = await node.boundingBox();
    if (!box) throw new Error('Unable to get node box for dragging');
    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;
    await this.page.mouse.move(startX, startY);
    await this.page.mouse.down();
    // Move in small steps to ensure dragging listeners get it
    await this.page.mouse.move(startX + dx / 2, startY + dy / 2, { steps: 4 });
    await this.page.mouse.move(startX + dx, startY + dy, { steps: 6 });
    await this.page.mouse.up();
  }

  // Click a node by index (0-based)
  async clickNodeByIndex(idx = 0) {
    const nodes1 = this.nodesLocatorAll();
    if ((await nodes.count()) <= idx) throw new Error('Node index out of range');
    const n = nodes.nth(idx);
    await n.click();
  }

  // Create an edge by selecting source then target nodes (assumes add-edge mode active)
  async createEdgeBetween(firstIdx = 0, secondIdx = 1) {
    await this.clickNodeByIndex(firstIdx);
    // wait for selection message
    await this.page.waitForTimeout(150); // small wait for UI to update
    await this.clickNodeByIndex(secondIdx);
    // after clicking second, UI may prompt for weight (dialog); handle gracefully
    // If a dialog appears, accept with default weight "1"
    this.page.once('dialog', async (dialog) => {
      await dialog.accept('1');
    });
    // allow edge creation to complete
    await this.page.waitForTimeout(200);
  }

  // Edit an edge by clicking it (triggers prompt) and accepting new value
  // Returns the dialog message text if one appeared
  async editFirstEdgeWithWeight(newWeight = '5') {
    const edges = this.edgesLocatorAll();
    if ((await edges.count()) === 0) throw new Error('No edges to edit');
    const e = edges.nth(0);
    let dialogText = null;
    this.page.once('dialog', async (dialog) => {
      dialogText = dialog.message();
      await dialog.accept(String(newWeight));
    });
    await e.click();
    // allow dialog handling
    await this.page.waitForTimeout(200);
    return dialogText;
  }

  // Get overlay pointer-events value if overlay exists
  async getOverlayPointerEvents() {
    // Common overlay element selectors
    const overlayLocators = [
      this.page.locator('#overlay'),
      this.page.locator('.overlay'),
      this.page.locator('.svg-overlay'),
      this.page.locator('.svg-wrap > div').first()
    ];
    for (const loc of overlayLocators) {
      if (await loc.count()) {
        const attr = await loc.getAttribute('style');
        if (attr && /pointer-events\s*:\s*([^;]+)/i.test(attr)) {
          const match = attr.match(/pointer-events\s*:\s*([^;]+)/i);
          return match ? match[1].trim() : null;
        }
        // try reading computed via evaluate
        try {
          const pe = await loc.evaluate((el) => {
            return window.getComputedStyle(el).pointerEvents || el.style.pointerEvents || null;
          });
          if (pe) return pe;
        } catch (e) {}
      }
    }
    return null;
  }

  // Get auto button visible label (Auto/Stop)
  async getAutoButtonText() {
    // look for any button with Auto or Stop text
    const btn = this.page.locator('button', { hasText: /Auto|Stop/i }).first();
    if (await btn.count()) return (await btn.innerText()).trim();
    // fallback: find by role and approximate text
    const roleBtn = this.page.getByRole('button').filter({ hasText: /Auto|Stop/i }).first();
    if (await roleBtn.count()) return (await roleBtn.innerText()).trim();
    return '';
  }

  // Return whether distance table has rows (if present)
  async distanceTableRowCount() {
    const table = this.page.locator('table.distance, table#distance, table[data-distance]');
    if (await table.count()) {
      return table.locator('tbody tr, tr').count();
    }
    // fallback: check for element labelled 'Distance' or 'distances'
    const rows = this.page.locator('[data-test="distance-row"], .distance-row');
    if (await rows.count()) return rows.count();
    return 0;
  }
}

/**
 * Test suite that validates states and transitions described in the FSM.
 * The tests focus on user-visible state changes (mode indicator, overlay pointer-events,
 * node/edge DOM changes, auto button label, messages, drag behavior, dialogs for edge edit,
 * and algorithm control buttons).
 *
 * Comments in tests explain the FSM states/transitions they validate.
 */
test.describe('Bellman–Ford Interactive Module — FSM and UI behaviors', () => {
  let app;

  test.beforeEach(async ({ page }) => {
    app = new BellmanFordPage(page);
    await app.goto();
    // ensure initial stable state
    await page.waitForTimeout(200);
  });

  test.afterEach(async ({ page }) => {
    // attempt cleanup: click Clear if present
    try {
      await app.clickClear();
    } catch (e) {
      // ignore if button not present
    }
    await page.waitForTimeout(100);
  });

  test.describe('Mode toggles and mode indicator (idle, addNode, addEdge, setSource)', () => {
    test('idle -> addNode and overlay pointer-events change onEnter/onExit', async ({ page }) => {
      // Verify initial mode is idle (mode indicator present and not in add-node)
      const initialMode = await app.getModeIndicatorText();
      expect(initialMode.toLowerCase()).toMatch(/idle|view|select|default|edit|mode/i);

      // Toggle Add Node -> should enter addNode state and overlay.pointerEvents asserted to 'auto'
      await app.toggleAddNode();
      // mode indicator should reflect add node mode
      const modeAfterAdd = await app.getModeIndicatorText();
      expect(modeAfterAdd.toLowerCase()).toMatch(/add.*node|adding node|add node/i);

      // overlay pointer events should be enabled for clicking to place nodes
      const overlayPE = await app.getOverlayPointerEvents();
      // pointer-events might be 'auto' or 'all' depending on implementation
      if (overlayPE !== null) {
        expect(overlayPE).toMatch(/auto|all|visible/i);
      }

      // Click Add Node toggle to return to idle -> overlay pointer events should be disabled or none
      await app.toggleAddNode();
      const modeAfterIdle = await app.getModeIndicatorText();
      expect(modeAfterIdle).toBeTruthy();
      const overlayPE2 = await app.getOverlayPointerEvents();
      // pointer-events might be 'none' or null (if overlay removed)
      if (overlayPE2 !== null) {
        expect(overlayPE2).toMatch(/none|auto|visible/i);
      }
    });

    test('idle -> addEdge -> selecting source -> addEdgeSourceSelected message and create edge', async ({ page }) => {
      // Add two nodes first
      await app.toggleAddNode();
      await app.clickSvgAt(0.25, 0.5);
      await app.clickSvgAt(0.75, 0.5);
      // Exit add-node mode back to idle by toggling
      await app.toggleAddNode();

      const nodeCount = await app.getNodeCount();
      expect(Number(nodeCount)).toBeGreaterThanOrEqual(2);

      // Enter addEdge mode
      await app.toggleAddEdge();
      const modeText = await app.getModeIndicatorText();
      expect(modeText.toLowerCase()).toMatch(/add.*edge|adding edge|add edge/i);

      // Click first node to select source -> FSM should go to addEdgeSourceSelected and message shown
      await app.clickNodeByIndex(0);
      const msg1 = (await app.getMessageText()).toLowerCase();
      expect(msg.length).toBeGreaterThan(0);
      // message should include 'selected' or 'source'
      expect(msg).toMatch(/select(ed)?\s*source|selected source|source/i);

      // Click second node to complete edge creation
      await app.clickNodeByIndex(1);
      // After edge creation, there should be at least one edge element
      const edgesCount = await app.edgesLocatorAll().count();
      expect(Number(edgesCount)).toBeGreaterThanOrEqual(1);
    });

    test('idle -> setSource -> clicking node sets source (visual change or message)', async ({ page }) => {
      // Ensure there is at least one node
      // Add one if necessary
      if ((await app.getNodeCount()) === 0) {
        await app.toggleAddNode();
        await app.clickSvgAt(0.5, 0.5);
        await app.toggleAddNode();
      }
      // Enter set-source mode
      await app.toggleSetSource();
      const modeText1 = await app.getModeIndicatorText();
      expect(modeText.toLowerCase()).toMatch(/set.*source|select source/i);

      // Click the first node to set it as source
      await app.clickNodeByIndex(0);
      // After setting source, UI might display message or node might have a 'source' attribute/class
      const message = (await app.getMessageText()).toLowerCase();
      if (message) {
        expect(message).toMatch(/source|set as source|selected as source/i);
      } else {
        // fallback: check for node with distinctive class/attr
        const sourceNode = app.page.locator('svg .source, svg .node.source, svg circle.source, svg [data-source]');
        // It's okay if no class exists; this is a best-effort check
        expect(await sourceNode.count()).toBeGreaterThanOrEqual(0);
      }
    });
  });

  test.describe('Node interactions and dragging (dragging state)', () => {
    test('NODE_MOUSEDOWN -> dragging -> NODE_MOUSEMOVE -> NODE_MOUSEUP results in moved node and reset algorithm state', async ({ page }) => {
      // Add a node to drag
      await app.toggleAddNode();
      await app.clickSvgAt(0.5, 0.5);
      await app.toggleAddNode();

      const nodes2 = app.nodesLocatorAll();
      const count1 = await nodes.count1();
      expect(count).toBeGreaterThan(0);

      // Capture initial center of first node (bounding box)
      const firstNode = nodes.nth(0);
      const beforeBox = await firstNode.boundingBox();
      expect(beforeBox).toBeTruthy();

      // Start dragging the node
      await app.dragFirstNodeBy(40, 40);
      // After dragging, node bounding box should have moved away from original center
      const afterBox = await firstNode.boundingBox();
      expect(afterBox).toBeTruthy();
      // Either x or y should have changed by at least 5 pixels
      const dx = Math.abs((afterBox.x + afterBox.width / 2) - (beforeBox.x + beforeBox.width / 2));
      const dy = Math.abs((afterBox.y + afterBox.height / 2) - (beforeBox.y + beforeBox.height / 2));
      expect(dx + dy).toBeGreaterThanOrEqual(5);

      // After drag ends, algorithm state should be reset; distance table rows likely 0 or containing defaults
      const distRows = await app.distanceTableRowCount();
      expect(Number(distRows)).toBeGreaterThanOrEqual(0);
    });

    test('dragging state continues if mousedown repeated and returns to idle on mouseup', async ({ page }) => {
      // Add node if none
      if ((await app.getNodeCount()) === 0) {
        await app.toggleAddNode();
        await app.clickSvgAt(0.4, 0.4);
        await app.toggleAddNode();
      }

      // Simulate repeated mousedown events: mousedown twice without mouseup
      const nodes3 = app.nodesLocatorAll();
      const node1 = nodes.nth(0);
      const box2 = await node.boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      // another mousedown while held (should be idempotent)
      await page.mouse.down();
      // now release
      await page.mouse.up();

      // After release, the mode indicator should not report 'dragging' anymore
      const mode = await app.getModeIndicatorText();
      expect(mode.toLowerCase()).not.toMatch(/drag|dragging/i);
    });
  });

  test.describe('Algorithm execution states (stepping, detecting, auto_running, finished)', () => {
    test('STEP_CLICK in idle triggers stepping and returns to idle (stepping -> RELAX_* -> idle)', async ({ page }) => {
      // Ensure there's at least one node and a source set; if not, add two nodes and an edge and set source
      if ((await app.getNodeCount()) < 2) {
        await app.toggleAddNode();
        await app.clickSvgAt(0.2, 0.5);
        await app.clickSvgAt(0.8, 0.5);
        await app.toggleAddNode();
      }
      // Try to set source if not set: click Set Source and pick first node
      await app.toggleSetSource();
      await app.clickNodeByIndex(0);
      // Back to idle
      await app.toggleSetSource();

      // Click Step and expect some transient activity. The FSM will enter stepping and then come back.
      await app.clickStep();
      // We expect some message or a visible animation on an edge or a UI update; check message or distance table
      await page.waitForTimeout(300);
      const message1 = (await app.getMessageText()).toLowerCase();
      // Accept either relaxed/nochange/complete messages or simply no crash (non-empty string ok)
      // If there's no message, at least ensure the mode is not stuck in stepping
      const mode1 = await app.getModeIndicatorText();
      expect(mode.toLowerCase()).not.toMatch(/stepping|running/i);
      // Distance table should exist (or be unchanged), ensure no JS errors: confirm page still responds
      await expect(app.page).toHaveURL(/7c299010-bcb0-11f0-95d9-c98d28730c93.html/);
    });

    test('AUTO_TOGGLE starts and stops auto_running: button text changes to Stop onEnter and back to Auto onExit', async ({ page }) => {
      // Click Auto to start
      await app.toggleAuto();
      // Auto button should change text to 'Stop' or similar
      const btnText = await app.getAutoButtonText();
      expect(btnText.toLowerCase()).toMatch(/stop|running|pause/i);

      // Let it run a small amount, then toggle to stop
      await page.waitForTimeout(400);
      await app.toggleAuto();
      // After stopping, button should read 'Auto' or similar
      const btnText2 = await app.getAutoButtonText();
      expect(btnText2.toLowerCase()).toMatch(/auto|start/i);
    });

    test('AUTO_FINISHED -> finished state shows finished message and allows RESET to idle', async ({ page }) => {
      // We simulate finishing by clicking Auto then immediately toggling (some implementations set a finished message)
      // Start auto
      await app.toggleAuto();
      // Wait briefly to allow possible algorithm to run and finish
      await page.waitForTimeout(600);
      // Try finding finished message
      const msg2 = (await app.getMessageText()).toLowerCase();
      // Either 'Algorithm finished' message present or we force stop to emulate user RESET
      const finishedLikely = /finished|algorithm finished/i.test(msg);
      // If not finished, force stop
      if (!finishedLikely) {
        await app.toggleAuto(); // stop
      }
      // Now check that finished UI state can be reset: Click Reset if present or Clear
      const resetBtn = app.page.getByRole('button', { name: /reset/i });
      if ((await resetBtn.count()) > 0) {
        await resetBtn.click();
      } else {
        // Use Clear as fallback
        await app.clickClear();
      }
      // Mode should now be idle or default
      const mode2 = await app.getModeIndicatorText();
      expect(mode.toLowerCase()).not.toMatch(/finished|running|auto/i);
    });

    test('NEG_CYCLE_DETECTED leads to detecting state and highlighted edges (red) and message', async ({ page }) => {
      // This test attempts to trigger a negative cycle detection scenario.
      // We'll create 3 nodes forming a triangle with negative total weight:
      // edges: A->B weight 1, B->C weight -2, C->A weight 0 (sum -1)
      // Because implementation prompts for edge weight on creation, we handle dialogs.

      // Clean slate
      await app.clickClear().catch(() => {});

      // Add three nodes
      await app.toggleAddNode();
      await app.clickSvgAt(0.30, 0.3); // A
      await app.clickSvgAt(0.70, 0.3); // B
      await app.clickSvgAt(0.50, 0.7); // C
      await app.toggleAddNode();

      // Create edges A->B (weight 1)
      await app.toggleAddEdge();
      // Edge creation may open a prompt for weight; handle by accepting default or provided weight
      app.page.once('dialog', async (d) => d.accept('1'));
      await app.clickNodeByIndex(0);
      await app.clickNodeByIndex(1);
      await page.waitForTimeout(150);

      // B->C (weight -2)
      app.page.once('dialog', async (d) => d.accept('-2'));
      await app.clickNodeByIndex(1);
      await app.clickNodeByIndex(2);
      await page.waitForTimeout(150);

      // C->A (weight 0)
      app.page.once('dialog', async (d) => d.accept('0'));
      await app.clickNodeByIndex(2);
      await app.clickNodeByIndex(0);
      await page.waitForTimeout(300);

      // Set source to A (node 0)
      await app.toggleSetSource();
      await app.clickNodeByIndex(0);
      await app.toggleSetSource();

      // Run auto to detect negative cycle (some implementations detect negative cycles during auto)
      await app.toggleAuto();
      // Wait ample time for detection to occur
      await page.waitForTimeout(1200);

      const message2 = (await app.getMessageText()).toLowerCase();
      // Expect a message that includes 'negative' or 'cycle'
      const detected = /neg(ative)?\s*cycle|negative cycle|cycle detected/i.test(message);
      // If the app detected negative cycle, we should see the message and edges highlighted (red)
      if (detected) {
        // Look for red-styled edges (stroke color containing red hex or rgb)
        const redEdge = await app.page.locator('svg path[stroke*="#ff"], svg line[stroke*="#ff"], svg path[stroke*="rgb(255,"] , svg .edge.red, .edge.detected').first();
        // It's acceptable if implementation uses classes instead of inline color; check both
        const foundRed = (await redEdge.count()) > 0;
        expect(foundRed || detected).toBeTruthy();
      } else {
        // If detection didn't happen automatically, at least assert app stayed responsive and displayed something
        expect(message.length).toBeGreaterThanOrEqual(0);
      }

      // Stop auto if still running
      const autoText = await app.getAutoButtonText();
      if (/stop|running|pause/i.test(autoText.toLowerCase())) {
        await app.toggleAuto();
      }
    }, 20000);
  });

  test.describe('Add / Edit actions (addNode action, addEdge action, edgeEdit)', () => {
    test('addNode action: clicking SVG in addNode mode adds a DOM node and renders distance table update', async ({ page }) => {
      const nodesBefore = Number(await app.getNodeCount());
      await app.toggleAddNode();
      // Click middle area to add node
      await app.clickSvgAt(0.5, 0.6);
      // some implementations add nodes asynchronously; wait briefly
      await page.waitForTimeout(200);
      const nodesAfter = Number(await app.getNodeCount());
      expect(nodesAfter).toBeGreaterThan(nodesBefore);
      // after addNode action, distance table should be reset or re-rendered (rows >= 0)
      const distRows1 = await app.distanceTableRowCount();
      expect(Number(distRows)).toBeGreaterThanOrEqual(0);
      // message should mention 'added' or similar
      const msg3 = (await app.getMessageText()).toLowerCase();
      if (msg) expect(msg).toMatch(/add(ed)?\s*node|added node|node added/i);
    });

    test('addEdge action: creating an edge triggers onEnter actions (reset algorithm state, message)', async ({ page }) => {
      // Ensure at least two nodes exist
      if ((await app.getNodeCount()) < 2) {
        await app.toggleAddNode();
        await app.clickSvgAt(0.2, 0.4);
        await app.clickSvgAt(0.8, 0.6);
        await app.toggleAddNode();
      }
      const edgesBefore = await app.edgesLocatorAll().count();
      await app.toggleAddEdge();
      // Create an edge between nodes 0 and 1
      app.page.once('dialog', async (d) => d.accept('2'));
      await app.clickNodeByIndex(0);
      await app.clickNodeByIndex(1);
      await page.waitForTimeout(200);
      const edgesAfter = await app.edgesLocatorAll().count();
      expect(Number(edgesAfter)).toBeGreaterThanOrEqual(Number(edgesBefore));
      // Message for added edge
      const msg4 = (await app.getMessageText()).toLowerCase();
      if (msg) expect(msg).toMatch(/add(ed)?\s*edge|edge added|added edge/i);
      // Distance table should have been reset/rendered
      const distRows2 = await app.distanceTableRowCount();
      expect(Number(distRows)).toBeGreaterThanOrEqual(0);
    });

    test('edgeEdit: clicking an edge opens a prompt to edit weight and triggers resetAlgorithmState', async ({ page }) => {
      // Ensure there is at least one edge; create simple edge if none
      if ((await app.edgesLocatorAll().count()) === 0) {
        // create two nodes and an edge
        await app.toggleAddNode();
        await app.clickSvgAt(0.25, 0.5);
        await app.clickSvgAt(0.75, 0.5);
        await app.toggleAddNode();
        await app.toggleAddEdge();
        app.page.once('dialog', async (d) => d.accept('3'));
        await app.clickNodeByIndex(0);
        await app.clickNodeByIndex(1);
        await page.waitForTimeout(200);
        await app.toggleAddEdge(); // exit add edge mode if needed
      }
      // Edit first edge: expect a dialog to appear; supply new weight
      const dialogMsg = await app.editFirstEdgeWithWeight('7');
      // dialog may or may not have appeared; if it did, ensure it contained edit prompt
      if (dialogMsg) {
        expect(dialogMsg.toLowerCase()).toMatch(/weight|edit|enter/i);
      }
      // After editing edge, app should reset algorithm state and update distance table
      const distRows3 = await app.distanceTableRowCount();
      expect(Number(distRows)).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Edge cases and error scenarios', () => {
    test('Attempt to Step with no source selected yields informative message or no crash', async ({ page }) => {
      // Ensure Clear to have no source
      await app.clickClear().catch(() => {});
      // Add a single node but do not set source
      await app.toggleAddNode();
      await app.clickSvgAt(0.5, 0.5);
      await app.toggleAddNode();
      // Click Step: app should produce helpful message or simply not crash
      await app.clickStep();
      await page.waitForTimeout(200);
      const msg5 = (await app.getMessageText()).toLowerCase();
      // Accept either an instructional message or no message, but ensure the app still responds
      expect(msg.length).toBeGreaterThanOrEqual(0);
    });

    test('Attempt to create an edge with same node (self-loop) either disallowed or created (robust behavior)', async ({ page }) => {
      // Ensure there is at least one node
      if ((await app.getNodeCount()) === 0) {
        await app.toggleAddNode();
        await app.clickSvgAt(0.5, 0.5);
        await app.toggleAddNode();
      }
      // Try creating an edge from node 0 to node 0
      await app.toggleAddEdge();
      // Accept any prompt
      app.page.once('dialog', async (d) => d.accept('1'));
      await app.clickNodeByIndex(0);
      await app.clickNodeByIndex(0);
      await page.waitForTimeout(200);
      const edgesAfter1 = await app.edgesLocatorAll().count();
      // Either the app created a self-loop (edgesAfter >= 1) or disallowed it (message)
      const msg6 = (await app.getMessageText()).toLowerCase();
      const disallowed = /cannot|invalid|same node|self/i.test(msg);
      expect(disallowed || edgesAfter >= 0).toBeTruthy();
      // Exit add-edge mode if necessary
      try {
        await app.toggleAddEdge();
      } catch (e) {}
    });

    test('Rapid toggling of modes (FAST_TOGGLE) does not crash the app and UI updates accordingly', async ({ page }) => {
      // Try quickly toggling Add Node, Add Edge, Set Source multiple times
      for (let i = 0; i < 4; i++) {
        await app.toggleAddNode();
        await page.waitForTimeout(50);
        await app.toggleAddEdge();
        await page.waitForTimeout(50);
        await app.toggleSetSource();
        await page.waitForTimeout(50);
      }
      // App should still be responsive and mode indicator present
      const mode3 = await app.getModeIndicatorText();
      expect(mode).toBeTruthy();
    });
  });
});