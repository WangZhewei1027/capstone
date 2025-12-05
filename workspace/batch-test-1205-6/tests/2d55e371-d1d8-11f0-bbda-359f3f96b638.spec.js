import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-6/html/2d55e371-d1d8-11f0-bbda-359f3f96b638.html';

// Page Object for the Binary Tree page
class TreePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.consoleMessages = [];
    this.pageErrors = [];
    this._consoleListener = (msg) => {
      // capture console messages of all types; keep them for assertions
      this.consoleMessages.push({
        type: msg.type(),
        text: msg.text(),
      });
    };
    this._pageErrorListener = (err) => {
      // capture unhandled page errors
      this.pageErrors.push(err);
    };
  }

  // Navigate to the app and attach listeners
  async goto() {
    // attach listeners before navigation to capture any early errors
    this.page.on('console', this._consoleListener);
    this.page.on('pageerror', this._pageErrorListener);
    await this.page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
  }

  // Clean up listeners (teardown)
  detachListeners() {
    this.page.off('console', this._consoleListener);
    this.page.off('pageerror', this._pageErrorListener);
  }

  // Return the build button element handle
  async getBuildButton() {
    return this.page.locator("button[onclick='buildTree()']");
  }

  // Click the Build Sample Binary Tree button
  async clickBuildButton() {
    await (await this.getBuildButton()).click();
  }

  // Get node elements (elements with class 'node')
  async getNodeElements() {
    return this.page.locator('#tree-container .node');
  }

  // Get line elements (elements with class 'line')
  async getLineElements() {
    return this.page.locator('#tree-container .line');
  }

  // Get raw text contents of all nodes
  async getNodeTexts() {
    const locator = await this.getNodeElements();
    const count = await locator.count();
    const texts = [];
    for (let i = 0; i < count; i++) {
      texts.push((await locator.nth(i).innerText()).trim());
    }
    return texts;
  }

  // Convenience to wait until at least one node exists
  async waitForNodes() {
    await this.page.waitForSelector('#tree-container .node', { state: 'attached', timeout: 2000 });
  }

  // Expose captured console messages and page errors
  getConsoleMessages() {
    return this.consoleMessages.slice();
  }

  getPageErrors() {
    return this.pageErrors.slice();
  }
}

