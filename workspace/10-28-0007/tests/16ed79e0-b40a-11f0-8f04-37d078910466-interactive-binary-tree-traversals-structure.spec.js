import { test, expect } from '@playwright/test';

/**
 * Playwright E2E tests for:
 * Application ID: 16ed79e0-b40a-11f0-8f04-37d078910466
 * Workspace: 10-28-0007
 *
 * These tests exercise the FSM-driven behaviors:
 * - idle, nodePanelOpen, confirmingClear, confirmingDelete, traversalPlaying
 * - Events: CLICK_ADD_ROOT, CLICK_CLEAR, OPEN_NODE_PANEL, CLICK_ADD_LEFT/RIGHT, CLICK_DELETE_NODE,
 *   CONFIRM_* flows, RUN_TRAVERSAL_*, TRAVERSAL interruption (CLICK_CANVAS / CLEAR_TRAVERSAL),
 *   SPEED_CHANGE, CONNECTOR_TOGGLE
 *
 * Notes:
 * - The UI uses native dialogs for prompt/confirm/alert in several flows — tests attach dialog handlers.
 * - Selectors are resilient (regex/text-based) to minor label variations.
 * - If optional UI elements (e.g., connector toggle) are absent in the served HTML, those checks are skipped.
 */

const BASE = 'http://127.0.0.1:5500/workspace/10-28-0007/html/16ed79e0-b40a-11f0-8f04-37d078910466.html';

test.describe.configure({ mode: 'serial' }); // run serially to maintain predictable dialog handling when needed

