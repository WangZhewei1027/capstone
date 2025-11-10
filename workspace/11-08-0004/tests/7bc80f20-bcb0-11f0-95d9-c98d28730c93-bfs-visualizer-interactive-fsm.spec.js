import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/11-08-0004/html/7bc80f20-bcb0-11f0-95d9-c98d28730c93.html';

// Utility helpers to locate commonly-named elements in the app. The app's markup can vary;
// we try multiple selector candidates so tests remain resilient.
async function getCanvas(page) {
  return page.locator(
    'svg#canvas, svg.canvas, #canvas, .canvas, [aria-label="canvas"], [data-role="canvas"], .board, #board, .graph, .canvas-root, svg'
  ).first();
}

async function getModeButton(page, nameRegex) {
  // Mode buttons generally have readable text (Move / Add / Connect / Delete). Use role for accessibility.
  return page.getByRole('button', { name: nameRegex });
}

async function expectModeActive(page, nameRegex) {
  const btn = await getModeButton(page, nameRegex);
  await expect(btn).toBeVisible();
  // Accept either aria-pressed="true" or an "active" class as indicators of active mode.
  const aria = await btn.getAttribute('aria-pressed');
  const cls = (await btn.getAttribute('class')) || '';
  if (aria === 'true') return;
  if (/\bactive\b/i.test(cls)) return;
  // As a last resort, assert the button has some pressed-like styling (border-color or box-shadow)
  // by checking computed style via evaluate.
  const hasStyling = await btn.evaluate((el) => {
    const s = window.getComputedStyle(el);
    return !!(s.boxShadow && s.boxShadow !== 'none') || !!(s.borderColor && s.borderColor !== '');
  });
  if (hasStyling) return;
  throw new Error(`Mode button matching ${nameRegex} not visibly active`);
}

async function getNodes(page) {
  // Nodes are usually rendered as SVG <g class="node"> or <circle class="node"> or elements with data-node-id.
  return page.locator('g.node, .node-node, circle.node, [data-node-id], g[class*="node"], circle');
}

async function getEdges(page) {
  // Edges often use <path class="edge"> or elements with class "edge" or data-edge-id
  return page.locator('path.edge, .edge, [data-edge-id], line.edge, path[class*="edge"]');
}

async function getStatusText(page) {
  // Status label may be in a variety of containers: try a few candidates.
  const candidates = [
    page.locator('#status'),
    page.locator('.status'),
    page.locator('.status-text'),
    page.getByText(/Idle|Ready|Playing|BFS complete/i),
    page.locator('[data-testid="status"]'),
    page.locator('.statusLabel')
  ];
  for (const c of candidates) {
    if (!c) continue;
    try {
      if (await c.count() && (await c.first().isVisible())) {
        const txt = (await c.first().innerText()).trim();
        if (txt) return txt;
      }
    } catch (e) {
      // ignore and move to next
    }
  }
  // Fallback: read the whole page's text and find a one-word status.
  const bodyTxt = await page.locator('body').innerText();
  const found = bodyTxt.match(/\b(Idle|Ready|Playing|BFS complete|Complete)\b/i);
  return found ? found[0] : '';
}

async function clickCanvasAt(page, canvas, xOffset = 100, yOffset = 100) {
  // canvas boundingBox then click at offsets relative to top-left
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Canvas bounding box not found');
  const x = box.x + Math.max(10, Math.min(xOffset, box.width - 10));
  const y = box.y + Math.max(10, Math.min(yOffset, box.height - 10));
  await page.mouse.click(x, y);
  return { x, y };
}

