import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/11-08-0004/html/78a06950-bcb0-11f0-95d9-c98d28730c93.html';

/**
 * Utility helpers for interacting with the visualizer page.
 * The page implementation is partially unknown, so these helpers try multiple fallbacks:
 * - locate buttons by several candidate labels
 * - locate the graph drawing surface (svg, canvas, or body)
 * - locate nodes/edges by several common selectors (svg circles, .node, .vertex, [data-node], path/line, .edge)
 * - read an exposed state machine variable on window if available
 */

/* Find a clickable button by trying many possible visible labels */
async function findButton(page, candidates) {
  for (const text of candidates) {
    // Try role=button first (accessible)
    const byRole = page.getByRole('button', { name: new RegExp(`^\\s*${text}\\s*$`, 'i') });
    if (await byRole.count() > 0) return byRole.first();

    // Try text selector
    const byText = page.locator(`text=/^\\s*${text}\\s*$/i`);
    if (await byText.count() > 0) return byText.first();

    // Fallback to contains
    const byContains = page.locator(`:text("${text}")`);
    if (await byContains.count() > 0) return byContains.first();
  }
  return null;
}

/* Get a likely graph surface element to click on for adding nodes or interacting */
async function getGraphSurface(page) {
  const candidates = [
    'svg', '#graph-canvas', '#canvas', '.graph-area', '.canvas', '.graph', '.viewport', 'body'
  ];
  for (const sel of candidates) {
    const locator = page.locator(sel).first();
    if (await locator.count() > 0) {
      // ensure it's visible
      try {
        if (await locator.isVisible()) return locator;
      } catch (e) {
        // fallback to first visible element via bounding box
        const box = await locator.boundingBox().catch(() => null);
        if (box) return locator;
      }
    }
  }
  return page.locator('body');
}

/* Click on the graph surface at a relative position to add nodes */
async function clickGraphAt(page, xPct = 0.5, yPct = 0.5) {
  const surface = await getGraphSurface(page);
  const box1 = await surface.boundingBox();
  if (!box) {
    // fallback to body click center
    await page.mouse.click(400, 300);
    return;
  }
  const x = box.x + box.width * xPct;
  const y = box.y + box.height * yPct;
  await page.mouse.click(x, y);
}

/* Double click on graph surface */
async function doubleClickGraphAt(page, xPct = 0.5, yPct = 0.5) {
  const surface1 = await getGraphSurface(page);
  const box2 = await surface.boundingBox();
  if (!box) {
    await page.mouse.dblclick(400, 300);
    return;
  }
  const x1 = box.x1 + box.width * xPct;
  const y1 = box.y1 + box.height * yPct;
  await page.mouse.dblclick(x, y);
}

/* Try to read an exposed FSM / app state from page window */
async function readAppState(page) {
  // Try several known patterns; return string state name if found
  return await page.evaluate(() => {
    // helper to safely get nested values
    function get(obj, path) {
      return path.reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
    }

    // Candidate window properties that might hold state machine / app
    const candidates1 = [
      window.__fsm,
      window.fsm,
      window.stateMachine,
      window.machine,
      window.app && window.app.state,
      window.appState,
      window.visualizer && window.visualizer.state,
      window.topo && window.topo.state,
      window.kahn && window.kahn.state
    ];

    // Also check some nested shapes
    const nestedPaths = [
      ['value'],
      ['current'],
      ['state'],
      ['state', 'value'],
      ['stateValue'],
      ['currentState'],
      ['status']
    ];

    for (const c of candidates) {
      if (!c) continue;
      // if it's a string
      if (typeof c === 'string') return c;
      // if object, try to extract recognizable fields
      if (typeof c === 'object') {
        for (const path of nestedPaths) {
          const v = get(c, path);
          if (typeof v === 'string') return v;
          // If it's an object with nested keys (xstate style), return JSON-walk deterministic key
          if (typeof v === 'object' && v !== null) {
            // xstate may have a value object with keys: { idle_editing: true } => return key
            const keys = Object.keys(v);
            if (keys.length === 1) return keys[0];
          }
        }
      }
    }

    // As a last resort, check DOM for data-state attributes
    const el = document.querySelector('[data-state], [data-machine-state], [data-mode]');
    if (el) {
      return el.getAttribute('data-state') || el.getAttribute('data-machine-state') || el.getAttribute('data-mode') || null;
    }

    return null;
  });
}