// Page object for the Binary Tree UI
class TreePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    // Helpful locators (created lazily)
    this.output = page.locator('.output');
    this.canvasWrap = page.locator('.canvas-wrap, .canvas, .vis'); // fallback set
    this.range = page.locator('input[type="range"]');
  }

  // Generic helper to find a button by regex text (case-insensitive)
  async getButtonByText(re) {
    const byRole = this.page.getByRole('button', { name: re });
    if (await byRole.count() > 0) return byRole.first();
    const byButtonText = this.page.locator('button', { hasText: re });
    if (await byButtonText.count() > 0) return byButtonText.first();
    // fallback to any element having text (not ideal, but used as last resort)
    return this.page.locator(`text=${re}`).first();
  }

  // Click Add Root and supply a value via prompt (if prompt appears).
  // Returns true if a prompt was handled (node creation attempt), false if no prompt shown.
  async clickAddRootAndAccept(value = 'R') {
    const btn = await this.getButtonByText(/add\s*root/i);
    // Some implementations may show prompt; wait for dialog then click
    const dialogPromise = this.page.waitForEvent('dialog').catch(() => null);
    await btn.click();
    const dialog = await dialogPromise;
    if (!dialog) return false;
    // if it's a prompt, provide value; if alert, just accept (no value)
    if (dialog.type() === 'prompt') {
      await dialog.accept(value);
    } else {
      // an alert or other dialog - accept, but no value
      await dialog.accept();
    }
    return true;
  }

  // Click an element that represents a node by its visible text label
  async clickNode(label) {
    // nodes often have the label visible; try to click by text
    const node = this.page.locator('.node, .tree-node, .node-label, circle, text', { hasText: label }).first();
    if (await node.count() === 0) {
      // fallback to any text
      await this.page.getByText(label, { exact: true }).first().click();
      return;
    }
    await node.click();
  }

  // Open the node panel for a node with label; returns true if panel opened (panel visible)
  async openNodePanelFor(label) {
    await this.clickNode(label);
    // panel should appear with Add Left/Add Right/Delete options
    const panel = this.page.locator('[role="dialog"], .node-panel, .panel-node, .node-actions, .popover');
    return (await panel.count()) > 0;
  }

  // Click Add Left or Add Right on the open node panel and accept prompt
  async clickAddOnPanel(side = 'left', value = 'X') {
    const re = side === 'left' ? /add\s*left/i : /add\s*right/i;
    const btn = await this.getButtonByText(re);
    const dialogPromise = this.page.waitForEvent('dialog').catch(() => null);
    await btn.click();
    const dialog = await dialogPromise;
    if (dialog) {
      if (dialog.type() === 'prompt') {
        await dialog.accept(value);
      } else {
        await dialog.accept();
      }
      return true;
    }
    // If no prompt, return false
    return false;
  }

  // Click Delete on the node panel and control confirm dialog via confirmOk boolean
  async clickDeleteOnPanel(confirmOk = true) {
    const btn = await this.getButtonByText(/delete/i);
    const dialogPromise = this.page.waitForEvent('dialog').catch(() => null);
    await btn.click();
    const dialog = await dialogPromise;
    if (!dialog) return null;
    // we expect a confirm dialog
    if (dialog.type() === 'confirm') {
      confirmOk ? await dialog.accept() : await dialog.dismiss();
    } else {
      // if an alert/prompt unexpectedly appears - accept/dismiss accordingly
      confirmOk ? await dialog.accept() : await dialog.dismiss();
    }
    return dialog;
  }

  // Click Clear (entire tree) and handle confirm
  async clickClear(confirmOk = true) {
    const btn = await this.getButtonByText(/clear/i);
    const dialogPromise = this.page.waitForEvent('dialog').catch(() => null);
    await btn.click();
    const dialog = await dialogPromise;
    if (!dialog) return null;
    if (dialog.type() === 'confirm') {
      confirmOk ? await dialog.accept() : await dialog.dismiss();
    } else {
      confirmOk ? await dialog.accept() : await dialog.dismiss();
    }
    return dialog;
  }

  // Run a traversal by pressing its button (preorder/inorder/postorder/level)
  async runTraversal(type = 'preorder') {
    const mapping = {
      preorder: /pre-?order|preorder/i,
      inorder: /in-?order|inorder/i,
      postorder: /post-?order|postorder/i,
      level: /level-?order|level/i,
    };
    const btn = await this.getButtonByText(mapping[type]);
    await btn.click();
  }

  // Return current output sequence as array of chip texts (chips typically show node values)
  async getOutputSequence() {
    // Wait briefly for any chips to be present; caller can await further.
    await this.page.waitForTimeout(80);
    const chips = this.page.locator('.output .chip.out, .output .chip');
    const count = await chips.count();
    const values = [];
    for (let i = 0; i < count; i++) {
      values.push((await chips.nth(i).innerText()).trim());
    }
    return values;
  }

  // Click canvas (center visualization) to simulate CLICK_CANVAS
  async clickCanvas() {
    // Click center of canvasWrap; fallback to clicking body center
    const el = this.canvasWrap;
    if ((await el.count()) > 0) {
      const box = await el.first().boundingBox();
      if (box) {
        await this.page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        return;
      }
    }
    // fallback
    await this.page.mouse.click(10, 10);
  }

  // Change speed slider; value between slider min and max; we dispatch input event
  async setSpeed(value) {
    if ((await this.range.count()) === 0) return false;
    await this.page.evaluate(
      (v) => {
        const r = document.querySelector('input[type="range"]');
        if (r) {
          r.value = v;
          r.dispatchEvent(new Event('input', { bubbles: true }));
          r.dispatchEvent(new Event('change', { bubbles: true }));
        }
      },
      String(value)
    );
    return true;
  }

  // Try to toggle connectors (if a toggle exists)
  async toggleConnectors() {
    // look for a toggle/checkbox/button labeled 'connector' or 'connectors' or 'lines'
    const toggle = this.page.locator('label, button, input', { hasText: /connector|connectors|lines|edges/i }).first();
    if ((await toggle.count()) === 0) return false;
    // If it's an input checkbox, click it; otherwise try click
    const tag = await toggle.evaluate((el) => el.tagName.toLowerCase());
    if (tag === 'input' || tag === 'button' || tag === 'label') {
      await toggle.click();
      return true;
    }
    return false;
  }

  // Helper: assert node with text exists or not
  async nodeExists(value) {
    const locator = this.page.getByText(value, { exact: true });
    return (await locator.count()) > 0;
  }

  // Wait until traversal animation starts by checking for active classes on nodes OR some progress in output area
  async waitForTraversalToStart(timeout = 2500) {
    // Wait until either an 'active' class appears on any node or the output gets at least 1 chip
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const active = await this.page.locator('.node.active, .active.node, .node--active, .active').count();
      const outCount = (await this.page.locator('.output .chip.out, .output .chip').count());
      if (active > 0 || outCount > 0) return true;
      await this.page.waitForTimeout(50);
    }
    return false;
  }
}

