import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/4c9e86e2-cd2f-11f0-a735-f5f9b4634e99.html';

// Page Object for the Binary Tree page to encapsulate common interactions and observations
class TreePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    // Arrays to capture console and page errors for assertions
    this.consoleMessages = [];
    this.consoleErrors = [];
    this.pageErrors = [];

    // Attach listeners to observe console and page errors as the page executes its scripts.
    // These arrays live on the TreePage instance and are used by tests to assert runtime behavior.
    this.page.on('console', msg => {
      const payload = { type: msg.type(), text: msg.text() };
      this.consoleMessages.push(payload);
      if (msg.type() === 'error') this.consoleErrors.push(payload);
    });

    this.page.on('pageerror', error => {
      // pageerror provides Error object; we capture its message and stack for analysis
      this.pageErrors.push({ message: error.message, stack: error.stack });
    });
  }

  // Navigate to the application URL and wait for load event
  async goto() {
    await this.page.goto(APP_URL, { waitUntil: 'load' });
  }

  // Return the textContent of the first node (root) if present
  async getRootNodeText() {
    const locator = this.page.locator('#tree .level .node').first();
    return await locator.textContent();
  }

  // Return array of text contents for all .node elements currently in the DOM
  async getAllNodeValues() {
    const nodes = this.page.locator('#tree .node');
    const count = await nodes.count();
    const values = [];
    for (let i = 0; i < count; i++) {
      const text = await nodes.nth(i).textContent();
      values.push(text ? text.trim() : text);
    }
    return values;
  }

  // Count number of .level elements present
  async getLevelCount() {
    return await this.page.locator('#tree .level').count();
  }

  // Count number of interactive controls on page (buttons, inputs, selects, textareas, forms)
  async getInteractiveControlCount() {
    return await this.page.locator('button, input, select, textarea, form').count();
  }

  // Access the captured console messages
  getConsoleMessages() {
    return this.consoleMessages;
  }

  // Access captured console.error messages
  getConsoleErrors() {
    return this.consoleErrors;
  }

  // Access captured page errors
  getPageErrors() {
    return this.pageErrors;
  }
}

