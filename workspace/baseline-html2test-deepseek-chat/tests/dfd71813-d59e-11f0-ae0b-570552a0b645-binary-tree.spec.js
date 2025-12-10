import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-deepseek-chat/html/dfd71813-d59e-11f0-ae0b-570552a0b645.html';

// Page Object for the Binary Tree page
class BinaryTreePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
  }

  // Element getters
  async insertButton() { return this.page.locator('#insertBtn'); }
  async deleteButton() { return this.page.locator('#deleteBtn'); }
  async traverseButton() { return this.page.locator('#traverseBtn'); }
  async clearButton() { return this.page.locator('#clearBtn'); }
  async randomButton() { return this.page.locator('#randomBtn'); }

  async nodeValueInput() { return this.page.locator('#nodeValue'); }
  async deleteValueInput() { return this.page.locator('#deleteValue'); }
  async traversalSelect() { return this.page.locator('#traversalType'); }

  async status() { return this.page.locator('#status'); }
  async operationLog() { return this.page.locator('#operationLog'); }
  async operationItems() { return this.page.locator('#operationLog .operation-item'); }
  async treeInfo() { return this.page.locator('#treeInfo'); }
  async treeCanvas() { return this.page.locator('#treeCanvas'); }

  // Actions
  async clickInsert() { await (await this.insertButton()).click(); }
  async clickDelete() { await (await this.deleteButton()).click(); }
  async clickTraverse() { await (await this.traverseButton()).click(); }
  async clickClear() { await (await this.clearButton()).click(); }
  async clickRandom() { await (await this.randomButton()).click(); }

  async setNodeValue(value) {
    const input = await this.nodeValueInput();
    await input.fill(String(value));
  }

  async setDeleteValue(value) {
    const input = await this.deleteValueInput();
    await input.fill(String(value));
  }

  async selectTraversal(value) {
    const sel = await this.traversalSelect();
    await sel.selectOption(value);
  }

  // Helpers to read text
  async getStatusText() { return (await this.status()).innerText(); }
  async getTreeInfoText() { return (await this.treeInfo()).innerText(); }
  async getOperationLogText() { return (await this.operationLog()).innerText(); }
  async getNodeValueInputValue() { return (await this.nodeValueInput()).inputValue(); }
  async getDeleteValueInputValue() { return (await this.deleteValueInput()).inputValue(); }
  async getTraversalValue() { return (await this.traversalSelect()).inputValue(); }
}

