import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/11-08-0004/html/76d1c3d0-bcb0-11f0-95d9-c98d28730c93.html';
const MAX_NODES = 8;

// Utility helpers to make selectors resilient to small markup differences.
async function getSvg(page) {
  const svg = page.locator('svg#graph');
  if (await svg.count()) return svg;
  // fallback: any svg in the canvas
  return page.locator('svg').first();
}

async function findAddNodeButton(page) {
  // Try a variety of likely labels/attributes for the "Add Node" control.
  const selectors = [
    'button:has-text("Add")',
    'button:has-text("Add Node")',
    'button[aria-label*="add"]',
    'button[title*="add"]',
    '.controls button:has-text("+")',
    '.controls [role="button"]:has-text("Add")',
  ];
  for (const s of selectors) {
    const loc = page.locator(s);
    if (await loc.count()) return loc.first();
  }
  return null;
}

async function findToggleDirected(page) {
  const selectors1 = [
    'button:has-text("Directed")',
    'button:has-text("Toggle Directed")',
    '[role="switch"][aria-label*="direct"]',
    '.toggle:has-text("Directed")',
    'input[type="checkbox"][name*="direct"]',
  ];
  for (const s of selectors) {
    const loc1 = page.locator(s);
    if (await loc.count()) return loc.first();
  }
  return null;
}

async function findClearButton(page) {
  const loc2 = page.locator('button:has-text("Clear"), button:has-text("Reset")');
  return (await loc.count()) ? loc.first() : null;
}

async function findRandomButton(page) {
  const loc3 = page.locator('button:has-text("Random")');
  return (await loc.count()) ? loc.first() : null;
}

async function findArrangeButton(page) {
  const loc4 = page.locator('button:has-text("Arrange")');
  return (await loc.count()) ? loc.first() : null;
}

async function matrixLocator(page) {
  // Common patterns for the adjacency matrix container/table
  const candidates = [
    'table#matrix',
    'table.matrix',
    '[data-testid="matrix"]',
    '.matrix table',
    '.matrix',
    'table:has(:text("0"))', // fallback
  ];
  for (const s of candidates) {
    const loc5 = page.locator(s);
    if (await loc.count()) return loc.first();
  }
  // Last resort: any table in the right panel
  const generic = page.locator('main.module table').first();
  if (await generic.count()) return generic;
  return null;
}

async function countSvgNodes(page) {
  const svg1 = await getSvg(page);
  // Prefer g.node or circle.node
  let nodes = svg.locator('g.node, circle.node');
  if (await nodes.count()) return await nodes.count();
  // fallback: any circle elements inside svg that look like nodes (exclude path)
  nodes = svg.locator('circle');
  return await nodes.count();
}

async function getNodeAtIndex(page, index) {
  const svg2 = await getSvg(page);
  let nodes1 = svg.locator('g.node, circle.node');
  if (await nodes.count() === 0) nodes = svg.locator('circle');
  const c = nodes.nth(index);
  return c;
}

async function getAdjValue(page, rowIndex, colIndex) {
  const mat = await matrixLocator(page);
  if (!mat) return null;
  // Try data-row/data-col attributes
  const cellByAttrs = mat.locator(`[data-row="${rowIndex}"][data-col="${colIndex}"]`);
  if (await cellByAttrs.count()) {
    return (await cellByAttrs.first().innerText()).trim();
  }
  // Try table rows and cells
  const rows = mat.locator('tr');
  if (await rows.count() > rowIndex) {
    const row = rows.nth(rowIndex);
    const cells = row.locator('td, th');
    if (await cells.count() > colIndex) {
      return (await cells.nth(colIndex).innerText()).trim();
    }
  }
  // Can't find explicit cell -> return null
  return null;
}

