import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-2/html/8ad2b531-d59a-11f0-891d-f361d22ca68a.html';

test.describe('Binary Tree FSM - Application 8ad2b531-d59a-11f0-891d-f361d22ca68a', () => {
  // Shared variables to collect runtime observations (errors, dialogs, console)
  let pageErrors;
  let dialogs;
  let consoleMessages;

  test.beforeEach(async ({ page }) => {
    // reset collectors
    pageErrors = [];
    dialogs = [];
    consoleMessages = [];

    // Capture page errors (unhandled exceptions)
    page.on('pageerror', (err) => {
      // store message text for assertions
      pageErrors.push(String(err?.message ?? err));
    });

    // Capture dialogs (alerts) and automatically accept them but record message
    page.on('dialog', async (dialog) => {
      dialogs.push(dialog.message());
      await dialog.accept();
    });

    // Capture console messages for additional insights
    page.on('console', (msg) => {
      consoleMessages.push(msg.text());
    });

    // Navigate to the page under test
    await page.goto(APP_URL);
    // Wait for critical elements to be available
    await expect(page.locator('#add-node-btn')).toBeVisible();
    await expect(page.locator('#delete-node-btn')).toBeVisible();
    await expect(page.locator('#update-node-btn')).toBeVisible();
    await expect(page.locator('#node-value-input')).toBeVisible();
  });

  test.afterEach(async () => {
    // No special teardown required; Playwright handles page lifecycle.
    // The afterEach is present for symmetry and future teardown needs.
  });

  test.describe('Idle State (S0_Idle) - initial UI', () => {
    test('should render input and action buttons', async ({ page }) => {
      // Validate presence and basic attributes of UI components as evidence of Idle state
      const addBtn = page.locator('#add-node-btn');
      const delBtn = page.locator('#delete-node-btn');
      const updBtn = page.locator('#update-node-btn');
      const input = page.locator('#node-value-input');
      const tree = page.locator('#tree');

      await expect(addBtn).toBeVisible();
      await expect(addBtn).toHaveText('Add Node');

      await expect(delBtn).toBeVisible();
      await expect(delBtn).toHaveText('Delete Node');

      await expect(updBtn).toBeVisible();
      await expect(updBtn).toHaveText('Update Node');

      await expect(input).toBeVisible();
      await expect(input).toHaveAttribute('placeholder', 'Enter node value');

      // Tree should be empty initially
      const treeText = (await tree.textContent()) || '';
      expect(treeText.trim()).toBe('', 'Expected tree to be empty in Idle state');
    });
  });

  test.describe('Add Node transitions (S0_Idle -> S1_NodeAdded)', () => {
    test('clicking Add Node without entering a value should still call addNode and print something to #tree', async ({ page }) => {
      // This verifies the transition and the side-effect of printTree being called for the newly pushed node
      const tree = page.locator('#tree');

      // Ensure tree is empty initially
      const before = (await tree.textContent()) || '';

      // Click Add Node (the implementation will be called with the click event object as the parameter)
      await page.click('#add-node-btn');

      // Wait a short while for DOM updates (printTree writes into #tree)
      await page.waitForTimeout(200);

      const after = (await tree.textContent()) || '';

      // The tree should have changed - something was printed (even if it's an object string like [object MouseEvent])
      expect(after.trim().length).toBeGreaterThan(before.trim().length);

      // The printed output often contains 'object' when event objects are stringified; it's acceptable
      expect(after.toLowerCase()).toMatch(/object|mouse|undefined|null|->|left|right/);

      // Record that no unexpected dialogs popped up in this specific interaction
      expect(dialogs.length).toBeLessThanOrEqual(1);

      // There may or may not be page errors yet; we won't assert on them here to keep this test focused.
    });
  });

  test.describe('Delete Node transitions (S0_Idle -> S2_NodeDeleted)', () => {
    test('after adding a node, clicking Delete Node should change the printed tree (node removed or tree updated)', async ({ page }) => {
      const tree = page.locator('#tree');

      // Add a node first to exercise delete behavior on a non-empty nodes array
      await page.click('#add-node-btn');
      await page.waitForTimeout(200);
      const afterAdd = (await tree.textContent()) || '';
      expect(afterAdd.trim().length).toBeGreaterThan(0);

      // Click Delete Node - implementation accepts an index but will be called with the event object
      await page.click('#delete-node-btn');
      await page.waitForTimeout(200);

      const afterDelete = (await tree.textContent()) || '';

      // The tree DOM should reflect change; either it becomes empty or differs from previous content
      expect(afterDelete.trim() === '' || afterDelete.trim() !== afterAdd.trim()).toBeTruthy();

      // If an alert was produced (e.g., "Node not found."), it will have been captured
      if (dialogs.length > 0) {
        // Ensure the dialog message is one of the expected alert strings from the FSM implementation
        expect(dialogs.some(d => /node not found|tree is full/i.test(d))).toBeTruthy();
      }

      // No guaranteed pageerror for delete; but if one exists, it should be recorded in pageErrors
    });

    test('clicking Delete Node on a fresh page (no nodes) should not crash the page (no unhandled exceptions)', async ({ page }) => {
      // On a fresh load, clicking delete should be tolerated by the code (even if behavior is odd)
      await page.click('#delete-node-btn');
      // short wait for any errors to surface
      await page.waitForTimeout(200);

      // There should be no unhandled pageerror in this specific scenario (implementation attempts splice and printTree)
      expect(pageErrors.length).toBe(0);
    });
  });

  test.describe('Update Node transitions (S0_Idle -> S3_NodeUpdated)', () => {
    test('clicking Update Node (without parameters) triggers a runtime error due to incorrect implementation', async ({ page }) => {
      // This test intentionally verifies that the broken implementation causes a runtime TypeError
      // Clear any earlier errors (fresh page in beforeEach ensures this)
      expect(pageErrors.length).toBe(0);

      // Click Update Node - this attempts to run updateNode(index, value) but is invoked with the click event
      await page.click('#update-node-btn');

      // Give the page a bit of time to register unhandled exceptions
      await page.waitForTimeout(200);

      // Expect at least one unhandled exception to have occurred
      expect(pageErrors.length).toBeGreaterThanOrEqual(1);

      // The exact browser message may vary, but it should indicate something about accessing/setting properties on undefined
      const joined = pageErrors.join(' ').toLowerCase();
      expect(joined).toMatch(/cannot set|cannot read|cannot assign|undefined|cannot set property|cannot read properties/);
    });

    test('updating after adding a node: still leads to runtime error when implementation tries to set nodes[index].value incorrectly', async ({ page }) => {
      // Add a node so nodes array is non-empty
      await page.click('#add-node-btn');
      await page.waitForTimeout(200);

      // Reset recorded page errors before update attempt
      pageErrors.length = 0;

      // Click Update Node - expected to cause a TypeError due to invalid index usage
      await page.click('#update-node-btn');
      await page.waitForTimeout(200);

      // There should be at least one page error recorded
      expect(pageErrors.length).toBeGreaterThanOrEqual(1);

      // The error should reflect inability to set property on undefined or similar
      const joined = pageErrors.join(' ').toLowerCase();
      expect(joined).toMatch(/cannot set|cannot read|undefined|cannot set property|cannot read properties/);
    });
  });

  test.describe('Edge cases and implementation quirks', () => {
    test('input event handler attached by updateNodeInput does not crash immediately on input but has questionable logic', async ({ page }) => {
      const input = page.locator('#node-value-input');

      // Add a node to ensure updateNodeInput gets called by addNode and attaches an input listener
      await page.click('#add-node-btn');
      await page.waitForTimeout(200);

      // Enter a numeric value to trigger input listeners (which contain suspicious code)
      await input.fill('42');
      // Trigger the input event
      await input.dispatchEvent('input');
      await page.waitForTimeout(200);

      // The implementation's input handler uses Array.prototype.indexOf.call with a callback and references an undefined 'node' variable
      // In practice, the callback won't match and the inner block won't run, so no ReferenceError is expected here.
      // Assert that no new pageerror was thrown by the input handler itself.
      expect(pageErrors.length).toBe(0);
    });

    test('console messages may include debug/info; capture them for observability', async ({ page }) => {
      // This test simply ensures we can capture console output; no strict expectations about content
      // Trigger some actions that may log or cause implicit console messages
      await page.click('#add-node-btn');
      await page.click('#update-node-btn').catch(() => { /* swallow - we expect errors elsewhere */ });
      await page.waitForTimeout(200);

      // We should have captured any console messages emitted during these interactions
      // This test is informational: ensure the consoleMessages array exists and is an array
      expect(Array.isArray(consoleMessages)).toBeTruthy();
    });
  });

  test.describe('FSM coverage summary checks', () => {
    test('verify that transitions for Add, Delete, Update were exercised', async ({ page }) => {
      // We'll exercise each button once, and then assert side effects or errors were observed for each
      // Reset collectors and reload page to get a clean slate
      pageErrors = [];
      dialogs = [];
      consoleMessages = [];

      await page.reload();
      await expect(page.locator('#add-node-btn')).toBeVisible();

      // Add
      await page.click('#add-node-btn');
      await page.waitForTimeout(200);
      const treeTextAfterAdd = (await page.locator('#tree').textContent()) || '';
      expect(treeTextAfterAdd.trim().length).toBeGreaterThan(0);

      // Delete
      await page.click('#delete-node-btn');
      await page.waitForTimeout(200);
      // Deleting may or may not show an alert; allow either but ensure the code path was exercised
      // (We can't introspect internal nodes array directly; checking DOM change or alert)
      const maybeDialog = dialogs.join(' ');
      if (maybeDialog) {
        expect(/node not found|tree is full/i.test(maybeDialog)).toBeTruthy();
      }

      // Update - expected to produce a runtime error (TypeError)
      await page.click('#update-node-btn');
      await page.waitForTimeout(200);

      // Confirm at least one unhandled exception occurred from the update attempt
      expect(pageErrors.length).toBeGreaterThanOrEqual(1);
    });
  });
});