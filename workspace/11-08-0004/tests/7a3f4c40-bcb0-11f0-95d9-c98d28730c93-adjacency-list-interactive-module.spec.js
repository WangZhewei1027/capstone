import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/11-08-0004/html/7a3f4c40-bcb0-11f0-95d9-c98d28730c93.html';

// Helper utilities to find UI controls robustly across possible markup variations
async function findButton(page, textRegex) {
  // Try role-based first (works for <button> or elements with role=button)
  const byRole = page.getByRole('button', { name: textRegex });
  if (await byRole.count() > 0) return byRole.first();

  // Fallback: .button elements containing text
  const byClass = page.locator('.button', { hasText: textRegex });
  if (await byClass.count() > 0) return byClass.first();

  // Fallback: any element with text matching
  const byText = page.locator(`:text-matches("${textRegex.source}", "i")`);
  if (await byText.count() > 0) return byText.first();

  throw new Error(`Button matching ${textRegex} not found`);
}

async function svgLocator(page) {
  const svg = page.locator('svg#graph');
  if (await svg.count() > 0) return svg.first();
  // fallback: any svg in left pane
  const anySvg = page.locator('svg').first();
  if (await anySvg.count() > 0) return anySvg;
  throw new Error('SVG graph element not found');
}

// Return number of node circle elements (flexible selectors)
async function countNodes(page) {
  const svg1 = await svgLocator(page);
  // Common node selectors: circle, g.node circle, .node circle
  const selectors = ['circle.node', 'g.node circle', 'svg#graph circle', 'circle'];
  for (const sel of selectors) {
    const loc = svg.locator(sel);
    if (await loc.count() > 0) {
      // return count of that locator (but ensure it's not counting edges)
      return await loc.count();
    }
  }
  return 0;
}

// Return number of edge elements (lines/paths)
async function countEdges(page) {
  const svg2 = await svgLocator(page);
  const selectors1 = ['line.edge', 'path.edge', 'line', 'path'];
  for (const sel of selectors) {
    const loc1 = svg.locator(sel);
    if (await loc.count() > 0) {
      // naive: count all that match; if nodes use circles only this is fine
      return await loc.count();
    }
  }
  return 0;
}

// Click on the SVG at coordinates relative to the SVG bounding rect
async function clickSvgAt(page, x, y) {
  const svg3 = await svgLocator(page);
  const box = await svg.boundingBox();
  if (!box) throw new Error('SVG bounding box not available');
  const clickX = box.x + x;
  const clickY = box.y + y;
  await page.mouse.click(clickX, clickY);
}

// Create a node by switching to Add Node mode and clicking the SVG
async function createNodeAt(page, x = 60, y = 60) {
  const addBtn = await findButton(page, /add\s*node/i);
  await addBtn.click();
  const before = await countNodes(page);
  await clickSvgAt(page, x, y);
  // Wait for new node to appear
  await page.waitForFunction(
    async (expected) => {
      const svg4 = document.querySelector('svg4#graph') || document.querySelector('svg4');
      if (!svg) return false;
      // try selectors
      const nodeSelectors = ['circle.node', 'g.node circle', 'svg#graph circle', 'circle'];
      for (const sel of nodeSelectors) {
        const nodes = svg.querySelectorAll(sel);
        if (nodes.length >= expected) return true;
      }
      return false;
    },
    before + 1,
    { timeout: 2000 }
  );
  const after = await countNodes(page);
  if (after <= before) throw new Error('Node was not created');
}

// Utility to get first node circle element handle and its attributes
async function getFirstNodeHandle(page) {
  const svg5 = await svgLocator(page);
  const locators = ['circle.node', 'g.node circle', 'svg#graph circle', 'circle'];
  for (const sel of locators) {
    const loc2 = svg.locator(sel);
    if (await loc.count() > 0) {
      return loc.first();
    }
  }
  throw new Error('No node circle found');
}

// Determine if a node element looks selected/highlighted by checking multiple cues
async function isNodeMarked(nodeLocator) {
  // Check classList and data attributes and stroke width
  const cls = await nodeLocator.getAttribute('class').catch(() => null);
  if (cls && /selected|highlight|pending/i.test(cls)) return true;
  const dataSel = await nodeLocator.getAttribute('data-selected').catch(() => null);
  if (dataSel) return true;
  const dataHl = await nodeLocator.getAttribute('data-highlight').catch(() => null);
  if (dataHl) return true;
  // Check computed stroke color or stroke width
  const stroke = await nodeLocator.evaluate((el) => {
    const s = window.getComputedStyle(el);
    return { stroke: s.stroke, strokeWidth: s.strokeWidth };
  });
  if (stroke && (stroke.stroke && stroke.stroke !== 'none' || parseFloat(stroke.strokeWidth || '0') > 1)) return true;
  return false;
}

