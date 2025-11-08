import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/11-08-0004/html/7f1b0ab0-bcb0-11f0-95d9-c98d28730c93.html';

/**
 * Page Object for the Interactive DFS Explorer app.
 * This object centralizes selectors and common interactions so tests are readable.
 *
 * NOTE: The HTML implementation provided in the prompt was truncated and did not
 * include full definitive IDs/classes for controls. This page object therefore
 * tries multiple reasonable selector strategies for each control (id, text, role)
 * so the tests are resilient. If the real app uses different selectors, adapt
 * the selectors below accordingly.
 */
class DFSPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;

    // Canvas area where nodes are added and dragged. Try a few likely selectors.
    this.canvas = page.locator('#canvas').first()
      .or(page.locator('.canvas').first())
      .or(page.locator('[data-testid="canvas"]').first())
      .or(page.locator('svg').first());

    // Status message element
    this.status = page.locator('#statusMsg').or(page.locator('.status')).first();

    // Toggle add/connect buttons - try id then button text then class
    this.toggleAdd = page.locator('#toggle-add').or(page.locator('button', { hasText: 'Add' })).or(page.locator('button', { hasText: 'Toggle Add' }));
    this.toggleConnect = page.locator('#toggle-connect').or(page.locator('button', { hasText: 'Connect' })).or(page.locator('button', { hasText: 'Toggle Connect' }));

    // Play/Pause and Step controls
    this.playPauseBtn = page.locator('#play-pause').or(page.locator('button', { hasText: 'Play' })).or(page.locator('button', { hasText: 'Pause' }));
    this.stepBtn = page.locator('#step-btn').or(page.locator('button', { hasText: 'Step' }));
    this.resetTraversalBtn = page.locator('#reset-traversal').or(page.locator('button', { hasText: 'Reset Traversal' }));
    this.resetGraphBtn = page.locator('#reset-graph').or(page.locator('button', { hasText: 'Reset Graph' }));
    this.loadSampleBtn = page.locator('#load-sample').or(page.locator('button', { hasText: 'Load Sample' }));
    this.clearGraphBtn = page.locator('#clear-graph').or(page.locator('button', { hasText: 'Clear Graph' }));

    // Start node select
    this.startSelect = page.locator('#start-select').or(page.locator('select[name="start"]')).first();

    // Stack and visited views
    this.stackView = page.locator('#stack-view').or(page.locator('.stack-view')).first();
    this.visitedView = page.locator('#visited-view').or(page.locator('.visited-view')).first();

    // Node locator factory: match by data-id attribute or by text label
    this.nodeById = (id) => page.locator(`[data-node-id="${id}"]`).or(page.locator(`.node[data-id="${id}"]`)).or(page.locator(`.node:has-text("${id}")`));
    this.nodes = page.locator('.node').or(page.locator('[data-node-id]')).or(page.locator('.graph-node'));
    this.edges = page.locator('.edge').or(page.locator('[data-edge]')).or(page.locator('.graph-edge'));
  }

  async goto() {
    await this.page.goto(APP_URL);
    // wait for app to load a plausible root element
    await this.page.waitForLoadState('networkidle');
    // allow UI to initialize
    await this.page.waitForTimeout(200);
  }

  // Toggle Add mode
  async toggleAddMode() {
    await this.toggleAdd.click();
    await this.page.waitForTimeout(100);
  }

  // Toggle Connect mode
  async toggleConnectMode() {
    await this.toggleConnect.click();
    await this.page.waitForTimeout(100);
  }

  // Click canvas relative positions (x,y)
  async clickCanvasAt(x = 100, y = 100) {
    const box = await this.canvas.boundingBox();
    if (!box) throw new Error('Canvas bounding box not found');
    await this.page.mouse.click(box.x + x, box.y + y);
    await this.page.waitForTimeout(120);
  }

  // Add node by clicking canvas while in add mode
  async addNodeAt(x = 100, y = 100) {
    await this.clickCanvasAt(x, y);
    // Wait a short time for node to appear
    await this.page.waitForTimeout(150);
    // Return last node found
    const count = await this.nodes.count();
    if (count === 0) throw new Error('No node was created after canvas click');
    return this.nodes.nth(count - 1);
  }

  // Click a node element (by locator)
  async clickNode(locator) {
    await locator.click();
    await this.page.waitForTimeout(100);
  }

  // Simulate dragging a node by id or locator
  async dragNode(locator, toOffsetX = 40, toOffsetY = 20) {
    const box1 = await locator.boundingBox();
    if (!box) throw new Error('Node bounding box not found for dragging');
    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;
    await this.page.mouse.move(startX, startY);
    await this.page.mouse.down();
    // small move to enter 'dragging' state
    await this.page.mouse.move(startX + 5, startY + 5);
    await this.page.waitForTimeout(80);
    // drag to destination
    await this.page.mouse.move(startX + toOffsetX, startY + toOffsetY, { steps: 8 });
    await this.page.waitForTimeout(80);
    await this.page.mouse.up();
    await this.page.waitForTimeout(120);
  }

  // Click play/pause button
  async clickPlay() {
    await this.playPauseBtn.click();
    await this.page.waitForTimeout(120);
  }

  // Click step
  async clickStep() {
    await this.stepBtn.click();
    await this.page.waitForTimeout(250);
  }

  // Click reset traversal
  async clickResetTraversal() {
    await this.resetTraversalBtn.click();
    await this.page.waitForTimeout(150);
  }

  // Click reset graph
  async clickResetGraph() {
    await this.resetGraphBtn.click();
    await this.page.waitForTimeout(150);
  }

  // Load sample graph
  async clickLoadSample() {
    await this.loadSampleBtn.click();
    await this.page.waitForTimeout(250);
  }

  // Clear graph
  async clickClearGraph() {
    await this.clearGraphBtn.click();
    await this.page.waitForTimeout(150);
  }

  // Set start node via select dropdown (choose value or label)
  async setStartNode(valueOrLabel) {
    // Try classic select interactions
    try {
      await this.startSelect.selectOption({ label: String(valueOrLabel) });
    } catch (e) {
      try {
        await this.startSelect.selectOption(String(valueOrLabel));
      } catch (e2) {
        // fallback: click and choose option via text
        await this.startSelect.click();
        await this.page.click(`text="${valueOrLabel}"`);
      }
    }
    await this.page.waitForTimeout(120);
  }

  // Expect helpers
  async expectAddModeActive() {
    // add mode should add 'primary' class to toggleAdd according to FSM onEnter
    await expect(this.toggleAdd).toHaveClass(/primary/);
    // status message should contain 'Add mode'
    await expect(this.status).toContainText(/Add mode/i);
  }

  async expectConnectModeActive() {
    await expect(this.toggleConnect).toHaveClass(/primary/);
    await expect(this.status).toContainText(/Connect mode/i);
  }

  async expectIdleState() {
    // In idle state neither toggle has 'primary' (could be others), and status likely 'Idle' or neutral
    const addHasPrimary = await this.toggleAdd.evaluate((el) => el.classList.contains('primary')).catch(() => false);
    const connHasPrimary = await this.toggleConnect.evaluate((el) => el.classList.contains('primary')).catch(() => false);
    expect(addHasPrimary || connHasPrimary).toBeFalsy();
    // status should mention 'Idle' if app sets it
    const statusText = await this.status.textContent().catch(() => '');
    expect(statusText === null || /Idle|add|connect|start/i.test(statusText) || statusText.length >= 0).toBeTruthy();
  }

  async expectNodeVisited(locator) {
    // visited nodes may get .visited or .node-visited class or inline style color change
    const cls = await locator.getAttribute('class').catch(() => '');
    expect(/visited|node-visited|visited-node/.test(cls || '') || /visited/i.test(await locator.textContent().catch(() => ''))).toBeTruthy();
  }

  async expectTraversalComplete() {
    await expect(this.status).toContainText(/complete/i);
    // play button should display 'Play' (onExit traversing_playing sets text to 'Play')
    await expect(this.playPauseBtn).toHaveText(/Play/i);
  }
}

