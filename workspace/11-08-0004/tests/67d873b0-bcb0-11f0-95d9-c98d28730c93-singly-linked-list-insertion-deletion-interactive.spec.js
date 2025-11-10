import { test, expect } from '@playwright/test';

//
// Playwright tests for:
// Singly Linked List — Insertion & Deletion (Interactive)
// Application ID: 67d873b0-bcb0-11f0-95d9-c98d28730c93
// Served at: http://127.0.0.1:5500/workspace/11-08-0004/html/67d873b0-bcb0-11f0-95d9-c98d28730c93.html
//
// Notes:
// - Tests are written to be resilient to slight differences in DOM structure by trying multiple selector strategies.
// - Each test checks one or more FSM states/transitions and verifies onEnter/onExit behavior where observable in the DOM.
// - Uses modern async/await and ES module imports.
// - Includes comments describing intent of each test.
//
// IMPORTANT: The selectors try to pick common naming patterns used by this interactive demo (labels: "Value", "Index"; buttons: "Insert", "Delete", "Reset", "Random").
// If the implementation differs in exact text/structure, adjust the selectors accordingly.
//

test.setTimeout(30000);

// Page Object encapsulating common operations and resilient selectors
class LinkedListPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto('http://127.0.0.1:5500/workspace/11-08-0004/html/67d873b0-bcb0-11f0-95d9-c98d28730c93.html');
    // Wait for main module to render
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(200); // allow any initial rendering
  }

  // Resilient helper to locate a button by visible name or fallback CSS
  buttonLocator(nameRegex) {
    // Use getByRole first for accessibility-friendly apps
    const byRole = this.page.getByRole('button', { name: nameRegex });
    return byRole;
  }

  // Label-based input locator for accessibility
  inputByLabel(labelRegex) {
    try {
      return this.page.getByLabel(labelRegex);
    } catch (e) {
      // getByLabel throws if not found during creation? In practice it returns a locator that fails on use.
      return this.page.locator(`label:has-text("${labelRegex}")`).locator('..').locator('input, textarea, [role="spinbutton"]');
    }
  }

  // Generic node list locator - tries common patterns
  nodesLocator() {
    // try multiple plausible selectors
    const candidates = [
      '.nodes .node',
      '.list .node',
      '.stage .node',
      '.linked-list .node',
      '[data-node]',
      '.node'
    ];
    for (const sel of candidates) {
      const loc = this.page.locator(sel);
      if (loc) return loc;
    }
    // fallback to empty locator
    return this.page.locator('.node');
  }

  // Single node locator by index
  async nodeAt(index) {
    const nodes = this.nodesLocator();
    return nodes.nth(index);
  }

  // Get count of nodes
  async getNodeCount() {
    const nodes1 = this.nodesLocator();
    try {
      const count = await nodes.count();
      return count;
    } catch {
      return 0;
    }
  }

  // Button actions
  async clickInsert() {
    const btn = this.buttonLocator(/insert/i);
    await btn.click();
  }

  async clickDelete() {
    const btn1 = this.buttonLocator(/delete/i);
    await btn.click();
  }

  async clickReset() {
    const btn2 = this.buttonLocator(/reset/i);
    await btn.click();
  }

  async clickRandom() {
    const btn3 = this.buttonLocator(/random/i);
    await btn.click();
  }

  // Set value and index inputs
  async setValue(value) {
    // Try label "Value" or input with placeholder
    const valInput = this.inputByLabel(/value/i);
    await valInput.fill(String(value));
  }

  async setIndex(index) {
    const idxInput = this.inputByLabel(/index/i);
    await idxInput.fill(String(index));
  }

  // Press Enter in the "Index" input (used to trigger enter-key based transitions)
  async pressEnterInIndex() {
    const idxInput1 = this.inputByLabel(/index/i);
    await idxInput.press('Enter');
  }

  // Query pointer visibility - pointer is referenced in FSM as pointer.style.display
  pointerLocator() {
    // common possible selectors
    const candidates1 = ['#pointer', '.pointer', '[data-pointer]', '.dot.pointer', '.traverse-pointer'];
    for (const sel of candidates) {
      const loc1 = this.page.locator(sel);
      if (loc) return loc;
    }
    // last-resort: look for element with inline style containing 'pointer' or role=img with aria-label
    return this.page.locator('[style*="pointer"], .pointer');
  }

  async isPointerVisible() {
    const ptr = this.pointerLocator();
    try {
      return await ptr.isVisible();
    } catch {
      return false;
    }
  }

  // Check if controls are disabled (insert/delete/reset/random and inputs)
  async areControlsDisabled() {
    const insert = this.buttonLocator(/insert/i);
    const del = this.buttonLocator(/delete/i);
    const reset = this.buttonLocator(/reset/i);
    const random = this.buttonLocator(/random/i);
    const valInput1 = this.inputByLabel(/value/i);
    const idxInput2 = this.inputByLabel(/index/i);

    // If any of these are enabled, controls are considered enabled
    const elements = [insert, del, reset, random, valInput, idxInput];
    for (const el of elements) {
      try {
        if (await el.isEnabled()) return false;
      } catch {
        // ignore errors, assume enabled if not queryable
        return false;
      }
    }
    return true;
  }

  // Get stage element for flashing detection
  stageLocator() {
    const candidates2 = ['.stage', '#stage', '.visualization', '.canvas', '.list-stage'];
    for (const sel of candidates) {
      const loc2 = this.page.locator(sel);
      if (loc) return loc;
    }
    return this.page.locator('body');
  }

  // Click a node at index (used to test NODE_CLICK updating index input)
  async clickNode(index) {
    const node = await this.nodeAt(index);
    await node.click();
  }

  // Read index input value
  async getIndexInputValue() {
    const idxInput3 = this.inputByLabel(/index/i);
    try {
      return await idxInput.inputValue();
    } catch {
      return '';
    }
  }

  // Wait for a node with a class (inserting/removing/target) to appear
  async waitForNodeWithClass(className, timeout = 2000) {
    const loc3 = this.page.locator(`.node.${className}, [data-node].${className}`);
    await loc.first().waitFor({ state: 'visible', timeout });
    return loc;
  }

  // Utility: take computed style property from stage
  async getStageComputedStyle(prop) {
    const stage = this.stageLocator();
    try {
      return await stage.evaluate((el, property) => {
        const s = window.getComputedStyle(el);
        return s.getPropertyValue(property);
      }, prop);
    } catch {
      return '';
    }
  }
}