test.describe('Binary Tree Visualization (Application ID: 4c9e86e2-cd2f-11f0-a735-f5f9b4634e99)', () => {
  // Shared TreePage instance for each test
  let treePage;

  // Before each test, create the TreePage object and navigate to the URL.
  // We intentionally do not patch or change any runtime behavior; we only observe console/page errors as they happen.
  test.beforeEach(async ({ page }) => {
    treePage = new TreePage(page);
    await treePage.goto();
  });

  // Test: Initial page load should render the tree container and at least the root node
  test('Initial load renders tree container and root node', async ({ page }) => {
    // Purpose: Verify the page loaded, the tree container exists, and the root node (15) is rendered.
    // This checks basic DOM setup before any runtime errors occur.
    await expect(page).toHaveTitle(/Binary Tree Visualization/i);

    // The tree container should exist
    const treeLocator = page.locator('#tree');
    await expect(treeLocator).toBeVisible();

    // The root node should be present and have the expected value "15"
    const rootText = await treePage.getRootNodeText();
    expect(rootText).not.toBeNull();
    expect(rootText.trim()).toBe('15');
  });

  // Test: All expected node values from the inserted array are present in the DOM
  test('Tree contains all inserted values (15,10,20,5,13,18,25) in the DOM', async () => {
    // Purpose: The BinaryTree inserts values [15,10,20,5,13,18,25] before traversing.
    // Even if an eventual runtime error occurs (observed in later tests), these values should appear in the DOM.
    const expectedValues = ['15', '10', '20', '5', '13', '18', '25'];
    const valuesInDom = await treePage.getAllNodeValues();

    // Every expected value should be present somewhere among the .node elements
    for (const v of expectedValues) {
      expect(valuesInDom).toContain(v);
    }
  });

  // Test: Validate visual nodes presence and styling class usage
  test('Nodes are visible and use the .node CSS class for styling', async ({ page }) => {
    // Purpose: Ensure that node elements are visible to the user and are marked with the .node class.
    const nodeLocator = page.locator('#tree .node');
    const count = await nodeLocator.count();

    // There should be at least one node visible (the root)
    expect(count).toBeGreaterThan(0);

    // The first node should be visible
    await expect(nodeLocator.first()).toBeVisible();

    // Each node should have class "node"
    for (let i = 0; i < Math.min(count, 10); i++) {
      const classAttr = await nodeLocator.nth(i).getAttribute('class');
      expect(classAttr).toMatch(/(^|\s)node(\s|$)/);
    }
  });

  // Test: Confirm that there are no interactive controls (buttons, inputs, forms, etc.) on the page
  test('Page contains no interactive controls (buttons, inputs, forms, selects, textareas)', async () => {
    // Purpose: The provided HTML has no interactive elements. This test asserts that fact.
    const interactiveCount = await treePage.getInteractiveControlCount();
    expect(interactiveCount).toBe(0);
  });

  // Test: The implementation contains an infinite recursion bug that should produce a stack overflow (RangeError)
  test('Page should emit a runtime error (likely RangeError: Maximum call stack size exceeded) due to infinite recursion', async () => {
    // Purpose: The BinaryTree._displayTree implementation does not stop recursing for arrays of nulls,
    // which leads to unbounded recursion and a stack overflow. We observe page errors and console errors.
    // Assert that at least one pageerror has been recorded and that its message indicates a stack overflow.
    const pageErrors = treePage.getPageErrors();
    const consoleErrors = treePage.getConsoleErrors();

    // Wait briefly to ensure any asynchronous error events have been captured.
    // (Most errors from this script are synchronous during load, but we give a small margin.)
    await new Promise(res => setTimeout(res, 250));

    // There should be at least one page error captured
    expect(pageErrors.length).toBeGreaterThanOrEqual(1);

    // At least one of the page errors should look like a stack overflow / maximum call stack message
    const stackOverflowPattern = /(Maximum call stack size exceeded|call stack|RangeError)/i;
    const foundStackError = pageErrors.some(err => stackOverflowPattern.test(err.message || '') || stackOverflowPattern.test(err.stack || ''));
    expect(foundStackError).toBeTruthy();

    // Also inspect console.error messages for similar content (some runtimes log the error to console)
    const foundConsoleStackError = consoleErrors.some(e => stackOverflowPattern.test(e.text || ''));
    // It is acceptable if console.error didn't capture it; we only assert that either pageErrors or consoleErrors show stack overflow.
    expect(foundConsoleStackError || foundStackError).toBeTruthy();
  });

  // Test: The tree levels are present and non-zero (basic structural check)
  test('Tree levels are created in the DOM (basic structural check)', async () => {
    // Purpose: Ensure the traversal created at least one .level container and that level count is sensible.
    const levelCount = await treePage.getLevelCount();
    // There should be at least one level; realistically this will be multiple levels for the inserted values.
    expect(levelCount).toBeGreaterThanOrEqual(1);

    // For debugging clarity, capture the number of levels and nodes (not an assertion on exact depth due to crash timing)
    const nodes = await treePage.getAllNodeValues();
    // At least the root is expected
    expect(nodes.length).toBeGreaterThanOrEqual(1);
  });

  // After each test we optionally log captured errors to the test output (helps debugging failing CI runs).
  test.afterEach(async ({}, testInfo) => {
    // Attach captured runtime errors and console messages to the test report for visibility
    if (treePage) {
      const pageErrors = treePage.getPageErrors();
      const consoleMessages = treePage.getConsoleMessages();

      if (pageErrors.length) {
        for (const err of pageErrors) {
          testInfo.attach('page-error', {
            body: `${err.message}\n\n${err.stack || ''}`,
            contentType: 'text/plain'
          }).catch(() => {});
        }
      }

      if (consoleMessages.length) {
        testInfo.attach('console-messages', {
          body: consoleMessages.map(m => `[${m.type}] ${m.text}`).join('\n'),
          contentType: 'text/plain'
        }).catch(() => {});
      }
    }
  });
});