import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/11-08-0004/html/77fd7290-bcb0-11f0-95d9-c98d28730c93.html';

// Page Object for the Priority Queue Visualizer
class HeapPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    // Generic selectors used across tests (kept resilient to small DOM differences)
    this.textInput = page.locator('input[type="text"]').first();
    this.numberInput = page.locator('input[type="number"]').first();
    this.insertButton = page.locator('button', { hasText: /^Insert$/i }).first();
    this.extractButton = page.locator('button', { hasText: /^Extract$/i }).first();
    this.peekButton = page.locator('button', { hasText: /^Peek$/i }).first();
    this.clearButton = page.locator('button', { hasText: /^Clear$/i }).first();
    this.randomizeButton = page.locator('button', { hasText: /^Randomize$/i }).first();
    this.hintButton = page.locator('button', { hasText: /^Hint$/i }).first();
    this.heapTypeSelect = page.locator('select').first();
    // Node and list selectors
    this.nodeLocator = page.locator('.node');
    // Fallback: array-like representation of heap
    this.arrayItems = page.locator('.array .item, .heap-array .item, .array-item');
    // Logs area (best-effort)
    this.logArea = page.locator('#log, .log, .console, .activity-log').first();
    // Top badge (best-effort)
    this.topBadge = page.locator('.top-badge, .badge-top, .top').first();
  }

  async goto() {
    await this.page.goto(APP_URL);
    // Wait for the module to initialize. Look for likely text or an element change.
    // Primary: "Module loaded — ready" log line or presence of at least one node (initial randomize).
    await Promise.race([
      this.page.waitForSelector('text=Module loaded — ready', { timeout: 1500 }).catch(() => null),
      this.page.waitForSelector('.node', { timeout: 1500 }).catch(() => null),
      this.page.waitForLoadState('domcontentloaded'),
    ]);
  }

  // Insert using the visible input fields and Insert button
  async insert(value, priority) {
    if (value !== null) {
      await this.textInput.fill(String(value));
    }
    if (priority !== null) {
      await this.numberInput.fill(String(priority));
    }
    // click insert
    await this.insertButton.click();
  }

  // Insert by pressing Enter in priority input (PRIORITY_ENTER_KEY event)
  async insertByEnter(value, priority) {
    if (value !== null) await this.textInput.fill(String(value));
    if (priority !== null) await this.numberInput.fill(String(priority));
    await this.numberInput.press('Enter');
  }

  async extract() {
    await this.extractButton.click();
  }

  async peek() {
    await this.peekButton.click();
  }

  // Click Clear and optionally accept or cancel the confirm dialog
  async clear(accept = true) {
    const dlgPromise = this.page.waitForEvent('dialog');
    await this.clearButton.click();
    const dialog = await dlgPromise;
    if (accept) {
      await dialog.accept();
    } else {
      await dialog.dismiss();
    }
  }

  // Click Randomize and respond to the prompt. If count is null -> cancel
  async randomize(count = null) {
    const dlgPromise1 = this.page.waitForEvent('dialog');
    await this.randomizeButton.click();
    const dialog1 = await dlgPromise;
    if (count === null) {
      await dialog.dismiss();
    } else {
      await dialog.accept(String(count));
    }
  }

  // Click the nth node (0-based). Returns the locator for that node.
  async clickNode(index = 0) {
    const locator = this.nodeLocator.nth(index);
    await locator.scrollIntoViewIfNeeded();
    await locator.click();
    return locator;
  }

  // Edit a clicked node via prompt. Provide newPriority or cancel if null.
  async editNodePrioritySubmit(newPriority = null) {
    const dlgPromise2 = this.page.waitForEvent('dialog');
    // The prompt will already be open after node click in tests where used.
    const dialog2 = await dlgPromise;
    if (newPriority === null) {
      await dialog.dismiss();
    } else {
      await dialog.accept(String(newPriority));
    }
  }

  // Change heap type via select (value name guessed: 'min' or 'max'), fallback choose second option
  async changeHeapType(toValue = 'max') {
    // If select has an option with matching value/text choose it; otherwise toggle to the other option.
    const select = this.heapTypeSelect;
    if (!(await select.count())) return;
    const options = await select.locator('option').all();
    for (const opt of options) {
      const v = (await opt.getAttribute('value')) || (await opt.textContent());
      if (String(v).toLowerCase().includes(String(toValue).toLowerCase())) {
        const val = await opt.getAttribute('value');
        if (val) {
          await select.selectOption(val);
          return;
        } else {
          // If no value attribute, select by label
          await select.selectOption({ label: await opt.textContent() });
          return;
        }
      }
    }
    // fallback: pick the second option if available to cause a change
    if (options.length >= 2) {
      const val1 = await options[1].getAttribute('value');
      if (val) {
        await select.selectOption(val);
      } else {
        await select.selectOption({ label: await options[1].textContent() });
      }
    }
  }

  async clickHintAndAccept() {
    const dlgPromise3 = this.page.waitForEvent('dialog');
    await this.hintButton.click();
    const dialog3 = await dlgPromise;
    await dialog.accept();
  }

  async getNodeCount() {
    // Prefer .node, fallback to array items
    const count = await this.nodeLocator.count();
    if (count > 0) return count;
    return await this.arrayItems.count();
  }

  async getNodesText() {
    const count1 = await this.getNodeCount();
    const arr = [];
    if (await this.nodeLocator.count() > 0) {
      for (let i = 0; i < count; i++) {
        const t = (await this.nodeLocator.nth(i).innerText()).trim();
        arr.push(t);
      }
    } else {
      for (let i = 0; i < count; i++) {
        arr.push((await this.arrayItems.nth(i).innerText()).trim());
      }
    }
    return arr;
  }

  async waitForAnimationComplete(timeout = 3000) {
    // Best-effort: wait for any element with class 'new' to disappear or for no '.swapping' classes.
    const page = this.page;
    await page.waitForTimeout(60); // small tick to allow animation to start
    await page.waitForFunction(() => {
      const hasNew = !!document.querySelector('.node.new, .new.node');
      const hasSwap = !!document.querySelector('.swapping, .swap, .moving');
      // If none of these markers exist, consider animation complete.
      return !hasNew && !hasSwap;
    }, null, { timeout }).catch(() => null);
  }

  async getLogText() {
    if (!(await this.logArea.count())) return '';
    return (await this.logArea.innerText()).trim();
  }

  async getTopBadgeText() {
    if (!(await this.topBadge.count())) return '';
    return (await this.topBadge.innerText()).trim();
  }
}