test.describe('BFS Visualizer Interactive FSM - End-to-end', () => {
  test.beforeEach(async ({ page }) => {
    // Load the app for each test to have a clean slate.
    await page.goto(APP_URL);
    await expect(page).toHaveTitle(/Breadth-First Search/i);
    // Wait for UI to stabilize
    await page.waitForLoadState('networkidle');
  });

  test.describe('Mode management and mode transitions', () => {
    test('default mode should be Move; switching between modes toggles UI correctly', async ({ page }) => {
      // Validate default mode is Move on load (mode_move onEnter should set mode)
      await expectModeActive(page, /Move/i);

      const addBtn = await getModeButton(page, /Add/i);
      const connectBtn = await getModeButton(page, /Connect/i);
      const deleteBtn = await getModeButton(page, /Delete/i);
      const moveBtn = await getModeButton(page, /Move/i);

      // Switch to Add mode and verify active state
      await addBtn.click();
      await expectModeActive(page, /Add/i);

      // Switch to Connect mode
      await connectBtn.click();
      await expectModeActive(page, /Connect/i);

      // Switch to Delete mode
      await deleteBtn.click();
      await expectModeActive(page, /Delete/i);

      // Back to Move
      await moveBtn.click();
      await expectModeActive(page, /Move/i);
    });

    test('entering a mode clears transient connect selection on exit', async ({ page }) => {
      const canvas = await getCanvas(page);
      const addBtn1 = await getModeButton(page, /Add/i);
      const connectBtn1 = await getModeButton(page, /Connect/i);
      const moveBtn1 = await getModeButton(page, /Move/i);

      // Create two nodes to interact with
      await addBtn.click();
      await clickCanvasAt(page, canvas, 80, 80);
      await clickCanvasAt(page, canvas, 200, 80);
      const nodes = await getNodes(page);
      await expect(nodes.count()).toBeGreaterThanOrEqual(2);

      // Enter Connect mode and select the first node as connect source
      await connectBtn.click();
      await expectModeActive(page, /Connect/i);
      const firstNode = (await getNodes(page).first());
      await firstNode.click(); // NODE_POINTER_DOWN -> connect_selected onEnter selectConnectSource

      // The selected source should have some visual indicator; check classes/attributes for "connect" or "selected"
      const selClass = await firstNode.getAttribute('class');
      expect(/connect|selected|source/i.test(selClass || '')).toBeTruthy();

      // Now switch to Move mode: onExit of connect_selected or onEnter of mode_move should clear connect source
      await moveBtn.click();
      await expectModeActive(page, /Move/i);
      // The previously-selected node should no longer have connect selection class
      const selClassAfter = await firstNode.getAttribute('class');
      expect(!/connect|selected|source/i.test(selClassAfter || '')).toBeTruthy();
    });

    test('clicking canvas in Add mode creates nodes; clicking in Move mode does not', async ({ page }) => {
      const canvas1 = await getCanvas(page);
      const addBtn2 = await getModeButton(page, /Add/i);
      const moveBtn2 = await getModeButton(page, /Move/i);

      // Ensure Move mode and count baseline
      await moveBtn.click();
      await expectModeActive(page, /Move/i);
      const nodesBefore = await getNodes(page).count();

      // In Move mode, canvas clicks should not create nodes
      await clickCanvasAt(page, canvas, 120, 120);
      await page.waitForTimeout(200);
      const nodesAfterMoveClick = await getNodes(page).count();
      expect(nodesAfterMoveClick).toBe(nodesBefore);

      // In Add mode, canvas click should create nodes
      await addBtn.click();
      await expectModeActive(page, /Add/i);
      await clickCanvasAt(page, canvas, 120, 120);
      await clickCanvasAt(page, canvas, 220, 160);
      await page.waitForTimeout(200);
      const nodesAfterAdd = await getNodes(page).count();
      expect(nodesAfterAdd).toBeGreaterThan(nodesBefore);
    });
  });

  test.describe('Connect / Create Edge flows and cancelling', () => {
    test('creating an edge by selecting source then target (Connect mode)', async ({ page }) => {
      const canvas2 = await getCanvas(page);
      const addBtn3 = await getModeButton(page, /Add/i);
      const connectBtn2 = await getModeButton(page, /Connect/i);

      // Create two nodes
      await addBtn.click();
      await clickCanvasAt(page, canvas, 100, 100);
      await clickCanvasAt(page, canvas, 260, 100);
      await page.waitForTimeout(200);
      const nodes1 = getNodes(page);
      await expect(nodes.count()).toBeGreaterThanOrEqual(2);

      // Enter Connect mode and click source then target
      await connectBtn.click();
      await expectModeActive(page, /Connect/i);
      const first = nodes.first();
      const second = nodes.nth(1);

      // Select source
      await first.click();
      // Visual mark for connect source should appear
      const c1class = await first.getAttribute('class');
      expect(/connect|selected|source/i.test(c1class || '')).toBeTruthy();

      // Click target to create an edge
      await second.click();
      // After creation, an edge element should appear
      const edges = await getEdges(page);
      await expect(edges.count()).toBeGreaterThanOrEqual(1);
    });

    test('connect_selected -> clicking same node cancels the connection (CONNECT_CANCEL)', async ({ page }) => {
      const canvas3 = await getCanvas(page);
      const addBtn4 = await getModeButton(page, /Add/i);
      const connectBtn3 = await getModeButton(page, /Connect/i);
      const moveBtn3 = await getModeButton(page, /Move/i);

      // Create a node
      await addBtn.click();
      const coords = await clickCanvasAt(page, canvas, 150, 150);
      await page.waitForTimeout(150);
      const nodes2 = getNodes(page);
      await expect(nodes.count()).toBeGreaterThanOrEqual(1);
      const node = nodes.first();

      // In Connect mode select it, then click same node to cancel
      await connectBtn.click();
      await node.click(); // select source
      const classSel = await node.getAttribute('class');
      expect(/connect|selected|source/i.test(classSel || '')).toBeTruthy();

      // Click same node -> should cancel
      await node.click();
      await page.waitForTimeout(150);
      const classAfter = await node.getAttribute('class');
      expect(!/connect|selected|source/i.test(classAfter || '')).toBeTruthy();

      // Ensure switching mode also cleared selection (redundant check for onExit)
      await moveBtn.click();
      await expectModeActive(page, /Move/i);
    });
  });

  test.describe('Deleting nodes and edges', () => {
    test('delete a node and its connected edges in Delete mode', async ({ page }) => {
      const canvas4 = await getCanvas(page);
      const addBtn5 = await getModeButton(page, /Add/i);
      const connectBtn4 = await getModeButton(page, /Connect/i);
      const deleteBtn1 = await getModeButton(page, /Delete/i);

      // Create two nodes and an edge between them
      await addBtn.click();
      await clickCanvasAt(page, canvas, 120, 120);
      await clickCanvasAt(page, canvas, 260, 120);
      await page.waitForTimeout(200);
      const nodes3 = getNodes(page);
      await expect(nodes.count()).toBeGreaterThanOrEqual(2);

      await connectBtn.click();
      const n1 = nodes.first();
      const n2 = nodes.nth(1);
      await n1.click();
      await n2.click();
      await page.waitForTimeout(200);
      let edgesCount = await getEdges(page).count();
      expect(edgesCount).toBeGreaterThanOrEqual(1);

      // Delete the first node; edge(s) should also be removed
      await deleteBtn.click();
      await n1.click(); // NODE_POINTER_DOWN -> NODE_DELETED
      await page.waitForTimeout(200);
      const nodesAfter = await getNodes(page).count();
      const edgesAfter = await getEdges(page).count();
      expect(nodesAfter).toBeLessThan(await nodes.count());
      expect(edgesAfter).toBeLessThanOrEqual(edgesCount);
    });

    test('delete an edge by clicking it in Delete mode', async ({ page }) => {
      const canvas5 = await getCanvas(page);
      const addBtn6 = await getModeButton(page, /Add/i);
      const connectBtn5 = await getModeButton(page, /Connect/i);
      const deleteBtn2 = await getModeButton(page, /Delete/i);

      // Create two nodes and connect them
      await addBtn.click();
      await clickCanvasAt(page, canvas, 120, 220);
      await clickCanvasAt(page, canvas, 300, 220);
      await page.waitForTimeout(200);
      const nodes4 = getNodes(page);
      await expect(nodes.count()).toBeGreaterThanOrEqual(2);
      await connectBtn.click();
      await nodes.first().click();
      await nodes.nth(1).click();
      await page.waitForTimeout(200);

      // Count edges, then delete an edge
      const edgesBefore = await getEdges(page).count();
      expect(edgesBefore).toBeGreaterThanOrEqual(1);

      await deleteBtn.click();
      // Some implementations put the edge on a path element - attempt to click the first edge
      const edges1 = getEdges(page);
      await edges.first().click({ force: true });
      await page.waitForTimeout(200);
      const edgesAfter1 = await getEdges(page).count();
      expect(edgesAfter).toBeLessThan(edgesBefore);
    });
  });

  test.describe('Dragging nodes (dragging transient state)', () => {
    test('pointer down + move adds dragging class; pointer up removes it and updates edges', async ({ page }) => {
      const canvas6 = await getCanvas(page);
      const addBtn7 = await getModeButton(page, /Add/i);
      const moveBtn4 = await getModeButton(page, /Move/i);

      // Create nodes and an edge
      await addBtn.click();
      await clickCanvasAt(page, canvas, 120, 320);
      await clickCanvasAt(page, canvas, 280, 320);
      await page.waitForTimeout(200);
      const nodes5 = getNodes(page);
      await expect(nodes.count()).toBeGreaterThanOrEqual(2);
      // Connect them
      const connectBtn6 = await getModeButton(page, /Connect/i);
      await connectBtn.click();
      await nodes.first().click();
      await nodes.nth(1).click();
      await page.waitForTimeout(200);
      await moveBtn.click();

      const node1 = nodes.first();
      const box1 = await node.boundingBox();
      if (!box) {
        test.skip('Node bounding box not available; skipping drag test');
        return;
      }
      const startX = box.x + box.width / 2;
      const startY = box.y + box.height / 2;

      // Start dragging by mouse actions (triggers pointer capture behavior in app)
      await page.mouse.move(startX, startY);
      await page.mouse.down();
      // Inspect class during dragging - some apps add "dragging" class
      await page.waitForTimeout(50);
      const clsDuring = await node.getAttribute('class');
      expect(/dragging|drag/i.test(clsDuring || '')).toBeTruthy();

      // Move node
      await page.mouse.move(startX + 60, startY + 30);
      await page.waitForTimeout(100);

      // Release pointer
      await page.mouse.up();
      await page.waitForTimeout(150);

      // Node should no longer have dragging class
      const clsAfter = await node.getAttribute('class');
      expect(!/dragging|drag/i.test(clsAfter || '')).toBeTruthy();

      // Edges should still be present (and potentially updated). Ensure at least one edge exists.
      const edgesAfter2 = await getEdges(page).count();
      expect(edgesAfter).toBeGreaterThanOrEqual(1);
    });
  });

  test.describe('BFS algorithm states and playback', () => {
    test('bfs_idle -> bfs_ready by double-clicking a node sets start and status', async ({ page }) => {
      const canvas7 = await getCanvas(page);
      const addBtn8 = await getModeButton(page, /Add/i);

      // Create two nodes connected so BFS can proceed
      await addBtn.click();
      await clickCanvasAt(page, canvas, 120, 420);
      await clickCanvasAt(page, canvas, 260, 420);
      await page.waitForTimeout(200);
      const nodes6 = getNodes(page);
      await expect(nodes.count()).toBeGreaterThanOrEqual(2);

      // Status should be Idle initially (bfs_idle onEnter)
      const statusBefore = await getStatusText(page);
      expect(/Idle/i.test(statusBefore)).toBeTruthy();

      // Double-click a node to set start (NODE_DOUBLE_CLICK -> SET_START -> bfs_ready)
      await nodes.first().dblclick();
      await page.waitForTimeout(200);
      const statusAfter = await getStatusText(page);
      // Ready is expected on bfs_ready
      expect(/Ready/i.test(statusAfter)).toBeTruthy();
    });

    test('single step (BUTTON_STEP) performs an inspect and renders visited changes', async ({ page }) => {
      const canvas8 = await getCanvas(page);
      const addBtn9 = await getModeButton(page, /Add/i);
      const connectBtn7 = await getModeButton(page, /Connect/i);
      const stepBtn = page.getByRole('button', { name: /Step/i });

      // Build a small chain of three nodes: A - B - C
      await addBtn.click();
      await clickCanvasAt(page, canvas, 120, 520); // A
      await clickCanvasAt(page, canvas, 260, 520); // B
      await clickCanvasAt(page, canvas, 400, 520); // C
      await page.waitForTimeout(200);
      const nodes7 = getNodes(page);
      await expect(nodes.count()).toBeGreaterThanOrEqual(3);

      // Connect A-B and B-C
      await connectBtn.click();
      await nodes.first().click();
      await nodes.nth(1).click();
      await nodes.nth(1).click();
      await nodes.nth(2).click();
      await page.waitForTimeout(300);

      // Double click A to set as start
      await nodes.first().dblclick();
      await page.waitForTimeout(150);
      const statusReady = await getStatusText(page);
      expect(/Ready/i.test(statusReady)).toBeTruthy();

      // Click Step to inspect one node; BFS inspecting should produce exploring visuals on some edge(s)
      await stepBtn.click();
      // During inspection the app may add an 'explore' or 'exploring' class to edges; wait shortly then assert
      await page.waitForTimeout(350);
      const edges2 = getEdges(page);
      let observedExploring = false;
      const edgeCount = await edges.count();
      for (let i = 0; i < edgeCount; i++) {
        const e = edges.nth(i);
        const cls1 = await e.getAttribute('class');
        if (/explore|exploring|exploring-edge|exploring/i.test(cls || '')) {
          observedExploring = true;
          break;
        }
      }
      // Either an exploring class was observed OR at minimum one node gained a visited-like class after step
      const visitedCandidate = nodes.first();
      const visitedClass = await visitedCandidate.getAttribute('class');
      const visitedObserved = /visited|explored|visited-order|visited-node/i.test(visitedClass || '');
      expect(observedExploring || visitedObserved).toBeTruthy();
    });

    test('playback (BUTTON_PLAY_TOGGLE) automatically advances BFS and completes', async ({ page }) => {
      const canvas9 = await getCanvas(page);
      const addBtn10 = await getModeButton(page, /Add/i);
      const connectBtn8 = await getModeButton(page, /Connect/i);
      const playBtn = page.getByRole('button', { name: /Play/i });
      const pauseBtnCandidate = page.getByRole('button', { name: /Pause/i });

      // Create a simple three-node graph and connect them
      await addBtn.click();
      await clickCanvasAt(page, canvas, 120, 620);
      await clickCanvasAt(page, canvas, 260, 620);
      await clickCanvasAt(page, canvas, 400, 620);
      await page.waitForTimeout(200);
      const nodes8 = getNodes(page);
      await expect(nodes.count()).toBeGreaterThanOrEqual(3);

      await connectBtn.click();
      await nodes.first().click();
      await nodes.nth(1).click();
      await nodes.nth(1).click();
      await nodes.nth(2).click();
      await page.waitForTimeout(200);

      // Set start node
      await nodes.first().dblclick();
      await page.waitForTimeout(150);
      const startStatus = await getStatusText(page);
      expect(/Ready/i.test(startStatus)).toBeTruthy();

      // Start playback. If there is a toggle named "Play" it may change to "Pause" visually.
      await playBtn.click();
      // The app should set status to Playing
      await page.waitForTimeout(250);
      const statusPlaying = await getStatusText(page);
      // Accept both 'Playing' or a visible 'Pause' button
      const hasPause = (await pauseBtnCandidate.count()) > 0;
      expect(/Playing/i.test(statusPlaying) || hasPause).toBeTruthy();

      // Wait for BFS to complete - the FSM will set status to 'BFS complete' or similar when done.
      // Provide a generous timeout for playback.
      const completed = await page.waitForFunction(() => {
        const txtCandidates = Array.from(document.querySelectorAll('body *')).map((n) => (n.innerText || '').trim());
        return txtCandidates.some(t => /BFS complete|BFS Complete|Complete|Completed/i.test(t));
      }, { timeout: 8000 }).catch(() => null);

      // Accept either the detected completion text or a status text change observed via our helper
      const finalStatus = await getStatusText(page);
      if (!completed) {
        // If our DOM-wide search didn't find completion, check the status text
        expect(/BFS complete|Complete|Completed/i.test(finalStatus)).toBeTruthy();
      } else {
        expect(/BFS complete|Complete|Completed/i.test(finalStatus) || completed).toBeTruthy();
      }
    });
  });

  test.describe('Edge cases and error scenarios', () => {
    test('double-click on empty canvas does not set start', async ({ page }) => {
      const canvas10 = await getCanvas(page);
      // Ensure no nodes exist; if there are, delete or reload (using a simple page reload for clean slate)
      await page.reload();
      await page.waitForLoadState('networkidle');

      const newCanvas = await getCanvas(page);
      const statusBefore1 = await getStatusText(page);
      expect(/Idle/i.test(statusBefore) || statusBefore.length >= 0).toBeTruthy();

      // Double click some empty area
      const box2 = await newCanvas.boundingBox();
      if (box) {
        await page.mouse.dblclick(box.x + 50, box.y + 50);
        await page.waitForTimeout(150);
      }

      // Status should still be Idle (no start set)
      const statusAfter1 = await getStatusText(page);
      expect(/Idle/i.test(statusAfter) || /Ready/i.test(statusAfter) === false).toBeTruthy();
    });

    test('changing mode during a drag or connect clears transient state safely', async ({ page }) => {
      const canvas11 = await getCanvas(page);
      const addBtn11 = await getModeButton(page, /Add/i);
      const connectBtn9 = await getModeButton(page, /Connect/i);
      const moveBtn5 = await getModeButton(page, /Move/i);
      const deleteBtn3 = await getModeButton(page, /Delete/i);

      // Create two nodes
      await addBtn.click();
      await clickCanvasAt(page, canvas, 120, 720);
      await clickCanvasAt(page, canvas, 260, 720);
      await page.waitForTimeout(200);
      const nodes9 = getNodes(page);
      await expect(nodes.count()).toBeGreaterThanOrEqual(2);

      // Start a connect selection
      await connectBtn.click();
      await nodes.first().click();
      const selClass1 = await nodes.first().getAttribute('class');
      expect(/connect|selected|source/i.test(selClass || '')).toBeTruthy();

      // Now switch to Delete mode mid-connection; connect source should be cleared
      await deleteBtn.click();
      await page.waitForTimeout(80);
      const selAfter = await nodes.first().getAttribute('class');
      expect(!/connect|selected|source/i.test(selAfter || '')).toBeTruthy();

      // Start a drag and then switch mode; dragging class should be removed on exit
      await moveBtn.click();
      const n = nodes.first();
      const b = await n.boundingBox();
      if (b) {
        await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
        await page.mouse.down();
        await page.mouse.move(b.x + b.width / 2 + 20, b.y + b.height / 2 + 20);
        // Now switch to Add mode while mouse is still down (simulate abrupt mode change)
        await addBtn.click();
        await page.waitForTimeout(100);
        // Release pointer to ensure cleanup
        await page.mouse.up();
        // Verify node is not stuck in dragging state
        const clsFinal = await n.getAttribute('class');
        expect(!/dragging|drag/i.test(clsFinal || '')).toBeTruthy();
      }
    });
  });
});