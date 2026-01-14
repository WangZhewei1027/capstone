import { test, expect } from '@playwright/test';

class BinaryTreePage {
  /**
   * Page object for the Binary Tree example.
   * Encapsulates common selectors and actions.
   */
  constructor(page) {
    this.page = page;
    this.url = 'http://127.0.0.1:5500/workspace/baseline-html2test-llama/html/11b74605-d5a1-11f0-9c7a-cdf1d7a06e11.html';
    this.input = page.locator('#value');
    this.addButton = page.locator('#add');
    this.removeButton = page.locator('#remove');
    this.clearButton = page.locator('#clear');
    this.tree = page.locator('#tree');
    this.treeNodes = page.locator('#tree .node');
  }

  async goto() {
    await this.page.goto(this.url);
  }

  async addValue(value) {
    await this.input.fill(String(value));
    await this.addButton.click();
  }

  async removeValue(value) {
    await this.input.fill(String(value));
    await this.removeButton.click();
  }

  async clearTree() {
    await this.clearButton.click();
  }

  async countVisibleNodes() {
    return this.treeNodes.count();
  }
}

test.describe('Binary Tree interactive app - 11b74605-d5a1-11f0-9c7a-cdf1d7a06e11', () => {
  // Arrays to capture console messages and page errors for each test
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Capture console messages and page errors to inspect runtime behavior.
    page.on('console', (msg) => {
      // Store the text and type for assertions/debugging
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    page.on('pageerror', (err) => {
      // Capture unhandled exceptions from the page
      pageErrors.push(err);
    });
  });

  test.afterEach(async ({ page }) => {
    // Ensure no unexpected modal/dialogs are left (defensive cleanup)
    page.removeAllListeners('console');
    page.removeAllListeners('pageerror');
  });

  test('loads page and shows initial default state', async ({ page }) => {
    // Purpose: Verify the page loads and the expected basic elements are present.
    const app = new BinaryTreePage(page);
    await app.goto();

    // Page heading should be present
    await expect(page.locator('h1')).toHaveText('Binary Tree');

    // Input and buttons should be visible and enabled
    await expect(app.input).toBeVisible();
    await expect(app.addButton).toBeVisible();
    await expect(app.removeButton).toBeVisible();
    await expect(app.clearButton).toBeVisible();

    // The tree container should be visible
    await expect(app.tree).toBeVisible();

    // Inspect visible nodes inside #tree. Based on the implementation,
    // the script appends a single createNode('') into #tree at load time.
    const visibleNodes = await app.countVisibleNodes();
    expect(visibleNodes).toBeGreaterThanOrEqual(1);

    // There should be no uncaught page errors on initial load
    expect(pageErrors.length).toBe(0);

    // No console messages of type 'error' should have been emitted during load
    const consoleErrors = consoleMessages.filter((c) => c.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  test('clicking Add with a value clears the input and does not change visible tree when currentNode is null', async ({ page }) => {
    // Purpose: Validate Add button behavior with the current implementation.
    const app1 = new BinaryTreePage(page);
    await app.goto();

    // Count visible nodes before adding
    const before = await app.countVisibleNodes();

    // Enter a value and click Add
    await app.addValue(42);

    // The input should be cleared by the click handler
    await expect(app.input).toHaveValue('');

    // Because the implementation appends new nodes to elements that are not attached
    // to the DOM when currentNode is null, the visible node count should remain unchanged.
    const after = await app.countVisibleNodes();
    expect(after).toBe(before);

    // Ensure no uncaught page errors were introduced by clicking Add
    expect(pageErrors.length).toBe(0);

    // No console errors should be present
    const consoleErrors1 = consoleMessages.filter((c) => c.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  test('Clicking Clear keeps visible tree stable (implementation-specific behavior)', async ({ page }) => {
    // Purpose: The clear action manipulates internal containers. Verify visible DOM stability.
    const app2 = new BinaryTreePage(page);
    await app.goto();

    // Count visible nodes before clearing
    const before1 = await app.countVisibleNodes();

    // Click clear
    await app.clearTree();

    // Because clear manipulates treeNode (not appended) and treeNodeLeft/Right (not appended),
    // the visible DOM (#tree) is expected to remain with the same number of visible nodes.
    const after1 = await app.countVisibleNodes();
    expect(after).toBe(before);

    // No uncaught page errors should have occurred by using Clear
    expect(pageErrors.length).toBe(0);

    // No console errors emitted
    const consoleErrors2 = consoleMessages.filter((c) => c.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  test('Clicking Remove with no currentNode is a no-op and produces no runtime errors', async ({ page }) => {
    // Purpose: Validate Remove behavior when currentNode === null (default).
    const app3 = new BinaryTreePage(page);
    await app.goto();

    // Put a value in the input and then click remove
    await app.removeValue(999);

    // Visible nodes should remain stable
    const visibleNow = await app.countVisibleNodes();
    expect(visibleNow).toBeGreaterThanOrEqual(1);

    // No uncaught page errors should have been recorded
    expect(pageErrors.length).toBe(0);

    // No console errors emitted
    const consoleErrors3 = consoleMessages.filter((c) => c.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  test('manually setting currentNode to a visible node and clicking Remove triggers a runtime DOM exception', async ({ page }) => {
    // Purpose: Intentionally create the situation that causes removeNode to attempt
    // to remove a parent from itself, which should raise a runtime DOMException.
    const app4 = new BinaryTreePage(page);
    await app.goto();

    // Sanity check: ensure there is at least one visible node to attach as currentNode
    const nodeCount = await app.countVisibleNodes();
    expect(nodeCount).toBeGreaterThanOrEqual(1);

    // Set the page's currentNode variable to the first visible node.
    // This manipulates an existing global variable that the page script declared.
    await page.evaluate(() => {
      // Assign the existing page-global currentNode (declared in the page script)
      // to be the first visible node inside #tree. This creates the condition
      // where removeNode will enter the branch that causes an improper removeChild call.
      window.currentNode = document.querySelector('#tree .node');
    });

    // Clear any previously captured errors/messages
    consoleMessages = [];
    pageErrors = [];

    // Click the Remove button with an empty input (the code will try to compare values,
    // then attempt to remove a parent from itself and should throw a DOM exception).
    await app.removeButton.click();

    // Wait briefly to allow the in-page exception to be propagated to the Playwright pageerror handler.
    // Using a small timeout rather than waitForEvent to keep test robust across environments.
    await page.waitForTimeout(100);

    // The pageErrors array should capture the thrown exception.
    expect(pageErrors.length).toBeGreaterThanOrEqual(1);

    // The error message should reference removeChild or not-a-child semantics depending on the browser.
    const errorMessages = pageErrors.map(e => String(e && e.message ? e.message : e));
    const combined = errorMessages.join(' | ');
    expect(combined.toLowerCase()).toContain('removechild');

    // Additionally, a console error might have been logged; check for 'error' console messages.
    const consoleErrorTexts = consoleMessages.filter(c => c.type === 'error').map(c => c.text);
    // It's acceptable if there are console errors, but we assert that at least one page error was received.
    // If console errors are present, ensure they relate to the DOM removal issue.
    if (consoleErrorTexts.length > 0) {
      const joined = consoleErrorTexts.join(' | ').toLowerCase();
      // If console errors exist, they should likely mention removeChild or similar DOM failure.
      expect(joined.includes('removechild') || joined.includes('not a child') || joined.includes('failed to execute')).toBeTruthy();
    }
  });

  test('input event triggers printTree internally (no visible change expected) and does not throw', async ({ page }) => {
    // Purpose: Verify that typing into the input triggers the input handler,
    // which calls printTree(currentNode). The page may manipulate internal nodes,
    // but this should not produce uncaught exceptions.
    const app5 = new BinaryTreePage(page);
    await app.goto();

    // Ensure starting without errors
    expect(pageErrors.length).toBe(0);

    // Type into the input to trigger the 'input' listener
    await app.input.fill('12345');

    // Allow any asynchronous handlers to run
    await page.waitForTimeout(50);

    // There should still be no uncaught page errors as a result of the input event
    expect(pageErrors.length).toBe(0);

    // The visible nodes in #tree remain stable (printTree acts on internal structures)
    const visibleAfterInput = await app.countVisibleNodes();
    expect(visibleAfterInput).toBeGreaterThanOrEqual(1);
  });
});