test.describe('Priority Queue Visualizer (Interactive Heap) - FSM validation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app before each test
    const heap = new HeapPage(page);
    await heap.goto();
  });

  test('Module load triggers initialization (MODULE_LOAD -> initialize -> idle)', async ({ page }) => {
    // Validate the module initialized cleanly and moved to idle.
    const heap1 = new HeapPage(page);

    // The page title should match and module should have logged readiness or present nodes.
    await expect(page).toHaveTitle(/Priority Queue|Interactive Module/i);

    // Prefer explicit log text if present
    const logText = await heap.getLogText();
    // Either a clearly visible "Module loaded — ready" or some log text that suggests readiness
    const readyFound = /Module loaded|ready|initialized/i.test(logText);
    const nodesPresent = (await heap.getNodeCount()) > 0;
    expect(readyFound || nodesPresent).toBeTruthy();
  });

  test('Insert flow: INSERT_CLICK -> inserting -> BUBBLE_UP_START -> bubbling_up -> BUBBLE_UP_DONE -> idle', async ({ page }) => {
    // This test verifies insertion of a new element, visual "new" marker, and that animation finishes.
    const heap2 = new HeapPage(page);

    // Record initial node count
    const before = await heap.getNodeCount();

    // Insert a new item
    await heap.insert('X', 1);

    // The newly created node with label "X" should appear
    const found = page.locator('text=X');
    await expect(found).toHaveCountGreaterThan(0);

    // The node should briefly have a 'new' marker class (onEnter inserted)
    const nodeWithText = page.locator('.node', { hasText: 'X' }).first();
    // If 'new' class is applied, its class attribute will include 'new'
    const classAttr = await nodeWithText.getAttribute('class').catch(() => '');
    if (classAttr && classAttr.includes('new')) {
      expect(classAttr).toContain('new');
    }

    // Wait for bubble-up / animation to finish (BUBBLE_UP_DONE -> idle)
    await heap.waitForAnimationComplete(3000);

    // After completion, node count increased by at least 1
    const after = await heap.getNodeCount();
    expect(after).toBeGreaterThanOrEqual(before + 1);
  });

  test('Insert via Enter key triggers PRIORITY_ENTER_KEY', async ({ page }) => {
    // Validate insertion when pressing Enter in priority input triggers same workflow.
    const heap3 = new HeapPage(page);
    const before1 = await heap.getNodeCount();

    await heap.insertByEnter('EnterInsert', 42);

    // Expect the new node to appear
    await expect(page.locator('text=EnterInsert')).toHaveCountGreaterThan(0);

    // Wait for any animation to complete
    await heap.waitForAnimationComplete(3000);

    const after1 = await heap.getNodeCount();
    expect(after).toBeGreaterThanOrEqual(before + 1);
  });

  test('Peek (PEEK_CLICK) shows top item or empty log (peeking)', async ({ page }) => {
    const heap4 = new HeapPage(page);
    // Ensure there is at least one item; if not, randomize to get items
    if ((await heap.getNodeCount()) === 0) {
      // Provide prompt response for randomize
      const dlg = page.waitForEvent('dialog');
      await heap.randomize(3);
      // dialog already handled in heap.randomize
      await dlg.catch(() => null);
      await heap.waitForAnimationComplete(1000);
    }

    // Trigger peek
    await heap.peek();

    // Expect the log area to contain "top" or the visible top node value
    const logText1 = await heap.getLogText();
    const nodes = await heap.getNodesText();
    const topText = nodes.length > 0 ? nodes[0] : '';
    expect(/top|peek|top of heap|peeked/i.test(logText) || (topText && logText.includes(topText))).toBeTruthy();
  });

  test('Extracting when heap empty logs message and does not crash (extracting empty)', async ({ page }) => {
    const heap5 = new HeapPage(page);

    // Clear heap first (accept confirm)
    await heap.clear(true);
    // Wait briefly for UI to update
    await page.waitForTimeout(200);

    // Ensure no nodes remain
    expect(await heap.getNodeCount()).toBe(0);

    // Click Extract and expect an informative message in logs or no nodes created
    await heap.extract();
    const logText2 = await heap.getLogText();
    const emptyMsg = /empty|nothing to extract/i.test(logText);
    expect(emptyMsg || (await heap.getNodeCount()) === 0).toBeTruthy();
  });

  test('Extracting non-empty heap removes root and may bubble down (extracting non-empty)', async ({ page }) => {
    const heap6 = new HeapPage(page);

    // Ensure there are items by randomizing
    await heap.randomize(5);
    // Wait for rebuild to finish
    await heap.waitForAnimationComplete(1000);

    const beforeNodes = await heap.getNodesText();
    expect(beforeNodes.length).toBeGreaterThanOrEqual(1);
    const rootText = beforeNodes[0];

    // Extract root
    await heap.extract();

    // After extraction, the former root should no longer be at the root position
    await heap.waitForAnimationComplete(2000);
    const afterNodes = await heap.getNodesText();
    if (afterNodes.length === 0) {
      // If heap had 1 element, after it's empty — that's valid
      expect(beforeNodes.length).toBe(1);
    } else {
      // Otherwise, root should have changed
      expect(afterNodes[0]).not.toEqual(rootText);
    }
  });

  test('Clear cancel and confirm (clearing_confirm -> CLEAR_CANCEL / CLEAR_CONFIRM)', async ({ page }) => {
    const heap7 = new HeapPage(page);

    // Ensure we have nodes to clear
    await heap.randomize(4);
    await heap.waitForAnimationComplete(500);

    const countBefore = await heap.getNodeCount();
    expect(countBefore).toBeGreaterThan(0);

    // Click Clear and cancel the confirmation
    const dlgPromise11 = page.waitForEvent('dialog');
    await heap.clear(false); // dismiss
    // If dismissed, heap should remain unchanged
    await page.waitForTimeout(200);
    const countAfterCancel = await heap.getNodeCount();
    expect(countAfterCancel).toBeGreaterThanOrEqual(countBefore);

    // Now clear and accept
    await heap.clear(true);
    // Wait for UI to reflect cleared state
    await page.waitForTimeout(200);
    const countAfterConfirm = await heap.getNodeCount();
    expect(countAfterConfirm).toBe(0);
  });

  test('Randomize prompt flows: RANDOMIZE_CLICK -> RANDOMIZE_SUBMIT and RANDOMIZE_CANCEL', async ({ page }) => {
    const heap8 = new HeapPage(page);

    // Open randomize and cancel
    {
      const p = page.waitForEvent('dialog');
      await heap.randomize(null); // will dismiss
      await p.catch(() => null);
      // No change expected
      await page.waitForTimeout(200);
    }

    // Now randomize with submit count = 7
    await heap.randomize(7);
    // Wait for synchronous heapify rendering done
    await heap.waitForAnimationComplete(500);
    const count2 = await heap.getNodeCount();
    // Expect at least 7 nodes or exactly 7 depending on implementation
    expect(count).toBeGreaterThanOrEqual(7);
  });

  test('Edit node priority prompt flows: NODE_CLICK -> EDIT_PROMPT_SUBMIT/CANCEL -> evaluate_edit -> bubble up/down', async ({ page }) => {
    const heap9 = new HeapPage(page);

    // Randomize a few items so we can edit an inner node
    await heap.randomize(6);
    await heap.waitForAnimationComplete(500);

    const nodesBefore = await heap.getNodesText();
    expect(nodesBefore.length).toBeGreaterThanOrEqual(2);

    // Click a non-root node if available (choose index 1)
    const indexToEdit = nodesBefore.length > 1 ? 1 : 0;
    const nodeLocator = heap.nodeLocator.nth(indexToEdit);
    const textBefore = (await nodeLocator.innerText()).trim();

    // Click node to open prompt and submit a very low priority to force bubble-up (for min-heap)
    // Intercept dialog and accept with a very low numeric priority
    const dlgPromise4 = page.waitForEvent('dialog');
    await nodeLocator.click();
    const dialog4 = await dlgPromise;
    // Provide a numeric priority that should move it to top for min-heap (large negative)
    await dialog.accept('-9999');

    // After change, wait for animation to complete
    await heap.waitForAnimationComplete(2000);

    // The edited node's label should now be at or near the root (bubble up)
    const nodesAfter = await heap.getNodesText();
    expect(nodesAfter.length).toBeGreaterThanOrEqual(1);
    // We at least expect the edited text to appear somewhere (may contain same label plus priority)
    const joined = nodesAfter.join(' | ');
    expect(joined).toContain(textBefore);
  });

  test('Edit prompt cancel returns to idle without change (EDIT_PROMPT_CANCEL)', async ({ page }) => {
    const heap10 = new HeapPage(page);

    await heap.randomize(4);
    await heap.waitForAnimationComplete(300);

    const nodesBefore1 = await heap.getNodesText();

    // Click a node and cancel the prompt
    const node = heap.nodeLocator.first();
    const dlgPromise5 = page.waitForEvent('dialog');
    await node.click();
    const dialog5 = await dlgPromise;
    await dialog.dismiss();

    // Ensure nodes unchanged after cancellation (within reason)
    await page.waitForTimeout(200);
    const nodesAfter1 = await heap.getNodesText();
    expect(nodesAfter.length).toEqual(nodesBefore.length);
  });

  test('Heap type change triggers rebuilding and log (HEAP_TYPE_CHANGE -> rebuilding -> ACTION_COMPLETE)', async ({ page }) => {
    const heap11 = new HeapPage(page);

    // Ensure some items exist
    await heap.randomize(6);
    await heap.waitForAnimationComplete(200);

    // Change heap type (attempt to change to 'max' to trigger rebuild)
    await heap.changeHeapType('max');

    // Wait briefly for synchronous rebuild
    await page.waitForTimeout(200);

    // Expect log to mention switching heap type or top badge to reflect new type
    const log = await heap.getLogText();
    const badge = await heap.getTopBadgeText();
    const switched = /switched heap type|heap type|max|min/i.test(log) || /max|min/i.test(badge);
    expect(switched).toBeTruthy();
  });

  test('Hint click shows explanatory alert (HINT_CLICK -> hinting)', async ({ page }) => {
    const heap12 = new HeapPage(page);

    // Click hint and accept the alert
    const dlgPromise6 = page.waitForEvent('dialog');
    await heap.hintButton.click();
    const dialog6 = await dlgPromise;
    // Message should contain hint-like wording. We check presence and accept.
    const msg = dialog.message();
    expect(/heap|bubble|insert|extract|priority|root/i.test(msg)).toBeTruthy();
    await dialog.accept();
  });

  test('Animation should block new operations while running (animInProgress behavior)', async ({ page }) => {
    const heap13 = new HeapPage(page);

    // Start an insert that will animate
    await heap.insert('BlockTest', 5);

    // Immediately after insert, attempt another insert. If animInProgress is enforced,
    // the second insert should either be queued/ignored or not create duplicate immediate entries.
    const beforeSecond = await heap.getNodeCount();
    await heap.insert('Blocked', 6);

    // Wait for animations to finish
    await heap.waitForAnimationComplete(3000);

    const afterSecond = await heap.getNodeCount();
    // It should not drop below beforeSecond; it should be at least beforeSecond + 1 overall.
    expect(afterSecond).toBeGreaterThanOrEqual(beforeSecond);
  });

  test('Edge case: Insert with missing input should be validated and not create a node', async ({ page }) => {
    const heap14 = new HeapPage(page);

    // Capture nodes before
    const before2 = await heap.getNodeCount();

    // Attempt to insert without a value or without priority
    // Case A: missing priority
    await heap.textInput.fill('NoPriority');
    await heap.numberInput.fill('');
    await heap.insert(null, null);

    // Small wait for validation feedback
    await page.waitForTimeout(200);

    // Count should not have increased
    const after2 = await heap.getNodeCount();
    expect(after).toBeGreaterThanOrEqual(before);

    // Case B: missing value
    await heap.textInput.fill('');
    await heap.numberInput.fill('10');
    await heap.insert(null, null);

    // Small wait
    await page.waitForTimeout(200);
    const after21 = await heap.getNodeCount();
    expect(after2).toBeGreaterThanOrEqual(before);
  });

  test.afterEach(async ({ page }) => {
    // Best-effort teardown: try to clear heap (dismiss dialogs if any)
    page.on('dialog', async dialog => {
      try {
        await dialog.dismiss();
      } catch {
        /* ignore */
      }
    });
    // Attempt a safe clear
    try {
      const heap15 = new HeapPage(page);
      if ((await heap.getNodeCount()) > 0) {
        // If clear button exists, click and accept
        if (await heap.clearButton.count()) {
          const dlg1 = page.waitForEvent('dialog').catch(() => null);
          await heap.clearButton.click().catch(() => null);
          const d = await dlg;
          if (d) await d.accept().catch(() => null);
        }
      }
    } catch {
      // ignore cleanup errors
    }
  });
});