test.describe('Binary Tree Visualization (FSM: Idle -> Tree Built)', () => {
  // Each test will create its own Page and TreePage instance via fixtures
  test.afterEach(async ({ page }) => {
    // Ensure any listeners are removed after each test to avoid leakage
    page.removeAllListeners('console');
    page.removeAllListeners('pageerror');
  });

  test('Initial state "Idle": button is present and no tree nodes rendered', async ({ page }) => {
    // This test validates the initial FSM Idle state: button exists and tree container is empty.
    const tree = new TreePage(page);
    await tree.goto();

    // Validate presence of the button with correct attribute and text
    const button = await tree.getBuildButton();
    await expect(button).toBeVisible();
    await expect(button).toHaveText('Build Sample Binary Tree');

    // Validate that initially there are no node or line elements in the container
    const nodes = await tree.getNodeElements();
    const lines = await tree.getLineElements();
    await expect(nodes).toHaveCount(0);
    await expect(lines).toHaveCount(0);

    // Ensure no unexpected page errors were emitted during load
    const pageErrors = tree.getPageErrors();
    const consoleMsgs = tree.getConsoleMessages().filter(m => m.type === 'error');
    // We assert that there were no runtime errors on page load
    expect(pageErrors.length, `Expected no page errors on load, but found: ${pageErrors.map(e => String(e)).join('; ')}`).toBe(0);
    expect(consoleMsgs.length, `Expected no console errors on load, but found: ${consoleMsgs.map(m => m.text).join('; ')}`).toBe(0);

    // Teardown: detach listeners
    tree.detachListeners();
  });

  test('Transition "BuildTree": clicking button draws 7 tree nodes and 6 connecting lines', async ({ page }) => {
    // This test validates the FSM transition from Idle -> Tree Built
    // It verifies the expected observable: nodes displayed in the container after clicking the button.
    const tree1 = new TreePage(page);
    await tree.goto();

    // Click the build button to trigger buildTree()
    await tree.clickBuildButton();

    // Wait for nodes to be attached to DOM and assert counts
    await tree.waitForNodes();

    const nodes1 = await tree.getNodeElements();
    const lines1 = await tree.getLineElements();

    // drawTree should append exactly 7 node elements (one per value 1..7)
    await expect(nodes).toHaveCount(7);

    // There should be one connecting line per non-root node (7 nodes -> 6 lines)
    await expect(lines).toHaveCount(6);

    // Verify node texts include all numbers 1..7 (order may be pre-order traversal)
    const nodeTexts = await tree.getNodeTexts();
    const numbersFound = new Set(nodeTexts);
    for (let i = 1; i <= 7; i++) {
      expect(numbersFound.has(String(i)), `Expected node with text "${i}" to be present`).toBe(true);
    }

    // Check that the tree container has both node and line elements as children
    const containerChildrenCount = await page.locator('#tree-container').evaluate((el) => el.children.length);
    expect(containerChildrenCount).toBe(nodes.count ? await nodes.count() + (await lines.count()) : 7 + 6);

    // Also assert no runtime page errors were emitted during the build (if any, fail with messages)
    const pageErrors1 = tree.getPageErrors();
    const consoleErrorMsgs = tree.getConsoleMessages().filter(m => m.type === 'error');
    expect(pageErrors.length, `Expected no page errors after building tree, found: ${pageErrors.map(e => String(e)).join('; ')}`).toBe(0);
    expect(consoleErrorMsgs.length, `Expected no console.error logs after building tree, found: ${consoleErrorMsgs.map(m => m.text).join('; ')}`).toBe(0);

    tree.detachListeners();
  });

  test('Edge case: clicking Build button multiple times appends nodes (no automatic clear)', async ({ page }) => {
    // This test validates behavior when the user triggers the BuildTree event repeatedly.
    // The implementation appends nodes rather than clearing, which is an important edge case.
    const tree2 = new TreePage(page);
    await tree.goto();

    // First click -> 7 nodes
    await tree.clickBuildButton();
    await tree.waitForNodes();
    await expect(tree.getNodeElements()).toHaveCount(7);
    await expect(tree.getLineElements()).toHaveCount(6);

    // Second click -> nodes appended, total should become 14, lines 12
    await tree.clickBuildButton();

    // Wait for additional nodes to appear
    await page.waitForTimeout(200); // small timeout to let DOM updates happen
    await expect(tree.getNodeElements()).toHaveCount(14);
    await expect(tree.getLineElements()).toHaveCount(12);

    // Confirm that values 1..7 appear at least twice in the appended order
    const nodeTexts1 = await tree.getNodeTexts();
    const counts = {};
    for (const t of nodeTexts) {
      counts[t] = (counts[t] || 0) + 1;
    }
    for (let i = 1; i <= 7; i++) {
      expect(counts[String(i)], `Expected value "${i}" to appear at least twice after two clicks`).toBeGreaterThanOrEqual(2);
    }

    // Ensure no page errors were emitted by repeated clicks
    const pageErrors2 = tree.getPageErrors();
    const consoleErrorMsgs1 = tree.getConsoleMessages().filter(m => m.type === 'error');
    expect(pageErrors.length, `Expected no page errors after repeated builds, found: ${pageErrors.map(e => String(e)).join('; ')}`).toBe(0);
    expect(consoleErrorMsgs.length, `Expected no console.error logs after repeated builds, found: ${consoleErrorMsgs.map(m => m.text).join('; ')}`).toBe(0);

    tree.detachListeners();
  });

  test('FSM "entry action" observation: attempting to call missing renderPage() should surface a ReferenceError', async ({ page }) => {
    // The FSM's initial state's entry_actions lists renderPage(), but the implementation does not define it.
    // This test intentionally invokes renderPage() in the page context to observe and assert the natural ReferenceError.
    const tree3 = new TreePage(page);
    await tree.goto();

    // Call renderPage() from page context and assert it throws with ReferenceError
    // We don't catch the error in the page context; instead, we assert the promise is rejected.
    await expect(async () => {
      // page.evaluate will reject if renderPage is not defined / throws
      await page.evaluate(() => {
        // Intentionally call the (non-existent) renderPage function to let the runtime throw naturally.
        // This mirrors the FSM's specified entry action and lets us observe the resulting error without patching page code.
        // eslint-disable-next-line no-undef
        return renderPage();
      });
    }).rejects.toThrowError(/renderPage is not defined|renderPage is not a function|ReferenceError/);

    // Additionally, because this error originated from a direct evaluation, it might or might not have emitted a pageerror.
    // If a pageerror was emitted, assert that it corresponds to a ReferenceError-like message.
    const pageErrors3 = tree.getPageErrors();
    if (pageErrors.length > 0) {
      const serialized = pageErrors.map(pe => String(pe.message || pe)).join(' | ');
      expect(serialized).toMatch(/renderPage|ReferenceError/);
    }

    tree.detachListeners();
  });

  test('Observe console and pageerror streams during normal use: ensure we record messages and none are error-level', async ({ page }) => {
    // This test simply demonstrates collection of console messages and page errors while exercising the UI.
    const tree4 = new TreePage(page);
    await tree.goto();

    // Attach an additional console.log in the page to exercise console capture without altering code definitions:
    // We will not redefine or patch existing functions; we will call console.log from test context inside page.evaluate
    // which is allowed and will be captured by the console listener.
    await page.evaluate(() => {
      console.log('PLAYWRIGHT_TEST_LOG: build-start');
    });

    // Click to build the tree
    await tree.clickBuildButton();
    await tree.waitForNodes();

    // Also log a message after build
    await page.evaluate(() => {
      console.log('PLAYWRIGHT_TEST_LOG: build-end');
    });

    // Inspect captured console messages for our markers and any error types
    const consoleMsgs1 = tree.getConsoleMessages();
    const logs = consoleMsgs.filter(m => m.type === 'log').map(m => m.text);
    expect(logs.some(t => t.includes('PLAYWRIGHT_TEST_LOG: build-start')), 'Expected build-start log to be captured').toBe(true);
    expect(logs.some(t => t.includes('PLAYWRIGHT_TEST_LOG: build-end')), 'Expected build-end log to be captured').toBe(true);

    // Assert there were no error-level console messages
    const errorLevel = consoleMsgs.filter(m => m.type === 'error');
    expect(errorLevel.length, `Expected no console.error entries during normal use, found: ${errorLevel.map(e => e.text).join('; ')}`).toBe(0);

    // Assert there are no unhandled page errors
    const pageErrors4 = tree.getPageErrors();
    expect(pageErrors.length, `Expected no unhandled page errors during normal use, found: ${pageErrors.map(e => String(e)).join('; ')}`).toBe(0);

    tree.detachListeners();
  });
});