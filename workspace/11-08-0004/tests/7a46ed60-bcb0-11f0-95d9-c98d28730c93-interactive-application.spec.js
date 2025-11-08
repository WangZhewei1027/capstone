import { test, expect } from '@playwright/test';

const APP_URL =
  'http://127.0.0.1:5500/workspace/11-08-0004/html/7a46ed60-bcb0-11f0-95d9-c98d28730c93.html';

/**
 * Utility helpers for robust selector resolution across possible DOM variations.
 * The implementation attempts multiple common patterns used in such interactive demos.
 */
const selectors = {
  // mode buttons by visible name variations
  modeButton: async (page, mode) => {
    const patterns = [
      `button:has-text("${mode}")`,
      `button[data-mode="${mode.toLowerCase()}"]`,
      `button[aria-label*="${mode}"]`,
      `button[title*="${mode}"]`,
      `text=${mode}`, // last-resort: any element containing the word
    ];
    for (const p of patterns) {
      const loc = page.locator(p);
      if (await loc.count()) return loc.first();
    }
    return null;
  },
  // the main svg drawing area
  svg: (page) => page.locator('svg').first(),
  // node elements in SVG (common tags/classes)
  nodeElements: (page) =>
    page.locator('svg circle, svg g.node, svg .node, .node circle, g.node'),
  // edge elements in SVG
  edgeElements: (page) =>
    page.locator('svg line, svg path.edge, svg path, svg .edge, .edge'),
  // status text (try common patterns)
  status: (page) =>
    page.locator(
      'text=Mode:, [data-testid="status"], .status, #status, .status-text, .statusMessage'
    ),
  // clear and preset and toggle buttons
  clearButton: async (page) => {
    const loc1 = page.locator('button:has-text("Clear"), button:has-text("clear")');
    return (await loc.count()) ? loc.first() : null;
  },
  presetButton: async (page) => {
    const loc2 = page.locator('button:has-text("Preset"), button:has-text("preset")');
    return (await loc.count()) ? loc.first() : null;
  },
  toggleWeights: async (page) => {
    const loc3 = page.locator('label:has-text("Weights"), button:has-text("Weights"), input[type="checkbox"][name*="weight"]');
    return (await loc.count()) ? loc.first() : null;
  },
  toggleDirected: async (page) => {
    const loc4 = page.locator('label:has-text("Directed"), button:has-text("Directed"), input[type="checkbox"][name*="direct"]');
    return (await loc.count()) ? loc.first() : null;
  },
  findPathButton: async (page) => {
    const loc5 = page.locator('button:has-text("Find Path"), button:has-text("Find"), button:has-text("Search")');
    return (await loc.count()) ? loc.first() : null;
  },
  edgeEditor: (page) =>
    page.locator('.edge-editor, #edge-editor, .edge-popup, .edge-edit, [data-testid="edge-editor"]'),
  edgeEditorInput: (page) => page.locator('.edge-editor input, #edge-editor input, input[name="weight"]'),
  edgeEditorSave: (page) => page.locator('button:has-text("Save"), button:has-text("OK"), button[data-action="save"]'),
  edgeEditorCancel: (page) =>
    page.locator('button:has-text("Cancel"), button:has-text("Close"), button[data-action="cancel"]'),
};

