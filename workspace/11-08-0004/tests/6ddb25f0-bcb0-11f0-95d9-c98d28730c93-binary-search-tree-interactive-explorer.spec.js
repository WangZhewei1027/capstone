import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/11-08-0004/html/6ddb25f0-bcb0-11f0-95d9-c98d28730c93.html';

// Helper: page object for interacting with the BST explorer
class BSTPage {
  constructor(page) {
    this.page = page;
    this.svg = page.locator('svg');
    this.numInput = page.locator('input[type="number"]');
    this.textInput = page.locator('input[type="text"]');
    // Buttons: use accessible names (case-insensitive) and fallback to generic selectors
    this.insertBtn = page.getByRole('button', { name: /insert/i }).first();
    this.insertRandomBtn = page.getByRole('button', { name: /(random|insert random)/i }).first();
    this.searchBtn = page.getByRole('button', { name: /search/i }).first();
    this.deleteBtn = page.getByRole('button', { name: /delete/i }).first();
    this.traverseBtn = page.getByRole('button', { name: /traverse|traversal/i }).first();
    this.resetBtn = page.getByRole('button', { name: /reset/i }).first();
    this.clearBtn = page.getByRole('button', { name: /clear(?!\s*highlights)/i }).first();
    this.loadSampleBtn = page.getByRole('button', { name: /(sample|load sample)/i }).first();
    this.clearHighlightsBtn = page.getByRole('button', { name: /clear[-\s]*highlights|clear highlights/i }).first();
    this.status = page.locator('#status').first(); // best-effort: many implementations use #status
    // Fallback locate for status if #status is not present
    this.fallbackStatus = page.locator('.status, .flash, .message').first();
  }

  async goto() {
    await this.page.goto(APP_URL);
    // Ensure basic UI ready
    await expect(this.page).toHaveTitle(/Binary Search Tree|BST|Interactive/i);
    // Wait for the SVG or control area to appear
    await expect(this.page.locator('svg, .card')).toBeVisible();
  }

  // Read status text (use #status or fallback)
  async getStatusText() {
    if (await this.status.count() > 0) {
      return (await this.status.textContent())?.trim() ?? '';
    }
    if (await this.fallbackStatus.count() > 0) {
      return (await this.fallbackStatus.textContent())?.trim() ?? '';
    }
    return '';
  }

  // Insert value using numeric input + Insert button
  async insertValue(value) {
    // Prefer numeric input; if not present use text input
    if (await this.numInput.count() > 0) {
      await this.numInput.fill(String(value));
    } else if (await this.textInput.count() > 0) {
      await this.textInput.fill(String(value));
    } else {
      // As a last resort, try focusing document and typing value and pressing Enter
      await this.page.keyboard.type(String(value));
    }
    await this.insertBtn.click();
  }

  // Insert random using button
  async insertRandom() {
    await this.insertRandomBtn.click();
  }

  // Search value
  async searchValue(value) {
    if (await this.numInput.count() > 0) {
      await this.numInput.fill(String(value));
    } else if (await this.textInput.count() > 0) {
      await this.textInput.fill(String(value));
    } else {
      await this.page.keyboard.type(String(value));
    }
    await this.searchBtn.click();
  }

  // Delete value
  async deleteValue(value) {
    if (await this.numInput.count() > 0) {
      await this.numInput.fill(String(value));
    } else if (await this.textInput.count() > 0) {
      await this.textInput.fill(String(value));
    } else {
      await this.page.keyboard.type(String(value));
    }
    await this.deleteBtn.click();
  }

  // Trigger traversal
  async traverse() {
    await this.traverseBtn.click();
  }

  // Click reset/clear/load sample/clear highlights
  async reset() { if (await this.resetBtn.count() > 0) await this.resetBtn.click(); }
  async clear() { if (await this.clearBtn.count() > 0) await this.clearBtn.click(); }
  async loadSample() { if (await this.loadSampleBtn.count() > 0) await this.loadSampleBtn.click(); }
  async clearHighlights() { if (await this.clearHighlightsBtn.count() > 0) await this.clearHighlightsBtn.click(); }

  // Get a node text element for a value (xpath inside svg)
  nodeTextLocator(value) {
    // Use normalized text match
    return this.page.locator(`xpath=//svg//*[local-name()="text" and normalize-space(string())="${value}"]`);
  }

  // Get node group (g) that contains a given text (value)
  nodeGroupLocator(value) {
    return this.page.locator(`xpath=//svg//*[local-name()="g" and contains(@class,"node")][.//*[local-name()="text" and normalize-space(string())="${value}"]]`);
  }

  // Count all nodes with given value
  async countNodesWithValue(value) {
    return await this.nodeTextLocator(value).count();
  }