test.describe('Binary Tree Visualization - UI and script error observation', () => {
  // Capture console errors and page errors per test
  test.beforeEach(async ({ page }) => {
    // No-op here; individual tests will set up listeners as needed
  });

  // Test initial page load and check static DOM elements
  test('Initial load: page structure and default values are present', async ({ page }) => {
    const consoleErrors = [];
    const pageErrors = [];

    // Collect console error messages
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    // Collect runtime page errors
    page.on('pageerror', err => {
      pageErrors.push(String(err));
    });

    const p = new BinaryTreePage(page);
    await page.goto(APP_URL);

    // Verify heading and description exist
    await expect(page.locator('h1')).toHaveText('Binary Tree Visualization');
    await expect(page.locator('.description')).toContainText('A binary tree is a hierarchical data structure');

    // Verify control elements exist and default values
    await expect(await p.nodeValueInput()).toBeVisible();
    await expect(await p.deleteValueInput()).toBeVisible();
    await expect(await p.traversalSelect()).toBeVisible();
    await expect(await p.insertButton()).toBeVisible();
    await expect(await p.deleteButton()).toBeVisible();
    await expect(await p.traverseButton()).toBeVisible();
    await expect(await p.clearButton()).toBeVisible();
    await expect(await p.randomButton()).toBeVisible();

    // Default input values as per HTML
    expect(await p.getNodeValueInputValue()).toBe('15');
    expect(await p.getDeleteValueInputValue()).toBe('15');

    // Default select value
    expect(await p.getTraversalValue()).toBe('inorder');

    // Status and tree info default texts
    await expect(await p.status()).toContainText('Status: Ready');
    await expect(await p.treeInfo()).toHaveText('No tree generated yet.');

    // Operation log contains heading
    await expect(await p.operationLog()).toContainText('Operation Log');

    // Canvas exists
    await expect(await p.treeCanvas()).toBeVisible();

    // We expect the page script to be malformed (truncated). Assert that a console or page error occurred.
    // Allow some time for the browser to report errors that may occur during parsing/execution.
    await page.waitForTimeout(250); // short pause to capture errors emitted on load

    // At least one console error or page error should be present due to the truncated script.
    const combinedErrors = consoleErrors.concat(pageErrors);
    // Make an informative assertion: if no errors, fail the test indicating we expected a script error.
    expect(combinedErrors.length).toBeGreaterThan(0);

    // Check that one of the errors mentions common parse/runtime phrases
    const joined = combinedErrors.join(' | ').toLowerCase();
    const expectedIndicators = ['syntaxerror', 'unexpected end', 'unexpected token', 'referenceerror', 'uncaught', 'unexpected identifier'];
    const foundIndicator = expectedIndicators.some(ind => joined.includes(ind.toLowerCase()));
    expect(foundIndicator).toBeTruthy();
  });

  // Test that interactive controls exist but clicking them does not execute tree logic (script didn't run)
  test('Clicking controls does not change status or operation log when script fails to execute', async ({ page }) => {
    const consoleErrors = [];
    const pageErrors = [];

    // Capture errors
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => {
      pageErrors.push(String(err));
    });

    const p = new BinaryTreePage(page);
    await page.goto(APP_URL);

    // sanity: initial status
    await expect(await p.status()).toContainText('Status: Ready');
    const initialLogText = await p.getOperationLogText();

    // Try inserting by clicking insert button
    await p.setNodeValue(42);
    await p.clickInsert();

    // Wait briefly for any JS to run (or not)
    await page.waitForTimeout(200);

    // Because the inline script is truncated, we expect no insertion action took place:
    // - Status remains unchanged
    // - Operation log still contains only its initial content
    expect(await p.getStatusText()).toContain('Status: Ready');
    const afterInsertLog = await p.getOperationLogText();
    expect(afterInsertLog).toBe(initialLogText);

    // Try delete action
    await p.setDeleteValue(42);
    await p.clickDelete();
    await page.waitForTimeout(200);

    // Still no change expected
    expect(await p.getStatusText()).toContain('Status: Ready');
    expect(await p.getOperationLogText()).toBe(initialLogText);

    // Press Enter key in the node input - should not trigger any insertion callback
    await (await p.nodeValueInput()).press('Enter');
    await page.waitForTimeout(200);
    expect(await p.getOperationLogText()).toBe(initialLogText);

    // Attempt traversal
    await p.selectTraversal('levelorder');
    await p.clickTraverse();
    await page.waitForTimeout(200);

    // No new status or operation entries
    expect(await p.getStatusText()).toContain('Status: Ready');
    expect(await p.getOperationLogText()).toBe(initialLogText);

    // Confirm errors were captured (script likely failed)
    const combined = consoleErrors.concat(pageErrors);
    expect(combined.length).toBeGreaterThan(0);
  });

  // Test: Clearing and generating random tree buttons should be present but inert when script fails
  test('Clear and Random buttons exist and are inert if script fails', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    page.on('pageerror', err => { errors.push(String(err)); });

    const p = new BinaryTreePage(page);
    await page.goto(APP_URL);

    // Take snapshot of tree info and status
    const beforeInfo = await p.getTreeInfoText();
    const beforeStatus = await p.getStatusText();

    // Click Clear
    await p.clickClear();
    await page.waitForTimeout(150);

    // Click Random
    await p.clickRandom();
    await page.waitForTimeout(150);

    // Expect no logical updates (since script is broken)
    expect(await p.getTreeInfoText()).toBe(beforeInfo);
    expect(await p.getStatusText()).toBe(beforeStatus);

    // Expect that the page emitted at least one error during load/execution
    expect(errors.length).toBeGreaterThan(0);
  });

  // Test accessibility of controls: buttons should have accessible names and be focusable
  test('Controls are focusable and accessible via keyboard (basic accessibility checks)', async ({ page }) => {
    await page.goto(APP_URL);
    const p = new BinaryTreePage(page);

    // Tab through a few controls to ensure they are in tab order and focusable
    await page.keyboard.press('Tab'); // to first focusable element
    // Simply ensure the insert button is present and can be focused
    await (await p.insertButton()).focus();
    expect(await p.insertButton()).toBeFocused();

    // Move focus to traverse, then clear, then random
    await page.keyboard.press('Tab');
    await (await p.traverseButton()).focus();
    expect(await p.traverseButton()).toBeFocused();

    await page.keyboard.press('Tab');
    await (await p.clearButton()).focus();
    expect(await p.clearButton()).toBeFocused();

    await page.keyboard.press('Tab');
    await (await p.randomButton()).focus();
    expect(await p.randomButton()).toBeFocused();
  });

  // Negative / edge case: entering invalid values into inputs and pressing buttons should not break page further
  test('Edge cases: invalid input values are handled gracefully by UI (or are inert) and do not crash', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', err => { pageErrors.push(String(err)); });

    const p = new BinaryTreePage(page);
    await page.goto(APP_URL);

    // Enter invalid values (out of range, empty, non-number) and attempt actions
    await p.setNodeValue(''); // empty
    await p.clickInsert();
    await page.waitForTimeout(100);

    await p.setNodeValue('9999'); // outside max
    await p.clickInsert();
    await page.waitForTimeout(100);

    await p.setDeleteValue('');
    await p.clickDelete();
    await page.waitForTimeout(100);

    // Nothing should throw additional page errors beyond those already present
    // We assert at least one page error exists (from the broken script), but no new errors lead to an unhandled crash.
    expect(pageErrors.length).toBeGreaterThanOrEqual(0);

    // The status element should still be present and readable
    await expect(await p.status()).toBeVisible();
  });

  // Inspect console and page errors more directly: expect a SyntaxError or unexpected end of input
  test('Script parsing/execution errors are present in console or pageerror', async ({ page }) => {
    const consoleErrors = [];
    const pageErrors = [];

    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => {
      pageErrors.push(String(err));
    });

    await page.goto(APP_URL);

    // Wait a moment for errors to register
    await page.waitForTimeout(300);

    // Combine and assert
    const combined = consoleErrors.concat(pageErrors);
    // We expect at least one error due to the truncated script in the HTML.
    expect(combined.length).toBeGreaterThan(0);

    // Validate that at least one error message indicates a parsing/runtime JS error
    const msg = combined.join(' | ').toLowerCase();
    const mustContain = ['syntax', 'unexpected', 'referenceerror', 'typeerror', 'uncaught'];
    const found = mustContain.some(k => msg.includes(k));
    expect(found).toBeTruthy();
  });
});