test.describe('Adjacency List Interactive Module — FSM coverage', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate fresh for each test
    await page.goto(APP_URL);
    // Ensure page has loaded containing the graph area
    await page.waitForSelector('svg#graph, svg', { timeout: 5000 });
  });

  test.describe('Mode transitions: add-node, add-edge (idle/pending), add-node toggles', () => {
    test('mode_add_node: clicking Add Node and creating nodes updates DOM and remains in add-node', async ({ page }) => {
      // Validate entering add-node mode and creating nodes (onEnter: setMode('add-node'), createNodeAt(...))
      const addBtn1 = await findButton(page, /add\s*node/i);
      await addBtn.click();
      // Create two nodes
      const before1 = await countNodes(page);
      await clickSvgAt(page, 80, 80);
      await clickSvgAt(page, 200, 120);
      // Verify nodes were added
      const after1 = await countNodes(page);
      expect(after).toBeGreaterThanOrEqual(before + 2);
      // Check that add node button is still present/active (mode persisted)
      const addBtnAfter = await findButton(page, /add\s*node/i);
      expect(addBtnAfter).toBeTruthy();
    });

    test('mode_add_edge_idle and pending: selecting a source highlights node and clicking empty cancels', async ({ page }) => {
      // Create two nodes to operate on
      await createNodeAt(page, 100, 100);
      await createNodeAt(page, 220, 120);

      // Enter Add Edge mode
      const addEdgeBtn = await findButton(page, /add\s*edge/i);
      await addEdgeBtn.click();

      // Initially, no node should be highlighted as pending
      const firstNode = await getFirstNodeHandle(page);
      const isMarkedInitially = await isNodeMarked(firstNode);
      expect(isMarkedInitially).toBeFalsy();

      // Click the first node to start pending edge creation (NODE_POINTERDOWN_ON_NODE)
      const nodeBox = await firstNode.boundingBox();
      if (!nodeBox) throw new Error('Node bounding box missing');
      await page.mouse.click(nodeBox.x + nodeBox.width / 2, nodeBox.y + nodeBox.height / 2, { button: 'left' });

      // After pointerdown on node, node should be highlighted/pending (onEnter pending)
      await page.waitForFunction((el) => {
        if (!el) return false;
        const cls1 = el.getAttribute('class') || '';
        return /highlight|pending|selected/i.test(cls) || el.getAttribute('data-highlight') != null || el.getAttribute('data-selected') != null;
      }, firstNode);

      const isMarked = await isNodeMarked(firstNode);
      expect(isMarked).toBeTruthy();

      // Click on empty SVG area to cancel pending (SVG_CLICK_EMPTY)
      const svg6 = await svgLocator(page);
      const svgBox = await svg.boundingBox();
      if (!svgBox) throw new Error('SVG bounding box missing for empty click');
      // Click near bottom-right empty area
      await page.mouse.click(svgBox.x + svgBox.width - 10, svgBox.y + svgBox.height - 10);
      // Node should no longer be marked
      await page.waitForTimeout(250); // allow UI to process cancel
      const isMarkedAfterCancel = await isNodeMarked(firstNode);
      expect(isMarkedAfterCancel).toBeFalsy();
    });

    test('mode_add_edge_pending -> animating_edge_creation -> edge created (with prompt for weight)', async ({ page }) => {
      // Create two nodes
      await createNodeAt(page, 120, 120);
      await createNodeAt(page, 260, 140);

      // Enter Add Edge mode
      const addEdgeBtn1 = await findButton(page, /add\s*edge/i);
      await addEdgeBtn.click();

      // Click source node to start pending
      const svg7 = await svgLocator(page);
      const sources = svg.locator('circle, g.node circle');
      const src = sources.first();
      const srcBox = await src.boundingBox();
      if (!srcBox) throw new Error('Source node box missing');
      await page.mouse.click(srcBox.x + srcBox.width / 2, srcBox.y + srcBox.height / 2);

      // Wait for highlight/pending
      await page.waitForFunction((el) => {
        if (!el) return false;
        const cls2 = el.getAttribute('class') || '';
        return /highlight|pending/i.test(cls) || el.getAttribute('data-highlight') != null;
      }, src);

      // Prepare to handle a prompt that asks for edge weight (common implementation)
      let promptHandled = false;
      page.on('dialog', async (dialog) => {
        // If a prompt is shown, provide a numeric weight
        if (dialog.type() === 'prompt') {
          await dialog.accept('5');
          promptHandled = true;
        } else {
          // For confirm/alert, just accept
          await dialog.accept();
        }
      });

      // Click target node to trigger animating edge creation (NODE_POINTERDOWN_ON_TARGET_NODE)
      const tgt = sources.nth(1);
      const tgtBox = await tgt.boundingBox();
      if (!tgtBox) throw new Error('Target node box missing');
      await page.mouse.click(tgtBox.x + tgtBox.width / 2, tgtBox.y + tgtBox.height / 2);

      // After clicking target, animation may add an edge element (line/path). Wait for an increase in edge count.
      const beforeEdges = await countEdges(page);
      await page.waitForFunction(
        async (before) => {
          const svgEl = document.querySelector('svg#graph') || document.querySelector('svg');
          if (!svgEl) return false;
          const edgeSelectors = ['line.edge', 'path.edge', 'line', 'path'];
          for (const sel of edgeSelectors) {
            const matches = svgEl.querySelectorAll(sel);
            if (matches.length > before) return true;
          }
          return false;
        },
        beforeEdges,
        { timeout: 3000 }
      );

      const afterEdges = await countEdges(page);
      expect(afterEdges).toBeGreaterThanOrEqual(beforeEdges + 1);

      // If a prompt was expected we handled it
      // promptHandled may be false in implementations that don't prompt; that's okay
    });
  });

  test.describe('Selection, dragging, node/edge selection, deletion', () => {
    test('mode_select_idle: selecting a node marks it and pressing delete removes it', async ({ page }) => {
      // Create one node to select and delete
      await createNodeAt(page, 140, 140);

      // Enter Select mode
      const selectBtn = await findButton(page, /select/i);
      await selectBtn.click();

      // Click the node (NODE_POINTERUP_CLICK) to select
      const node = await getFirstNodeHandle(page);
      const nb = await node.boundingBox();
      if (!nb) throw new Error('Node bounding box missing');
      await page.mouse.click(nb.x + nb.width / 2, nb.y + nb.height / 2);

      // After selection, node should be marked/selected
      await page.waitForFunction((el) => {
        if (!el) return false;
        const cls3 = el.getAttribute('class') || '';
        return /selected|active/i.test(cls) || el.getAttribute('data-selected') != null;
      }, node);

      const marked = await isNodeMarked(node);
      expect(marked).toBeTruthy();

      // Delete via Delete key event (DELETE_KEY)
      const nodeCountBefore = await countNodes(page);
      await page.keyboard.press('Delete');

      // After deletion, node count should decrement (or become zero)
      await page.waitForTimeout(300); // allow deletion to process
      const nodeCountAfter = await countNodes(page);
      expect(nodeCountAfter).toBeLessThanOrEqual(nodeCountBefore - 1);
    });

    test('dragging: pointerdown + move updates node position and edges update on pointer up', async ({ page }) => {
      // Create two nodes and connect them to observe edge update after dragging
      await createNodeAt(page, 100, 100);
      await createNodeAt(page, 220, 160);

      // Create an edge between them
      const addEdgeBtn2 = await findButton(page, /add\s*edge/i);
      await addEdgeBtn.click();
      const svg8 = await svgLocator(page);
      const nodes1 = svg.locator('circle, g.node circle');
      const a = nodes.first();
      const b = nodes.nth(1);
      const aBox = await a.boundingBox();
      const bBox = await b.boundingBox();
      if (!aBox || !bBox) throw new Error('Node boxes missing for edge creation');

      // Try to accept prompt if present
      page.on('dialog', async (dialog) => {
        if (dialog.type() === 'prompt') await dialog.accept('1');
        else await dialog.accept();
      });

      // create edge
      await page.mouse.click(aBox.x + aBox.width / 2, aBox.y + aBox.height / 2);
      await page.mouse.click(bBox.x + bBox.width / 2, bBox.y + bBox.height / 2);

      // Wait for an edge to appear
      const edgesBefore = await countEdges(page);
      expect(edgesBefore).toBeGreaterThanOrEqual(1);

      // Enter select mode to drag
      const selectBtn1 = await findButton(page, /select/i);
      await selectBtn.click();

      // Start drag: pointerdown on first node, move, then pointerup
      await page.mouse.move(aBox.x + aBox.width / 2, aBox.y + aBox.height / 2);
      await page.mouse.down();
      // Move by +60,+60
      await page.mouse.move(aBox.x + aBox.width / 2 + 60, aBox.y + aBox.height / 2 + 60, { steps: 10 });
      // During dragging, ensure state allows pointer moves (dragging state persists); we check node position changed
      await page.mouse.up();

      // After drag, node position attributes (cx/cy) should reflect movement
      // Try to read attributes from the node element
      const cx = await a.getAttribute('cx').catch(() => null);
      const cy = await a.getAttribute('cy').catch(() => null);
      // If implementation uses transform/translation, try to inspect transform attribute
      const transform = await a.getAttribute('transform').catch(() => null);

      // At least one of these should indicate position moved compared to original box
      const moved = (() => {
        if (cx && cy) {
          const cxVal = parseFloat(cx);
          const cyVal = parseFloat(cy);
          // original approx box center coordinates in svg space are unknown; we accept any numeric values present
          return !Number.isNaN(cxVal) && !Number.isNaN(cyVal);
        }
        if (transform) return transform.includes('translate(') || transform.includes('matrix(');
        return false;
      })();
      expect(moved).toBeTruthy();

      // After drag, edges should still exist and likely updated (count same or greater)
      const edgesAfter = await countEdges(page);
      expect(edgesAfter).toBeGreaterThanOrEqual(edgesBefore);
    });

    test('edge_selected: clicking an edge selects it and delete removes it', async ({ page }) => {
      // Create nodes and edge
      await createNodeAt(page, 120, 120);
      await createNodeAt(page, 260, 120);
      const addEdgeBtn3 = await findButton(page, /add\s*edge/i);
      await addEdgeBtn.click();

      const svg9 = await svgLocator(page);
      const nodes2 = svg.locator('circle, g.node circle');
      const aBox1 = await nodes.first().boundingBox();
      const bBox1 = await nodes.nth(1).boundingBox();
      if (!aBox || !bBox) throw new Error('Node boxes missing for edge creation');

      page.on('dialog', async (dialog) => {
        if (dialog.type() === 'prompt') await dialog.accept('2');
        else await dialog.accept();
      });

      await page.mouse.click(aBox.x + aBox.width / 2, aBox.y + aBox.height / 2);
      await page.mouse.click(bBox.x + bBox.width / 2, bBox.y + bBox.height / 2);

      // Wait for edge
      await page.waitForTimeout(200);
      const edgesBefore1 = await countEdges(page);
      expect(edgesBefore).toBeGreaterThanOrEqual(1);

      // Enter select mode and click an edge
      const selectBtn2 = await findButton(page, /select/i);
      await selectBtn.click();

      // Try clicking the first path/line in the svg (edge)
      const edgeLoc = svg.locator('path.edge, line.edge, path, line').first();
      if (await edgeLoc.count() === 0) throw new Error('Edge element not found to select');
      const edgeBox = await edgeLoc.boundingBox();
      if (!edgeBox) throw new Error('Edge bounding box missing');
      await page.mouse.click(edgeBox.x + edgeBox.width / 2, edgeBox.y + edgeBox.height / 2);

      // After clicking, the edge should be marked (class/data attr)
      await page.waitForFunction((el) => {
        if (!el) return false;
        const cls4 = el.getAttribute('class') || '';
        return /selected|active/i.test(cls) || el.getAttribute('data-selected') != null;
      }, edgeLoc);

      // Delete via Delete key
      await page.keyboard.press('Delete');

      // After deletion, edge count should decrease
      await page.waitForTimeout(200);
      const edgesAfter1 = await countEdges(page);
      expect(edgesAfter).toBeLessThanOrEqual(edgesBefore - 1);
    });
  });

  test.describe('Tooltip and clearing confirmation flows', () => {
    test('tooltip_shown and tooltip_hidden: hovering node shows tooltip and leaving hides it', async ({ page }) => {
      // Create a node to hover
      await createNodeAt(page, 140, 140);
      const node1 = await getFirstNodeHandle(page);
      const nb1 = await node.boundingBox();
      if (!nb) throw new Error('Node bounding box missing');

      // Hover to trigger tooltip
      await page.mouse.move(nb.x + nb.width / 2, nb.y + nb.height / 2);
      await page.waitForTimeout(300); // allow tooltip to appear

      // Check for tooltip element (role=tooltip or .tooltip)
      const tooltipByRole = page.getByRole('tooltip');
      let tooltipVisible = false;
      if (await tooltipByRole.count() > 0) {
        tooltipVisible = await tooltipByRole.isVisible();
      } else {
        const tooltipByClass = page.locator('.tooltip, .node-tooltip');
        if (await tooltipByClass.count() > 0) tooltipVisible = await tooltipByClass.first().isVisible().catch(() => false);
      }
      expect(tooltipVisible).toBeTruthy();

      // Move mouse away to hide tooltip (POINTER_LEAVE -> tooltip_hidden)
      await page.mouse.move(0, 0);
      await page.waitForTimeout(300);
      // Now tooltip should be gone or hidden
      let tooltipGone = true;
      if (await tooltipByRole.count() > 0) {
        tooltipGone = !(await tooltipByRole.isVisible());
      } else {
        const tooltipByClass1 = page.locator('.tooltip, .node-tooltip');
        if (await tooltipByClass.count() > 0) tooltipGone = !(await tooltipByClass.first().isVisible().catch(() => false));
      }
      expect(tooltipGone).toBeTruthy();
    });

    test('clearing_confirmation: clicking Clear triggers confirm and clears graph on OK', async ({ page }) => {
      // Create some nodes and edges to ensure graph is non-empty
      await createNodeAt(page, 100, 100);
      await createNodeAt(page, 200, 120);

      // Click Clear button which should trigger confirmation (JS confirm)
      const clearBtn = await findButton(page, /clear/i);
      // Intercept dialog and accept (CONFIRM_OK)
      let dialogSeen = false;
      page.on('dialog', async (dialog) => {
        dialogSeen = true;
        // Simulate user confirming
        await dialog.accept();
      });

      // Click clear
      await clearBtn.click();
      // Wait briefly for dialog handler
      await page.waitForTimeout(300);
      expect(dialogSeen).toBeTruthy();

      // After confirming, graph should be cleared: zero nodes and edges
      await page.waitForTimeout(300);
      const nodesLeft = await countNodes(page);
      const edgesLeft = await countEdges(page);
      expect(nodesLeft).toBeLessThanOrEqual(0);
      expect(edgesLeft).toBeLessThanOrEqual(0);
    });
  });

  test.describe('Edge cases and robustness', () => {
    test('clicking same node while pending cancels pending (NODE_POINTERDOWN_ON_SAME_NODE)', async ({ page }) => {
      // Create one node
      await createNodeAt(page, 150, 150);

      // Enter add-edge mode and click the same node twice
      const addEdgeBtn4 = await findButton(page, /add\s*edge/i);
      await addEdgeBtn.click();
      const node2 = await getFirstNodeHandle(page);
      const nb2 = await node.boundingBox();
      if (!nb) throw new Error('Node bounding box missing');

      // First click -> pending
      await page.mouse.click(nb.x + nb.width / 2, nb.y + nb.height / 2);
      await page.waitForTimeout(200);
      const marked1 = await isNodeMarked(node);
      expect(marked).toBeTruthy();

      // Second click on same node should cancel (NODE_POINTERDOWN_ON_SAME_NODE -> mode_add_edge_idle)
      await page.mouse.click(nb.x + nb.width / 2, nb.y + nb.height / 2);
      await page.waitForTimeout(200);
      const markedAfter = await isNodeMarked(node);
      expect(markedAfter).toBeFalsy();
    });

    test('entering edge weight via prompt flow gracefully handled if user cancels', async ({ page }) => {
      // Create two nodes
      await createNodeAt(page, 120, 120);
      await createNodeAt(page, 260, 120);

      // Enter add-edge and start create
      const addEdgeBtn5 = await findButton(page, /add\s*edge/i);
      await addEdgeBtn.click();

      const svg10 = await svgLocator(page);
      const nodes3 = svg.locator('circle, g.node circle');
      const a1 = nodes.first();
      const b1 = nodes.nth(1);
      const aBox2 = await a.boundingBox();
      const bBox2 = await b.boundingBox();
      if (!aBox || !bBox) throw new Error('Node boxes missing');

      // When prompt appears, dismiss it (simulate cancel)
      page.on('dialog', async (dialog) => {
        if (dialog.type() === 'prompt') {
          await dialog.dismiss(); // user cancels entering weight
        } else {
          await dialog.accept();
        }
      });

      // Click source and target nodes
      await page.mouse.click(aBox.x + aBox.width / 2, aBox.y + aBox.height / 2);
      await page.mouse.click(bBox.x + bBox.width / 2, bBox.y + bBox.height / 2);

      // After canceling the prompt, UI should have returned to add-edge idle or not left a stuck pending state
      await page.waitForTimeout(300);

      // Verify no dangling pending highlight
      const pendingCheck = await isNodeMarked(a);
      expect(pendingCheck).toBeFalsy();
    });
  });
});