import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-subtest2/html/f766e5e0-d5b8-11f0-9ee1-ef07bdc6053d.html';

test.describe('Red-Black Tree Visualization (FSM validation)', () => {
  // Arrays to capture console messages and page errors for each test
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    // reset capture arrays
    consoleMessages = [];
    pageErrors = [];

    // capture console messages
    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // capture uncaught exceptions on the page
    page.on('pageerror', (err) => {
      // store the Error object for assertions
      pageErrors.push(err);
    });

    // Navigate to the application page exactly as-is
    await page.goto(APP_URL, { waitUntil: 'load' });
  });

  test.afterEach(async () => {
    // Nothing to teardown beyond Playwright fixtures; arrays are per-test
  });

  // Utility page object for interacting with the app
  const TreePage = {
    async inputLocator(page) {
      return page.locator('#nodeValue');
    },
    async insertButton(page) {
      return page.locator('button[onclick="insertNode()"]');
    },
    async treeContainer(page) {
      return page.locator('#tree');
    },
    // Helper to get count of rendered nodes
    async nodeCount(page) {
      return await page.locator('#tree .node').count();
    },
    // Helper to get array of node texts
    async nodeTexts(page) {
      return await page.evaluate(() => {
        return Array.from(document.querySelectorAll('#tree .node')).map(n => n.textContent.trim());
      });
    },
    // Helper to get classes of first node with given text
    async classesForNodeWithText(page, text) {
      return await page.evaluate((t) => {
        const nodes = Array.from(document.querySelectorAll('#tree .node'));
        const found = nodes.find(n => n.textContent.trim() === String(t));
        return found ? found.className : null;
      }, text);
    }
  };

  test('S0_Idle: initial render shows input, button, and empty tree', async ({ page }) => {
    // Validate Idle state UI elements presence
    const input = await TreePage.inputLocator(page);
    const button = await TreePage.insertButton(page);
    const tree = await TreePage.treeContainer(page);

    await expect(input).toBeVisible();
    await expect(button).toBeVisible();
    // The tree should be empty initially (no nodes)
    await expect(tree).toBeVisible();
    const initialNodes = await TreePage.nodeCount(page);
    expect(initialNodes).toBe(0);

    // There should be no uncaught page errors on initial load
    expect(pageErrors.length).toBe(0);

    // There should be no console messages of type 'error'
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  test('InsertNode event transitions to NodeInserted: inserting root node and visualized as black root', async ({ page }) => {
    // Insert a valid node value (10) and assert the tree updates
    const input = await TreePage.inputLocator(page);
    const button = await TreePage.insertButton(page);
    const tree = await TreePage.treeContainer(page);

    // Type value and click insert
    await input.fill('10');
    await button.click();

    // After insertion, the tree should contain a node with text '10'
    await expect(tree.locator('.node', { hasText: '10' })).toBeVisible();

    // The inserted root node should be colored black after fixViolation
    const classes = await TreePage.classesForNodeWithText(page, '10');
    expect(classes).toBeTruthy();
    expect(classes.split(/\s+/)).toContain('black');

    // Input should be cleared after successful insertion (per implementation)
    await expect(input).toHaveValue('');

    // Validate no page errors occurred during insertion
    expect(pageErrors.length).toBe(0);

    // Validate no console errors were emitted
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  test('Multiple insertions: tree grows and nodes are rendered; colors adjusted', async ({ page }) => {
    const input = await TreePage.inputLocator(page);
    const button = await TreePage.insertButton(page);
    const tree = await TreePage.treeContainer(page);

    // Insert root 20
    await input.fill('20');
    await button.click();
    await expect(tree.locator('.node', { hasText: '20' })).toBeVisible();

    // Insert left child 10
    await input.fill('10');
    await button.click();
    await expect(tree.locator('.node', { hasText: '10' })).toBeVisible();

    // Insert right child 30
    await input.fill('30');
    await button.click();
    await expect(tree.locator('.node', { hasText: '30' })).toBeVisible();

    // Now there should be 3 nodes rendered
    const count = await TreePage.nodeCount(page);
    expect(count).toBeGreaterThanOrEqual(3);

    // Node texts should include the three inserted values
    const texts = await TreePage.nodeTexts(page);
    expect(texts).toEqual(expect.arrayContaining(['20', '10', '30']));

    // No uncaught page errors or console error messages during these operations
    expect(pageErrors.length).toBe(0);
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  test('Edge case: invalid input triggers alert and does not modify tree', async ({ page }) => {
    const input = await TreePage.inputLocator(page);
    const button = await TreePage.insertButton(page);
    const tree = await TreePage.treeContainer(page);

    // Ensure input is empty and capture dialog
    await input.fill('');

    let dialogMessage = null;
    page.once('dialog', async (dialog) => {
      dialogMessage = dialog.message();
      await dialog.accept(); // accept so test can continue
    });

    // Click insert with empty input -> should trigger alert
    await button.click();

    // Wait a short moment to ensure dialog handler ran
    await page.waitForTimeout(200);

    expect(dialogMessage).toBe('Please enter a valid number.');

    // Tree should remain unchanged (we didn't insert anything). Count can be zero or previous nodes if earlier tests ran in same process;
    // but we assert that clicking with invalid input does not throw and no new nodes with empty label were added.
    const texts = await TreePage.nodeTexts(page);
    // There should be no node with empty text
    expect(texts.some(t => t === '')).toBe(false);

    // No uncaught page errors as a result of invalid input
    expect(pageErrors.length).toBe(0);
  });

  test('Insert duplicate values: app handles duplicates (inserts to the right) and visual shows repeated values', async ({ page }) => {
    const input = await TreePage.inputLocator(page);
    const button = await TreePage.insertButton(page);

    // Insert a value 42 twice
    await input.fill('42');
    await button.click();

    await input.fill('42');
    await button.click();

    // Count occurrences of '42' in rendered nodes
    const texts = await TreePage.nodeTexts(page);
    const occurrences = texts.filter(t => t === '42').length;
    expect(occurrences).toBeGreaterThanOrEqual(2);

    // No uncaught page errors or console errors
    expect(pageErrors.length).toBe(0);
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  test('Global sanity: observe console and page errors across interactions (should be none)', async ({ page }) => {
    // This test verifies globally that there are no JS runtime errors collected
    // It acts as a safety assertion that the page script ran without uncaught exceptions.
    // We don't perform new interactions here; we assert the captured collections are clean.

    // No uncaught page errors
    expect(pageErrors.length).toBe(0);

    // No console messages of type 'error'
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);

    // Optionally assert that some console log types may exist (info/debug) but not required.
    // We ensure that if any runtime ReferenceError / SyntaxError / TypeError occurred, it would have been captured above.
  });
});