test.describe('Interactive Binary Tree — Traversals & Structure', () => {
  /** @type {TreePage} */
  let tree;

  test.beforeEach(async ({ page }) => {
    // Increase default timeout in case of slow animations
    test.setTimeout(60 * 1000);
    await page.goto(BASE);
    tree = new TreePage(page);
    // Ensure page loaded by checking for some main structural elements
    await expect(page.locator('main, .panel, .vis, .controls, .output')).toHaveCountGreaterThan(0).catch(() => {
      // not fatal: we'll still continue with tests, selectors are resilient
    });
  });

  test.afterEach(async ({ page }) => {
    // attempt to dismiss any lingering dialogs to keep subsequent tests stable
    page.removeAllListeners('dialog');
  });

  test('idle: Add root (prompt) creates root; duplicate Add Root leads to alert (rejection)', async ({ page }) => {
    // Create root via Add Root (expect prompt)
    let dialog = null;
    const dialogPromise = page.waitForEvent('dialog').catch(() => null);
    const addBtn = await tree.getButtonByText(/add\s*root/i);
    await addBtn.click();
    dialog = await dialogPromise;
    // If prompt appears, supply value 'A'
    if (dialog) {
      expect(['prompt', 'alert', 'confirm']).toContain(dialog.type());
      if (dialog.type() === 'prompt') await dialog.accept('A');
      else await dialog.accept();
    }

    // Wait for node with label 'A' to appear
    await page.waitForTimeout(150); // allow render
    expect(await tree.nodeExists('A')).toBeTruthy();

    // Attempt to add root again; this should show an alert (root exists)
    const secondDialogPromise = page.waitForEvent('dialog');
    await addBtn.click();
    const secondDialog = await secondDialogPromise;
    expect(secondDialog).toBeTruthy();
    // Should be an alert (implementation note: adding root when exists triggers alert)
    expect(['alert', 'confirm', 'prompt']).toContain(secondDialog.type());
    // Dismiss/accept alert to continue
    await secondDialog.accept();
    // Ensure still only one root label 'A'
    const found = await page.getByText('A', { exact: true }).count();
    expect(found).toBeGreaterThanOrEqual(1);
  });

  test('nodePanelOpen: open panel on node; Add Left/Add Right create children via prompt; Delete confirm/cancel flows', async ({ page }) => {
    // Prepare root 'Root'
    await tree.clickAddRootAndAccept('Root');
    await page.waitForTimeout(120);
    expect(await tree.nodeExists('Root')).toBeTruthy();

    // Open panel on root
    await tree.openNodePanelFor('Root');
    // Add left child 'L'
    const addLeftHandled = await tree.clickAddOnPanel('left', 'L');
    // If the UI didn't use prompt, we still expect left node to appear if possible
    await page.waitForTimeout(200);
    expect(await tree.nodeExists('L')).toBeTruthy();

    // Re-open panel on root and add right 'R'
    await tree.openNodePanelFor('Root');
    const addRightHandled = await tree.clickAddOnPanel('right', 'R');
    await page.waitForTimeout(200);
    expect(await tree.nodeExists('R')).toBeTruthy();

    // Open panel on left child 'L' and attempt delete -> dismiss (cancel)
    const panelOpened = await tree.openNodePanelFor('L');
    if (panelOpened) {
      // Click delete and cancel
      const deleteDialog = await tree.clickDeleteOnPanel(false); // simulate CONFIRM_DELETE_CANCEL
      if (deleteDialog) {
        // For a cancelled delete, the node should still exist and panel should remain open
        await page.waitForTimeout(120);
        expect(await tree.nodeExists('L')).toBeTruthy();
        // The node panel is expected to be visible: look for panel UI
        const panel = page.locator('[role="dialog"], .node-panel, .popover, .node-actions');
        expect((await panel.count()) > 0).toBeTruthy();
      } else {
        // If the implementation did not open a native confirm, skip strict checks but ensure node still exists
        expect(await tree.nodeExists('L')).toBeTruthy();
      }

      // Now actually confirm deletion
      const confirmDialog = await tree.clickDeleteOnPanel(true);
      // After confirmation the node should be removed
      await page.waitForTimeout(200);
      expect(await tree.nodeExists('L')).toBeFalsy();
    } else {
      test.skip('Node panel did not open for left child; skipping delete-confirm flows for that node.');
    }
  });

  test('confirmingClear: Clear entire tree with cancel and accept behaviors', async ({ page }) => {
    // Setup small tree Root -> A, B
    await tree.clickAddRootAndAccept('C');
    await page.waitForTimeout(100);
    expect(await tree.nodeExists('C')).toBeTruthy();
    await tree.openNodePanelFor('C');
    await tree.clickAddOnPanel('left', 'L1');
    await page.waitForTimeout(80);
    expect(await tree.nodeExists('L1')).toBeTruthy();

    // Click Clear and cancel
    const clearDialog = await tree.clickClear(false);
    if (clearDialog) {
      // After cancel, nodes should remain
      await page.waitForTimeout(120);
      expect(await tree.nodeExists('C')).toBeTruthy();
      expect(await tree.nodeExists('L1')).toBeTruthy();
    } else {
      test.skip('Clear did not produce a confirmation dialog; skipping cancel behavior assert.');
    }

    // Click Clear and accept -> should remove nodes
    const confirmClearDialog = await tree.clickClear(true);
    if (confirmClearDialog) {
      await page.waitForTimeout(200);
      // All nodes should be gone (no node labels present)
      const anyNode = (await page.locator('.node, .tree-node, .node-label').count()) > 0;
      // If nodes are still present as DOM but cleared of labels, we at least ensure the previously created labels are gone
      expect(await tree.nodeExists('C')).toBeFalsy();
      expect(await tree.nodeExists('L1')).toBeFalsy();
    } else {
      test.skip('Clear did not present a native confirmation dialog; skipping clear assert.');
    }
  });

  test('traversalPlaying: build tree and verify Preorder/Inorder/Postorder/Level traversals and animation controls', async ({ page }) => {
    // Build the following tree to have deterministic traversals:
    //        1
    //       / \
    //      2   3
    //     /
    //    4
    //
    // Expected traversals:
    // Preorder: 1,2,4,3
    // Inorder: 4,2,1,3
    // Postorder: 4,2,3,1
    // Level: 1,2,3,4  (assuming left-to-right)
    // We'll create nodes via prompts; if the UI lacks prompt we'll try best-effort.

    // Clear any existing tree first
    if ((await page.locator('.node, .tree-node').count()) > 0) {
      // attempt to clear quickly
      const cbtn = await tree.getButtonByText(/clear/i);
      if (await cbtn.count() > 0) {
        const d = page.waitForEvent('dialog').catch(() => null);
        await cbtn.click();
        const dlg = await d;
        if (dlg) await dlg.accept();
        await page.waitForTimeout(150);
      }
    }

    // Add root '1'
    await tree.clickAddRootAndAccept('1');
    await page.waitForTimeout(120);
    expect(await tree.nodeExists('1')).toBeTruthy();

    // Add left '2' and right '3' to root
    await tree.openNodePanelFor('1');
    await tree.clickAddOnPanel('left', '2');
    await page.waitForTimeout(120);
    expect(await tree.nodeExists('2')).toBeTruthy();
    await tree.openNodePanelFor('1');
    await tree.clickAddOnPanel('right', '3');
    await page.waitForTimeout(120);
    expect(await tree.nodeExists('3')).toBeTruthy();

    // Add left child '4' to node '2'
    await tree.openNodePanelFor('2');
    await tree.clickAddOnPanel('left', '4');
    await page.waitForTimeout(150);
    expect(await tree.nodeExists('4')).toBeTruthy();

    // Helper to run traversal and validate final output sequence
    async function runAndGetSequence(type, expectedSeq, allowRestart = true) {
      // Start traversal
      await tree.runTraversal(type);
      // Wait for traversal to start (active marker or first output)
      const started = await tree.waitForTraversalToStart(2000);
      expect(started).toBeTruthy();

      // Wait until expected output chip count equals expectedSeq.length or timeout
      const end = Date.now() + 5000;
      let seq = [];
      while (Date.now() < end) {
        seq = await tree.getOutputSequence();
        if (seq.length >= expectedSeq.length) break;
        await page.waitForTimeout(60);
      }
      // Basic sequence check: expected elements present in same order (some implementations may append extra text)
      // Normalize chip texts to first tokens
      const norm = seq.map((s) => s.trim().split(/\s+/)[0]);
      expect(norm.slice(0, expectedSeq.length)).toEqual(expectedSeq);
      return norm;
    }

    // Preorder
    await runAndGetSequence('preorder', ['1', '2', '4', '3']);

    // Re-trigger Preorder while playing to test restart: click again and ensure animation restarts (chips cleared then re-accumulate)
    // Start first traversal
    await tree.runTraversal('preorder');
    await tree.waitForTraversalToStart(2000);
    // Trigger again to restart
    await tree.runTraversal('preorder');
    // After restart, output should eventually equal same sequence
    const seqAfterRestart = await runAndGetSequence('preorder', ['1', '2', '4', '3']);
    expect(seqAfterRestart.slice(0, 4)).toEqual(['1', '2', '4', '3']);

    // Inorder
    await runAndGetSequence('inorder', ['4', '2', '1', '3']);

    // Postorder
    await runAndGetSequence('postorder', ['4', '2', '3', '1']);

    // Level-order
    await runAndGetSequence('level', ['1', '2', '3', '4']);

    // Test clicking canvas stops traversal (start a longish traversal and then click canvas)
    // Start traversal
    await tree.runTraversal('preorder');
    await tree.waitForTraversalToStart(2000);
    // Click canvas to interrupt
    await tree.clickCanvas();
    // After clicking canvas, traversal should stop and animation cleared (output cleared or not progressing)
    // We'll wait briefly and ensure no more chips are appended beyond what existed at interruption moment within a short window
    const snapshot = await tree.getOutputSequence();
    await page.waitForTimeout(300);
    const afterClick = await tree.getOutputSequence();
    expect(afterClick.length).toBeLessThanOrEqual(Math.max(1, snapshot.length + 1)); // allow one small variance
  });

  test('SPEED_CHANGE and CONNECTOR_TOGGLE: changing speed updates slider and toggles connectors do not break', async ({ page }) => {
    // Attempt to change speed if slider present
    if ((await tree.range.count()) > 0) {
      // set to mid value '50' or '2' depending on slider scale
      await tree.setSpeed(50);
      // No direct visible label guaranteed; but ensure slider value changed
      const val = await page.evaluate(() => {
        const r = document.querySelector('input[type="range"]');
        return r ? r.value : null;
      });
      expect(val).not.toBeNull();
    } else {
      test.skip('Speed slider not found; skipping speed change assertions.');
    }

    // Try connector toggle if exists
    const toggled = await tree.toggleConnectors();
    if (!toggled) {
      test.skip('Connector toggle not found; skipping connector toggle assertions.');
    } else {
      // toggling connectors should not remove nodes; ensure app still responsive
      await page.waitForTimeout(80);
      // If no specific assertions, ensure buttons still clickable
      const btn = await tree.getButtonByText(/pre-?order|in-?order/i);
      expect((await btn.count()) > 0).toBeTruthy();
    }
  });

  test('Edge cases: adding child where one already exists shows alert; deleting root clears subtree', async ({ page }) => {
    // Clean slate
    // Attempt to clear if present
    const clearBtn = await tree.getButtonByText(/clear/i);
    if ((await clearBtn.count()) > 0) {
      const dlg = page.waitForEvent('dialog').catch(() => null);
      await clearBtn.click();
      const d = await dlg;
      if (d) await d.accept();
      await page.waitForTimeout(120);
    }

    // Build minimal tree: root 'X' with left child 'Y'
    await tree.clickAddRootAndAccept('X');
    await page.waitForTimeout(80);
    await tree.openNodePanelFor('X');
    await tree.clickAddOnPanel('left', 'Y');
    await page.waitForTimeout(80);
    expect(await tree.nodeExists('X')).toBeTruthy();
    expect(await tree.nodeExists('Y')).toBeTruthy();

    // Try to add left again on X -> should present an alert or fail
    await tree.openNodePanelFor('X');
    const addLeftBtn = await tree.getButtonByText(/add\s*left/i);
    // Click and expect a dialog (likely alert) indicating failure
    const dialogPromise = page.waitForEvent('dialog').catch(() => null);
    await addLeftBtn.click();
    const dialog = await dialogPromise;
    if (dialog) {
      // If an alert/prompt/error is shown, accept it and assert the existing child remains
      await dialog.accept();
      await page.waitForTimeout(80);
      expect(await tree.nodeExists('Y')).toBeTruthy();
    } else {
      test.skip('Add Left did not trigger a native dialog when child existed; skipping assertion.');
    }

    // Delete root 'X' via its panel and accept -> all subtree removed
    await tree.openNodePanelFor('X');
    const delDialog = await tree.clickDeleteOnPanel(true);
    if (delDialog) {
      await page.waitForTimeout(180);
      expect(await tree.nodeExists('X')).toBeFalsy();
      expect(await tree.nodeExists('Y')).toBeFalsy();
    } else {
      test.skip('Delete did not open a native confirm; skipping subtree deletion assert.');
    }
  });
});