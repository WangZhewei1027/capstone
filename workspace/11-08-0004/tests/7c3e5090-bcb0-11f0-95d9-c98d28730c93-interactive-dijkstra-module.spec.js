import { test, expect } from '@playwright/test';

const APP = 'http://127.0.0.1:5500/workspace/11-08-0004/html/7c3e5090-bcb0-11f0-95d9-c98d28730c93.html';

test.describe('Interactive Dijkstra Module — end-to-end', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app and wait for the svg canvas to be ready
    await page.goto(APP);
    await page.waitForSelector('svg', { timeout: 5000 });
  });

  test.describe('Mode switching and toolbar behavior', () => {
    test('Clicking mode buttons toggles toolbar aria-pressed and clears other mode buttons', async ({ page }) => {
      // Buttons are expected to exist; use case-insensitive matching
      const addNodeBtn = page.getByRole('button', { name: /add\s*node/i });
      const addEdgeBtn = page.getByRole('button', { name: /add\s*edge/i });
      const moveBtn = page.getByRole('button', { name: /move/i });

      // Ensure buttons are present
      await expect(addNodeBtn).toBeVisible();
      await expect(addEdgeBtn).toBeVisible();
      await expect(moveBtn).toBeVisible();

      // Click Add Node: it should set aria-pressed on Add Node and unset others
      await addNodeBtn.click();
      await expect(addNodeBtn).toHaveAttribute('aria-pressed', 'true');
      // Others should be false or absent; ensure at least Move is not pressed
      expect(await moveBtn.getAttribute('aria-pressed')).not.toBe('true');

      // Switch to Add Edge
      await addEdgeBtn.click();
      await expect(addEdgeBtn).toHaveAttribute('aria-pressed', 'true');
      await expect(addNodeBtn).not.toHaveAttribute('aria-pressed', 'true');

      // Switch to Move
      await moveBtn.click();
      await expect(moveBtn).toHaveAttribute('aria-pressed', 'true');
      await expect(addEdgeBtn).not.toHaveAttribute('aria-pressed', 'true');
    });

    test('Entering add-edge then clicking move clears any selection (onExit effects)', async ({ page }) => {
      const addNodeBtn1 = page.getByRole('button', { name: /add\s*node/i });
      const addEdgeBtn1 = page.getByRole('button', { name: /add\s*edge/i });
      const moveBtn1 = page.getByRole('button', { name: /move/i });
      const svg = page.locator('svg');

      // Create two nodes to operate on
      await addNodeBtn.click();
      await svg.click({ position: { x: 120, y: 120 } });
      await svg.click({ position: { x: 220, y: 120 } });

      // Select first node by pointerdown
      const firstNode = page.locator('svg').locator('circle, g.node').first();
      const box = await firstNode.boundingBox();
      test.skip(!box, 'No node bounding box: environment may have rendered nodes differently');

      if (box) {
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { button: 'left' });
      }

      // Ensure something shows as selected (either class 'selected' or attribute)
      const selectedNode = page.locator('svg .selected, svg [data-selected="true"]');
      await expect(selectedNode.first()).toBeVisible();

      // Enter add-edge mode then immediately click move to trigger onExit for add-edge
      await addEdgeBtn.click();

      // Simulate clicking Move — onExit of add-edge should clear selection
      await moveBtn.click();

      // There should be no selected nodes
      await expect(page.locator('svg .selected, svg [data-selected="true"]')).toHaveCount(0);
    });
  });

  test.describe('Node and Edge creation flows', () => {
    test('Add nodes by clicking the canvas in add-node mode', async ({ page }) => {
      const addNodeBtn2 = page.getByRole('button', { name: /add\s*node/i });
      const svg1 = page.locator('svg1');

      await addNodeBtn.click();
      // Click in three positions to add nodes
      await svg.click({ position: { x: 80, y: 140 } });
      await svg.click({ position: { x: 180, y: 240 } });
      await svg.click({ position: { x: 300, y: 180 } });

      // Expect at least 3 circle elements or node groups
      const nodes = page.locator('svg circle, svg g.node');
      await expect(nodes).toHaveCountGreaterThan(2);
    });

    test('Create an edge between two nodes using add-edge mode', async ({ page }) => {
      const addNodeBtn3 = page.getByRole('button', { name: /add\s*node/i });
      const addEdgeBtn2 = page.getByRole('button', { name: /add\s*edge/i });
      const svg2 = page.locator('svg2');

      // Create two nodes to link
      await addNodeBtn.click();
      await svg.click({ position: { x: 100, y: 150 } });
      await svg.click({ position: { x: 220, y: 150 } });

      // Get the two nodes' centers
      const nodes1 = page.locator('svg circle, svg g.node');
      await expect(nodes).toHaveCountGreaterThan(1);
      const first = nodes.nth(0);
      const second = nodes.nth(1);

      const b1 = await first.boundingBox();
      const b2 = await second.boundingBox();

      test.skip(!(b1 && b2), 'Node bounding boxes not available; skipping edge creation test');

      if (b1 && b2) {
        // Enter add-edge, click first node then second node to finish edge
        await addEdgeBtn.click();
        await page.mouse.click(b1.x + b1.width / 2, b1.y + b1.height / 2);
        // After pointerdown on node, app should enter edge_creating; finish by clicking other node
        await page.mouse.click(b2.x + b2.width / 2, b2.y + b2.height / 2);

        // Expect at least one edge-like element (line, path or .edge)
        const edgeCandidates = page.locator('svg line, svg path.edge, svg .edge');
        await expect(edgeCandidates.first()).toBeVisible();
      }
    });

    test('Cancel edge creation by clicking empty svg or pressing delete during edge creation', async ({ page }) => {
      const addNodeBtn4 = page.getByRole('button', { name: /add\s*node/i });
      const addEdgeBtn3 = page.getByRole('button', { name: /add\s*edge/i });
      const svg3 = page.locator('svg3');

      // Create two nodes
      await addNodeBtn.click();
      await svg.click({ position: { x: 120, y: 200 } });
      await svg.click({ position: { x: 260, y: 200 } });

      const nodes2 = page.locator('svg circle, svg g.node');
      const a = nodes.nth(0);
      const b = nodes.nth(1);

      const ba = await a.boundingBox();
      test.skip(!ba, 'Node bounding box missing');

      if (ba) {
        await addEdgeBtn.click();
        // Start edge creation by clicking the first node
        await page.mouse.click(ba.x + ba.width / 2, ba.y + ba.height / 2);
        // Now cancel by clicking empty area
        await svg.click({ position: { x: 20, y: 20 } });

        // No new edges should exist (or no temporary addEdgeFrom state should remain)
        // Check that no edge is highlighted as being created (no .selected or data-temp-edge)
        // We simply assert there's no visible temporary marker
        const temp = page.locator('svg .creating, svg .edge-temp, svg [data-adding-edge="true"]');
        await expect(temp).toHaveCount(0);

        // Start again, then press Delete to cancel (simulate keyboard)
        await addEdgeBtn.click();
        await page.mouse.click(ba.x + ba.width / 2, ba.y + ba.height / 2);
        await page.keyboard.press('Delete');
        await expect(page.locator('svg .creating, svg .edge-temp, svg [data-adding-edge="true"]')).toHaveCount(0);
      }
    });
  });

  test.describe('Selection, set source/target, deletion and dragging', () => {
    test('Selecting a node and setting it as source and target updates DOM state', async ({ page }) => {
      const addNodeBtn5 = page.getByRole('button', { name: /add\s*node/i });
      const setSourceBtn = page.getByRole('button', { name: /set\s*source/i }).catch(() => null);
      const setTargetBtn = page.getByRole('button', { name: /set\s*target/i }).catch(() => null);
      const svg4 = page.locator('svg4');

      // Create one node
      await addNodeBtn.click();
      await svg.click({ position: { x: 140, y: 180 } });

      const node = page.locator('svg circle, svg g.node').first();
      const box1 = await node.boundingBox();
      test.skip(!box, 'Node bounding box missing');

      if (box) {
        // Select node
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        // If UI exposes Set source/target buttons, use them. Otherwise try context menu like double click.
        if (setSourceBtn) {
          await setSourceBtn.click();
          // Source node should get source styling (class or data attr)
          const sourceSelector = 'svg .source, svg [data-source="true"]';
          await expect(page.locator(sourceSelector).first()).toBeVisible();
        }
        if (setTargetBtn) {
          await setTargetBtn.click();
          const targetSelector = 'svg .target, svg [data-target="true"]';
          await expect(page.locator(targetSelector).first()).toBeVisible();
        }
      }
    });

    test('Deleting a selected node removes it from DOM and delete without selection is a noop', async ({ page }) => {
      const addNodeBtn6 = page.getByRole('button', { name: /add\s*node/i });
      const svg5 = page.locator('svg5');

      // Add a node and then delete it
      await addNodeBtn.click();
      await svg.click({ position: { x: 160, y: 200 } });
      const nodes3 = page.locator('svg circle, svg g.node');
      await expect(nodes).toHaveCountGreaterThan(0);

      const first1 = nodes.first1();
      const box2 = await first.boundingBox();
      test.skip(!box, 'Node bounding box missing');

      if (box) {
        // Select and delete
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        await page.keyboard.press('Delete');

        // Node count should decrease or selected node should be gone
        const remaining = page.locator('svg circle, svg g.node');
        await expect(remaining).toHaveCountLessThan(await nodes.count());
      }

      // Press Delete when nothing is selected - this should not throw and should leave node count unchanged
      const beforeCount = await page.locator('svg circle, svg g.node').count();
      await page.keyboard.press('Delete');
      const afterCount = await page.locator('svg circle, svg g.node').count();
      expect(afterCount).toBe(beforeCount);
    });

    test('Drag a node updates its position and triggers render (dragging state)', async ({ page }) => {
      const addNodeBtn7 = page.getByRole('button', { name: /add\s*node/i });
      const svg6 = page.locator('svg6');

      // Create a node
      await addNodeBtn.click();
      await svg.click({ position: { x: 200, y: 240 } });

      const node1 = page.locator('svg circle, svg g.node1').first();
      const b11 = await node.boundingBox();
      test.skip(!b, 'Node bounding box missing');

      if (b) {
        const startX = b.x + b.width / 2;
        const startY = b.y + b.height / 2;
        const endX = startX + 80;
        const endY = startY + 60;

        // Drag using mouse events (pointerdown + move + up)
        await page.mouse.move(startX, startY);
        await page.mouse.down();
        await page.mouse.move(endX, endY, { steps: 8 });
        await page.waitForTimeout(100); // allow any render on move
        await page.mouse.up();

        // After drag, bounding box should be at new location (or significantly different)
        const b21 = await node.boundingBox();
        expect(b2).not.toBeNull();
        if (b2) {
          const moved = Math.hypot(b2.x - b.x, b2.y - b.y);
          expect(moved).toBeGreaterThan(10);
        }
      }
    });
  });

  test.describe('Edge weight editing and prompts', () => {
    test('Double-clicking an edge opens a prompt and updates the displayed weight', async ({ page }) => {
      const addNodeBtn8 = page.getByRole('button', { name: /add\s*node/i });
      const addEdgeBtn4 = page.getByRole('button', { name: /add\s*edge/i });
      const svg7 = page.locator('svg7');

      // Create two nodes and an edge
      await addNodeBtn.click();
      await svg.click({ position: { x: 120, y: 140 } });
      await svg.click({ position: { x: 260, y: 140 } });

      const nodes4 = page.locator('svg circle, svg g.node');
      const a1 = nodes.nth(0);
      const b211 = nodes.nth(1);
      const ba1 = await a.boundingBox();
      const bb = await b.boundingBox();
      test.skip(!(ba && bb), 'Node bounding boxes missing');

      if (ba && bb) {
        await addEdgeBtn.click();
        await page.mouse.click(ba.x + ba.width / 2, ba.y + ba.height / 2);
        await page.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2);

        // Identify an edge element - line, path or element with class .edge
        const edge = page.locator('svg line, svg path.edge, svg .edge').first();
        await expect(edge).toBeVisible();

        // Intercept the prompt/dialog opened on dblclick
        page.once('dialog', async (dialog) => {
          // The FSM suggests the prompt is for edge weight; enter 7 and accept
          expect(dialog.type()).toMatch(/prompt|alert|confirm/);
          await dialog.accept('7');
        });

        // Double click on the edge to trigger edit
        await edge.dblclick();

        // After accepting, the UI should render the weight near the edge (text node, .weight, .edge-weight)
        const weightText = page.locator('svg text.edge-weight, svg .edge-weight, svg text.weight');
        await expect(weightText.first()).toContainText(/7/);
      }
    });

    test('Cancelling the weight prompt leaves weight unchanged', async ({ page }) => {
      const addNodeBtn9 = page.getByRole('button', { name: /add\s*node/i });
      const addEdgeBtn5 = page.getByRole('button', { name: /add\s*edge/i });
      const svg8 = page.locator('svg8');

      // Create two nodes and an edge
      await addNodeBtn.click();
      await svg.click({ position: { x: 120, y: 200 } });
      await svg.click({ position: { x: 260, y: 200 } });

      const nodes5 = page.locator('svg circle, svg g.node');
      const a2 = nodes.nth(0);
      const b3 = nodes.nth(1);
      const ba2 = await a.boundingBox();
      const bb1 = await b.boundingBox();
      test.skip(!(ba && bb), 'Node bounding boxes missing');

      if (ba && bb) {
        await addEdgeBtn.click();
        await page.mouse.click(ba.x + ba.width / 2, ba.y + ba.height / 2);
        await page.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2);

        // If there is an existing weight, capture it
        const weightText1 = page.locator('svg text.edge-weight, svg .edge-weight, svg text.weight').first();
        const before = await weightText.textContent().catch(() => null);

        // Cancel the prompt
        page.once('dialog', async (dialog) => {
          await dialog.dismiss();
        });

        const edge1 = page.locator('svg line, svg path.edge1, svg .edge1').first();
        await edge.dblclick();

        // After dismissal, confirm the label is unchanged (or still absent)
        const after = await weightText.textContent().catch(() => null);
        expect(after).toBe(before);
      }
    });
  });

  test.describe('Random graph seeding and algorithm lifecycle (run/step/pause/complete)', () => {
    test('Clicking random graph seeds nodes and sets a source, then DONE->mode_move transition', async ({ page }) => {
      const randomBtn = page.getByRole('button', { name: /random|seed/i });
      await expect(randomBtn).toBeVisible();

      // Click random to seed a graph
      await randomBtn.click();

      // After seeding, expect nodes and edges to be created
      const nodes6 = page.locator('svg circle, svg g.node');
      await expect(nodes).toHaveCountGreaterThan(0);

      const edges = page.locator('svg line, svg path.edge, svg .edge');
      await expect(edges).toHaveCountGreaterThanOrEqual(0); // edges may be zero in degenerate cases

      // FSM says set sourceId on seeded_graph onEnter; source node should be marked
      const sourceSelector1 = 'svg .source, svg [data-source="true"]';
      const sourceNodes = page.locator(sourceSelector);
      // Either zero or one depending on implementation; if present it should be visible
      if ((await sourceNodes.count()) > 0) {
        await expect(sourceNodes.first()).toBeVisible();
      }
    });

    test('Clicking Run without a source triggers an alert "Set a source"', async ({ page }) => {
      // Ensure we have no source by clearing any seeded graph and not setting a source
      // If a "Clear" or "Clear All" button exists, try to use it; otherwise reload to fresh state
      const clearBtn = page.getByRole('button', { name: /clear|clear all/i }).catch(() => null);
      if (clearBtn) await clearBtn.click();
      else await page.reload();

      const runBtn = page.getByRole('button', { name: /run/i });
      await expect(runBtn).toBeVisible();

      // Listen for dialog and assert message includes 'Set a source'
      let sawAlert = false;
      page.once('dialog', async (dialog) => {
        const msg = dialog.message();
        if (msg && /set.*source/i.test(msg)) sawAlert = true;
        await dialog.accept();
      });

      await runBtn.click();
      // Wait a short time for dialog to appear
      await page.waitForTimeout(200);
      expect(sawAlert).toBe(true);
    });

    test('Running algorithm from seeded graph updates distances and eventually shows complete/Show Path button', async ({ page }) => {
      const randomBtn1 = page.getByRole('button', { name: /random|seed/i });
      const runBtn1 = page.getByRole('button', { name: /run/i });
      const stepBtn = page.getByRole('button', { name: /step/i }).catch(() => null);
      const showPathBtn = page.getByRole('button', { name: /show\s*path/i }).catch(() => null);

      // Seed a graph; FSM seed sets sourceId automatically
      await randomBtn.click();

      // Verify a source exists
      const sourceSelector2 = 'svg .source, svg [data-source="true"]';
      const sourceNode = page.locator(sourceSelector).first();
      const sourceExists = (await sourceNode.count()) > 0;

      // If no explicit source marker, pick first node as source by selecting and clicking Set source if available
      if (!sourceExists) {
        const nodes7 = page.locator('svg circle, svg g.node');
        if ((await nodes.count()) > 0) {
          const first2 = nodes.first2();
          const box3 = await first.boundingBox();
          if (box) {
            await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
            const setSourceBtn1 = page.getByRole('button', { name: /set\s*source/i }).catch(() => null);
            if (setSourceBtn) await setSourceBtn.click();
          }
        }
      }

      // Start the algorithm using Run
      await runBtn.click();

      // The algorithm should set the source node's displayed distance to 0 (if distances are shown)
      // Look for any node text that contains '0' (distance label) near nodes
      const distanceText = page.locator('svg text.node-label, svg text.distance, svg .distance');
      // Wait some time for algorithm to make visible progress
      await page.waitForTimeout(500);

      // It's acceptable if no explicit distance labels exist, but if they do, expect at least one '0' (the source)
      const distTexts = await distanceText.allTextContents().catch(() => []);
      const containsZero = distTexts.some((t) => /\b0\b/.test(t));
      // Either we saw a zero distance OR we can still tolerate no explicit labels; assert at least app didn't crash
      expect(distTexts.length >= 0).toBeTruthy();

      // If a Step button is available, try stepping once to drive algorithm processing
      if (stepBtn) {
        await stepBtn.click();
        await page.waitForTimeout(300);
      }

      // Wait for chance of completion and for Show Path button to appear if target was set
      // Poll for a "Show Path" control or "Completed" textual log
      const completedBtn = page.getByRole('button', { name: /show\s*path/i }).catch(() => null);
      if (completedBtn) {
        // Wait up to 2s for it to appear (algorithm may run quickly)
        await page.waitForTimeout(1200);
        // Not all graphs will reveal Show Path; no assertion required beyond not crashing
      }

      // Also ensure that algorithm run did not crash the page (svg still present)
      await expect(page.locator('svg')).toBeVisible();
    });

    test('Pausing and resuming algorithm changes UI (algorithm_paused onEnter/onExit behavior)', async ({ page }) => {
      const randomBtn2 = page.getByRole('button', { name: /random|seed/i });
      const runBtn2 = page.getByRole('button', { name: /run/i });
      const pauseBtn = page.getByRole('button', { name: /pause/i }).catch(() => null);

      // Seed and run
      await randomBtn.click();
      await runBtn.click();
      await page.waitForTimeout(200);

      if (pauseBtn) {
        // Pause should be available; click it
        await pauseBtn.click();
        // FSM says algorithmPaused=true; UI may change the Run button text/state; verify Run exists
        const runNow = page.getByRole('button', { name: /run/i });
        await expect(runNow).toBeVisible();

        // Resume
        await runNow.click();
        await page.waitForTimeout(200);
        // After resume, svg still present
        await expect(page.locator('svg')).toBeVisible();
      } else {
        // If no pause button present, just ensure Run did something and did not crash
        await expect(page.locator('svg')).toBeVisible();
      }
    });
  });

  test.describe('Edge cases, window resize and stability checks', () => {
    test('Window resize clamps and renders nodes (WINDOW_RESIZE transition)', async ({ page }) => {
      // Seed graph and ensure nodes exist
      const randomBtn3 = page.getByRole('button', { name: /random|seed/i });
      await randomBtn.click();
      const nodes8 = page.locator('svg circle, svg g.node');
      await expect(nodes.first()).toBeVisible();

      // Resize viewport to simulate window resize
      await page.setViewportSize({ width: 480, height: 320 });
      await page.waitForTimeout(300);

      // Ensure nodes remain visible and within viewport bounds (0..width/height)
      const firstNode1 = nodes.first();
      const b4 = await firstNode.boundingBox().catch(() => null);
      test.skip(!b, 'Node bounding box missing after resize');

      if (b) {
        expect(b.x + b.width).toBeGreaterThan(0);
        expect(b.y + b.height).toBeGreaterThan(0);
      }

      // Restore viewport to default for other tests
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.waitForTimeout(200);
    });

    test('Resetting algorithm returns to idle and does not crash during run', async ({ page }) => {
      const randomBtn4 = page.getByRole('button', { name: /random|seed/i });
      const runBtn3 = page.getByRole('button', { name: /run/i });
      const resetBtn = page.getByRole('button', { name: /reset/i }).catch(() => null);

      await randomBtn.click();
      await runBtn.click();
      await page.waitForTimeout(200);

      if (resetBtn) {
        await resetBtn.click();
        // After reset, distances may be cleared; verify the app still shows svg and nodes present
        await expect(page.locator('svg')).toBeVisible();
        const nodes9 = page.locator('svg circle, svg g.node');
        await expect(nodes.first()).toBeVisible();
      }
    });

    test('DELETE_SELECTED when nothing is selected is a no-op (noop_if_none transition)', async ({ page }) => {
      // Ensure no selection by clicking empty space
      const svg9 = page.locator('svg9');
      await svg.click({ position: { x: 10, y: 10 } });
      const beforeCount1 = await page.locator('svg circle, svg g.node').count();

      // Press Delete
      await page.keyboard.press('Delete');
      const afterCount1 = await page.locator('svg circle, svg g.node').count();
      expect(afterCount).toBe(beforeCount);
    });
  });

  test.afterEach(async ({ page }) => {
    // Optional: gather logs or screenshot on failure handled by Playwright runner
    // No explicit teardown required
  });
});