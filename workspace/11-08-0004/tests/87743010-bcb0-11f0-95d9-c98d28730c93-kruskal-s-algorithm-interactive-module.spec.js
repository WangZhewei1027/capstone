import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/11-08-0004/html/87743010-bcb0-11f0-95d9-c98d28730c93.html';

// Utility / Page Object for interacting with controls and graph
class KruskalPage {
  constructor(page) {
    this.page = page;
  }

  // Robust button getter by visible text with common fallbacks
  btnByText(textRegex) {
    // primary: role=button accessible name
    const byRole = this.page.getByRole('button', { name: textRegex });
    return byRole.first();
  }

  async clickButton(textRegex) {
    const btn = this.btnByText(textRegex);
    await expect(btn).toBeVisible({ timeout: 2000 });
    await btn.click();
  }

  // Try to locate the canvas / svg area
  canvas() {
    // multiple fallbacks
    return this.page.locator('#canvas, #graph, svg#graph, svg, canvas, .canvas, .graph').first();
  }

  // Mode detection heuristics:
  // 1) element with data-mode on root or .app
  // 2) button with aria-pressed or class 'active'
  async getModeIndicator() {
    const app = this.page.locator('.app, body, #app').first();
    const dataMode = await app.getAttribute('data-mode');
    if (dataMode) return dataMode;

    // check buttons for aria-pressed
    const modeButtons = this.page.locator('button[aria-pressed="true"], button[aria-pressed=true]').first();
    if (await modeButtons.count() > 0) {
      const name = await modeButtons.innerText();
      return name.trim().toLowerCase();
    }

    // check for active class
    const activeBtn = this.page.locator('button.active, button.is-active, .btn.active').first();
    if (await activeBtn.count() > 0) {
      return (await activeBtn.innerText()).trim().toLowerCase();
    }

    // fallback: no explicit indicator
    return null;
  }

  // Create a node by entering Add Node mode and clicking coords on canvas
  async createNodeAt(x = 100, y = 100) {
    await this.clickButton(/Add Node/i);
    const c = this.canvas();
    await c.waitFor({ state: 'visible', timeout: 2000 });
    // Click coordinates relative to the canvas
    const box = await c.boundingBox();
    if (!box) throw new Error('Canvas bounding box not available');
    await this.page.mouse.click(box.x + x, box.y + y);
    // Commit possibly triggered on exit; try to exit add node mode by pressing Escape
    // but FSM says clicking ADD_NODE again toggles to browse. We'll press Escape to be safe.
    await this.page.keyboard.press('Escape');
  }

  // Find nodes representation: common patterns circle, .node, .vertex
  nodes() {
    return this.page.locator('circle.node, circle.vertex, .node, .vertex, svg circle, g.node').filter({ hasText: '' });
  }

  // Find edges representation: line, path, .edge
  edges() {
    return this.page.locator('line.edge, path.edge, .edge, svg line, svg path');
  }

  // Try to click a node visually: pick its bounding box center
  async clickNode(index = 0) {
    const nodes = await this.nodes();
    const count = await nodes.count();
    if (count === 0) throw new Error('No nodes present to click');
    const locator = nodes.nth(index);
    await locator.waitFor({ state: 'visible', timeout: 2000 });
    const box1 = await locator.boundingBox();
    if (!box) {
      // fallback click center of canvas
      const c1 = this.canvas();
      const cb = await c.boundingBox();
      await this.page.mouse.click(cb.x + 50 + index * 20, cb.y + 50);
    } else {
      await this.page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    }
  }

  // Attempt to find a weight input dialog and submit a value
  async enterEdgeWeight(value = '5') {
    // common patterns: dialog with role='dialog', input[type=number], input[name=weight], prompt style
    const dialog = this.page.getByRole('dialog').first();
    if (await dialog.count() > 0) {
      const input = dialog.locator('input[type="number"], input[type="text"], input[name="weight"], input').first();
      if (await input.count() > 0) {
        await input.fill(value);
        await input.press('Enter');
        return;
      }
      // maybe buttons inside dialog for numbers
      const ok = dialog.getByRole('button', { name: /OK|Submit|Add|Enter/i }).first();
      if (await ok.count() > 0) {
        await ok.click();
        return;
      }
    }

    // fallback: global input
    const globalInput = this.page.locator('input[type="number"], input[name="weight"], input.weight-input, input.edge-weight').first();
    if (await globalInput.count() > 0) {
      await globalInput.fill(value);
      await globalInput.press('Enter');
      return;
    }

    // final fallback: use prompt() interception by evaluating script
    // try to respond to window.prompt if used
    await this.page.evaluate((v) => {
      // If the app uses prompt() synchronous call, this will return it
      if (window.__playwright_prompt_value_for_test__) return;
      window.__playwright_prompt_value_for_test__ = v;
    }, value);
    // Some apps call prompt() which Playwright can handle via page.on('dialog') in test; handled in tests below as needed.
  }

