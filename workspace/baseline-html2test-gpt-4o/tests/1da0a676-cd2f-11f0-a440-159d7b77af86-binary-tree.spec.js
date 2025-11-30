import { test, expect } from '@playwright/test';

// Test file for Binary Tree Visualization
// Application URL:
// http://127.0.0.1:5500/workspace/html2test/html/1da0a676-cd2f-11f0-a440-159d7b77af86.html

// Page Object representing the Binary Tree page and common operations
class BinaryTreePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
  }

  // Get all tree node elements
  async getNodeElements() {
    return this.page.$$('.tree-node');
  }

  // Get text values of all tree nodes as an array of strings
  async getNodeTexts() {
    const nodes = await this.getNodeElements();
    return Promise.all(nodes.map(async (n) => (await n.innerText()).trim()));
  }

  // Get count of connector elements
  async getConnectorCount() {
    return this.page.$$eval('.tree-connector', els => els.length);
  }

  // Programmatically insert a value into the tree using the page's global `tree` object
  // This calls window.tree.insert(value) and then window.tree.visualize()
  async insertValue(value) {
    return this.page.evaluate((v) => {
      // Intentionally call into the page's script as-is (do not patch or redefine)
      if (!window.tree || typeof window.tree.insert !== 'function') {
        // Let this throw naturally if tree is not available - test harness will capture page errors
        throw new Error('tree object or insert method not found on window');
      }
      window.tree.insert(v);
      // Re-render visualization
      if (typeof window.tree.visualize === 'function') {
        window.tree.visualize();
      }
    }, value);
  }

  // Re-run visualization without changing data
  async visualize() {
    return this.page.evaluate(() => {
      if (!window.tree || typeof window.tree.visualize !== 'function') {
        throw new Error('tree object or visualize method not found on window');
      }
      window.tree.visualize();
    });
  }

  // Convenience: get presence/absence of interactive controls on the page
  async countInteractiveControls() {
    return this.page.$$eval('input, button, form, select, textarea', els => els.length);
  }
}