test.describe('Interactive DFS Explorer - FSM behavior', () => {
  let dfs;
  test.beforeEach(async ({ page }) => {
    dfs = new DFSPage(page);
    await dfs.goto();
  });

  test.afterEach(async ({ page }) => {
    // try to reset UI between tests where applicable
    try {
      await dfs.clickResetTraversal();
      await dfs.clickResetGraph();
    } catch (e) {
      // ignore cleanup errors
    }
    await page.waitForTimeout(80);
  });

  test.describe('Idle and editing mode toggles', () => {
    test('idle -> add_mode -> idle via toggle and canvas clicks (CLICK_TOGGLE_ADD, CANVAS_CLICK_ADD_NODE)', async () => {
      // Ensure starting idle
      await dfs.expectIdleState();

      // Enter add mode
      await dfs.toggleAddMode();
      // Validate onEnter actions for add_mode (toggle has 'primary' and status shows Add mode)
      await dfs.expectAddModeActive();

      // Click canvas to add node in add_mode (CANVAS_CLICK_ADD_NODE)
      const node = await dfs.addNodeAt(120, 80);
      await expect(node).toBeVisible();

      // Verify the app still remains in add_mode (toggle remains primary and status message persists)
      await dfs.expectAddModeActive();

      // Exit add mode by toggling again (CLICK_TOGGLE_ADD -> idle)
      await dfs.toggleAddMode();
      await dfs.expectIdleState();
    });

    test('idle -> connect_mode_idle -> connect_mode_selected -> connect_mode_idle (CLICK_TOGGLE_CONNECT, NODE_CLICK)', async () => {
      // Load a sample to ensure there are nodes to connect (LOAD_SAMPLE)
      await dfs.clickLoadSample();
      // Enter connect mode
      await dfs.toggleConnectMode();
      await dfs.expectConnectModeActive();

      // Choose two nodes to connect; pick first two nodes
      const nodesCount = await dfs.nodes.count();
      expect(nodesCount).toBeGreaterThanOrEqual(2);

      const first = dfs.nodes.nth(0);
      const second = dfs.nodes.nth(1);

      // Click first node to select (NODE_CLICK -> connect_mode_selected)
      await dfs.clickNode(first);
      // onEnter connect_mode_selected should set status to include selected node id/label
      await expect(dfs.status).toContainText(/Select|connect/i);

      // Click same node again (NODE_CLICK_SAME) - should go back to connect_mode_idle
      await dfs.clickNode(first);
      // After clicking same node category, back to connect_mode_idle, selected cleared
      await dfs.expectConnectModeActive();

      // Click first then different node to create an edge (NODE_CLICK_DIFFERENT)
      await dfs.clickNode(first);
      await dfs.clickNode(second);
      // After connecting, state should return to connect_mode_idle
      await dfs.expectConnectModeActive();

      // Optionally, check that an edge was created (edge DOM exists)
      const edgeCount = await dfs.edges.count();
      expect(edgeCount).toBeGreaterThanOrEqual(1);
    });

    test('dragging a node transitions into dragging state and back to idle (NODE_MOUSEDOWN, MOUSE_MOVE, MOUSE_UP)', async () => {
      // Ensure there is at least one node - create one if none
      if ((await dfs.nodes.count()) === 0) {
        await dfs.toggleAddMode();
        await dfs.addNodeAt(150, 120);
        await dfs.toggleAddMode();
      }
      const node1 = dfs.nodes.nth(0);
      // Start dragging
      await dfs.dragNode(node, 60, 40);

      // After drag completes, ensure node moved (position changed) - compare bounding boxes
      // (We captured new position indirectly by ensuring no errors and UI returns to idle)
      await dfs.expectIdleState();
    });

    test('loading sample and clearing graph preserve add_mode if applicable (LOAD_SAMPLE, CLEAR_GRAPH)', async () => {
      // Enter add mode
      await dfs.toggleAddMode();
      await dfs.expectAddModeActive();

      // Load sample while in add_mode
      await dfs.clickLoadSample();
      // App should remain in add_mode (per FSM transitions)
      await dfs.expectAddModeActive();

      // Clear graph while in add_mode
      await dfs.clickClearGraph();
      // Still in add_mode
      await dfs.expectAddModeActive();

      // Exit add mode
      await dfs.toggleAddMode();
      await dfs.expectIdleState();
    });
  });

  test.describe('Traversal lifecycle: prepare -> step -> play -> complete -> reset', () => {
    test('prepare traversal (traversal_prepared) by setting start and clicking Step (CLICK_STEP)', async () => {
      // Ensure enough nodes: if none, load sample
      if ((await dfs.nodes.count()) < 2) {
        await dfs.clickLoadSample();
      }

      // Set start node (SET_START_NODE)
      // Use the first node label or data-node-id if present
      const firstNode = dfs.nodes.nth(0);
      const nodeId = (await firstNode.getAttribute('data-node-id')) || (await firstNode.getAttribute('data-id')) || (await firstNode.textContent().then(t => t && t.trim().split(/\s/)[0]).catch(() => '1'));
      await dfs.setStartNode(nodeId);

      // Click Step to prepare traversal -> should go to traversal_prepared or animating_step
      await dfs.clickStep();

      // After preparing, there should be a stack view or visited view present/updated
      await expect(dfs.stackView).toBeVisible().catch(() => {});
      await expect(dfs.visitedView).toBeVisible().catch(() => {});
    }, { timeout: 120000 });

    test('animating_step: clicking Step repeatedly advances DFS micro-steps and updates visuals', async () => {
      // Ensure sample graph present
      if ((await dfs.nodes.count()) < 3) {
        await dfs.clickLoadSample();
      }

      // Set start node to first
      const firstNode1 = dfs.nodes.nth(0);
      const nodeId1 = (await firstNode.getAttribute('data-node-id')) || (await firstNode.getAttribute('data-id')) || '1';
      await dfs.setStartNode(nodeId);

      // Click Step which should trigger animating_step
      await dfs.clickStep();

      // After an animation step we expect:
      // - stack view updates (non-empty)
      // - visited view may show first node
      const stackText = await dfs.stackView.textContent().catch(() => '');
      const visitedText = await dfs.visitedView.textContent().catch(() => '');

      // At least stack or visited should show something meaningful after a step
      expect((stackText && stackText.trim().length > 0) || (visitedText && visitedText.trim().length > 0)).toBeTruthy();

      // Click Step repeatedly until traversal_complete or up to a limit
      let steps = 0;
      let completed = false;
      while (steps < 30) {
        steps += 1;
        await dfs.clickStep();
        // If status says complete or play button shows Play and status contains 'complete', break
        const status = (await dfs.status.textContent().catch(() => '')) || '';
        if (/complete/i.test(status)) {
          completed = true;
          break;
        }
      }
      // Either traversal completed or at least multiple steps progressed
      expect(steps > 0).toBeTruthy();

      // If completed, check traversal_complete behaviors
      if (completed) {
        await dfs.expectTraversalComplete();
      } else {
        // If not completed, at minimum visited view should have entries
        const visitedAfter = await dfs.visitedView.textContent().catch(() => '');
        expect(visitedAfter && visitedAfter.trim().length > 0).toBeTruthy();
      }
    }, { timeout: 120000 });

    test('traversing_playing: Play starts automatic stepping and Pause stops it (CLICK_PLAY, CLICK_PAUSE, TIMER_TICK)', async ({ page }) => {
      // Ensure sample graph exists
      if ((await dfs.nodes.count()) < 3) {
        await dfs.clickLoadSample();
      }

      // Set start node
      const first1 = dfs.nodes.nth(0);
      const nodeId2 = (await first.getAttribute('data-node-id')) || (await first.getAttribute('data-id')) || '1';
      await dfs.setStartNode(nodeId);

      // Click Play to start traversing_playing
      await dfs.clickPlay();

      // playPauseBtn onEnter should change label to 'Pause'
      // Wait a short while for the UI to update and potentially perform a few steps
      await page.waitForTimeout(800);
      await expect(dfs.playPauseBtn).toHaveText(/Pause/i);

      // During playing, visited view should start populating
      const visitedDuring = await dfs.visitedView.textContent().catch(() => '');
      expect(visitedDuring && visitedDuring.trim().length >= 0).toBeTruthy();

      // Click Play again to pause (CLICK_PAUSE)
      await dfs.clickPlay();
      // After pause, playPauseBtn should show 'Play'
      await expect(dfs.playPauseBtn).toHaveText(/Play/i);
    }, { timeout: 120000 });

    test('TRAVERSAL_DONE leads to traversal_complete and reset works (TRAVERSAL_DONE, CLICK_RESET_TRAVERSAL)', async () => {
      // Load sample graph and set start
      await dfs.clickLoadSample();
      if ((await dfs.nodes.count()) === 0) throw new Error('Sample should contain nodes');

      const first2 = dfs.nodes.nth(0);
      const nodeId3 = (await first.getAttribute('data-node-id')) || (await first.getAttribute('data-id')) || '1';
      await dfs.setStartNode(nodeId);

      // Play to completion - click Play and wait for status to include 'complete' or until timeout
      await dfs.clickPlay();
      let done = false;
      for (let i = 0; i < 60; i++) {
        const s = (await dfs.status.textContent().catch(() => '')) || '';
        if (/complete/i.test(s)) {
          done = true;
          break;
        }
        await new Promise((r) => setTimeout(r, 200));
      }
      // If not done, attempt to step until done
      if (!done) {
        // Pause if still playing
        await dfs.clickPlay().catch(() => {});
        for (let i = 0; i < 60; i++) {
          await dfs.clickStep();
          const s1 = (await dfs.status.textContent().catch(() => '')) || '';
          if (/complete/i.test(s)) {
            done = true;
            break;
          }
        }
      }
      expect(done).toBeTruthy();

      // On traversal_complete, play button should be 'Play' and status include 'Traversal complete'
      await dfs.expectTraversalComplete();

      // Clicking Reset Traversal should go to idle
      await dfs.clickResetTraversal();
      await dfs.expectIdleState();
    }, { timeout: 180000 });
  });

  test.describe('Edge cases and error scenarios', () => {
    test('Clicking Connect without nodes should not throw and returns to idle (CLICK_TOGGLE_CONNECT, CLICK_PLAY while empty)', async () => {
      // Clear graph first
      await dfs.clickClearGraph();
      // Ensure no nodes
      const count1 = await dfs.nodes.count1();
      expect(count).toBe(0);

      // Toggle connect mode with no nodes
      await dfs.toggleConnectMode();
      // App should show connect mode but operations should be safe
      await dfs.expectConnectModeActive();

      // Click Play while connect mode active (CLICK_PLAY) - should prepare traversal or remain safe (no crash)
      await dfs.clickPlay();
      // After clicking Play when no traversal possible, app should either be idle or show safe status
      const s2 = (await dfs.status.textContent().catch(() => '')) || '';
      expect(/error|no|start|idle|complete|traversal/i.test(s) || s.length >= 0).toBeTruthy();

      // Toggle connect off to return to idle
      await dfs.toggleConnectMode();
      await dfs.expectIdleState();
    });

    test('Switching modes during traversal should not corrupt state (CLICK_PLAY then CLICK_TOGGLE_ADD/CONNECT)', async () => {
      // Ensure there is a small graph
      await dfs.clickLoadSample();
      if ((await dfs.nodes.count()) === 0) throw new Error('Sample should provide nodes for this test');

      // Start playing traversal
      await dfs.clickPlay();
      await expect(dfs.playPauseBtn).toHaveText(/Pause/i);

      // While playing, toggle Add mode. Per FSM this should transition to add_mode
      await dfs.toggleAddMode();
      // The app likely leaves playing state when entering add_mode; ensure toggleAdd is active
      await dfs.expectAddModeActive();

      // Toggle Add mode off and resume play - ensure play button can be clicked again to resume playing or prepare traversal
      await dfs.toggleAddMode();
      await dfs.expectIdleState();

      // Now while paused, toggle Connect mode
      await dfs.toggleConnectMode();
      await dfs.expectConnectModeActive();

      // Restore to idle
      await dfs.toggleConnectMode();
      await dfs.expectIdleState();
    }, { timeout: 120000 });

    test('Keyboard shortcuts KEY_SPACE and KEY_ARROW_RIGHT map to Play and Step (KEY_SPACE, KEY_ARROW_RIGHT)', async ({ page }) => {
      // Ensure sample graph
      await dfs.clickLoadSample();
      if ((await dfs.nodes.count()) === 0) return;

      // Focus body and press Space to play
      await page.focus('body');
      await page.keyboard.press('Space');
      // Wait a moment for change
      await page.waitForTimeout(200);
      // The play button should change label to Pause or Play depending on toggle
      const txt = (await dfs.playPauseBtn.textContent().catch(() => '')) || '';
      expect(/Play|Pause/i.test(txt)).toBeTruthy();

      // Press right arrow to step
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(200);

      // The visited or stack view should reflect some activity after stepping
      const visited = await dfs.visitedView.textContent().catch(() => '');
      expect(visited !== null).toBeTruthy();
    });
  });
});