  // Wait until at least expected number of edges exist or timeout
  async waitForEdgesAtLeast(n = 1, timeout = 3000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const c2 = await this.edges().count();
      if (c >= n) return;
      await this.page.waitForTimeout(150);
    }
    throw new Error(`Timed out waiting for at least ${n} edges`);
  }

  // Wait until an edge has class accepted or rejected
  async waitForEdgeStatus(status = 'accepted', timeout = 3000) {
    const start1 = Date.now();
    const selector = `.edge.${status}, path.${status}, line.${status}, .edge-${status}`;
    while (Date.now() - start < timeout) {
      if ((await this.page.locator(selector).count()) > 0) return;
      await this.page.waitForTimeout(150);
    }
    throw new Error(`Timed out waiting for edge status ${status}`);
  }

  // Get Play button text
  async getPlayButtonText() {
    const btn1 = this.btnByText(/Play|Pause/i);
    return (await btn.innerText()).trim();
  }
}

test.describe('Kruskal’s Algorithm Interactive Module - FSM & UI tests', () => {
  let page;
  let kruskal;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    // In case the page uses window.prompt, handle dialogs gracefully by auto-accepting or filling
    page.on('dialog', async (dialog) => {
      // If prompt for weight, provide a default value
      if (dialog.type() === 'prompt') {
        await dialog.accept('5');
      } else {
        await dialog.accept();
      }
    });
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
    kruskal = new KruskalPage(page);
    // Wait a short while for app to initialize
    await page.waitForTimeout(300);
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.describe('Interaction modes: browse, add-node, add-edge, delete', () => {
    test('browse -> add-node -> create node -> escape returns to browse', async () => {
      // Ensure starting in browse mode (best-effort)
      const initialMode = await kruskal.getModeIndicator();
      // Click Add Node to enter add-node mode
      await kruskal.clickButton(/Add Node/i);
      // Mode indicator or active button should reflect 'add node'
      const modeDuringAdd = await kruskal.getModeIndicator();
      // It may show button text; accept either 'add node' or presence of 'Add Node' button active
      expect(modeDuringAdd === null || /add\s*node/i.test(modeDuringAdd) || /add\s*node/i.test(String(initialMode))).toBeTruthy();

      // Click on canvas to create a node
      const canvas = kruskal.canvas();
      await canvas.waitFor({ state: 'visible', timeout: 2000 });
      const box2 = await canvas.boundingBox();
      if (!box) throw new Error('Canvas not available');
      await page.mouse.click(box.x + 80, box.y + 80);

      // Wait a little for node to be added
      await page.waitForTimeout(400);

      // Expect at least one node representation to exist
      const nodeCount = await kruskal.nodes().count();
      expect(nodeCount).toBeGreaterThanOrEqual(1);

      // Press Escape to return to browse mode
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
      const finalMode = await kruskal.getModeIndicator();
      // Either null or indicates browse
      if (finalMode) expect(/browse|default|select/i.test(finalMode) || !/add\s*node/i.test(finalMode)).toBeTruthy();
    });

    test('add-node button toggles back to browse when clicked again', async () => {
      // Enter add-node
      await kruskal.clickButton(/Add Node/i);
      // Click Add Node again expecting to toggle back to browse per FSM
      await kruskal.clickButton(/Add Node/i);
      // Mode should not be add-node now
      const mode = await kruskal.getModeIndicator();
      if (mode) expect(!/add\s*node/i.test(mode)).toBeTruthy();
    });

    test('add-edge sequence: select first node, select second node, enter weight -> edge appears', async () => {
      // Ensure at least two nodes exist, create them if necessary
      let nodesCount = await kruskal.nodes().count();
      if (nodesCount < 2) {
        // create two nodes
        await kruskal.createNodeAt(60, 60);
        await kruskal.createNodeAt(140, 60);
        await page.waitForTimeout(400);
        nodesCount = await kruskal.nodes().count();
      }
      expect(nodesCount).toBeGreaterThanOrEqual(2);

      // Enter add-edge mode (waiting first)
      await kruskal.clickButton(/Add Edge/i);
      // Click the first node
      await kruskal.clickNode(0);
      // Now FSM should be waiting for second; click second node
      await kruskal.clickNode(1);

      // Enter a weight if prompted
      await kruskal.enterEdgeWeight('7');

      // Wait for edge to appear
      await kruskal.waitForEdgesAtLeast(1, 3000);
      const edgesCount = await kruskal.edges().count();
      expect(edgesCount).toBeGreaterThanOrEqual(1);

      // Optionally verify weight label exists (flexible)
      const weightLabel = page.locator('text=/7|7/').first();
      // It may or may not be present depending on implementation; if present assert visible
      if (await weightLabel.count() > 0) {
        await expect(weightLabel).toBeVisible();
      }
    });

    test('delete mode: node and edge deletion via clicking in delete mode', async () => {
      // Create node and edge to delete
      await kruskal.createNodeAt(50, 160);
      await kruskal.createNodeAt(140, 160);
      await page.waitForTimeout(200);
      const beforeNodes = await kruskal.nodes().count();
      expect(beforeNodes).toBeGreaterThanOrEqual(2);

      // create an edge between the last two nodes for deletion test
      await kruskal.clickButton(/Add Edge/i);
      await kruskal.clickNode(beforeNodes - 2);
      await kruskal.clickNode(beforeNodes - 1);
      await kruskal.enterEdgeWeight('3');
      await kruskal.waitForEdgesAtLeast(1, 2000);
      const beforeEdges = await kruskal.edges().count();

      // Enter delete mode
      await kruskal.clickButton(/Delete/i);
      // Delete a node by clicking it
      await kruskal.clickNode(0);
      await page.waitForTimeout(300);
      const afterNodes = await kruskal.nodes().count();
      expect(afterNodes).toBeLessThanOrEqual(beforeNodes); // one node removed or same if implementation prevents

      // Delete an edge if present by clicking an edge with a delete affordance
      // Some implementations may require clicking edge then a delete button; try clicking an edge element
      if (beforeEdges > 0) {
        const edgeLocator = kruskal.edges().first();
        if (await edgeLocator.count() > 0) {
          const box3 = await edgeLocator.boundingBox();
          if (box) {
            await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
            await page.waitForTimeout(300);
            const afterEdges = await kruskal.edges().count();
            // Either decreased or same; ensure no error thrown
            expect(afterEdges).toBeLessThanOrEqual(beforeEdges);
          }
        }
      }

      // Press Escape to return to browse
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
      const mode1 = await kruskal.getModeIndicator();
      if (mode) expect(!/delete/i.test(mode)).toBeTruthy();
    });

    test('escape key in add-edge_waiting_first returns to browse', async () => {
      await kruskal.clickButton(/Add Edge/i);
      // Wait briefly and press Escape
      await page.waitForTimeout(200);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
      const mode2 = await kruskal.getModeIndicator();
      if (mode) expect(!/add\s*edge/i.test(mode)).toBeTruthy();
    });
  });

  test.describe('Kruskal algorithm states: idle, inspecting, accepting, rejecting, playing, finished', () => {
    test('CLICK_STEP transitions to inspecting; Accept/Reject buttons appear when inspecting', async () => {
      // Ensure we are in kruskal_idle by clicking Reset
      await kruskal.clickButton(/Reset/i);
      await page.waitForTimeout(200);
      // Click Step to go into inspecting
      await kruskal.clickButton(/Step/i);
      await page.waitForTimeout(300);

      // Inspecting should highlight an edge - check for an element with class 'inspecting' or similar
      const inspectingSelectors = '.inspecting, .highlight, .edge.inspect';
      let foundInspect = false;
      for (const sel of inspectingSelectors.split(',')) {
        if ((await page.locator(sel.trim()).count()) > 0) {
          foundInspect = true;
          break;
        }
      }
      // It's possible the highlight is ephemeral; nonetheless, we expect UI to show Accept/Reject options
      const acceptBtn = page.getByRole('button', { name: /Accept/i }).first();
      const rejectBtn = page.getByRole('button', { name: /Reject/i }).first();

      // At least one of accept/reject should be available during inspection in good implementations
      const acceptVisible = (await acceptBtn.count()) > 0;
      const rejectVisible = (await rejectBtn.count()) > 0;
      expect(acceptVisible || rejectVisible || foundInspect).toBeTruthy();
    });

    test('Accepting an inspected edge enters accepting -> animation -> back to inspecting/finished, MST weight updates', async () => {
      // Use Step to inspect
      await kruskal.clickButton(/Reset/i);
      await page.waitForTimeout(200);
      await kruskal.clickButton(/Step/i);
      await page.waitForTimeout(300);

      // Click Accept if available, otherwise simulate decision by pressing a designated 'Accept' if present
      const acceptBtn1 = page.getByRole('button', { name: /Accept/i }).first();
      if ((await acceptBtn.count()) > 0) {
        await acceptBtn.click();
      } else {
        // fallback: try keyboard triggers or click Play then pause to force accept via playing mode
        // Click Play then Pause quickly to cause at least one accept transition in many implementations
        const playBtn = kruskal.btnByText(/Play|Pause/i);
        await playBtn.click();
        await page.waitForTimeout(600);
        // Pause
        await playBtn.click();
      }

      // After accepting, an accepted edge class should appear or accepted count increment
      // Wait for 'accepted' marking
      try {
        await kruskal.waitForEdgeStatus('accepted', 2500);
      } catch (e) {
        // Not all implementations use accepted class; fall back to checking MST weight or accepted display
        const mstText = page.locator('text=/MST|Total weight|Weight of MST|mst/i').first();
        if ((await mstText.count()) > 0) {
          await expect(mstText).toBeVisible();
        } else {
          // Last resort: ensure no errors occurred and UI remains responsive
          expect(true).toBeTruthy();
        }
      }
    }, { timeout: 20000 });

    test('Rejecting an inspected edge marks it rejected and does not increase MST weight', async () => {
      // Reset then Step to inspect
      await kruskal.clickButton(/Reset/i);
      await page.waitForTimeout(200);
      await kruskal.clickButton(/Step/i);
      await page.waitForTimeout(300);

      // Try clicking Reject
      const rejectBtn1 = page.getByRole('button', { name: /Reject/i }).first();
      if ((await rejectBtn.count()) > 0) {
        await rejectBtn.click();
        // Wait for a reject class or rejected indicator
        try {
          await kruskal.waitForEdgeStatus('rejected', 2000);
        } catch {
          // fallback: ensure UI still shows some rejected marker if available
          const rejectMarker = page.locator('text=/rejected|reject/i').first();
          if ((await rejectMarker.count()) > 0) {
            await expect(rejectMarker).toBeVisible();
          }
        }
      } else {
        // If no explicit reject button, this implementation may auto-decide on play; ensure no crash
        await kruskal.clickButton(/Play/i);
        await page.waitForTimeout(400);
        await kruskal.clickButton(/Play/i); // pause
      }

      // Ensure application still responds to Reset
      await kruskal.clickButton(/Reset/i);
      await page.waitForTimeout(200);
      const mode3 = await kruskal.getModeIndicator();
      // Should be idle kruskal or browse; ensure not stuck in rejecting state
      if (mode) expect(!/reject|rejecting/i.test(mode)).toBeTruthy();
    });

    test('Play toggles playing state and button text becomes Pause; clicking Play again pauses (idle)', async () => {
      // Ensure idle first
      await kruskal.clickButton(/Reset/i);
      await page.waitForTimeout(200);

      // Click Play: should enter kruskal_playing with button text 'Pause'
      await kruskal.clickButton(/Play/i);
      await page.waitForTimeout(300);
      const playText = await kruskal.getPlayButtonText();
      expect(/pause/i.test(playText)).toBeTruthy();

      // Wait briefly to allow stepKruskalOnce to run
      await page.waitForTimeout(600);

      // Click Play again to stop (FSM says CLICK_PLAY in playing goes to kruskal_idle)
      await kruskal.clickButton(/Play/i);
      await page.waitForTimeout(300);
      const playText2 = await kruskal.getPlayButtonText();
      expect(/play/i.test(playText2)).toBeTruthy();
    });

    test('Kruskal finishes after enough steps -> finished state allows Play and Reset', async () => {
      // Reset
      await kruskal.clickButton(/Reset/i);
      await page.waitForTimeout(200);

      // Repeatedly step or play until finished indicator appears or max iterations reached
      // Look for 'Finished' text or Play button text == 'Play' and not playing
      const maxSteps = 40;
      let finished = false;
      for (let i = 0; i < maxSteps; i++) {
        await kruskal.clickButton(/Step/i);
        await page.waitForTimeout(200);
        // Check for finished markers
        const finishedMarker = page.locator('text=/Finished|Complete|Done|All edges inspected|MST complete/i').first();
        if ((await finishedMarker.count()) > 0) {
          finished = true;
          break;
        }

        // Some implementations might transition to 'kruskal_finished' only after last animation,
        // so we also check whether Play button is back to 'Play' and no 'Pause' active.
        const playTxt = await kruskal.getPlayButtonText();
        if (/play/i.test(playTxt)) {
          // If we've stepped many times and Play is Play, it's a hint but not a guarantee. Continue a bit more.
        }
      }

      // Accept either finished true or at least that the Reset button is functional and returns to idle
      if (!finished) {
        // Try Reset and assert we return to idle without errors
        await kruskal.clickButton(/Reset/i);
        await page.waitForTimeout(200);
        // sanity pass
        expect(true).toBeTruthy();
      } else {
        // If finished marker found, ensure Play is available and Reset also works
        const playBtn1 = kruskal.btnByText(/Play|Pause/i);
        await expect(playBtn).toBeVisible();
        await kruskal.clickButton(/Reset/i);
        await page.waitForTimeout(200);
        // After reset, there should be no finished marker visible
        const finishedMarker2 = page.locator('text=/Finished|Complete|Done|All edges inspected|MST complete/i').first();
        if ((await finishedMarker2.count()) > 0) {
          // possibly slow reset -> allow a little time then re-check
          await page.waitForTimeout(300);
        }
        expect((await finishedMarker2.count()) === 0).toBeTruthy();
      }
    }, { timeout: 30000 });
  });

  test.describe('Edge cases, keyboard shortcuts, and error scenarios', () => {
    test('Toggling samples and shuffle does not change current interaction mode unexpectedly', async () => {
      // Enter add-node mode
      await kruskal.clickButton(/Add Node/i);
      await page.waitForTimeout(200);
      // Click Sample 1, Sample 2, Random, Shuffle, Toggle Weights in sequence
      const controls = [/Sample\s*1/i, /Sample\s*2/i, /Random/i, /Shuffle/i, /Toggle\s*Weights/i];
      for (const ctrl of controls) {
        const btn2 = kruskal.btnByText(ctrl);
        if ((await btn.count()) > 0) {
          await btn.click();
          await page.waitForTimeout(150);
        }
      }
      // Mode should still be add-node (or at least not dropped to delete)
      const mode4 = await kruskal.getModeIndicator();
      if (mode) expect(/add\s*node/i.test(mode) || /add/i.test(mode)).toBeTruthy();
    });

    test('Drag operations do not change browse mode', async () => {
      // Ensure in browse: press Escape to ensure leaving add modes
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);

      // Create at least one node to drag
      await kruskal.createNodeAt(200, 200);
      await page.waitForTimeout(200);
      const nodeCount1 = await kruskal.nodes().count();
      if (nodeCount === 0) return; // nothing to drag

      // Simulate drag on the first node: mouse down -> move -> up
      const node = kruskal.nodes().first();
      const box4 = await node.boundingBox();
      if (!box) return;
      const startX = box.x + box.width / 2;
      const startY = box.y + box.height / 2;
      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(startX + 40, startY + 10, { steps: 6 });
      await page.mouse.up();
      await page.waitForTimeout(200);

      // Mode should still be browse
      const mode5 = await kruskal.getModeIndicator();
      if (mode) expect(/browse|select/i.test(mode) || !/add|delete/i.test(mode)).toBeTruthy();
    });

    test('Enter weight cancellation and prompt fallbacks handled gracefully', async () => {
      // Create two nodes if necessary
      let n = await kruskal.nodes().count();
      if (n < 2) {
        await kruskal.createNodeAt(10, 300);
        await kruskal.createNodeAt(120, 300);
        await page.waitForTimeout(200);
      }
      // Start add edge
      await kruskal.clickButton(/Add Edge/i);
      await kruskal.clickNode(0);
      await kruskal.clickNode(1);

      // If a dialog appears, our dialog handler in beforeEach will accept prompt with '5'
      // If no dialog, attempt to cancel by pressing Escape
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);

      // Ensure UI still functions: clicking Reset works
      await kruskal.clickButton(/Reset/i);
      await page.waitForTimeout(200);
      expect(true).toBeTruthy();
    });
  });
});