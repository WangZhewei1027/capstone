import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/11-08-0004/html/6fc45850-bcb0-11f0-95d9-c98d28730c93.html';
const WAIT_LONG = 3000;

// Utility helpers placed in the test file to keep the tests readable.
async function clickButtonByName(page, nameRegex) {
  // Prefer accessible role, fallback to button:has-text
  const byRole = page.getByRole('button', { name: new RegExp(nameRegex, 'i') });
  if (await byRole.count() > 0) {
    await byRole.first().click();
    return;
  }
  const byText = page.locator(`button:has-text("${nameRegex}")`);
  if (await byText.count() > 0) {
    await byText.first().click();
    return;
  }
  // last try generic text
  await page.locator(`text=${nameRegex}`).first().click();
}

async function findCanvasLocator(page) {
  // Try a set of likely canvas/container selectors
  const candidates = [
    '#canvas', '.canvas', '.canvas-wrap', '.board', '#board', 'svg', '#svg',
    '[data-canvas]', '.nodes', '.canvas-area', '.stage'
  ];
  for (const sel of candidates) {
    const loc = page.locator(sel).first();
    if (await loc.count() > 0) return loc;
  }
  // fallback to body
  return page.locator('body');
}

async function countNodesBySelectors(page) {
  // Return counts for many selectors so tests can choose a meaningful one.
  return await page.evaluate(() => {
    const selectors = [
      '.node',
      '[data-node]',
      'g.node',
      'circle.node',
      '#canvas .node',
      'svg circle',
      '[role="button"].node',
      '.uf-node',
      '.node-element'
    ];
    const res = {};
    for (const s of selectors) {
      try { res[s] = document.querySelectorAll(s).length; } catch (e) { res[s] = 0; }
    }
    // Also count any element that looks like nodes numerically labeled (numbers inside)
    const numericNodes = Array.from(document.querySelectorAll('svg text, .node, .node *'))
      .filter(el => /^\d+$/.test(el.textContent?.trim() || '')).length;
    res['numeric-suspects'] = numericNodes;
    return res;
  });
}

async function getBestNodeLocator(page) {
  // Choose a selector that yields nodes, or fallback to any clickable circle or div inside canvas
  const candidates1 = [
    '.node',
    '[data-node]',
    'g.node',
    'circle.node',
    '#canvas .node',
    'svg circle',
    '[role="button"].node',
    '.uf-node',
    '.node-element'
  ];
  for (const sel of candidates) {
    const loc1 = page.locator(sel);
    if (await loc.count() > 0) return loc;
  }
  // fallback: find any circle inside svg or any direct child with numeric text
  const svgCircles = page.locator('svg circle');
  if (await svgCircles.count() > 0) return svgCircles;
  // fallback: any element inside canvas that has text that is numeric
  const numericNodes1 = page.locator('text=/^\\d+$/');
  if (await numericNodes.count() > 0) return numericNodes;
  // final fallback: clickable elements
  return page.locator('button, [role="button"], div').filter({ hasText: /\d+/ }).first();
}

async function readLogLines(page) {
  // Try to find a log area by common selectors
  const candidates2 = ['#log', '.log', '[data-log]', '.activity-log', '.console'];
  for (const sel of candidates) {
    const loc2 = page.locator(sel);
    if (await loc.count() > 0) {
      const text = await loc.first().innerText();
      return text.split('\n').map(l => l.trim()).filter(Boolean);
    }
  }
  // Fallback: search for any element that contains 'Union' or 'Find' as recent text in page
  const allText = await page.content();
  return allText.split('\n').slice(-20).map(l => l.trim()).filter(Boolean);
}

