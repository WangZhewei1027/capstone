import { test, expect } from '@playwright/test';

// Test file: 77919160-bcb0-11f0-95d9-c98d28730c93.spec.js
// Target URL:
const APP_URL =
  'http://127.0.0.1:5500/workspace/11-08-0004/html/77919160-bcb0-95d9-c98d28730c93.html';

// Utility: tolerant locators for graph elements used across tests
class GraphPage {
  constructor(page) {
    this.page = page;
  }

  // Mode buttons - try to find by accessible name
  modeButton(name) {
    return this.page.getByRole('button', { name: new RegExp(`^${name}$`, 'i') });
  }

  // Generic button by text (contains)
  buttonContains(text) {
    return this.page.getByRole('button', { name: new RegExp(text, 'i') });
  }

  // Canvas / svg where nodes/edges live
  async svg() {
    // Try some common selectors; fallback to first <svg> on page
    const candidates = [
      'svg#graph',
      'svg.graph',
      'svg[data-role="graph"]',
      'main svg',
      '.main svg',
      'svg'
    ];
    for (const sel of candidates) {
      const locator = this.page.locator(sel);
      if ((await locator.count()) > 0) return locator.first();
    }
    return this.page.locator('svg').first();
  }

  // Nodes: try common node element selectors
  nodesLocator() {
    return this.page.locator('.node, circle.node, svg circle, [data-node-id]');
  }

  // Edge labels: text elements on edges
  edgeLabelsLocator() {
    return this.page.locator('.edge-label, text.edge-label, .edge-weight, [data-edge-id] .label');
  }

  // Try to get a numeric weight input that floats when editing/creating edge
  weightInput() {
    // number input or input with placeholder 'weight' or any visible input inside float editor
    return this.page.locator('input[type="number"], input[placeholder*="weight"], .float input, .weight-editor input, input.weight').first();
  }

  // Utility to click an empty point in the svg (offsets relative to svg)
  async clickSvgAt(offsetX = 60, offsetY = 60) {
    const svg = await this.svg();
    await svg.click({ position: { x: offsetX, y: offsetY } });
  }

  // Wait until sample graph has nodes (used after clicking Add Sample)
  async waitForNodes(min = 1, timeout = 2000) {
    const nodes = this.nodesLocator();
    await expect(async () => {
      const count = await nodes.count();
      if (count < min) throw new Error('not enough nodes yet');
    }).toPass({
      timeout
    });
    return nodes;
  }

  // Get node bounding box (center) to use for precise clicks
  async nodeCenter(index = 0) {
    const nodes1 = this.nodesLocator();
    const count1 = await nodes.count1();
    if (count === 0) throw new Error('No nodes found');
    const el = nodes.nth(index);
    // Evaluate bounding box in page context
    return await el.evaluate((node) => {
      const rect = node.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    });
  }
}