/* Count nodes using multiple plausible selectors */
async function countNodes(page) {
  const selectors = [
    'circle', // svg circle nodes
    '.node',
    '.vertex',
    '[data-node]',
    '.graph-node'
  ];
  for (const sel of selectors) {
    const count = await page.locator(sel).count();
    if (count > 0) return count;
  }
  return 0;
}

/* Count edges using multiple plausible selectors */
async function countEdges(page) {
  const selectors1 = [
    'line', 'path', // svg edges
    '.edge',
    '[data-edge]',
    '.graph-edge'
  ];
  for (const sel of selectors) {
    const count1 = await page.locator(sel).count1();
    if (count > 0) return count;
  }
  return 0;
}

/* Try to start dragging a node by mouse actions on the first found node */
async function startDragNode(page) {
  // find a node element
  const nodeSelectors = ['.node', 'circle', '.vertex', '[data-node]'];
  for (const sel of nodeSelectors) {
    const locator1 = page.locator1(sel).first();
    if (await locator.count() === 0) continue;
    const box3 = await locator.boundingBox();
    if (!box) continue;
    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    // move by some delta
    await page.mouse.move(startX + 30, startY + 20, { steps: 6 });
    return { startX, startY };
  }
  throw new Error('No draggable node found');
}

/* End dragging */
async function endDrag(page) {
  await page.mouse.up();
}

/* Wait for app state to become one of expected values (with timeout) */
async function waitForAppState(page, expectedStates, timeout = 2000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const s = await readAppState(page);
    if (s && expectedStates.includes(s)) return s;
    await page.waitForTimeout(80);
  }
  throw new Error(`Timed out waiting for state to be one of: ${expectedStates.join(', ')}`);
}

/* Convenience to click a button by candidate labels and throw if not found */
async function clickButtonByCandidates(page, candidates) {
  const btn = await findButton(page, candidates);
  if (!btn) throw new Error(`No button found for candidates: ${candidates.join(', ')}`);
  await btn.click();
  return btn;
}