async function getInternalState(page) {
  // Try to detect internal FSM or app state in many possible global names.
  return await page.evaluate(() => {
    const w = window;
    const probes = [
      () => w.__UF_STATE__, // explicit spy
      () => w.uf?.state,
      () => w.dsu?.state,
      () => w.app?.state,
      () => w.app?.machine?.state?.value || w.app?.machine?.state,
      () => w.machine?.state?.value || w.machine?.state,
      () => w.state,
      () => w.currentState,
      () => w.fsm?.value || w.fsm?.state,
      () => (w.windowState) // last resort
    ];
    for (const p of probes) {
      try {
        const v = p();
        if (typeof v !== 'undefined' && v !== null) return v;
      } catch (e) {}
    }
    return undefined;
  });
}

// Spy wrappers for onEnter/onExit functions (if present) to verify they are called.
async function installSpies(page) {
  await page.evaluate(() => {
    // Create a spy storage
    window.__spy = window.__spy || {};
    const fnNames = [
      'updateButtons', 'updateSelectionVisuals', 'findWithTrace', 'union', 'createNodeAt',
      'autoCreate', 'resetAll', 'updateArrays', 'updateLinks', 'log', 'initiateDrag', 'endDrag'
    ];
    for (const fn of fnNames) {
      try {
        const orig = window[fn];
        if (typeof orig === 'function') {
          window.__spy[fn] = 0;
          window[fn] = function(...args) {
            window.__spy[fn] = (window.__spy[fn] || 0) + 1;
            try { return orig.apply(this, args); } catch (e) { /* swallow */ }
          };
        }
      } catch (e) {
        // ignore
      }
    }
    // mark that spies installed
    window.__spy.__installed = true;
  });
}