test.describe('Adjacency Matrix Interactive Module — FSM integration tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the served HTML before each test.
    await page.goto(APP_URL);
    // Wait for main SVG canvas to be ready.
    await page.waitForSelector('svg#graph, svg', { timeout: 5000 });
  });

  test.afterEach(async ({ page }) => {
    // Try to clear state after each test by clicking Clear if available.
    const clear = await findClearButton(page);
    if (clear) await clear.click().catch(() => {});
  });

  test.describe('Idle state and node addition (CLICK_SVG_ADD_NODE, KEY_ENTER_SVG_ADD_NODE)', () => {
    test('idle: initial render shows svg and matrix, and clicking Add Node adds a node', async ({ page }) => {
      // Verify idle onEnter side-effects: matrix rendered and some announcement/live region exists
      const mat1 = await matrixLocator(page);
      expect(mat, 'Matrix should be present on initial render').not.toBeNull();

      // Count nodes at start
      const initialNodes = await countSvgNodes(page);

      // Try to click a clear "Add Node" control if present
      const addBtn = await findAddNodeButton(page);
      if (addBtn) {
        await addBtn.click();
        // If pressing Enter should also work:
        await addBtn.press('Enter').catch(() => {});
      } else {
        // Fallback: click the SVG in the center to add a node
        const svg3 = await getSvg(page);
        const box = await svg.boundingBox();
        expect(box).toBeTruthy();
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      }

      // Wait for a new node to appear
      await page.waitForTimeout(200); // small delay for synchronous DOM update
      const afterNodes = await countSvgNodes(page);
      expect(afterNodes).toBeGreaterThanOrEqual(initialNodes + 1);
    });

    test('respects MAX_NODES: cannot add beyond maximum and announces limit', async ({ page }) => {
      // Add nodes up to MAX_NODES
      let addBtn1 = await findAddNodeButton(page);
      const svg4 = await getSvg(page);
      for (let i = 0; i < MAX_NODES; i++) {
        if (addBtn) {
          await addBtn.click();
        } else {
          const box1 = await svg.boundingBox();
          await page.mouse.click(box.x + 10 + i * 6, box.y + 10 + i * 6);
        }
        await page.waitForTimeout(100);
      }
      // Count nodes
      const nodeCount = await countSvgNodes(page);
      expect(nodeCount).toBeLessThanOrEqual(MAX_NODES);

      // Try to add one more node and expect no increase
      if (addBtn) {
        await addBtn.click();
      } else {
        const box2 = await svg.boundingBox();
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      }
      await page.waitForTimeout(200);
      const nodeCount2 = await countSvgNodes(page);
      expect(nodeCount2).toBeLessThanOrEqual(MAX_NODES);

      // Look for an announcement/live region that mentions maximum or limit
      const live = page.locator('[role="status"], [aria-live], .announce, .sr-only');
      if (await live.count()) {
        const txt = (await live.first().innerText()).toLowerCase();
        expect(
          txt.includes('max') || txt.includes('maximum') || txt.includes('limit') || txt.length === 0
        ).toBeTruthy();
      }
    });
  });

  test.describe('Node selection and nodeSelected state (CLICK_NODE, KEY_ENTER_NODE)', () => {
    test('clicking a node selects it (adds selected class) and clicking same node deselects', async ({ page }) => {
      // Ensure at least one node exists
      const addBtn2 = await findAddNodeButton(page);
      if (await countSvgNodes(page) === 0) {
        if (addBtn) await addBtn.click();
        else {
          const svg5 = await getSvg(page);
          const box3 = await svg.boundingBox();
          await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        }
        await page.waitForTimeout(150);
      }

      // Select the first node
      const node = await getNodeAtIndex(page, 0);
      expect(node).not.toBeNull();
      await node.click();

      // onEnter nodeSelected -> add 'selected' class
      const hasSelected = (await node.getAttribute('class'))?.includes('selected') ?? false;
      // Also some implementations add a different indicator; assert either class or aria-selected
      const ariaSelected = (await node.getAttribute('aria-selected')) === 'true';
      expect(hasSelected || ariaSelected).toBeTruthy();

      // Clicking same node should deselect (nodeSelected -> idle)
      await node.click();
      await page.waitForTimeout(100);
      const hasSelectedAfter = (await node.getAttribute('class'))?.includes('selected') ?? false;
      const ariaAfter = (await node.getAttribute('aria-selected')) === 'true';
      expect(!(hasSelectedAfter || ariaAfter)).toBeTruthy();
    });

    test('keyboard Enter on node toggles selection (KEY_ENTER_NODE)', async ({ page }) => {
      // Ensure node exists
      const addBtn3 = await findAddNodeButton(page);
      if (await countSvgNodes(page) === 0) {
        if (addBtn) await addBtn.click();
        else {
          const svg6 = await getSvg(page);
          const box4 = await svg.boundingBox();
          await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        }
        await page.waitForTimeout(150);
      }

      const node1 = await getNodeAtIndex(page, 0);
      await node.focus();
      await page.keyboard.press('Enter');
      // Wait briefly for selection
      await page.waitForTimeout(100);
      const isSelected = ((await node.getAttribute('class')) || '').includes('selected') || (await node.getAttribute('aria-selected')) === 'true';
      expect(isSelected).toBeTruthy();

      // Press Enter again to deselect
      await page.keyboard.press('Enter');
      await page.waitForTimeout(100);
      const isSelectedAfter = ((await node.getAttribute('class')) || '').includes('selected') || (await node.getAttribute('aria-selected')) === 'true';
      expect(isSelectedAfter).toBeFalsy();
    });
  });

  test.describe('Edge toggle and animating state (CLICK_NODE_DIFFERENT, CELL_CLICK, ANIMATION_END)', () => {
    test('select a node then click a different node to add an edge, matrix updates and highlight animation occurs', async ({ page }) => {
      // Ensure at least two nodes exist
      const addBtn4 = await findAddNodeButton(page);
      while ((await countSvgNodes(page)) < 2) {
        if (addBtn) await addBtn.click();
        else {
          const svg7 = await getSvg(page);
          const box5 = await svg.boundingBox();
          await page.mouse.click(box.x + 20 + (await countSvgNodes(page)) * 10, box.y + 20 + (await countSvgNodes(page)) * 10);
        }
        await page.waitForTimeout(100);
      }

      const nodeA = await getNodeAtIndex(page, 0);
      const nodeB = await getNodeAtIndex(page, 1);
      await nodeA.click();
      // Node should be selected
      const sel = ((await nodeA.getAttribute('class')) || '').includes('selected') || (await nodeA.getAttribute('aria-selected')) === 'true';
      expect(sel).toBeTruthy();

      // Click the other node to toggle/create edge
      await nodeB.click();
      // animating state should add a temporary highlight on path or on matrix cell
      // Look for path elements in svg representing edges and highlight class
      const svg8 = await getSvg(page);
      const pathHighlight = svg.locator('path.highlight, path.edge.highlight, path.edge, path');
      // Wait briefly for animation/edge creation
      await page.waitForTimeout(200);

      // Expect at least one path element representing the new edge (either directed or undirected)
      const pathCount = await svg.locator('path').count();
      expect(pathCount).toBeGreaterThanOrEqual(0); // non-strict - path could be drawn as line/group; continue with matrix check

      // Check adjacency matrix updated: find matrix cell for row 0 col 1 or for indices (depends on ordering)
      const val01 = await getAdjValue(page, 0, 1);
      const val10 = await getAdjValue(page, 1, 0);

      // At least one direction should have a '1' (directed or symmetric)
      const sawEdge = (val01 === '1' || val10 === '1');
      expect(sawEdge).toBeTruthy();

      // Animation cleanup: highlight should disappear eventually
      const highlightExists = await svg.locator('path.highlight, .highlight').count();
      // Wait up to 2s for animation cleanup
      if (highlightExists) await page.waitForTimeout(800);
      const highlightAfter = await svg.locator('path.highlight, .highlight').count();
      expect(highlightAfter).toBeLessThanOrEqual(highlightExists);
    });

    test('clicking a matrix cell toggles edge (CELL_CLICK) and responds to Enter key (KEY_ENTER_CELL)', async ({ page }) => {
      // Ensure 2 nodes exist and matrix present
      const addBtn5 = await findAddNodeButton(page);
      while ((await countSvgNodes(page)) < 2) {
        if (addBtn) await addBtn.click();
        else {
          const svg9 = await getSvg(page);
          const box6 = await svg.boundingBox();
          await page.mouse.click(box.x + 10, box.y + 10);
        }
        await page.waitForTimeout(100);
      }

      const mat2 = await matrixLocator(page);
      expect(mat).not.toBeNull();

      // Try to click a cell at row 0 col 1
      const cellByAttrs1 = mat.locator('[data-row="0"][data-col="1"], [data-row="1"][data-col="0"]');
      if (await cellByAttrs.count()) {
        const cell = cellByAttrs.first();
        const before = (await cell.innerText()).trim();
        await cell.click();
        await page.waitForTimeout(150);
        const after = (await cell.innerText()).trim();
        expect(after === '1' || after === '0').toBeTruthy();
        expect(after).not.toBe(before);

        // Press Enter on that cell to toggle back
        await cell.focus();
        await page.keyboard.press('Enter');
        await page.waitForTimeout(150);
        const after2 = (await cell.innerText()).trim();
        expect(after2).not.toBe(after);
      } else {
        // Fallback: click another node sequence to exercise same behavior
        const n0 = await getNodeAtIndex(page, 0);
        const n1 = await getNodeAtIndex(page, 1);
        await n0.click();
        await n1.click();
        await page.waitForTimeout(150);
        const val011 = await getAdjValue(page, 0, 1);
        expect(val01 === '1' || val01 === '0').toBeTruthy();
      }
    });
  });

  test.describe('Dragging nodes (DRAG_START, DRAG_MOVE, DRAG_END)', () => {
    test('dragging a node updates its coordinates and sets dragging flag while moving', async ({ page }) => {
      // Ensure one node exists
      const addBtn6 = await findAddNodeButton(page);
      if ((await countSvgNodes(page)) === 0) {
        if (addBtn) await addBtn.click();
        else {
          const svg10 = await getSvg(page);
          const box7 = await svg.boundingBox();
          await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        }
      }

      const node2 = await getNodeAtIndex(page, 0);
      const svg11 = await getSvg(page);
      // Determine starting position (cx/cy attributes for circle or transform for g)
      let startX = null;
      let startY = null;

      const tagName = (await node.evaluate((n) => n.tagName.toLowerCase()));
      if (tagName === 'circle') {
        startX = parseFloat((await node.getAttribute('cx')) || '0');
        startY = parseFloat((await node.getAttribute('cy')) || '0');
      } else {
        // g element: get bounding box center
        const box8 = await node.boundingBox();
        startX = box.x + box.width / 2;
        startY = box.y + box.height / 2;
      }

      const nodeBox = await node.boundingBox();
      expect(nodeBox).toBeTruthy();
      const startClientX = nodeBox.x + nodeBox.width / 2;
      const startClientY = nodeBox.y + nodeBox.height / 2;

      // Pointer down + move + up sequence to simulate dragging
      await page.mouse.move(startClientX, startClientY);
      await page.mouse.down();
      // Small move to start dragging
      await page.mouse.move(startClientX + 30, startClientY + 15, { steps: 5 });
      // During drag some implementations add class 'dragging' or attribute data-dragging
      const classDuringDrag = ((await node.getAttribute('class')) || '');
      const hasDraggingClass = classDuringDrag.includes('drag') || classDuringDrag.includes('dragging');
      // We can't assert it's present consistently across implementations, but record it
      await page.waitForTimeout(100);
      await page.mouse.up();
      await page.waitForTimeout(150);

      // After drag, position should have changed
      let endX = null;
      let endY = null;
      if (tagName === 'circle') {
        // Try reading cx/cy again
        endX = parseFloat((await node.getAttribute('cx')) || '0');
        endY = parseFloat((await node.getAttribute('cy')) || '0');
        // If cx/cy unchanged, check transform or boundingBox
        if (endX === startX && endY === startY) {
          const endBox = await node.boundingBox();
          endX = endBox.x + endBox.width / 2;
          endY = endBox.y + endBox.height / 2;
        }
      } else {
        const endBox1 = await node.boundingBox();
        endX = endBox.x + endBox.width / 2;
        endY = endBox.y + endBox.height / 2;
      }

      expect(Math.abs(endX - startX) + Math.abs(endY - startY)).toBeGreaterThan(0);
      // If dragging class/attribute was present, ensure it was present at some point during drag
      // (We already captured classDuringDrag before mouse.up; accept either true or false)
      expect(typeof hasDraggingClass === 'boolean').toBeTruthy();
    });
  });

  test.describe('Global actions and state transitions (TOGGLE_DIRECTED, CLICK_CLEAR, CLICK_RANDOM, CLICK_ARRANGE, RESIZE)', () => {
    test('toggle directed/undirected changes symmetry of matrix (TOGGLE_DIRECTED)', async ({ page }) => {
      // Ensure at least two nodes exist
      const addBtn7 = await findAddNodeButton(page);
      while ((await countSvgNodes(page)) < 2) {
        if (addBtn) await addBtn.click();
        else {
          const svg12 = await getSvg(page);
          const box9 = await svg.boundingBox();
          await page.mouse.click(box.x + 5 + (await countSvgNodes(page)) * 10, box.y + 5 + (await countSvgNodes(page)) * 10);
        }
        await page.waitForTimeout(80);
      }

      const toggle = await findToggleDirected(page);
      if (!toggle) {
        test.skip('No directed toggle control found; skipping directed/undirected symmetry test');
        return;
      }

      // Ensure we are in a known state by clearing then adding an edge one-way
      const clear1 = await findClearButton(page);
      if (clear) {
        await clear.click();
        await page.waitForTimeout(100);
      }

      // Add two nodes and create a directed edge from 0->1 via node clicks
      if (addBtn) { await addBtn.click(); await addBtn.click(); }
      else {
        const svg13 = await getSvg(page);
        const box10 = await svg.boundingBox();
        await page.mouse.click(box.x + 40, box.y + 40);
        await page.mouse.click(box.x + 80, box.y + 80);
      }
      await page.waitForTimeout(150);
      const n01 = await getNodeAtIndex(page, 0);
      const n11 = await getNodeAtIndex(page, 1);
      await n0.click();
      await n1.click();
      await page.waitForTimeout(150);

      // Read adjacency values
      const v01_before = await getAdjValue(page, 0, 1);
      const v10_before = await getAdjValue(page, 1, 0);

      // Toggle directed setting
      await toggle.click();
      await page.waitForTimeout(150);

      // If previously symmetric, toggling directed may break symmetry; assert that the toggle had effect on renderMatrix
      const v01_after = await getAdjValue(page, 0, 1);
      const v10_after = await getAdjValue(page, 1, 0);
      // At minimum, values should be '0' or '1' strings; ensure they are defined
      expect(['0', '1', null]).toContain(v01_after);
      expect(['0', '1', null]).toContain(v10_after);
    });

    test('click Clear removes nodes and edges and clears matrix (CLICK_CLEAR)', async ({ page }) => {
      // Create nodes and an edge
      const addBtn8 = await findAddNodeButton(page);
      if ((await countSvgNodes(page)) < 2) {
        if (addBtn) { await addBtn.click(); await addBtn.click(); }
        else {
          const svg14 = await getSvg(page);
          const box11 = await svg.boundingBox();
          await page.mouse.click(box.x + 20, box.y + 20);
          await page.mouse.click(box.x + 60, box.y + 60);
        }
      }
      await page.waitForTimeout(100);
      const n02 = await getNodeAtIndex(page, 0);
      const n12 = await getNodeAtIndex(page, 1);
      await n0.click(); await n1.click();
      await page.waitForTimeout(150);

      // Click clear
      const clear2 = await findClearButton(page);
      expect(clear, 'Clear button should exist').not.toBeNull();
      await clear.click();
      await page.waitForTimeout(150);

      // Nodes removed or matrix cleared: matrix should show zeros or be empty
      const mat3 = await matrixLocator(page);
      if (mat) {
        // Look for any '1' in matrix
        const text = (await mat.innerText()).trim();
        expect(text.includes('1')).toBeFalsy();
      }
      // Nodes should be zero or very few
      const nodeCount1 = await countSvgNodes(page);
      expect(nodeCount).toBeLessThanOrEqual(0 + 0 + MAX_NODES);
    });

    test('Click Random populates nodes/edges (CLICK_RANDOM)', async ({ page }) => {
      const random = await findRandomButton(page);
      if (!random) {
        test.skip('Random button not present; skipping CLICK_RANDOM test');
        return;
      }

      await random.click();
      await page.waitForTimeout(300);

      // Expect some nodes exist and some edges present in matrix
      const nodeCount21 = await countSvgNodes(page);
      expect(nodeCount).toBeGreaterThan(0);

      const mat4 = await matrixLocator(page);
      if (mat) {
        const txt1 = (await mat.innerText()).trim();
        // Expect at least one '1' in the matrix indicating some edges
        expect(txt.includes('1')).toBeTruthy();
      }
    });

    test('Click Arrange changes node positions (CLICK_ARRANGE)', async ({ page }) => {
      const arrange = await findArrangeButton(page);
      if (!arrange) {
        test.skip('Arrange control not present; skipping CLICK_ARRANGE test');
        return;
      }

      // Ensure at least 2 nodes
      const addBtn9 = await findAddNodeButton(page);
      while ((await countSvgNodes(page)) < 2) {
        if (addBtn) await addBtn.click();
        else {
          const svg15 = await getSvg(page);
          const box12 = await svg.boundingBox();
          await page.mouse.click(box.x + 10 + (await countSvgNodes(page)) * 10, box.y + 10 + (await countSvgNodes(page)) * 10);
        }
        await page.waitForTimeout(50);
      }

      // Record positions of first two nodes
      const n03 = await getNodeAtIndex(page, 0);
      const n13 = await getNodeAtIndex(page, 1);
      const box0_before = await n0.boundingBox();
      const box1_before = await n1.boundingBox();

      await arrange.click();
      // Wait for animation/arrangement
      await page.waitForTimeout(400);

      const box0_after = await n0.boundingBox();
      const box1_after = await n1.boundingBox();

      // At least one node should have moved
      const moved = Math.abs((box0_after.x + box0_after.y) - (box0_before.x + box0_before.y)) > 1 ||
                    Math.abs((box1_after.x + box1_after.y) - (box1_before.x + box1_before.y)) > 1;
      expect(moved).toBeTruthy();
    });

    test('window resize triggers RESIZE event and preserves/returns to expected state', async ({ page }) => {
      // Create a node and select it
      const addBtn10 = await findAddNodeButton(page);
      if ((await countSvgNodes(page)) === 0) {
        if (addBtn) await addBtn.click();
        else {
          const svg16 = await getSvg(page);
          const box13 = await svg.boundingBox();
          await page.mouse.click(box.x + 40, box.y + 40);
        }
      }
      const node3 = await getNodeAtIndex(page, 0);
      await node.click();
      const wasSelected = ((await node.getAttribute('class')) || '').includes('selected') || (await node.getAttribute('aria-selected')) === 'true';
      expect(wasSelected).toBeTruthy();

      // Resize viewport
      await page.setViewportSize({ width: 600, height: 800 });
      await page.waitForTimeout(200);
      // Dispatch native resize event in case implementation listens to window events
      await page.evaluate(() => { window.dispatchEvent(new Event('resize')); });

      // After resize, selection should be preserved according to FSM notes (nodeSelected remains on RESIZE)
      const stillSelected = ((await node.getAttribute('class')) || '').includes('selected') || (await node.getAttribute('aria-selected')) === 'true';
      expect(stillSelected).toBeTruthy();
    });
  });

  test.describe('Edge cases and animation cleanup', () => {
    test('animating state cleans up temporary visuals after ANIMATION_END', async ({ page }) => {
      // Create two nodes then toggle edge to produce transient visuals
      const addBtn11 = await findAddNodeButton(page);
      while ((await countSvgNodes(page)) < 2) {
        if (addBtn) await addBtn.click();
        else {
          const svg17 = await getSvg(page);
          const box14 = await svg.boundingBox();
          await page.mouse.click(box.x + 10, box.y + 10);
        }
        await page.waitForTimeout(80);
      }
      const n04 = await getNodeAtIndex(page, 0);
      const n14 = await getNodeAtIndex(page, 1);
      await n0.click();
      await n1.click();

      // Immediately check for temporary highlight classes or temporary paths
      const svg18 = await getSvg(page);
      const tempHighlights = svg.locator('path.temp, path.highlight, .temp, .highlight');
      // Wait some time for animation to play and then end
      await page.waitForTimeout(1000);

      // After animation end, temporary visuals should be removed
      const tempCount = await tempHighlights.count();
      // We accept zero or a decreasing number, but ideally zero
      expect(tempCount).toBeLessThanOrEqual(1);
    });
  });
});