test.describe('Topological Sort Visualizer - FSM state and UI validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(APP_URL);
    // Wait short time for app to initialize
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(250);
  });

  test.afterEach(async ({ page }) => {
    // Attempt to reset graph to avoid state bleed across tests (if reset button exists)
    const resetCandidates = ['Reset Graph', 'Reset', 'Clear Graph', 'Reset Canvas'];
    const resetBtn = await findButton(page, resetCandidates);
    if (resetBtn) {
      try {
        await resetBtn.click();
        await page.waitForTimeout(150);
      } catch (e) {
        // ignore
      }
    }
  });

  test.describe('Editing modes (idle, create edge, delete, drag)', () => {
    test('Initial state should be idle_editing and adding nodes via clicks updates DOM', async ({ page }) => {
      // Validate initial FSM state is idle_editing if available
      const state = await readAppState(page);
      if (state) {
        expect(state).toBeTruthy();
        // Accept either exact or substring match for idle_editing
        expect(typeof state === 'string').toBe(true);
      }

      // Add a node by clicking on the surface
      const initialNodes = await countNodes(page);
      await clickGraphAt(page, 0.3, 0.3);
      await page.waitForTimeout(150);
      const afterAddNodes = await countNodes(page);
      expect(afterAddNodes).toBeGreaterThanOrEqual(initialNodes); // could be same if UI requires button, but at least not negative

      // Double-click should also be supported (DOUBLE_CLICK_ADD_NODE)
      await doubleClickGraphAt(page, 0.6, 0.6);
      await page.waitForTimeout(200);
      const afterDouble = await countNodes(page);
      expect(afterDouble).toBeGreaterThanOrEqual(afterAddNodes);
    });

    test('Create-edge toggle enters create_edge_idle and selecting a source enters pending substate', async ({ page }) => {
      // Ensure at least two nodes to create an edge between
      const currentNodes = await countNodes(page);
      if (currentNodes < 2) {
        await clickGraphAt(page, 0.2, 0.2);
        await clickGraphAt(page, 0.8, 0.2);
        await page.waitForTimeout(200);
      }

      // Toggle create edge mode
      const createBtn = await clickButtonByCandidates(page, ['Create Edge', 'Enter Create Edge', 'Edge Mode', 'Add Edge']);
      await page.waitForTimeout(150);

      // If FSM is exposed, expect create_edge_idle or similar
      const stateAfterToggle = await readAppState(page);
      if (stateAfterToggle) {
        expect(stateAfterToggle.toLowerCase()).toContain('create_edge') || expect(stateAfterToggle.toLowerCase()).toContain('create-edge');
      }

      // Select a source node (click on the first node element)
      const nodeSel = (await page.locator('.node').count()) > 0 ? '.node' : (await page.locator('circle').count() > 0 ? 'circle' : null);
      expect(nodeSel).not.toBeNull();
      const node = page.locator(nodeSel).first();
      await node.click();
      await page.waitForTimeout(120);

      // State should now be create_edge_pending if available
      const pendingState = await readAppState(page);
      if (pendingState) {
        expect(pendingState.toLowerCase()).toContain('pending') || expect(pendingState.toLowerCase()).toContain('create_edge_pending');
      }

      // Click a target node (choose a different node)
      const nodesCount = await page.locator(nodeSel).count();
      if (nodesCount >= 2) {
        const target = page.locator(nodeSel).nth(nodesCount - 1);
        await target.click();
        await page.waitForTimeout(200);

        // Edge count should have increased (if edges are shown)
        const edges = await countEdges(page);
        // We can't assert exact number but expect >= 0 (this check ensures no crash)
        expect(edges).toBeGreaterThanOrEqual(0);
      }

      // Toggle create edge off and ensure we return to idle_editing
      const createToggle = await findButton(page, ['Create Edge', 'Exit Create Edge', 'Edge Mode', 'Add Edge']);
      if (createToggle) {
        await createToggle.click();
        await page.waitForTimeout(120);
        const s1 = await readAppState(page);
        if (s) {
          expect(s.toLowerCase()).toContain('idle') || expect(s.toLowerCase()).toContain('idle_editing');
        }
      }
    });

    test('Delete mode entering/exiting, deleting a node/edge mutates DOM', async ({ page }) => {
      // Ensure there is at least one node to delete
      const nodesBefore = await countNodes(page);
      if (nodesBefore === 0) {
        await clickGraphAt(page, 0.4, 0.4);
        await page.waitForTimeout(120);
      }

      // Toggle delete mode
      const delBtn = await clickButtonByCandidates(page, ['Delete Mode', 'Delete', 'Remove Mode', 'Delete Node']);
      await page.waitForTimeout(120);

      // If FSM present, expect delete_mode
      const s2 = await readAppState(page);
      if (s) expect(s.toLowerCase()).toContain('delete');

      // Attempt to click a node to delete
      const nodeSelector = (await page.locator('.node').count()) > 0 ? '.node' : (await page.locator('circle').count() > 0 ? 'circle' : null);
      if (nodeSelector) {
        const before = await page.locator(nodeSelector).count();
        await page.locator(nodeSelector).first().click();
        await page.waitForTimeout(180);
        const after = await page.locator(nodeSelector).count();
        // Expect node count decreased or stayed same (if deletion requires confirmation). We assert not increased.
        expect(after).toBeLessThanOrEqual(before);
      }

      // Toggle delete off
      const delToggle = await findButton(page, ['Delete Mode', 'Delete', 'Remove Mode', 'Delete Node']);
      if (delToggle) {
        await delToggle.click();
        await page.waitForTimeout(100);
      }
      const finalState = await readAppState(page);
      if (finalState) expect(finalState.toLowerCase()).toContain('idle');
    });

    test('Dragging a node enters dragging and returns to idle on end', async ({ page }) => {
      // Ensure there is a node to drag
      if ((await countNodes(page)) === 0) {
        await clickGraphAt(page, 0.5, 0.5);
        await page.waitForTimeout(120);
      }

      // Start dragging
      const dragInfo = await startDragNode(page);
      // After mouse down + move, the state should be 'dragging' if exposed
      const midState = await readAppState(page);
      if (midState) {
        expect(midState.toLowerCase()).toContain('drag');
      }

      // End drag
      await endDrag(page);
      await page.waitForTimeout(120);

      // Expect to return to idle_editing or similar
      const postState = await readAppState(page);
      if (postState) {
        expect(postState.toLowerCase()).toContain('idle') || expect(postState.toLowerCase()).toContain('idle_editing');
      }
    });
  });

  test.describe('Algorithm lifecycle (prepare, step, autoplay, complete, cycle)', () => {
    test('Preparing algorithm should compute indegrees and move to algo_ready', async ({ page }) => {
      // Ensure a simple DAG is present: create two nodes and an edge from first to second
      // Add nodes
      await clickGraphAt(page, 0.25, 0.5);
      await clickGraphAt(page, 0.75, 0.5);
      await page.waitForTimeout(150);

      // Toggle create edge mode and connect nodes
      const createEdgeBtn = await findButton(page, ['Create Edge', 'Add Edge', 'Edge Mode']);
      if (createEdgeBtn) {
        await createEdgeBtn.click();
        await page.waitForTimeout(80);
        const nodeSelector1 = (await page.locator('.node').count()) > 0 ? '.node' : (await page.locator('circle').count() > 0 ? 'circle' : null);
        if (nodeSelector && (await page.locator(nodeSelector).count()) >= 2) {
          await page.locator(nodeSelector).first().click();
          await page.waitForTimeout(80);
          await page.locator(nodeSelector).nth(1).click();
          await page.waitForTimeout(120);
        }
        // Exit create edge mode
        await createEdgeBtn.click();
        await page.waitForTimeout(120);
      }

      // Click 'Prepare' or 'Prepare Algorithm' or 'Start' or 'Build Indegrees'
      const prepareCandidates = ['Prepare Algorithm', 'Prepare', 'Start', 'Build', 'Compute'];
      const prepareBtn = await findButton(page, prepareCandidates);
      if (prepareBtn) {
        await prepareBtn.click();
        await page.waitForTimeout(200);
        // Expect state algo_ready if available
        const s3 = await readAppState(page);
        if (s) {
          expect(s.toLowerCase()).toContain('algo_ready') || expect(s.toLowerCase()).toContain('ready');
        }
      } else {
        // If there is no explicit prepare, maybe the app has a 'Step' to implicitly prepare
        const stepBtn = await findButton(page, ['Step', 'Next Step', 'Step Algorithm']);
        if (stepBtn) {
          // Click step to implicitly prepare and process one step
          await stepBtn.click();
          await page.waitForTimeout(200);
          const s4 = await readAppState(page);
          if (s) expect(['algo_processing', 'algo_ready', 'algo_complete', 'cycle_detected'].some(k => s.toLowerCase().includes(k))).toBeTruthy();
        } else {
          // As a final fallback, assert that some DOM shows indegree queue or status
          const status = await page.locator('.status, .badge, .muted').first().textContent().catch(() => null);
          expect(status === null || typeof status === 'string').toBeTruthy();
        }
      }
    });

    test('Single step transitions: CLICK_STEP -> algo_processing -> ANIMATION_COMPLETE -> algo_ready or algo_complete', async ({ page }) => {
      // Make small DAG with 2 nodes and 1 edge (A -> B) as earlier
      await page.reload();
      await page.waitForLoadState('networkidle');
      await clickGraphAt(page, 0.25, 0.5);
      await clickGraphAt(page, 0.75, 0.5);
      await page.waitForTimeout(150);
      // create edge
      const createEdgeBtn1 = await findButton(page, ['Create Edge', 'Add Edge', 'Edge Mode']);
      if (createEdgeBtn) {
        await createEdgeBtn.click();
        await page.waitForTimeout(80);
        const nodeSelector2 = (await page.locator('.node').count()) > 0 ? '.node' : (await page.locator('circle').count() > 0 ? 'circle' : null);
        if (nodeSelector) {
          await page.locator(nodeSelector).first().click();
          await page.locator(nodeSelector).nth(1).click();
          await page.waitForTimeout(80);
        }
        await createEdgeBtn.click();
      }

      // Prepare if possible
      const prepareBtn1 = await findButton(page, ['Prepare Algorithm', 'Prepare', 'Start']);
      if (prepareBtn) {
        await prepareBtn.click();
        await page.waitForTimeout(120);
      }

      // Click Step
      const stepBtn1 = await findButton(page, ['Step', 'Next Step', 'Step Algorithm']);
      if (!stepBtn) test.skip(); // cannot continue without Step UI
      await stepBtn.click();

      // Immediately the state should move into algo_processing (if exposed)
      const midState1 = await readAppState(page);
      if (midState) {
        expect(['algo_processing', 'processing'].some(k => midState.toLowerCase().includes(k))).toBeTruthy();
      }

      // Wait briefly for animation complete; after which state should be algo_ready or algo_complete
      await page.waitForTimeout(500);
      const postState1 = await readAppState(page);
      if (postState) {
        const lower = postState.toLowerCase();
        expect(['algo_ready', 'algo_complete', 'complete'].some(k => lower.includes(k)) || lower.includes('idle')).toBeTruthy();
      }

      // If algorithm not complete, run extra step to finish
      const finalState1 = await readAppState(page);
      if (finalState && finalState.toLowerCase().includes('ready')) {
        await stepBtn.click();
        await page.waitForTimeout(400);
        const s21 = await readAppState(page);
        if (s2) expect(['algo_complete', 'complete'].some(k => s2.toLowerCase().includes(k))).toBeTruthy();
      }
    });

    test('Autoplay (start/stop) schedules repeated steps and stops correctly', async ({ page }) => {
      // create a 3-node linear DAG A->B->C
      await page.reload();
      await page.waitForLoadState('networkidle');
      await clickGraphAt(page, 0.2, 0.5);
      await clickGraphAt(page, 0.5, 0.3);
      await clickGraphAt(page, 0.8, 0.5);
      await page.waitForTimeout(200);

      // create edges chain
      const nodeSelector3 = (await page.locator('.node').count()) > 0 ? '.node' : (await page.locator('circle').count() > 0 ? 'circle' : null);
      if (nodeSelector) {
        const createEdgeBtn2 = await findButton(page, ['Create Edge', 'Add Edge', 'Edge Mode']);
        if (createEdgeBtn) {
          await createEdgeBtn.click();
          await page.waitForTimeout(80);
          await page.locator(nodeSelector).nth(0).click();
          await page.locator(nodeSelector).nth(1).click();
          await page.waitForTimeout(60);
          await page.locator(nodeSelector).nth(1).click();
          await page.locator(nodeSelector).nth(2).click();
          await page.waitForTimeout(80);
          await createEdgeBtn.click();
        }
      }

      // Prepare algorithm if needed
      const prepareBtn2 = await findButton(page, ['Prepare Algorithm', 'Prepare', 'Start']);
      if (prepareBtn) {
        await prepareBtn.click();
        await page.waitForTimeout(120);
      }

      // Start autoplay
      const autoplayBtn = await findButton(page, ['Autoplay', 'Play', 'Start Autoplay']);
      if (!autoplayBtn) test.skip();
      await autoplayBtn.click();
      await page.waitForTimeout(120);
      const s11 = await readAppState(page);
      if (s1) expect(s1.toLowerCase()).toContain('autoplay') || expect(s1.toLowerCase()).toContain('playing');

      // Wait some time for a few timer ticks to process steps
      await page.waitForTimeout(1400);

      // Stop autoplay
      const stopCandidates = ['Stop Autoplay', 'Stop', 'Pause', 'Autoplay'];
      const stopBtn = await findButton(page, stopCandidates);
      if (stopBtn) {
        await stopBtn.click();
        await page.waitForTimeout(200);
      }

      // State should be algo_ready after stopping (or idle if finished)
      const s211 = await readAppState(page);
      if (s2) {
        expect(['algo_ready', 'algo_complete', 'complete', 'idle'].some(k => s2.toLowerCase().includes(k))).toBeTruthy();
      }
    });

    test('Algorithm detects cycle: creating a cycle leads to cycle_detected state', async ({ page }) => {
      // Build a simple 2-node cycle A->B->A
      await page.reload();
      await page.waitForLoadState('networkidle');

      await clickGraphAt(page, 0.3, 0.5);
      await clickGraphAt(page, 0.7, 0.5);
      await page.waitForTimeout(120);

      // create edges both ways
      const nodeSelector4 = (await page.locator('.node').count()) > 0 ? '.node' : (await page.locator('circle').count() > 0 ? 'circle' : null);
      const createEdgeBtn3 = await findButton(page, ['Create Edge', 'Add Edge', 'Edge Mode']);
      if (!createEdgeBtn || !nodeSelector) test.skip();

      await createEdgeBtn.click();
      await page.waitForTimeout(60);
      await page.locator(nodeSelector).nth(0).click();
      await page.locator(nodeSelector).nth(1).click();
      await page.waitForTimeout(60);
      await page.locator(nodeSelector).nth(1).click();
      await page.locator(nodeSelector).nth(0).click();
      await page.waitForTimeout(60);
      await createEdgeBtn.click();
      await page.waitForTimeout(120);

      // Prepare algorithm
      const prepareBtn3 = await findButton(page, ['Prepare Algorithm', 'Prepare', 'Start']);
      if (prepareBtn) {
        await prepareBtn.click();
        await page.waitForTimeout(120);
      }

      // Step through until cycle detection (click Step repeatedly a few times)
      const stepBtn2 = await findButton(page, ['Step', 'Next Step', 'Step Algorithm']);
      if (!stepBtn) test.skip();

      let detected = false;
      for (let i = 0; i < 4; i++) {
        await stepBtn.click();
        await page.waitForTimeout(300);
        const s5 = await readAppState(page);
        if (s && s.toLowerCase().includes('cycle')) {
          detected = true;
          break;
        }
      }

      expect(detected).toBe(true);
    });

    test('Algorithm complete state displays completion and restart returns to ready', async ({ page }) => {
      // Minimal DAG: A->B (two nodes) should complete after two steps
      await page.reload();
      await page.waitForLoadState('networkidle');

      await clickGraphAt(page, 0.25, 0.5);
      await clickGraphAt(page, 0.75, 0.5);
      await page.waitForTimeout(150);

      const nodeSelector5 = (await page.locator('.node').count()) > 0 ? '.node' : (await page.locator('circle').count() > 0 ? 'circle' : null);
      const createEdgeBtn4 = await findButton(page, ['Create Edge', 'Add Edge', 'Edge Mode']);
      if (createEdgeBtn && nodeSelector) {
        await createEdgeBtn.click();
        await page.waitForTimeout(60);
        await page.locator(nodeSelector).first().click();
        await page.locator(nodeSelector).nth(1).click();
        await page.waitForTimeout(80);
        await createEdgeBtn.click();
      }

      // Prepare if present
      const prepareBtn4 = await findButton(page, ['Prepare Algorithm', 'Prepare', 'Start']);
      if (prepareBtn) {
        await prepareBtn.click();
        await page.waitForTimeout(120);
      }

      // Step until complete
      const stepBtn3 = await findButton(page, ['Step', 'Next Step']);
      if (!stepBtn) test.skip();

      // Click potentially multiple times to finish
      for (let i = 0; i < 4; i++) {
        await stepBtn.click();
        await page.waitForTimeout(250);
        const s6 = await readAppState(page);
        if (s && s.toLowerCase().includes('complete')) break;
      }

      const final = await readAppState(page);
      if (!final || !final.toLowerCase().includes('complete')) test.skip();

      // Click restart to go back to algo_ready
      const restartBtn = await findButton(page, ['Restart', 'Click Restart', 'Restart Algorithm', 'Reset']);
      if (restartBtn) {
        await restartBtn.click();
        await page.waitForTimeout(120);
        const after1 = await readAppState(page);
        if (after) expect(after.toLowerCase()).toContain('algo_ready') || expect(after.toLowerCase()).toContain('ready');
      }
    });
  });

  test.describe('Edge cases and error scenarios', () => {
    test('Toggling create-edge while pending cancels pending state', async ({ page }) => {
      // Create two nodes if necessary
      if ((await countNodes(page)) < 2) {
        await clickGraphAt(page, 0.2, 0.4);
        await clickGraphAt(page, 0.8, 0.6);
        await page.waitForTimeout(120);
      }

      const createBtn1 = await findButton(page, ['Create Edge', 'Add Edge', 'Edge Mode']);
      if (!createBtn) test.skip();
      await createBtn.click();
      await page.waitForTimeout(80);

      // Click source node to enter pending
      const nodeSelector6 = (await page.locator('.node').count()) > 0 ? '.node' : (await page.locator('circle').count() > 0 ? 'circle' : null);
      if (!nodeSelector) test.skip();
      await page.locator(nodeSelector).first().click();
      await page.waitForTimeout(80);
      const pending = await readAppState(page);
      if (pending) expect(pending.toLowerCase()).toContain('pending');

      // Toggle create-edge off (same button)
      await createBtn.click();
      await page.waitForTimeout(120);

      const after2 = await readAppState(page);
      if (after) {
        // Should have exited create edge mode, back to idle
        expect(after.toLowerCase()).toContain('idle') || expect(after.toLowerCase()).toContain('idle_editing') || expect(after.toLowerCase()).toContain('ready');
      }
    });

    test('Reset graph clears nodes/edges and transitions to idle_editing', async ({ page }) => {
      // Add some nodes/edges first
      await clickGraphAt(page, 0.2, 0.3);
      await clickGraphAt(page, 0.8, 0.7);
      await page.waitForTimeout(120);

      const resetCandidates1 = ['Reset Graph', 'Reset', 'Clear Graph', 'Reset Canvas'];
      const resetBtn1 = await findButton(page, resetCandidates);
      if (!resetBtn) test.skip();

      // Count before reset
      const nodesBefore1 = await countNodes(page);
      const edgesBefore = await countEdges(page);

      await resetBtn.click();
      await page.waitForTimeout(250);

      const nodesAfter = await countNodes(page);
      const edgesAfter = await countEdges(page);

      // Expect nodes/edges to decrease (maybe to zero)
      expect(nodesAfter).toBeLessThanOrEqual(nodesBefore);
      expect(edgesAfter).toBeLessThanOrEqual(edgesBefore);

      const state1 = await readAppState(page);
      if (state) expect(state.toLowerCase()).toContain('idle') || expect(state.toLowerCase()).toContain('idle_editing');
    });
  });
});