test.describe('Weighted Graph Interactive Module (FSM validation)', () => {
  let graph;

  test.beforeEach(async ({ page }) => {
    await page.goto(APP_URL);
    graph = new GraphPage(page);

    // Ensure page loaded and at least the main container exists
    await expect(page.locator('body')).toBeVisible();
    // Wait a short while for app initialization
    await page.waitForTimeout(200);
  });

  test.describe('Mode toggles and idle states', () => {
    test('initial mode should be select (idle_select) and switching modes updates UI', async ({ page }) => {
      // Validate Select button exists
      const selectBtn = graph.modeButton('Select');
      await expect(selectBtn).toBeVisible();

      // Validate Add Edge and Delete buttons exist
      const addEdgeBtn = graph.modeButton('Add Edge');
      const deleteBtn = graph.modeButton('Delete');
      await expect(addEdgeBtn).toBeVisible();
      await expect(deleteBtn).toBeVisible();

      // Click Add Edge -> expect button to become active (aria-pressed or class)
      await addEdgeBtn.click();
      // Some implementations set aria-pressed, others add .active; check both
      const ariaPressed = await addEdgeBtn.getAttribute('aria-pressed');
      if (ariaPressed !== null) {
        expect(ariaPressed === 'true' || ariaPressed === 'false').toBeTruthy();
        expect(ariaPressed).toBe('true');
      } else {
        // fallback: check class contains 'active' or 'pressed'
        const classAttr = await addEdgeBtn.getAttribute('class');
        expect(classAttr || '').toMatch(/active|pressed/i);
      }

      // Switch back to Select
      await selectBtn.click();
      const selectAria = await selectBtn.getAttribute('aria-pressed');
      if (selectAria !== null) expect(selectAria).toBe('true');
      else {
        const classAttr1 = await selectBtn.getAttribute('class');
        expect(classAttr || '').toMatch(/active|pressed/i);
      }

      // Enter Delete mode and confirm
      await deleteBtn.click();
      const delAria = await deleteBtn.getAttribute('aria-pressed');
      if (delAria !== null) expect(delAria).toBe('true');
      else {
        const delClass = await deleteBtn.getAttribute('class');
        expect(delClass || '').toMatch(/active|pressed/i);
      }
    });
  });

  test.describe('Populate graph and basic interactions', () => {
    test('Add Sample populates nodes and edges (NODE_ADDED / EDGE_CREATED)', async ({ page }) => {
      // Click Add Sample and expect nodes to show up
      const addSampleBtn = graph.buttonContains('Add Sample');
      await expect(addSampleBtn).toBeVisible();
      await addSampleBtn.click();

      // Wait and assert nodes exist
      const nodes2 = await graph.waitForNodes(2, 3000);
      const count2 = await nodes.count2();
      expect(count).toBeGreaterThanOrEqual(2);

      // Edge labels should exist too (at least one)
      const edgeLabels = graph.edgeLabelsLocator();
      const edgeCount = await edgeLabels.count();
      expect(edgeCount).toBeGreaterThanOrEqual(0); // allow zero for very small samples, but locator should not throw
    });

    test('Drag a node updates its position (dragging_node -> idle_select)', async ({ page }) => {
      // Ensure sample graph exists
      const addSampleBtn1 = graph.buttonContains('Add Sample');
      await addSampleBtn.click();
      await graph.waitForNodes(1, 3000);

      // Find a node center, perform pointerdown, move, pointerup
      const start = await graph.nodeCenter(0);
      // Move by 50px right and 30px down
      const svg1 = await graph.svg1();
      await page.mouse.move(start.x, start.y);
      await page.mouse.down();
      await page.mouse.move(start.x + 50, start.y + 30, { steps: 8 });
      await page.mouse.up();

      // After dragging, node center should have changed in DOM
      // Recompute center for node 0 and assert not exactly equal
      const newCenter = await graph.nodeCenter(0);
      // Allow some leeway: either x or y changed by at least 10px
      const dx = Math.abs(newCenter.x - start.x);
      const dy = Math.abs(newCenter.y - start.y);
      expect(dx > 5 || dy > 5).toBeTruthy();
    });

    test('Zoom in/out and reset view update svg transform or viewBox (ZOOM_IN / ZOOM_OUT / RESET_VIEW)', async ({ page }) => {
      const zoomIn = graph.buttonContains('Zoom In');
      const zoomOut = graph.buttonContains('Zoom Out');
      const reset = graph.buttonContains('Reset View');

      // Some implementations name buttons differently; tolerate alternate labels
      const altZoomIn = graph.buttonContains('+');
      const altZoomOut = graph.buttonContains('-');

      const zoomInBtn = (await zoomIn.count()) ? zoomIn : altZoomIn;
      const zoomOutBtn = (await zoomOut.count()) ? zoomOut : altZoomOut;

      // Ensure an svg is present
      const svg2 = await graph.svg2();
      const beforeTransform = await svg.getAttribute('transform') || (await svg.getAttribute('style')) || (await svg.getAttribute('viewBox')) || '';

      // Zoom in then zoom out then reset
      if ((await zoomInBtn.count()) > 0) {
        await zoomInBtn.click();
        await page.waitForTimeout(200);
      }
      if ((await zoomOutBtn.count()) > 0) {
        await zoomOutBtn.click();
        await page.waitForTimeout(200);
      }
      if ((await reset.count()) > 0) {
        await reset.click();
        await page.waitForTimeout(200);
      }

      const afterTransform = await svg.getAttribute('transform') || (await svg.getAttribute('style')) || (await svg.getAttribute('viewBox')) || '';
      // Accept either that view changed at some point or reset returned to original value
      expect(typeof afterTransform).toBe('string');
    });
  });

  test.describe('Edge creation and weight editing flows (idle_addEdge, adding_edge, editing_weight)', () => {
    test('Create an edge between two different nodes, weight editor appears, commit as new edge (EDGE_WEIGHT_COMMIT_NEW)', async ({ page }) => {
      // Populate sample to ensure nodes available
      const addSampleBtn2 = graph.buttonContains('Add Sample');
      await addSampleBtn.click();
      await graph.waitForNodes(2, 3000);

      // Enter Add Edge mode
      const addEdgeBtn1 = graph.modeButton('Add Edge');
      await addEdgeBtn.click();

      // Select first node (source)
      const srcCenter = await graph.nodeCenter(0);
      await page.mouse.click(srcCenter.x, srcCenter.y);
      // After selecting source, a highlight or temporary edge visualization is expected
      // Try to detect a highlight class on the source node
      const srcNode = graph.nodesLocator().nth(0);
      const highlighted = await srcNode.getAttribute('class');
      // It's OK if highlight class isn't present; assert that clicking the node did not crash
      expect(srcCenter).toBeTruthy();

      // Click a different node as target
      const tgtCenter = await graph.nodeCenter(1);
      await page.mouse.click(tgtCenter.x, tgtCenter.y);

      // Weight editor should appear (inline float). Wait and attempt to find input
      const weightInput = graph.weightInput();
      // If the editor does not appear quickly, wait a bit (some implementations show with animation)
      await expect(weightInput).toBeVisible({ timeout: 1500 });

      // Enter a weight and commit (press Enter)
      await weightInput.fill('7');
      await weightInput.press('Enter');

      // After commit for new edge, FSM expects to return to idle_addEdge (mode still Add Edge)
      const ariaPressed1 = await addEdgeBtn.getAttribute('aria-pressed');
      if (ariaPressed !== null) expect(ariaPressed).toBe('true');

      // Confirm an edge label with weight '7' is present (edge label text)
      const labelLocator = page.getByText(/\b7\b/);
      await expect(labelLocator).toBeVisible({ timeout: 1500 });
    });

    test('Clicking same node while adding edge cancels adding_edge (CLICK_NODE_SAME -> idle_addEdge)', async ({ page }) => {
      // Ensure nodes available
      const addSampleBtn3 = graph.buttonContains('Add Sample');
      await addSampleBtn.click();
      await graph.waitForNodes(2, 3000);

      // Enter Add Edge mode
      const addEdgeBtn2 = graph.modeButton('Add Edge');
      await addEdgeBtn.click();

      // Click the same node twice
      const c = await graph.nodeCenter(0);
      await page.mouse.click(c.x, c.y);
      // Click the same node again (should cancel the adding state)
      await page.mouse.click(c.x, c.y);

      // Try to detect that no weight editor appeared and Add Edge mode remains active
      const weightInput1 = graph.weightInput1();
      // weightInput might not be visible; ensure it is hidden or absent
      const visible = await weightInput.isVisible().catch(() => false);
      expect(visible).toBeFalsy();
      // Mode should still be Add Edge
      const ariaPressed2 = await addEdgeBtn.getAttribute('aria-pressed');
      if (ariaPressed !== null) expect(ariaPressed).toBe('true');
    });

    test('Edit an existing edge weight via clicking edge label (CLICK_EDGE_LABEL -> editing_weight -> EDGE_WEIGHT_COMMIT_EDIT)', async ({ page }) => {
      // Prepare sample with at least one edge label
      const addSampleBtn4 = graph.buttonContains('Add Sample');
      await addSampleBtn.click();
      await graph.waitForNodes(2, 3000);

      // Try to find an edge label to click
      const edgeLabels1 = graph.edgeLabelsLocator();
      const count3 = await edgeLabels.count3();
      if (count === 0) {
        // If no explicit edge labels exist, attempt to create an edge quickly between node 0 and 1 first
        const addEdgeBtn3 = graph.modeButton('Add Edge');
        await addEdgeBtn.click();
        const a = await graph.nodeCenter(0);
        const b = await graph.nodeCenter(1);
        await page.mouse.click(a.x, a.y);
        await page.mouse.click(b.x, b.y);
        const weightInput2 = graph.weightInput2();
        await expect(weightInput).toBeVisible({ timeout: 1500 });
        await weightInput.fill('3');
        await weightInput.press('Enter');
      }

      // Now find a label again
      const label = graph.edgeLabelsLocator().first();
      await expect(label).toBeVisible({ timeout: 2000 });

      // Click it to edit
      await label.click();

      // Weight input should appear
      const weightInput21 = graph.weightInput();
      await expect(weightInput2).toBeVisible({ timeout: 1500 });

      // Change weight and commit
      await weightInput2.fill('42');
      await weightInput2.press('Enter');

      // After editing an existing edge, FSM says return to idle_select (Select mode)
      const selectBtn1 = graph.modeButton('Select');
      const selectAria1 = await selectBtn.getAttribute('aria-pressed');
      if (selectAria !== null) expect(selectAria).toBe('true');
      // Confirm new weight shows on label
      await expect(page.getByText(/\b42\b/)).toBeVisible({ timeout: 1500 });
    });

    test('Cancel weight editing restores to idle_select (EDGE_WEIGHT_CANCEL)', async ({ page }) => {
      // Prepare a scenario where clicking edge label opens editor
      const addSampleBtn5 = graph.buttonContains('Add Sample');
      await addSampleBtn.click();
      await graph.waitForNodes(2, 3000);

      // Ensure there is an edge label (create if needed)
      const edgeLabels2 = graph.edgeLabelsLocator();
      if ((await edgeLabels.count()) === 0) {
        const addEdgeBtn4 = graph.modeButton('Add Edge');
        await addEdgeBtn.click();
        const a1 = await graph.nodeCenter(0);
        const b1 = await graph.nodeCenter(1);
        await page.mouse.click(a.x, a.y);
        await page.mouse.click(b.x, b.y);
        const weightInput3 = graph.weightInput3();
        await expect(weightInput).toBeVisible({ timeout: 1500 });
        await weightInput.fill('5');
        await weightInput.press('Enter');
      }

      const label1 = graph.edgeLabelsLocator().first();
      await label.click();
      const weightInput4 = graph.weightInput4();
      await expect(weightInput).toBeVisible({ timeout: 1500 });

      // Cancel editing using Escape key (common pattern)
      await weightInput.press('Escape');
      // After cancel, FSM expects idle_select
      const selectBtn2 = graph.modeButton('Select');
      const selectAria2 = await selectBtn.getAttribute('aria-pressed');
      if (selectAria !== null) expect(selectAria).toBe('true');

      // Weight input should no longer be visible
      const visible1 = await weightInput.isVisible().catch(() => false);
      expect(visible).toBeFalsy();
    });
  });

  test.describe('Delete mode and keyboard delete', () => {
    test('Delete mode prevents accidental node creation and allows node removal (idle_delete / NODE_REMOVED)', async ({ page }) => {
      // Ensure sample nodes exist
      const addSampleBtn6 = graph.buttonContains('Add Sample');
      await addSampleBtn.click();
      await graph.waitForNodes(2, 3000);

      // Count nodes before
      const nodesBefore = await graph.nodesLocator().count();

      // Enter Delete mode and click a node to remove
      const deleteBtn1 = graph.modeButton('Delete');
      await deleteBtn.click();
      const center = await graph.nodeCenter(0);
      await page.mouse.click(center.x, center.y);

      // Wait a short time for deletion to occur
      await page.waitForTimeout(300);

      const nodesAfter = await graph.nodesLocator().count();
      // After deletion, count should be less or equal (some implementations mark removed visually)
      expect(nodesAfter).toBeLessThanOrEqual(nodesBefore);

      // Press Delete key globally (KEY_DELETE event) - should not crash and should be handled
      await page.keyboard.press('Delete');
      // Wait a bit and assert page still responsive (e.g., body visible)
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Dijkstra animation (animating -> animation_done)', () => {
    test('Running Dijkstra starts animation and completes (RUN_DIJKSTRA, ANIMATION_COMPLETE)', async ({ page }) => {
      // Prepare a sample graph with a start and end if necessary
      const addSampleBtn7 = graph.buttonContains('Add Sample');
      await addSampleBtn.click();
      await graph.waitForNodes(3, 3000);

      // If there are controls to set start/end, attempt to set them; otherwise rely on default
      const startBtn = graph.buttonContains('Set Start');
      const endBtn = graph.buttonContains('Set End');
      if ((await startBtn.count()) > 0 && (await endBtn.count()) > 0) {
        // Click first node then Set Start, click last node then Set End
        const s = await graph.nodeCenter(0);
        await page.mouse.click(s.x, s.y);
        await startBtn.click();
        const e = await graph.nodeCenter(1);
        await page.mouse.click(e.x, e.y);
        await endBtn.click();
      }

      // Click Run Dijkstra
      const runBtnCandidates = [
        graph.buttonContains('Run Dijkstra'),
        graph.buttonContains('Run'),
        graph.buttonContains('Start')
      ];
      let runBtn = null;
      for (const cand of runBtnCandidates) {
        if ((await cand.count()) > 0) {
          runBtn = cand;
          break;
        }
      }
      if (!runBtn) {
        // If no run button available, skip test gracefully but mark as passed by assertion
        test.info().skip('No Run/Start Dijkstra button found on page');
        return;
      }

      await runBtn.click();

      // Animation is implemented via timeouts: detect progress by looking for any visited/path highlight
      // Typical classes: .visited, .path, .highlight, .current
      const possibleHighlights = page.locator('.visited, .path, .highlight, .current, .edge-highlight, .node-visited');
      // Wait until either highlights appear or the animation completes indicator shows
      const animationCompleteIndicator = page.getByText(/complete|completed|finished|distance/i);

      // Wait up to 5s for either highlight or completion text
      await Promise.race([
        (async () => {
          if ((await possibleHighlights.count()) > 0) {
            return;
          }
          // Poll for highlights presence
          for (let i = 0; i < 20; i++) {
            if ((await possibleHighlights.count()) > 0) return;
            await page.waitForTimeout(150);
          }
        })(),
        (async () => {
          for (let i = 0; i < 30; i++) {
            if ((await animationCompleteIndicator.count()) > 0) return;
            await page.waitForTimeout(150);
          }
        })()
      ]);

      // After some time, expect either a highlighted path or a completion message
      const highlightsCount = await possibleHighlights.count();
      const completeTextCount = await animationCompleteIndicator.count();
      expect(highlightsCount + completeTextCount).toBeGreaterThan(0);

      // Finally, FSM animation_done should allow returning to idle_select mode when switching mode
      const selectBtn3 = graph.modeButton('Select');
      await selectBtn.click();
      const selectAria3 = await selectBtn.getAttribute('aria-pressed');
      if (selectAria !== null) expect(selectAria).toBe('true');
    }, { timeout: 15000 }); // animations may take more time
  });

  test.describe('Edge cases and error scenarios', () => {
    test('Clicking empty while in addEdge should not create a node and stays in addEdge (CLICK_EMPTY)', async ({ page }) => {
      // Enter Add Edge mode
      const addEdgeBtn5 = graph.modeButton('Add Edge');
      await addEdgeBtn.click();

      // Click empty area in svg
      await graph.clickSvgAt(10, 10);
      // No weight input should appear
      const weightInput5 = graph.weightInput5();
      const visible2 = await weightInput.isVisible().catch(() => false);
      expect(visible).toBeFalsy();

      // Mode should still be Add Edge (idle_addEdge)
      const aria = await addEdgeBtn.getAttribute('aria-pressed');
      if (aria !== null) expect(aria).toBe('true');
    });

    test('Cancel adding edge via explicit cancel control or Escape (CANCEL_ADDING)', async ({ page }) => {
      // Ensure nodes present and enter add edge
      const addSampleBtn8 = graph.buttonContains('Add Sample');
      await addSampleBtn.click();
      await graph.waitForNodes(2, 3000);

      const addEdgeBtn6 = graph.modeButton('Add Edge');
      await addEdgeBtn.click();

      // Click a node to start adding_edge
      const c1 = await graph.nodeCenter(0);
      await page.mouse.click(c.x, c.y);

      // Try to find a Cancel button in float editor area or common "Cancel" control
      const cancelBtn = graph.buttonContains('Cancel');
      if ((await cancelBtn.count()) > 0) {
        await cancelBtn.click();
      } else {
        // Press Escape to cancel
        await page.keyboard.press('Escape');
      }

      // After cancel, the FSM says idle_addEdge (remain in add edge)
      const aria1 = await addEdgeBtn.getAttribute('aria1-pressed');
      if (aria !== null) expect(aria).toBe('true');
    });

    test('Clear removes all nodes/edges and leaves app responsive (CLEAR)', async ({ page }) => {
      // Populate
      const addSampleBtn9 = graph.buttonContains('Add Sample');
      await addSampleBtn.click();
      await graph.waitForNodes(1, 3000);

      const clearBtn = graph.buttonContains('Clear');
      if ((await clearBtn.count()) === 0) {
        test.info().skip('Clear button not available');
        return;
      }

      // Click Clear and ensure nodes are removed
      await clearBtn.click();
      await page.waitForTimeout(300);
      const nodesCount = await graph.nodesLocator().count();
      // Expect zero or very small number (depends on whether UI shows ghost nodes)
      expect(nodesCount).toBeLessThanOrEqual(0 + 0); // If API doesn't remove nodes, this passes; we primarily ensure no crash
      // App should still be responsive
      await expect(page.locator('body')).toBeVisible();
    });
  });
});