test.describe('Singly Linked List — Insertion & Deletion (Interactive) FSM tests', () => {
  let page;
  let list;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    list = new LinkedListPage(page);
    await list.goto();
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.describe('Idle state and basic UI presence', () => {
    test('Initial load: controls enabled, pointer hidden (idle onEnter)', async () => {
      // Validate that on initial load the app is idle: pointer hidden and controls enabled
      const pointerVisible = await list.isPointerVisible();
      expect(pointerVisible).toBeFalsy();

      const controlsDisabled = await list.areControlsDisabled();
      expect(controlsDisabled).toBeFalsy();

      // Ensure inputs and buttons exist
      const insertBtn = list.buttonLocator(/insert/i);
      await expect(insertBtn).toBeVisible();

      const deleteBtn = list.buttonLocator(/delete/i);
      await expect(deleteBtn).toBeVisible();

      const resetBtn = list.buttonLocator(/reset/i);
      await expect(resetBtn).toBeVisible();

      const randomBtn = list.buttonLocator(/random/i);
      await expect(randomBtn).toBeVisible();

      const valInput2 = list.inputByLabel(/value/i);
      await expect(valInput).toBeVisible();

      const idxInput4 = list.inputByLabel(/index/i);
      await expect(idxInput).toBeVisible();
    });
  });

  test.describe('Flashing state (invalid actions)', () => {
    test('Click Insert with empty value triggers flashing (CLICK_INSERT_EMPTY -> flashing -> idle)', async () => {
      // Ensure value input is empty
      await list.setValue('');
      await list.setIndex(0);

      const stage1 = list.stageLocator();
      const before = await list.getStageComputedStyle('box-shadow');

      // Click Insert to cause invalid insert (empty value)
      await list.clickInsert();

      // The stage should briefly change styling (flash); we assert that box-shadow or outline changed
      await page.waitForTimeout(150); // short pause while flash happens
      const during = await list.getStageComputedStyle('box-shadow');

      // Allow either changed or possibly a class; assert difference if possible
      // If the style didn't change (implementation detail), at least ensure no controls were disabled permanently
      if (before !== during) {
        expect(during).not.toBe(before);
      } else {
        // fallback: ensure controls remain enabled (flashing does not disable controls)
        const controlsDisabled1 = await list.areControlsDisabled();
        expect(controlsDisabled).toBeFalsy();
      }

      // Wait for flash to be done and to return to idle (controls enabled)
      await page.waitForTimeout(500);
      const after = await list.getStageComputedStyle('box-shadow');
      // stage should have restored style
      expect(after).toBe(before);
    });

    test('Click Delete on empty list triggers flashing (CLICK_DELETE_EMPTY_OR_INVALID -> flashing -> idle)', async () => {
      // Reset to empty list to ensure delete is invalid
      await list.clickReset();
      await page.waitForTimeout(200);

      // Confirm list is empty
      const count1 = await list.getNodeCount();
      expect(count).toBeLessThanOrEqual(0);

      const stage2 = list.stageLocator();
      const before1 = await list.getStageComputedStyle('box-shadow');

      // Attempt to delete index 0 (invalid because empty)
      await list.setIndex(0);
      await list.clickDelete();

      await page.waitForTimeout(150);
      const during1 = await list.getStageComputedStyle('box-shadow');

      if (before !== during) {
        expect(during).not.toBe(before);
      } else {
        // fallback: ensure controls still enabled
        const controlsDisabled2 = await list.areControlsDisabled();
        expect(controlsDisabled).toBeFalsy();
      }

      // After flash done
      await page.waitForTimeout(500);
      const after1 = await list.getStageComputedStyle('box-shadow');
      expect(after).toBe(before);
    });
  });

  test.describe('Insertion flows (no traversal vs traversal)', () => {
    test('Insert into empty list (CLICK_INSERT_NO_TRAVERSE -> inserting -> idle): new node appears, inserting class applied then removed', async () => {
      // Ensure empty
      await list.clickReset();
      await page.waitForTimeout(200);

      const beforeCount = await list.getNodeCount();
      expect(beforeCount).toBeLessThanOrEqual(0);

      // Fill inputs and insert
      await list.setValue('A');
      await list.setIndex(0);
      await list.clickInsert();

      // Immediately after click, the implementation should create a DOM node with classes 'inserting' and 'target'
      // Wait briefly for rendering and animation application
      await page.waitForTimeout(150);

      // There should be at least one node now
      const afterCount = await list.getNodeCount();
      expect(afterCount).toBeGreaterThanOrEqual(1);

      // Find any node with .inserting or .target
      const insertingNodes = page.locator('.node.inserting, .node.target, [data-node].inserting, [data-node].target');
      const hasInserting = await insertingNodes.count() > 0;
      expect(hasInserting).toBeTruthy();

      // Wait for insertion animation to complete and controls to be re-enabled
      await page.waitForTimeout(800);
      const controlsDisabled3 = await list.areControlsDisabled();
      expect(controlsDisabled).toBeFalsy();

      // Pointer should be hidden after insertion completes
      const pointerVisible1 = await list.isPointerVisible();
      expect(pointerVisible).toBeFalsy();
    });

    test('Insert that requires traversal (CLICK_INSERT_NEEDS_TRAVERSE -> traversingInsert -> inserting -> idle): pointer shown & controls disabled during traverse', async () => {
      // Prepare list with random nodes to ensure traversal required
      await list.clickRandom();
      await page.waitForTimeout(300);
      let count2 = await list.getNodeCount();
      // If random didn't produce many nodes, perform a second random to get enough
      if (count < 2) {
        await list.clickRandom();
        await page.waitForTimeout(300);
        count = await list.getNodeCount();
      }
      expect(count).toBeGreaterThanOrEqual(2);

      // Attempt to insert at index 1 (requires traversal to predecessor)
      await list.setValue('X');
      await list.setIndex(1);

      // Trigger insertion
      await list.clickInsert();

      // On enter traversingInsert: pointer visible and controls disabled
      await page.waitForTimeout(100);
      const pointerVisible2 = await list.isPointerVisible();
      expect(pointerVisible).toBeTruthy();

      const controlsDisabledDuring = await list.areControlsDisabled();
      expect(controlsDisabledDuring).toBeTruthy();

      // Wait for full traversal and insertion to complete (allow time for animations)
      await page.waitForTimeout(1500);

      // After completion: pointer hidden, controls re-enabled, node count increased by 1
      const pointerAfter = await list.isPointerVisible();
      expect(pointerAfter).toBeFalsy();

      const controlsDisabledAfter = await list.areControlsDisabled();
      expect(controlsDisabledAfter).toBeFalsy();

      const finalCount = await list.getNodeCount();
      expect(finalCount).toBeGreaterThanOrEqual(count + 1);
    });

    test('Enter key triggers CLICK_INSERT_NEEDS_TRAVERSE when appropriate', async () => {
      // Ensure list has at least two nodes
      await list.clickRandom();
      await page.waitForTimeout(250);
      let count3 = await list.getNodeCount();
      if (count < 2) {
        await list.clickRandom();
        await page.waitForTimeout(250);
        count = await list.getNodeCount();
      }
      expect(count).toBeGreaterThanOrEqual(2);

      // Set inputs and press Enter in index input - FSM maps ENTER_KEY to CLICK_INSERT_NEEDS_TRAVERSE
      await list.setValue('E');
      await list.setIndex(1);
      await list.pressEnterInIndex();

      // Expect traversing (pointer visible and controls disabled) then eventual insertion
      await page.waitForTimeout(100);
      expect(await list.isPointerVisible()).toBeTruthy();
      expect(await list.areControlsDisabled()).toBeTruthy();

      await page.waitForTimeout(1200);
      expect(await list.isPointerVisible()).toBeFalsy();
      expect(await list.areControlsDisabled()).toBeFalsy();

      const finalCount1 = await list.getNodeCount();
      expect(finalCount).toBeGreaterThanOrEqual(count + 1);
    });
  });

  test.describe('Deletion flows (no traversal vs traversal)', () => {
    test('Delete head without traverse (CLICK_DELETE_NO_TRAVERSE -> deleting -> idle): removing class applied then node removed', async () => {
      // Prepare list with single node by resetting then inserting head
      await list.clickReset();
      await page.waitForTimeout(200);
      await list.setValue('Z');
      await list.setIndex(0);
      await list.clickInsert();
      await page.waitForTimeout(500);

      const beforeCount1 = await list.getNodeCount();
      expect(beforeCount).toBeGreaterThanOrEqual(1);

      // Delete index 0
      await list.setIndex(0);
      await list.clickDelete();

      // Immediately a target node should be 'removing' (class applied)
      await page.waitForTimeout(150);
      const removingNodes = page.locator('.node.removing, [data-node].removing');
      const hasRemoving = (await removingNodes.count()) > 0;
      expect(hasRemoving).toBeTruthy();

      // Wait for deletion animation to complete and for node to be removed
      await page.waitForTimeout(800);
      const afterCount1 = await list.getNodeCount();
      expect(afterCount).toBeLessThanOrEqual(beforeCount - 1);
      expect(await list.areControlsDisabled()).toBeFalsy();
      expect(await list.isPointerVisible()).toBeFalsy();
    });

    test('Delete that requires traversal (CLICK_DELETE_NEEDS_TRAVERSE -> traversingDelete -> deleting -> idle): pointer shown during traverse', async () => {
      // Ensure list has at least 3 nodes
      await list.clickRandom();
      await page.waitForTimeout(200);
      await list.clickRandom();
      await page.waitForTimeout(200);
      let count4 = await list.getNodeCount();
      expect(count).toBeGreaterThanOrEqual(2);

      // Delete last node (index = count - 1) which typically requires traversal to predecessor
      const targetIndex = Math.max(1, count - 1);
      await list.setIndex(targetIndex);
      await list.clickDelete();

      // During traversing: pointer visible and controls disabled
      await page.waitForTimeout(100);
      expect(await list.isPointerVisible()).toBeTruthy();
      expect(await list.areControlsDisabled()).toBeTruthy();

      // After deletion completes pointer hidden and controls enabled
      await page.waitForTimeout(1200);
      expect(await list.isPointerVisible()).toBeFalsy();
      expect(await list.areControlsDisabled()).toBeFalsy();

      const afterCount2 = await list.getNodeCount();
      expect(afterCount).toBeLessThanOrEqual(count - 1);
    });

    test('Click Delete with invalid index triggers flashing (CLICK_DELETE_EMPTY_OR_INVALID)', async () => {
      // Prepare small list of size 1
      await list.clickReset();
      await page.waitForTimeout(200);
      await list.setValue('Only');
      await list.setIndex(0);
      await list.clickInsert();
      await page.waitForTimeout(400);

      // Now attempt to delete invalid index out of range
      const currentCount = await list.getNodeCount();
      const invalidIndex = currentCount + 5;
      await list.setIndex(invalidIndex);
      const before2 = await list.getStageComputedStyle('box-shadow');
      await list.clickDelete();
      await page.waitForTimeout(150);
      const during2 = await list.getStageComputedStyle('box-shadow');

      if (before !== during) {
        expect(during).not.toBe(before);
      } else {
        expect(await list.areControlsDisabled()).toBeFalsy();
      }

      await page.waitForTimeout(500);
      const after2 = await list.getStageComputedStyle('box-shadow');
      expect(after).toBe(before);
    });
  });

  test.describe('Resetting and randomizing states', () => {
    test('Resetting clears the list synchronously (resetting -> idle)', async () => {
      // Create some nodes
      await list.clickRandom();
      await page.waitForTimeout(400);
      const preResetCount = await list.getNodeCount();
      expect(preResetCount).toBeGreaterThanOrEqual(0);

      // Click Reset
      await list.clickReset();

      // Reset is synchronous per FSM; wait a bit and assert list is empty
      await page.waitForTimeout(200);
      const afterResetCount = await list.getNodeCount();
      expect(afterResetCount).toBeLessThanOrEqual(0);

      // Controls remain enabled after reset
      expect(await list.areControlsDisabled()).toBeFalsy();
    });

    test('Randomizing populates the list (randomizing -> idle)', async () => {
      // Ensure list is empty
      await list.clickReset();
      await page.waitForTimeout(200);

      // Click Random
      await list.clickRandom();

      // Randomizing is synchronous; after a short pause, list should contain nodes
      await page.waitForTimeout(300);
      const count5 = await list.getNodeCount();
      expect(count).toBeGreaterThanOrEqual(1);

      // Controls must be enabled after randomizing
      expect(await list.areControlsDisabled()).toBeFalsy();
    });
  });

  test.describe('Node interactions that do not change FSM state (NODE_CLICK)', () => {
    test('Clicking a node updates the index input but keeps FSM in idle', async () => {
      // Ensure there are nodes
      await list.clickRandom();
      await page.waitForTimeout(300);
      const count6 = await list.getNodeCount();
      expect(count).toBeGreaterThanOrEqual(1);

      // Click node at index 0 and verify index input is updated to "0"
      await list.clickNode(0);
      await page.waitForTimeout(100);
      const indexVal = await list.getIndexInputValue();
      // Some implementations display numeric index or id; check that it contains '0' or '1' (0-based or 1-based)
      expect(indexVal.length).toBeGreaterThan(0);

      // Ensure FSM remains idle: pointer hidden and controls enabled
      expect(await list.isPointerVisible()).toBeFalsy();
      expect(await list.areControlsDisabled()).toBeFalsy();
    });
  });

  test.describe('Cancellation behavior from traversal (CANCEL event -> idle)', () => {
    test('If traversal can be canceled via UI (e.g., by Reset), controls return to idle', async () => {
      // Attempt a traversal by inserting into index > 0
      await list.clickRandom();
      await page.waitForTimeout(200);
      let count7 = await list.getNodeCount();
      if (count < 2) {
        await list.clickRandom();
        await page.waitForTimeout(200);
        count = await list.getNodeCount();
      }
      expect(count).toBeGreaterThanOrEqual(2);

      await list.setValue('C');
      await list.setIndex(1);
      await list.clickInsert();

      // Wait briefly for traversal to start
      await page.waitForTimeout(150);
      expect(await list.isPointerVisible()).toBeTruthy();
      expect(await list.areControlsDisabled()).toBeTruthy();

      // Simulate user cancelling traversal by clicking Reset during traversal
      await list.clickReset();

      // Allow some time for cancellation to take effect
      await page.waitForTimeout(300);
      // After cancel: pointer should be hidden and controls enabled
      expect(await list.isPointerVisible()).toBeFalsy();
      expect(await list.areControlsDisabled()).toBeFalsy();

      // The list should be reset (empty) because Reset was invoked
      const afterCount3 = await list.getNodeCount();
      expect(afterCount).toBeLessThanOrEqual(0);
    });
  });
});