test.describe('Binary Tree Visualization - 1da0a676-cd2f-11f0-a440-159d7b77af86', () => {
  const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/1da0a676-cd2f-11f0-a440-159d7b77af86.html';

  // Arrays to capture console error messages and uncaught page errors during navigation and tests
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    // Initialize collectors for each test so we're not sharing state between tests
    consoleErrors = [];
    pageErrors = [];

    // Capture console.error messages
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push({ text: msg.text(), location: msg.location() });
      }
    });

    // Capture uncaught exceptions on the page (pageerror)
    page.on('pageerror', (error) => {
      // Save the error object string for examination/assertions
      pageErrors.push(error);
    });

    // Navigate to the application page; we set listeners before navigation to catch any load-time errors
    await page.goto(APP_URL, { waitUntil: 'load' });
  });

  test.afterEach(async ({ page }) => {
    // Basic teardown: clear listeners (Playwright auto-cleans but keep explicit)
    page.removeAllListeners('console');
    page.removeAllListeners('pageerror');
  });

  test('Initial page load shows title and the tree container', async ({ page }) => {
    // Purpose: Verify the page loaded, title is present, and the tree container exists
    const treePage = new BinaryTreePage(page);

    // Check page title h1
    const title = await page.locator('h1').innerText();
    expect(title).toBe('Binary Tree Visualization');

    // The tree container should exist and be visible
    const container = page.locator('#tree-container');
    await expect(container).toBeVisible();

    // Verify no unexpected interactive controls are present on the page
    const interactiveCount = await treePage.countInteractiveControls();
    // There are no interactive controls in this HTML; assert zero
    expect(interactiveCount).toBe(0);

    // Verify console and page errors - there should be none on a clean run
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Tree visualization initial nodes and content match expected values', async ({ page }) => {
    // Purpose: Ensure the correct number of nodes are rendered and values match the inserted values
    const treePage = new BinaryTreePage(page);

    // Expected values inserted by the page script
    const expectedValues = ['8', '3', '10', '1', '6', '14', '4', '7', '13'];

    // Get node texts
    const nodeTexts = await treePage.getNodeTexts();

    // There should be exactly as many .tree-node elements as values inserted
    expect(nodeTexts.length).toBe(expectedValues.length);

    // The set of displayed values should match the expected set (order in DOM is traversal order based on visualize)
    const sortedDisplayed = [...nodeTexts].sort((a, b) => Number(a) - Number(b));
    const sortedExpected = [...expectedValues].sort((a, b) => Number(a) - Number(b));
    expect(sortedDisplayed).toEqual(sortedExpected);

    // The root node (first .tree-node appended in the container) should contain the root value '8'
    const firstNodeText = nodeTexts[0];
    expect(firstNodeText).toBe('8');

    // Verify there is a connector for each node (visualize inserts one .tree-connector per node)
    const connectorCount = await treePage.getConnectorCount();
    expect(connectorCount).toBe(nodeTexts.length);

    // No runtime errors (console/page) during this verification
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Programmatic insertion of a new value updates the DOM and increases node count', async ({ page }) => {
    // Purpose: Insert a new value into the tree using the page's tree API and verify the DOM updates
    const treePage = new BinaryTreePage(page);

    // Insert value 5 which should become a node in the tree
    await treePage.insertValue(5);

    // After insertion and visualization, expect one more node in the DOM
    const nodeTextsAfter = await treePage.getNodeTexts();
    expect(nodeTextsAfter.length).toBe(10);

    // The new value '5' should be present among node texts
    expect(nodeTextsAfter).toContain('5');

    // Confirm connectors count matches new node count
    const connectorCountAfter = await treePage.getConnectorCount();
    expect(connectorCountAfter).toBe(nodeTextsAfter.length);

    // Ensure no console errors or page errors occurred during insertion & visualization
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Inserting a duplicate value increments node count and duplicate value appears', async ({ page }) => {
    // Purpose: Validate behavior when inserting a duplicate value (equal values should go to the right)
    const treePage = new BinaryTreePage(page);

    // Insert duplicate of existing value 10
    await treePage.insertValue(10);

    // The DOM should now have one extra node (original 9 + 1)
    const nodeTexts = await treePage.getNodeTexts();
    expect(nodeTexts.length).toBe(10);

    // There should be at least one '10' already; after insertion there should be at least two
    const occurrencesOf10 = nodeTexts.filter(t => t === '10').length;
    expect(occurrencesOf10).toBeGreaterThanOrEqual(2);

    // No console or page errors occurred
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Calling visualize repeatedly is idempotent and does not duplicate nodes', async ({ page }) => {
    // Purpose: Ensure multiple visualize() calls do not duplicate DOM nodes
    const treePage = new BinaryTreePage(page);

    // Capture initial node count
    const initialTexts = await treePage.getNodeTexts();
    const initialCount = initialTexts.length;

    // Call visualize multiple times
    await treePage.visualize();
    await treePage.visualize();
    await treePage.visualize();

    // Node count should remain unchanged after repeated visualization calls
    const afterTexts = await treePage.getNodeTexts();
    expect(afterTexts.length).toBe(initialCount);

    // The set of texts should remain the same (order may vary based on rendering but counts should match)
    const sortedBefore = [...initialTexts].sort();
    const sortedAfter = [...afterTexts].sort();
    expect(sortedAfter).toEqual(sortedBefore);

    // Confirm no console/page errors
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Structure sanity: every .tree-node should have a following .tree-connector sibling in the DOM', async ({ page }) => {
    // Purpose: Verify the HTML structure created by visualizeNode() where each node is followed by a connector
    const treePage = new BinaryTreePage(page);

    // Evaluate in page context to check sibling relationships without altering the page
    const mismatchedNodes = await page.evaluate(() => {
      const nodes = Array.from(document.querySelectorAll('.tree-node'));
      const problems = [];
      nodes.forEach((node) => {
        const next = node.nextElementSibling;
        if (!next || !next.classList.contains('tree-connector')) {
          problems.push({
            nodeText: node.innerText,
            hasConnector: !!(next && next.classList.contains('tree-connector'))
          });
        }
      });
      return problems;
    });

    // There should be no nodes that lack a connector sibling
    expect(mismatchedNodes.length).toBe(0);

    // Ensure no console/page errors were emitted during structural check
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Observe console and page errors: capture and report any ReferenceError/SyntaxError/TypeError', async ({ page }) => {
    // Purpose: Explicitly examine captured console and page errors for specific error types
    // We do not inject or modify the page; just inspect what was captured during navigation and prior tests
    // Gather message texts from console errors
    const consoleTexts = consoleErrors.map(e => e.text);

    // Gather page error names (if any)
    const pageErrorNames = pageErrors.map(e => (e && e.name) ? e.name : String(e));

    // Assert that there are no SyntaxError, ReferenceError, or TypeError captured.
    // If such errors exist, fail the test and include the details to help debugging.
    const forbidden = ['ReferenceError', 'SyntaxError', 'TypeError'];
    const foundInConsole = consoleTexts.filter(text => forbidden.some(f => text.includes(f)));
    const foundInPageErrors = pageErrorNames.filter(name => forbidden.includes(name));

    expect(foundInConsole.length, `Unexpected console errors: ${JSON.stringify(consoleTexts)}`).toBe(0);
    expect(foundInPageErrors.length, `Unexpected page errors: ${JSON.stringify(pageErrorNames)}`).toBe(0);
  });
});