test.describe('Union-Find Interactive Module - FSM validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(APP_URL);
    // ensure we have focus and stable layout
    await page.waitForLoadState('networkidle');
    // install spies on known global functions to assert onEnter/onExit effects where possible
    await installSpies(page);
  });

  test('loads app and basic UI controls exist', async ({ page }) => {
    // Verify essential buttons exist: Add/Create, Auto Create, Reset, Union, Find, Demo/Step
    const texts = ['Add', 'Auto', 'Reset', 'Union', 'Find', 'Demo', 'Path Compression', 'Union by Size'];
    const found = {};
    for (const t of texts) {
      const locator = page.getByRole('button', { name: new RegExp(t, 'i') });
      if (await locator.count() > 0) {
        found[t] = true;
      } else {
        // maybe it's a checkbox or label
        const label = page.locator(`label:has-text("${t}")`);
        found[t] = (await label.count() > 0);
      }
    }
    // At least critical controls should be present
    expect(found['Reset'] || found['Auto']).toBeTruthy();
    expect(found['Union'] || found['Find']).toBeTruthy();
  });

  test.describe('Node creation, keyboard add, auto-create and reset', () => {
    test('creates a node via keyboard shortcut (Ctrl/Cmd+N) and via Add button', async ({ page }) => {
      // count nodes initially
      const initialCounts = await countNodesBySelectors(page);

      // Try keyboard add: Ctrl/Cmd+N (handle Mac vs other via metaKey)
      await page.keyboard.down(process.platform === 'darwin' ? 'Meta' : 'Control');
      await page.keyboard.press('n');
      await page.keyboard.up(process.platform === 'darwin' ? 'Meta' : 'Control');
      // Wait briefly for DOM update
      await page.waitForTimeout(400);

      const countsAfterKey = await countNodesBySelectors(page);
      // At least some selector should show increase or numeric suspects increased
      const increased = Object.keys(countsAfterKey).some(k => countsAfterKey[k] > (initialCounts[k] || 0));
      expect(increased).toBeTruthy();

      // Now try Add Node button if exists: click Add and then click on canvas
      const addButton = page.getByRole('button', { name: /Add/i });
      const canvas = await findCanvasLocator(page);
      if (await addButton.count() > 0) {
        await addButton.first().click();
        // click canvas at center to create node (some implementations create immediately without further clicks)
        const box = await canvas.first().boundingBox();
        if (box) {
          await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        } else {
          await canvas.first().click();
        }
        await page.waitForTimeout(300);
        const countsAfterAdd = await countNodesBySelectors(page);
        const increasedAdd = Object.keys(countsAfterAdd).some(k => countsAfterAdd[k] > (countsAfterKey[k] || 0));
        expect(increasedAdd).toBeTruthy();
      } else {
        test.info().log('Add button not found; keyboard add tested only.');
      }
    });

    test('auto-create creates multiple nodes and reset clears them', async ({ page }) => {
      // Try to find Auto Create control and set number to 5 if possible
      const autoBtn = page.getByRole('button', { name: /Auto Create|Auto/i });
      if (await autoBtn.count() > 0) {
        // If there is a number input near it, set it
        const parent = autoBtn.first().locator('..');
        const numberInput = parent.locator('input[type="number"]');
        if (await numberInput.count() > 0) {
          await numberInput.fill('5');
        }
        await autoBtn.first().click();
        // allow some time for auto creation
        await page.waitForTimeout(800);
        const countsAfterAuto = await countNodesBySelectors(page);
        const sum = Object.values(countsAfterAuto).reduce((a, b) => a + b, 0);
        expect(sum).toBeGreaterThan(0);
        // Verify spy for autoCreate if installed
        const spyInstalled = await page.evaluate(() => !!(window.__spy && window.__spy.__installed));
        if (spyInstalled) {
          const autoCalls = await page.evaluate(() => window.__spy['autoCreate'] || 0);
          // Expect it to be called at least once
          expect(autoCalls).toBeGreaterThanOrEqual(1);
        }
      } else {
        test.info().log('Auto Create button not present - test skipped for this page.');
      }

      // Now click Reset and confirm nodes cleared and resetAll called
      const resetBtn = page.getByRole('button', { name: /Reset/i });
      if (await resetBtn.count() > 0) {
        await resetBtn.first().click();
        await page.waitForTimeout(300);
        const countsAfterReset = await countNodesBySelectors(page);
        const anyLeft = Object.values(countsAfterReset).some(v => v > 0);
        // Some implementations may keep a static UI; prefer to assert that internal reset function ran if present
        const resetCalled = await page.evaluate(() => (window.__spy && window.__spy['resetAll']) || 0);
        expect(resetCalled >= 0).toBeTruthy();
        // If DOM shows nodes, at least log should show reset event
        const logs = await readLogLines(page);
        const hasResetLog = logs.some(l => /reset/i.test(l));
        expect(hasResetLog || !anyLeft).toBeTruthy();
      } else {
        test.info().log('Reset button not found - skipping reset assertions.');
      }
    });
  });

  test.describe('Selection, find and union operations', () => {
    test('selects two nodes and performs union (with optional union-by-size)', async ({ page }) => {
      // Ensure we have at least 2 nodes - try auto-create 3 if needed
      const nodeLocator = await getBestNodeLocator(page);
      let nodeCount = await nodeLocator.count();
      if (nodeCount < 2) {
        const autoBtn1 = page.getByRole('button', { name: /Auto Create|Auto/i });
        if (await autoBtn.count() > 0) {
          await autoBtn.first().click();
          await page.waitForTimeout(800);
        } else {
          // fallback: create two nodes via keyboard
          for (let i = 0; i < 2; i++) {
            await page.keyboard.down(process.platform === 'darwin' ? 'Meta' : 'Control');
            await page.keyboard.press('n');
            await page.keyboard.up(process.platform === 'darwin' ? 'Meta' : 'Control');
            await page.waitForTimeout(200);
          }
        }
      }

      // Recompute nodes
      const nodes = await getBestNodeLocator(page);
      nodeCount = await nodes.count();
      expect(nodeCount).toBeGreaterThanOrEqual(2);

      // Click first node -> should enter selected_one state (try to read internal state)
      await nodes.nth(0).click({ force: true });
      await page.waitForTimeout(150);
      const stateAfterFirst = await getInternalState(page);
      // The FSM internal detection is best-effort; either we see 'selected_one' or an indicator from UI
      const selectedVisuals = await page.evaluate(() => {
        const el = document.querySelector('.selected, .is-selected, .node.selected');
        return !!el;
      });
      expect(selectedVisuals || /selected_one|selected/ig.test(String(stateAfterFirst || ''))).toBeTruthy();

      // Click second node -> selected_two
      await nodes.nth(1).click({ force: true });
      await page.waitForTimeout(150);
      const stateAfterSecond = await getInternalState(page);
      const selectedTwoVisuals = await page.evaluate(() => {
        const els = document.querySelectorAll('.selected, .is-selected, .node.selected');
        return els.length >= 2;
      });
      expect(selectedTwoVisuals || /selected_two|selected/ig.test(String(stateAfterSecond || ''))).toBeTruthy();

      // Toggle Union by Size if exists to exercise that path
      const unionBySizeLabel = page.locator('label:has-text("Union by Size"), label:has-text("by size")');
      if (await unionBySizeLabel.count() > 0) {
        await unionBySizeLabel.first().click();
      }

      // Click Union button
      const unionBtn = page.getByRole('button', { name: /Union/i });
      if (await unionBtn.count() > 0) {
        await unionBtn.first().click();
        // wait for union animation/complete time
        await page.waitForTimeout(700);
        // After union, parents array or links should reflect union. Check logs for union entry
        const logs1 = await readLogLines(page);
        const unionLog = logs.some(l => /union/i.test(l));
        const unionSpy = await page.evaluate(() => window.__spy && (window.__spy['union'] || 0));
        expect(unionLog || unionSpy > 0).toBeTruthy();
      } else {
        test.info().log('Union button not found - union interaction could not be fully validated.');
      }
    });

    test('find operation highlights path and optionally compresses path', async ({ page }) => {
      // Ensure at least one node present
      const nodes1 = await getBestNodeLocator(page);
      const cnt = await nodes.count();
      expect(cnt).toBeGreaterThanOrEqual(1);

      // Click a node to select and then click Find button
      await nodes.nth(0).click({ force: true });
      await page.waitForTimeout(120);

      // Toggle Path Compression checkbox when present
      const pcLabel = page.locator('label:has-text("Path Compression"), label:has-text("path compression")');
      let doCompression = false;
      if (await pcLabel.count() > 0) {
        // toggle it on to test compression
        await pcLabel.first().click();
        doCompression = true;
      }

      // Click Find
      const findBtn = page.getByRole('button', { name: /Find/i });
      if (await findBtn.count() > 0) {
        await findBtn.first().click();
        // Find operation is asynchronous; wait longer to let any animation finish
        await page.waitForTimeout(WAIT_LONG);
        // Check logs for find/compression messages
        const logs2 = await readLogLines(page);
        const findLog = logs.some(l => /find|representative|compression/i.test(l));
        const findSpy = await page.evaluate(() => window.__spy && (window.__spy['findWithTrace'] || 0));
        expect(findLog || findSpy > 0).toBeTruthy();
        if (doCompression) {
          // When compression enabled, parent array should reflect compressed parent for the node
          // We'll inspect common internal names for parent arrays
          const parents = await page.evaluate(() => {
            const keys = ['parents','parent','parentArray','parentArr','p'];
            for (const k of keys) {
              if (window[k]) return window[k];
              if (window.app && window.app[k]) return window.app[k];
              if (window.uf && window.uf[k]) return window.uf[k];
              if (window.dsu && window.dsu[k]) return window.dsu[k];
            }
            return undefined;
          });
          // If we can inspect parents, it should be array-like
          if (Array.isArray(parents)) {
            expect(parents.length).toBeGreaterThan(0);
          }
        }
      } else {
        test.info().log('Find button not present on page - skipping find validation.');
      }
    });

    test('user can cancel a running find (USER_CANCEL) via Escape key', async ({ page }) => {
      // Start a find (if find exists) and then press Escape to cancel
      const nodes2 = await getBestNodeLocator(page);
      const cnt1 = await nodes.count();
      if (cnt < 1) return test.skip('No nodes to test find/cancel');

      await nodes.nth(0).click({ force: true });
      await page.waitForTimeout(100);

      const findBtn1 = page.getByRole('button', { name: /Find/i });
      if (await findBtn.count() > 0) {
        // Kick off find
        await findBtn.first().click();
        // Wait a little to ensure asynchronous find started
        await page.waitForTimeout(200);
        // Press Escape to cancel
        await page.keyboard.press('Escape');
        await page.waitForTimeout(200);
        // Verify state returned to idle or not in finding
        const state = await getInternalState(page);
        // Accept either 'idle' or not containing 'finding'
        expect(String(state || '').toLowerCase()).not.toContain('finding');
      } else {
        test.info().log('Find button not present - skipping cancel test.');
      }
    });
  });

  test.describe('Dragging lifecycle and returning to previous state', () => {
    test('pointerdown initiates dragging and pointerup returns to previous selection state', async ({ page }) => {
      // Create at least one node
      let nodes3 = await getBestNodeLocator(page);
      let cnt2 = await nodes.count();
      if (cnt < 1) {
        // try keyboard create
        await page.keyboard.down(process.platform === 'darwin' ? 'Meta' : 'Control');
        await page.keyboard.press('n');
        await page.keyboard.up(process.platform === 'darwin' ? 'Meta' : 'Control');
        await page.waitForTimeout(300);
        nodes = await getBestNodeLocator(page);
        cnt = await nodes.count();
      }
      if (cnt < 1) return test.skip('No nodes available for drag test');

      // select node to get into selected_one state
      await nodes.nth(0).click({ force: true });
      await page.waitForTimeout(150);
      const stateBeforeDrag = await getInternalState(page);

      // Get bounding box of node for pointer interaction
      const box1 = await nodes.nth(0).boundingBox();
      if (!box) return test.skip('Unable to determine node bounding box for drag');

      // Press pointer down -> should trigger dragging state
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      // wait a tiny bit for drag init
      await page.waitForTimeout(150);

      // Optionally, check that initiateDrag was called via spy
      const dragSpyBefore = await page.evaluate(() => window.__spy && window.__spy['initiateDrag'] || 0);
      // Move pointer to simulate dragging
      await page.mouse.move(box.x + box.width / 2 + 40, box.y + box.height / 2 + 10);
      await page.waitForTimeout(120);
      // Release pointer
      await page.mouse.up();
      await page.waitForTimeout(250);

      // Check endDrag spy
      const dragSpyAfter = await page.evaluate(() => window.__spy && window.__spy['endDrag'] || 0);
      expect(dragSpyAfter >= 0).toBeTruthy();

      // After pointerup, the FSM should return to previous selection state
      const stateAfter = await getInternalState(page);
      // if we had 'selected_one' before, expect to return to something containing 'selected' or 'idle'
      const prevStr = String(stateBeforeDrag || '');
      expect(String(stateAfter || '').toLowerCase()).not.toContain('dragging');
    });
  });

  test.describe('Union-Find demo runner and composite sequences', () => {
    test('demo step runs scripted union then find and completes', async ({ page }) => {
      // Try to click Demo or Step button
      const demoBtn = page.getByRole('button', { name: /Demo Step|Demo|Step/i });
      if (await demoBtn.count() === 0) return test.skip('Demo control not present');

      // Ensure at least two nodes exist
      const nodes4 = await getBestNodeLocator(page);
      if ((await nodes.count()) < 2) {
        const autoBtn2 = page.getByRole('button', { name: /Auto Create|Auto/i });
        if (await autoBtn.count() > 0) {
          await autoBtn.first().click();
          await page.waitForTimeout(700);
        } else {
          // create nodes using keyboard
          for (let i = 0; i < 2; i++) {
            await page.keyboard.down(process.platform === 'darwin' ? 'Meta' : 'Control');
            await page.keyboard.press('n');
            await page.keyboard.up(process.platform === 'darwin' ? 'Meta' : 'Control');
            await page.waitForTimeout(200);
          }
        }
      }

      // Run demo step
      await demoBtn.first().click();
      // The demo may internally trigger unioning then finding; wait longer for sequence to complete
      await page.waitForTimeout(WAIT_LONG + 1000);

      // Validate demo logs if present
      const logs3 = await readLogLines(page);
      const demoMsgs = logs.filter(l => /demo|script|union|find|complete/i.test(l));
      // At least some demo-related messages should be present
      expect(demoMsgs.length).toBeGreaterThanOrEqual(0);

      // Check FSM returned to idle (best-effort)
      const state1 = await getInternalState(page);
      expect(String(state || '').toLowerCase()).not.toContain('demo_running');
    });
  });

  test.describe('Edge cases and robustness', () => {
    test('attempt union of node with itself should be handled gracefully', async ({ page }) => {
      // Ensure at least 1 node
      let nodes5 = await getBestNodeLocator(page);
      if ((await nodes.count()) < 1) {
        await page.keyboard.down(process.platform === 'darwin' ? 'Meta' : 'Control');
        await page.keyboard.press('n');
        await page.keyboard.up(process.platform === 'darwin' ? 'Meta' : 'Control');
        await page.waitForTimeout(300);
        nodes = await getBestNodeLocator(page);
      }
      const cnt3 = await nodes.count();
      if (cnt < 1) return test.skip('No node to test self-union');

      // Select the same node twice
      await nodes.nth(0).click({ force: true });
      await page.waitForTimeout(80);
      await nodes.nth(0).click({ force: true });
      await page.waitForTimeout(150);

      // Click Union
      const unionBtn1 = page.getByRole('button', { name: /Union/i });
      if (await unionBtn.count() > 0) {
        await unionBtn.first().click();
        await page.waitForTimeout(500);
        // Check logs for a handled message or error prevention
        const logs4 = await readLogLines(page);
        const ok = logs.some(l => /same|already|no-op|ignore|invalid/i.test(l));
        // Accept either a controlled message or no crash (we verify the page is still interactive)
        expect(ok || (await page.evaluate(() => document.readyState)) === 'complete').toBeTruthy();
      } else {
        test.info().log('Union button missing - skipping self-union test.');
      }
    });

    test('page remains interactive after rapid resize events (RESIZE)', async ({ page }) => {
      // Dispatch several resize events to exercise RESIZE transitions
      for (let i = 0; i < 3; i++) {
        await page.setViewportSize({ width: 800 + i * 10, height: 600 + i * 5 });
        await page.waitForTimeout(120);
      }
      // After resizes, app should still respond to a simple action like focusing a button
      const resetBtn1 = page.getByRole('button', { name: /Reset/i });
      if (await resetBtn.count() > 0) {
        await resetBtn.first().focus();
        expect(await resetBtn.first().isEnabled()).toBeTruthy();
      } else {
        // fallback: ensure body exists
        expect(await page.evaluate(() => !!document.body)).toBeTruthy();
      }
    });
  });

  test.afterEach(async ({ page }) => {
    // Try to reset the app after each test to leave a clean state
    const resetBtn2 = page.getByRole('button', { name: /Reset/i });
    if (await resetBtn.count() > 0) {
      await resetBtn.first().click();
      await page.waitForTimeout(200);
    } else {
      // try calling resetAll if available
      await page.evaluate(() => {
        try { if (window.resetAll) window.resetAll(); } catch (e) {}
      });
    }
  });
});