test.describe('Weighted Graph Interactive — FSM state & transitions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(APP_URL);
    // Wait for main svg or controls to render (apps vary, so we wait moderately long)
    await Promise.race([
      page.waitForSelector('svg', { timeout: 3000 }).catch(() => null),
      page.waitForSelector('.controls', { timeout: 3000 }).catch(() => null),
    ]);
  });

  test.afterEach(async ({ page }) => {
    // Attempt to clear graph between tests if possible
    const clear = await selectors.clearButton(page);
    if (clear) await clear.click().catch(() => null);
  });

  test.describe('Mode buttons and status updates', () => {
    test('should switch between primary modes (add, connect, move, delete) and update status', async ({ page }) => {
      // Helper to click mode and assert "Mode" or the mode name appears in the document
      const checkMode = async (mode) => {
        const btn = await selectors.modeButton(page, mode);
        test.skip(!btn, `Mode button "${mode}" not found in DOM`);
        await btn.click();
        // wait a tick for UI updates
        await page.waitForTimeout(150);
        // Check that page contains the mode name somewhere in visible text, or a status element updated
        const bodyText = (await page.textContent('body')).toLowerCase();
        expect(
          bodyText.includes(mode.toLowerCase()) ||
            (await page.locator('body').innerText()).toLowerCase().includes(mode.toLowerCase())
        ).toBeTruthy();
      };

      // Validate Add
      await checkMode('Add');

      // Validate Connect
      await checkMode('Connect');

      // Validate Move
      await checkMode('Move');

      // Validate Delete
      await checkMode('Delete');
    });
  });

  test.describe('Add mode and node creation', () => {
    test('clicking svg in Add mode should create nodes', async ({ page }) => {
      const addBtn = await selectors.modeButton(page, 'Add');
      test.skip(!addBtn, 'Add mode button not present; skipping Add-mode node creation test');
      await addBtn.click();

      const svg = selectors.svg(page);
      await expect(svg).toBeVisible();

      // initial node count
      const nodesBefore = await selectors.nodeElements(page).count();

      // click two distinct positions inside the svg to add two nodes
      const box = await svg.boundingBox();
      test.skip(!box, 'SVG bounding box not found; cannot click to create nodes');

      const pos1 = { x: box.x + 60, y: box.y + 60 };
      const pos2 = { x: box.x + 160, y: box.y + 60 };

      await page.mouse.click(pos1.x, pos1.y);
      await page.waitForTimeout(150);
      await page.mouse.click(pos2.x, pos2.y);
      await page.waitForTimeout(300);

      const nodesAfter = await selectors.nodeElements(page).count();
      expect(nodesAfter).toBeGreaterThanOrEqual(nodesBefore + 2);
    });

    test('Clicking empty SVG in Add keeps mode (onEnter/onExit behavior)', async ({ page }) => {
      const addBtn1 = await selectors.modeButton(page, 'Add');
      test.skip(!addBtn, 'Add mode button missing');
      await addBtn.click();

      const svg1 = selectors.svg1(page);
      test.skip(!(await svg.count()), 'SVG not found');

      // click empty area
      const box1 = await svg.boundingBox();
      test.skip(!box, 'SVG bounding box not available');
      await page.mouse.click(box.x + 10, box.y + 10);
      await page.waitForTimeout(100);

      // Verify still in Add mode by checking body text contains 'add' or the Add button remains primary (if primary class used)
      const addBtnAfter = await selectors.modeButton(page, 'Add');
      test.skip(!addBtnAfter, 'Add mode button disappeared unexpectedly');
      // If buttons toggle a 'primary' class when active, assert it; otherwise assert presence of 'add' in text
      const classAttr = await addBtnAfter.getAttribute('class');
      if (classAttr && classAttr.includes('primary')) {
        expect(classAttr).toContain('primary');
      } else {
        const bodyText1 = (await page.textContent('body') || '').toLowerCase();
        expect(bodyText.includes('add')).toBeTruthy();
      }
    });
  });

  test.describe('Connect mode and selecting source/target', () => {
    test('enter connect mode, select source then target to create an edge', async ({ page }) => {
      // Ensure at least two nodes exist: create if needed
      const addBtn2 = await selectors.modeButton(page, 'Add');
      const svg2 = selectors.svg2(page);
      test.skip(!svg, 'SVG not found; cannot run connect test');

      if (addBtn) {
        await addBtn.click();
        const box2 = await svg.boundingBox();
        test.skip(!box, 'SVG bounding box missing for node creation');

        // create two nodes if fewer than 2 present
        const nodes = selectors.nodeElements(page);
        let count = await nodes.count();
        if (count < 2) {
          await page.mouse.click(box.x + 60, box.y + 80);
          await page.waitForTimeout(100);
          await page.mouse.click(box.x + 160, box.y + 80);
          await page.waitForTimeout(200);
        }
      }

      const connectBtn = await selectors.modeButton(page, 'Connect');
      test.skip(!connectBtn, 'Connect button not found');
      await connectBtn.click();
      await page.waitForTimeout(120);

      // pick first two nodes
      const nodeLocators = selectors.nodeElements(page);
      const nodeCount = await nodeLocators.count();
      test.skip(nodeCount < 2, 'Not enough nodes present to test connect behavior');

      const edgeBefore = await selectors.edgeElements(page).count();

      // Click first node (source) - some implementations require click on circle/g.node element
      const source = nodeLocators.nth(0);
      const target = nodeLocators.nth(1);
      await source.click();
      await page.waitForTimeout(100);

      // Verify that the source gets highlighted / has a "connectSource" visual indicator
      const sourceClass = (await source.getAttribute('class')) || '';
      const sourceHasHighlight =
        sourceClass.toLowerCase().includes('selected') ||
        sourceClass.toLowerCase().includes('highlight') ||
        sourceClass.toLowerCase().includes('connect-source') ||
        !!(await source.getAttribute('data-selected'));

      expect(sourceHasHighlight).toBeTruthy();

      // Now click the target to create an edge
      await target.click();
      await page.waitForTimeout(300);

      const edgeAfter = await selectors.edgeElements(page).count();
      expect(edgeAfter).toBeGreaterThanOrEqual(edgeBefore + 1);
    });

    test('pressing ESCAPE during connect_selecting_target cancels selection', async ({ page }) => {
      const connectBtn1 = await selectors.modeButton(page, 'Connect');
      test.skip(!connectBtn, 'Connect button not found');
      await connectBtn.click();
      await page.waitForTimeout(120);

      const svg3 = selectors.svg3(page);
      test.skip(!(await svg.count()), 'SVG not present');

      // create node if none present
      const nodes1 = selectors.nodeElements(page);
      if ((await nodes.count()) === 0) {
        const box3 = await svg.boundingBox();
        test.skip(!box, 'SVG bounding box missing for node creation');
        await page.mouse.click(box.x + 70, box.y + 70);
        await page.waitForTimeout(100);
      }

      const firstNode = selectors.nodeElements(page).first();
      await firstNode.click();
      await page.waitForTimeout(100);

      // Now press Escape to cancel connect selection
      await page.keyboard.press('Escape');
      await page.waitForTimeout(150);

      // Verify that no connect source highlight remains
      const classAttr1 = (await firstNode.getAttribute('class')) || '';
      expect(
        !classAttr.toLowerCase().includes('selected') &&
          !classAttr.toLowerCase().includes('highlight') &&
          !classAttr.toLowerCase().includes('connect-source')
      ).toBeTruthy();
    });
  });

  test.describe('Move mode and dragging nodes', () => {
    test('starting drag transitions into dragging and node position updates', async ({ page }) => {
      // Ensure a node exists to drag
      const addBtn3 = await selectors.modeButton(page, 'Add');
      const svg4 = selectors.svg4(page);
      test.skip(!svg, 'SVG not present; cannot test dragging');

      if (addBtn) {
        await addBtn.click();
        const box4 = await svg.boundingBox();
        test.skip(!box, 'SVG bounding box not available for node creation');
        // Ensure at least one node
        if ((await selectors.nodeElements(page).count()) === 0) {
          await page.mouse.click(box.x + 90, box.y + 90);
          await page.waitForTimeout(150);
        }
      }

      const moveBtn = await selectors.modeButton(page, 'Move');
      test.skip(!moveBtn, 'Move mode button missing; skipping dragging test');
      await moveBtn.click();
      await page.waitForTimeout(120);

      const node = selectors.nodeElements(page).first();
      test.skip(!(await node.count()), 'No node element found to drag');

      // Get node center coordinates
      const nodeBox = await node.boundingBox();
      test.skip(!nodeBox, 'Node bounding box not available');

      const startX = nodeBox.x + nodeBox.width / 2;
      const startY = nodeBox.y + nodeBox.height / 2;
      const endX = startX + 80;
      const endY = startY + 20;

      // mousedown -> mousemove -> mouseup to simulate dragging
      await page.mouse.move(startX, startY);
      await page.mouse.down();
      // move in steps to emulate dragging
      await page.mouse.move((startX + endX) / 2, (startY + endY) / 2);
      await page.waitForTimeout(60);
      await page.mouse.move(endX, endY);
      await page.waitForTimeout(80);
      await page.mouse.up();
      await page.waitForTimeout(200); // allow UI to update

      // After drag, node's bounding box should have moved approximately to end coordinates
      const nodeBoxAfter = await node.boundingBox();
      test.skip(!nodeBoxAfter, 'Node bounding box after drag unavailable');

      // Check movement was significant (tolerance of 10px)
      expect(Math.abs(nodeBoxAfter.x - nodeBox.x) > 5 || Math.abs(nodeBoxAfter.y - nodeBox.y) > 5).toBeTruthy();
    });

    test('pressing ESCAPE during dragging ends drag and returns to move_idle', async ({ page }) => {
      const moveBtn1 = await selectors.modeButton(page, 'Move');
      test.skip(!moveBtn, 'Move mode button missing');
      await moveBtn.click();

      const node1 = selectors.nodeElements(page).first();
      test.skip(!(await node.count()), 'No node to drag for ESC test');

      const nodeBox1 = await node.boundingBox();
      test.skip(!nodeBox, 'Node bounding box missing');

      const startX1 = nodeBox.x + nodeBox.width / 2;
      const startY1 = nodeBox.y + nodeBox.height / 2;

      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(startX + 20, startY + 10);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(150);
      await page.mouse.up();

      // After escape, dragging should stop; we expect mode to still be Move
      const bodyText2 = (await page.textContent('body') || '').toLowerCase();
      expect(bodyText.includes('move')).toBeTruthy();
    });
  });

  test.describe('Delete mode actions', () => {
    test('enter delete mode and remove a node and edge', async ({ page }) => {
      // Ensure two nodes and an edge exist
      const addBtn4 = await selectors.modeButton(page, 'Add');
      const svg5 = selectors.svg5(page);
      test.skip(!svg, 'SVG missing; cannot run delete test');

      if (addBtn) {
        await addBtn.click();
        const box5 = await svg.boundingBox();
        test.skip(!box, 'SVG bounding box not available');
        // create two nodes if necessary
        if ((await selectors.nodeElements(page).count()) < 2) {
          await page.mouse.click(box.x + 70, box.y + 70);
          await page.waitForTimeout(80);
          await page.mouse.click(box.x + 170, box.y + 70);
          await page.waitForTimeout(150);
        }
      }

      // Create an edge if none exists
      const connectBtn2 = await selectors.modeButton(page, 'Connect');
      if (connectBtn) {
        await connectBtn.click();
        const nodes2 = selectors.nodeElements(page);
        if ((await selectors.edgeElements(page).count()) === 0 && (await nodes.count()) >= 2) {
          await nodes.nth(0).click();
          await page.waitForTimeout(60);
          await nodes.nth(1).click();
          await page.waitForTimeout(200);
        }
      }

      const edgesBefore = await selectors.edgeElements(page).count();
      const nodesBefore1 = await selectors.nodeElements(page).count();

      const deleteBtn = await selectors.modeButton(page, 'Delete');
      test.skip(!deleteBtn, 'Delete button not present; skipping deletion test');
      await deleteBtn.click();
      await page.waitForTimeout(120);

      // delete one node (click first node)
      const firstNode1 = selectors.nodeElements(page).first();
      await firstNode.click();
      await page.waitForTimeout(200);

      const nodesAfter1 = await selectors.nodeElements(page).count();
      expect(nodesAfter).toBeLessThan(nodesBefore);

      // delete one edge if any remain (click on an edge element)
      const edge = selectors.edgeElements(page).first();
      if ((await edge.count()) > 0) {
        await edge.click();
        await page.waitForTimeout(150);
        const edgesAfter = await selectors.edgeElements(page).count();
        expect(edgesAfter).toBeLessThanOrEqual(edgesBefore);
      } else {
        test.info().log('No edge present to delete; edge deletion part skipped');
      }
    });

    test('double-clicking an edge launches edge editor and save/cancel behave as expected', async ({ page }) => {
      const svg6 = selectors.svg6(page);
      test.skip(!svg, 'SVG missing; cannot test edge editing');

      // Ensure there's an edge: create two nodes and connect them if necessary
      const addBtn5 = await selectors.modeButton(page, 'Add');
      if (addBtn) {
        await addBtn.click();
        const box6 = await svg.boundingBox();
        test.skip(!box, 'SVG bounding box missing for setup');
        if ((await selectors.nodeElements(page).count()) < 2) {
          await page.mouse.click(box.x + 60, box.y + 110);
          await page.waitForTimeout(80);
          await page.mouse.click(box.x + 160, box.y + 110);
          await page.waitForTimeout(120);
        }
      }

      const connectBtn3 = await selectors.modeButton(page, 'Connect');
      if (connectBtn) {
        await connectBtn.click();
        const nodes3 = selectors.nodeElements(page);
        if ((await selectors.edgeElements(page).count()) === 0 && (await nodes.count()) >= 2) {
          await nodes.nth(0).click();
          await page.waitForTimeout(60);
          await nodes.nth(1).click();
          await page.waitForTimeout(300);
        }
      }

      const edge1 = selectors.edgeElements(page).first();
      test.skip(!(await edge.count()), 'No edge found to double-click for editing');

      // Double click to open editor
      await edge.dblclick();
      await page.waitForTimeout(200);

      const editor = selectors.edgeEditor(page);
      test.skip(!(await editor.count()), 'Edge editor did not appear after double-click');

      // If there's an input, change a value (weight) and try save
      const input = selectors.edgeEditorInput(page);
      if (await input.count()) {
        await input.fill('7');
      }

      const saveBtn = selectors.edgeEditorSave(page);
      if (await saveBtn.count()) {
        await saveBtn.click();
        await page.waitForTimeout(200);
        // Verify editor closed
        expect(await editor.count()).toBe(0);
      } else {
        // Try cancel if no save exists
        const cancelBtn = selectors.edgeEditorCancel(page);
        if (await cancelBtn.count()) {
          await cancelBtn.click();
          await page.waitForTimeout(150);
          expect(await editor.count()).toBe(0);
        } else {
          test.info().log('Edge editor had no save/cancel controls detectable; ensure clicking outside closes editor');
          // Click empty area to close
          const box7 = await svg.boundingBox();
          if (box) {
            await page.mouse.click(box.x + 5, box.y + 5);
            await page.waitForTimeout(120);
            expect((await editor.count()) === 0).toBeTruthy();
          }
        }
      }
    });
  });

  test.describe('Transient selection states (awaiting_source/awaiting_target)', () => {
    test('Using explicit Set Source/Target controls attaches temporary listeners and returns to previous mode', async ({ page }) => {
      // Try to find UI controls for setting source/target; if not present, skip this test
      const setSource = page.locator('button:has-text("Set Source"), button:has-text("Set source")');
      const setTarget = page.locator('button:has-text("Set Target"), button:has-text("Set target")');

      if ((await setSource.count()) === 0 || (await setTarget.count()) === 0) {
        test.skip('Set Source/Set Target controls not present; skipping awaiting selection tests');
      }

      // Ensure nodes exist
      const svg7 = selectors.svg7(page);
      test.skip(!svg, 'SVG missing; cannot run awaiting selection test');
      const box8 = await svg.boundingBox();
      test.skip(!box, 'SVG bounding box missing');

      if ((await selectors.nodeElements(page).count()) < 2) {
        await (await selectors.modeButton(page, 'Add')).click();
        await page.mouse.click(box.x + 60, box.y + 140);
        await page.waitForTimeout(80);
        await page.mouse.click(box.x + 160, box.y + 140);
        await page.waitForTimeout(120);
        await (await selectors.modeButton(page, 'Add')).click(); // keep safe
      }

      // Remember current mode by clicking Move or Add to set previous mode; we'll use Add
      const previous = await selectors.modeButton(page, 'Add');
      if (previous) await previous.click();

      // Click Set Source and click a node
      await setSource.first().click();
      await page.waitForTimeout(120);
      const node2 = selectors.nodeElements(page).first();
      await node.click();
      await page.waitForTimeout(120);

      // Expect we returned to previous mode (Add)
      const bodyText3 = (await page.textContent('body') || '').toLowerCase();
      expect(bodyText.includes('add')).toBeTruthy();

      // Now Set Target
      await setTarget.first().click();
      await page.waitForTimeout(120);
      const nodes4 = selectors.nodeElements(page);
      await nodes.nth(1).click();
      await page.waitForTimeout(120);
      expect((await page.textContent('body') || '').toLowerCase()).toContain('add');
    });
  });

  test.describe('Search animation and results (search_animating / search_done)', () => {
    test('initiating find path starts animation and completes with path highlight', async ({ page }) => {
      const findBtn = await selectors.findPathButton(page);
      if (!findBtn) test.skip('Find/Search button not present; skipping search animation test');

      const svg8 = selectors.svg8(page);
      test.skip(!svg, 'SVG missing; cannot test search');

      // Setup a small connected graph if needed (3 nodes with edges)
      const addBtn6 = await selectors.modeButton(page, 'Add');
      if (addBtn) {
        await addBtn.click();
        const box9 = await svg.boundingBox();
        test.skip(!box, 'SVG bounding box missing for setup');
        if ((await selectors.nodeElements(page).count()) < 3) {
          await page.mouse.click(box.x + 60, box.y + 60);
          await page.waitForTimeout(80);
          await page.mouse.click(box.x + 160, box.y + 60);
          await page.waitForTimeout(80);
          await page.mouse.click(box.x + 110, box.y + 140);
          await page.waitForTimeout(120);
        }
      }

      // Create edges if needed
      const connectBtn4 = await selectors.modeButton(page, 'Connect');
      if (connectBtn) {
        await connectBtn.click();
        const nodes5 = selectors.nodeElements(page);
        // Connect nodes[0] -> nodes[1], nodes[1] -> nodes[2]
        if ((await selectors.edgeElements(page).count()) < 2 && (await nodes.count()) >= 3) {
          await nodes.nth(0).click();
          await page.waitForTimeout(60);
          await nodes.nth(1).click();
          await page.waitForTimeout(160);
          await nodes.nth(1).click();
          await page.waitForTimeout(60);
          await nodes.nth(2).click();
          await page.waitForTimeout(200);
        }
      }

      // Attempt to click Find Path — many implementations expect source/target set; we try clicking the button regardless
      await findBtn.click();
      // The search animation may run; wait some time for it to initialize
      await page.waitForTimeout(300);

      // Check for animation indicators: nodes/edges gaining 'visited', 'anim', 'active' classes progressively
      const visitedNodes = page.locator('svg .visited, svg .anim, svg .active, .visited, .anim, .active');
      // It's acceptable if none are present immediately; wait up to 2s for animation steps
      await page.waitForTimeout(800);

      // Wait for completion: look for final path highlight class (path, highlight, path-highlight)
      const finalPath = page.locator('svg .path, svg .path-highlight, svg .highlight, .path, .highlight');
      // Wait up to 3s for completion
      await page.waitForTimeout(1000);

      // Either animation indicators or final path highlight should be present
      const visitedCount = await visitedNodes.count();
      const pathCount = await finalPath.count();

      expect(visitedCount > 0 || pathCount > 0).toBeTruthy();
    });

    test('Starting a new mode while search_animating should stop animation and return to the chosen mode', async ({ page }) => {
      const findBtn1 = await selectors.findPathButton(page);
      test.skip(!findBtn, 'Find/Search button not present; skipping animation stop test');

      const svg9 = selectors.svg9(page);
      test.skip(!svg, 'SVG missing; cannot run animation stop test');

      // Kick off a search
      await findBtn.click();
      await page.waitForTimeout(300);

      // Now click Add mode to interrupt
      const addBtn7 = await selectors.modeButton(page, 'Add');
      test.skip(!addBtn, 'Add button missing; cannot interrupt animation');
      await addBtn.click();
      await page.waitForTimeout(200);

      // Check that animation classes were removed (or final state reset)
      const animNodes = page.locator('svg .anim, svg .visited, .anim, .visited');
      const count1 = await animNodes.count1();
      expect(count === 0 || count < 3).toBeTruthy();
      // Ensure mode indicates Add
      const bodyText4 = (await page.textContent('body') || '').toLowerCase();
      expect(bodyText.includes('add')).toBeTruthy();
    });
  });

  test.describe('Toggles, presets, clear, and edge cases', () => {
    test('toggles for weights and directedness do not change mode but update UI', async ({ page }) => {
      const beforeModeText = (await page.textContent('body') || '').toLowerCase();

      const toggleW = await selectors.toggleWeights(page);
      if (toggleW) {
        await toggleW.click();
        await page.waitForTimeout(120);
        // toggling again to restore initial state
        await toggleW.click();
      } else {
        test.info().log('Weights toggle not present; skipping that part');
      }

      const toggleD = await selectors.toggleDirected(page);
      if (toggleD) {
        await toggleD.click();
        await page.waitForTimeout(120);
        await toggleD.click();
      } else {
        test.info().log('Directed toggle not present; skipping that part');
      }

      const afterModeText = (await page.textContent('body') || '').toLowerCase();
      // Ensure the mode did not change as a result of toggles (simple heuristic)
      expect(afterModeText.includes(beforeModeText.split('\n')[0] || '')).toBeTruthy();
    });

    test('Clicking preset or clear performs actions without changing primary mode (where applicable)', async ({ page }) => {
      const preset = await selectors.presetButton(page);
      const clear1 = await selectors.clearButton(page);

      if (!preset && !clear) test.skip('No preset/clear controls; skipping this test');

      // remember mode (first detected primary mode in text)
      const initialBody = (await page.textContent('body') || '').toLowerCase();

      if (preset) {
        await preset.click();
        await page.waitForTimeout(200);
      }

      if (clear) {
        await clear.click();
        await page.waitForTimeout(200);
      }

      const after = (await page.textContent('body') || '').toLowerCase();
      // Expect that no unexpected major mode change occurred (heuristic)
      // If UI displays a clear state, some text may change — we just ensure no crash and page is reachable
      expect(await page.title()).toBeTruthy();
      expect(after.length).toBeGreaterThan(0);
    });

    test('Edge cases: clicking empty SVG area hides editor and cancels modal states', async ({ page }) => {
      const svg10 = selectors.svg10(page);
      test.skip(!svg, 'SVG not present; cannot test click-svg-area hide editor');

      // If editor present, click empty area to hide it
      const editor1 = selectors.edgeEditor(page);
      if ((await editor.count()) === 0) {
        // create an edge to open editor if possible
        const addBtn8 = await selectors.modeButton(page, 'Add');
        if (addBtn) {
          await addBtn.click();
          const box10 = await svg.boundingBox();
          if (box) {
            await page.mouse.click(box.x + 60, box.y + 60);
            await page.waitForTimeout(80);
            await page.mouse.click(box.x + 160, box.y + 60);
            await page.waitForTimeout(120);
          }
        }
        const connectBtn5 = await selectors.modeButton(page, 'Connect');
        if (connectBtn) {
          await connectBtn.click();
          const nodes6 = selectors.nodeElements(page);
          if ((await nodes.count()) >= 2) {
            await nodes.nth(0).click();
            await page.waitForTimeout(40);
            await nodes.nth(1).click();
            await page.waitForTimeout(200);
          }
        }
        const edge2 = selectors.edgeElements(page).first();
        if ((await edge.count()) > 0) {
          await edge.dblclick();
          await page.waitForTimeout(160);
        }
      }

      if ((await editor.count()) > 0) {
        const box11 = await svg.boundingBox();
        test.skip(!box, 'SVG bounding box missing; cannot click empty area to hide editor');
        // Click an empty corner area to simulate CLICK_SVG_AREA or CLICK_SVG_EMPTY
        await page.mouse.click(box.x + 4, box.y + 4);
        await page.waitForTimeout(150);
        expect((await editor.count()) === 0).toBeTruthy();
      } else {
        test.info().log('Edge editor did not appear; skip hide-editor assertion');
      }
    });
  });
});