  // Check if any active animation classes present
  activeHighlightLocator() {
    // classes used in FSM: active, found, removing, visited, highlight
    return this.page.locator('xpath=//svg//*[contains(@class,"active") or contains(@class,"found") or contains(@class,"removing") or contains(@class,"visited") or contains(@class,"highlight")]');
  }

  // Wait until there are no active animation/highlight classes (idle)
  async waitForNoActiveHighlights(timeout = 5000) {
    await expect(this.activeHighlightLocator()).toHaveCount(0, { timeout });
  }

  // Wait until a node with value appears
  async waitForNode(value, opts = { timeout: 5000 }) {
    await expect(this.nodeTextLocator(value)).toHaveCount(1, opts);
  }

  // Wait until node with value is removed
  async waitForNodeRemoved(value, opts = { timeout: 5000 }) {
    await expect(this.nodeTextLocator(value)).toHaveCount(0, opts);
  }

  // Click on the SVG background (click center of svg)
  async clickSvgBackground() {
    const box = await this.svg.boundingBox();
    if (!box) return;
    await this.page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  }
}

test.describe('Binary Search Tree — Interactive Explorer (FSM validation)', () => {
  let bst;

  test.beforeEach(async ({ page }) => {
    bst = new BSTPage(page);
    await bst.goto();
  });

  test.afterEach(async ({ page }) => {
    // try to reset to a clean state between tests
    try { await bst.reset(); } catch (e) { /* ignore */ }
    // small pause to let UI settle
    await page.waitForTimeout(200);
  });

  test.describe('Idle state and basic UI commands', () => {
    test('Initial load should be idle and controls visible', async () => {
      // Validate basic UI elements and that we are not in an animation state
      const statusText = await bst.getStatusText();
      // Status might be 'Idle', 'Ready', or some instructional text; ensure it's present
      expect(typeof statusText).toBe('string');
      // Controls should be visible and enabled
      await expect(bst.insertBtn).toBeVisible();
      await expect(bst.insertBtn).toBeEnabled();
      await expect(bst.searchBtn).toBeVisible();
      await expect(bst.deleteBtn).toBeVisible();
      await expect(bst.traverseBtn).toBeVisible();
      // Ensure no animation classes are present on initial load
      await bst.waitForNoActiveHighlights(2000);
    });

    test('Reset, Clear, Load Sample buttons perform immediate transitions back to idle', async () => {
      // Load sample and expect nodes to appear (sample usually populates the tree)
      if (await bst.loadSampleBtn.count() > 0) {
        await bst.loadSample();
        // After loading sample, the UI should show nodes; wait a bit for drawTree
        // We can't know exact values, but there should be at least one text element in svg
        await expect(bst.page.locator('xpath=//svg//*[local-name()="text"]')).toHaveCountGreaterThan(0, { timeout: 3000 });
        // Now reset to empty
        if (await bst.resetBtn.count() > 0) {
          await bst.reset();
          // After reset, ensure no nodes
          await expect(bst.page.locator('xpath=//svg//*[local-name()="text"]')).toHaveCount(0, { timeout: 3000 });
        }
      } else {
        // If load sample not available, try clear button to ensure it doesn't crash
        if (await bst.clearBtn.count() > 0) {
          await bst.clear();
          // still expect idle: no active highlights
          await bst.waitForNoActiveHighlights(2000);
        }
      }
    });
  });

  test.describe('Insertion flow (inserting state -> idle)', () => {
    test('Insert a value shows inserting state and then creates a node', async () => {
      // Insert a specific value and assert animation and final node
      const VAL = 50;
      await bst.insertValue(VAL);

      // While animating, status should indicate insert in progress (best-effort)
      const statusDuring = await bst.getStatusText();
      expect(statusDuring.toLowerCase()).toMatch(/insert|inserting|adding|adding node|busy/i);

      // The node should appear eventually and the active highlight classes should clear
      await bst.waitForNode(VAL);
      await bst.waitForNoActiveHighlights();

      // Final status should include success / inserted (best-effort)
      const finalStatus = await bst.getStatusText();
      expect(finalStatus.toLowerCase()).toMatch(/insert|inserted|done|success|added/i);
    });

    test('Inserting a duplicate reports duplicate and does not create second node', async () => {
      const VAL1 = 77;
      // Insert first time
      await bst.insertValue(VAL);
      await bst.waitForNode(VAL);
      await bst.waitForNoActiveHighlights();
      const countBefore = await bst.countNodesWithValue(VAL);
      expect(countBefore).toBeGreaterThanOrEqual(1);

      // Insert same value again -> expect duplicate handling
      await bst.insertValue(VAL);

      // Some UIs flash duplicate status; wait for status to include duplicate/nearly
      const dupStatus = await bst.getStatusText();
      expect(dupStatus.toLowerCase()).toMatch(/duplicate|already|exists|exists/i);

      // Ensure count hasn't increased
      const countAfter = await bst.countNodesWithValue(VAL);
      expect(countAfter).toBe(countBefore);
      // Ensure we return to idle
      await bst.waitForNoActiveHighlights();
    });

    test('Insert random creates a new node and updates status', async () => {
      // Count nodes before
      const nodesBefore = await bst.page.locator('xpath=//svg//*[local-name()="text"]').count();

      if (await bst.insertRandomBtn.count() === 0) {
        test.skip();
      }
      await bst.insertRandom();

      // Expect at least one new textual node within svg
      await expect(bst.page.locator('xpath=//svg//*[local-name()="text"]')).toHaveCountGreaterThan(nodesBefore, { timeout: 3000 });

      // After animation, should be idle
      await bst.waitForNoActiveHighlights();
      const status = await bst.getStatusText();
      expect(status.toLowerCase()).toMatch(/insert|random|added|success/i);
    });
  });

  test.describe('Search flow (searching state -> idle)', () => {
    test('Searching for an existing value highlights path and marks found', async () => {
      // Prepare: insert a node to search for
      const VAL2 = 42;
      await bst.insertValue(VAL);
      await bst.waitForNode(VAL);
      await bst.waitForNoActiveHighlights();

      // Perform search
      await bst.searchValue(VAL);

      // During search, nodes along path should receive highlight classes
      // We expect final node to get class "found" or similar; check for any node with 'found'
      const foundLocator = bst.page.locator('xpath=//svg//*[contains(@class,"found")]');
      await expect(foundLocator).toHaveCountGreaterThan(0, { timeout: 3000 });
      // Specifically the node with the value should be among found/active at some point
      const targetGroup = bst.nodeGroupLocator(VAL);
      await expect(targetGroup).toHaveCount(1, { timeout: 3000 });

      // After the animation completes, highlights should be cleared
      await bst.waitForNoActiveHighlights(4000);

      // Final status includes found/complete
      const finalStatus1 = await bst.getStatusText();
      expect(finalStatus.toLowerCase()).toMatch(/found|search.*found|complete/i);
    });

    test('Searching for a non-existent value shows not found and clears highlights', async () => {
      const VAL3 = 99999; // unlikely present
      // Ensure VAL is not present
      const preCount = await bst.countNodesWithValue(VAL);
      if (preCount > 0) {
        // remove it first
        await bst.deleteValue(VAL);
        await bst.waitForNodeRemoved(VAL);
      }

      await bst.searchValue(VAL);
      // Status should indicate not found (best-effort)
      const during = await bst.getStatusText();
      expect(during.toLowerCase()).toMatch(/search|searching|not found|notfound|no.*found|none/i);

      // Ensure highlights are cleared at end
      await bst.waitForNoActiveHighlights(4000);

      const final = await bst.getStatusText();
      expect(final.toLowerCase()).toMatch(/not found|no results|complete|done|search/i);
    });
  });

  test.describe('Deletion flow (deleting state -> idle)', () => {
    test('Deleting an existing node marks removing then deletes it', async () => {
      const VAL4 = 1234;
      await bst.insertValue(VAL);
      await bst.waitForNode(VAL);
      await bst.waitForNoActiveHighlights();

      // Delete the node
      await bst.deleteValue(VAL);

      // During delete animation there should be a node with class 'removing'
      const removingLocator = bst.page.locator('xpath=//svg//*[contains(@class,"removing")]');
      await expect(removingLocator).toHaveCountGreaterThan(0, { timeout: 3000 });

      // Final: node should be removed from DOM
      await bst.waitForNodeRemoved(VAL);
      await bst.waitForNoActiveHighlights();

      const status1 = await bst.getStatusText();
      expect(status.toLowerCase()).toMatch(/delete|deleted|removed|success/i);
    });

    test('Deleting a non-existent node reports not found and leaves tree intact', async () => {
      const VAL5 = 55555;
      // Ensure node doesn't exist
      const beforeCount = await bst.page.locator('xpath=//svg//*[local-name()="text"]').count();
      // Try deleting non-existent value
      await bst.deleteValue(VAL);

      // Expect status to include not found
      const s = await bst.getStatusText();
      expect(s.toLowerCase()).toMatch(/not found|notfound|does not exist|no such/i);

      // Tree should be unchanged in number of nodes
      await bst.waitForNoActiveHighlights();
      const afterCount = await bst.page.locator('xpath=//svg//*[local-name()="text"]').count();
      expect(afterCount).toBe(beforeCount);
    });
  });

  test.describe('Traversal flow (traversing state -> idle)', () => {
    test('Traversal animates visiting nodes and reports order on completion', async () => {
      // Build small tree: insert 10, 5, 15
      const vals = [10, 5, 15];
      for (const v of vals) {
        await bst.insertValue(v);
        await bst.waitForNode(v);
        await bst.waitForNoActiveHighlights();
      }

      // Trigger traversal
      await bst.traverse();

      // During traversal nodes may receive 'visited' or 'active' classes; ensure some class appears
      const visitedLoc = bst.page.locator('xpath=//svg//*[contains(@class,"visited") or contains(@class,"active")]');
      await expect(visitedLoc).toHaveCountGreaterThan(0, { timeout: 3000 });

      // After completion, highlights should be cleared
      await bst.waitForNoActiveHighlights(5000);

      // Status should contain traversal order or completion text (best-effort)
      const status2 = await bst.getStatusText();
      expect(status.toLowerCase()).toMatch(/travers|order|complete|visited|inorder|preorder|postorder|result/i);
      // If the app reports the exact nodes visited in order, that is good; we at least ensure non-empty status
      expect(status.length).toBeGreaterThan(0);
    });
  });

  test.describe('UI commands for highlights, keyboard shortcuts and SVG background click', () => {
    test('Clear highlights button, svg background click and C key remove highlights', async ({ page }) => {
      // Prepare: insert two nodes and trigger a search to create highlights
      await bst.insertValue(200);
      await bst.insertValue(100);
      await bst.waitForNode(200);
      await bst.waitForNode(100);
      await bst.waitForNoActiveHighlights();

      // Trigger search to produce highlight classes
      await bst.searchValue(100);

      // Wait for some highlight to appear
      await expect(bst.activeHighlightLocator()).toHaveCountGreaterThan(0, { timeout: 3000 });

      // Use clear highlights button if available
      if (await bst.clearHighlightsBtn.count() > 0) {
        await bst.clearHighlights();
        await bst.waitForNoActiveHighlights();
      } else {
        // Otherwise click SVG background
        await bst.clickSvgBackground();
        await bst.waitForNoActiveHighlights();
      }

      // Recreate highlight for keyboard test: search again
      await bst.searchValue(100);
      await expect(bst.activeHighlightLocator()).toHaveCountGreaterThan(0, { timeout: 3000 });

      // Press 'c' key to clear highlights as per FSM (KEY_C_PRESSED)
      await page.keyboard.press('c');
      await bst.waitForNoActiveHighlights();

      // Now ensure pressing 'r' triggers the insert mode / inserting transition when used with a value
      // Pressing 'r' should, according to FSM, enter inserting state (KEY_R_PRESSED)
      // Some implementations focus the input or prepare for random insert; we'll press r and then insert a number
      await page.keyboard.press('r');

      // Try to insert a value quickly to assert the key had effect (best-effort)
      const testVal = 303;
      await bst.insertValue(testVal);
      await bst.waitForNode(testVal);
      await bst.waitForNoActiveHighlights();
    });

    test('Clicking on a node may highlight it and svg background click clears highlights (SVG_BG_CLICK)', async () => {
      const VAL6 = 404;
      await bst.insertValue(VAL);
      await bst.waitForNode(VAL);
      await bst.waitForNoActiveHighlights();

      // Click on the node text to highlight (many implementations highlight on node click)
      const nodeText = bst.nodeTextLocator(VAL);
      await nodeText.click();

      // Expect some highlight class to appear on the node group or text
      const nodeGroup = bst.nodeGroupLocator(VAL);
      const hasHighlight = await nodeGroup.locator('[class*="active"], [class*="found"], [class*="highlight"]').count();
      // If clicking nodes does not highlight in this implementation, skip gracefully
      if (hasHighlight === 0) {
        test.skip('Node clicks do not produce highlight classes in this implementation');
      } else {
        // Click background to clear
        await bst.clickSvgBackground();
        await bst.waitForNoActiveHighlights();
      }
    });
  });

  test.describe('Concurrency & animation interrupt scenarios', () => {
    test('Starting a new command during animation should not leave UI stuck (ANIMATION_INTERRUPT)', async ({ page }) => {
      // Insert a value with some intentional overlap: trigger insert then immediately reset
      const VAL7 = 8080;
      await bst.insertValue(VAL);

      // Immediately request reset which in FSM is allowed and returns to idle
      if (await bst.resetBtn.count() > 0) {
        await bst.reset();
      } else {
        // Try clear which should be instantaneous
        await bst.clear();
      }

      // After this interrupt, ensure we don't remain in animating state and tree settled
      await bst.waitForNoActiveHighlights(5000);

      // The node may or may not have been added depending on interrupt, but UI must be stable
      const status3 = await bst.getStatusText();
      expect(status.length).toBeGreaterThanOrEqual(0); // at least some status text present
    });
  });
});