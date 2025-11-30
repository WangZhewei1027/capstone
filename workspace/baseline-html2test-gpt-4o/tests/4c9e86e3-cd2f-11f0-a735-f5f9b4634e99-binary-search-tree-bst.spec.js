import { test, expect } from '@playwright/test';

// Page object for the BST visualization page
class BSTPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
  }

  // Navigate to the page under test
  async goto() {
    await this.page.goto('http://127.0.0.1:5500/workspace/html2test/html/4c9e86e3-cd2f-11f0-a735-f5f9b4634e99.html', { waitUntil: 'domcontentloaded' });
  }

  // Return the page title
  async title() {
    return this.page.title();
  }

  // Return the h1 text
  async headingText() {
    return this.page.locator('h1').innerText();
  }

  // Get all node elements (.node)
  nodes() {
    return this.page.locator('#bst .node');
  }

  // Get all connector elements (.connector)
  connectors() {
    return this.page.locator('#bst .connector');
  }

  // Get count of interactive controls (inputs, buttons, selects, forms)
  async interactiveControlsCount() {
    const selector = 'input, button, select, textarea, form';
    return this.page.locator(selector).count();
  }

  // Get textual content of all nodes in order they appear in DOM
  async nodeTexts() {
    return this.page.$$eval('#bst .node', nodes => nodes.map(n => n.innerText.trim()));
  }

  // Get wrappers inside #bst (direct children)
  async wrappers() {
    return this.page.locator('#bst > div');
  }

  // Return collected console messages of a given type
  // (This is handled in tests via listeners, but helper left for completeness)
}

/**
 * Test Suite for Binary Search Tree (BST) Visualization
 *
 * These tests:
 * - Verify the initial rendered state of the BST
 * - Verify DOM structure (nodes, connectors, wrappers)
 * - Assert there are no interactive controls
 * - Attempt to access page-scoped variables to observe natural ReferenceError
 * - Observe console and page errors produced on load
 */

test.describe('Binary Search Tree (BST) Visualization (4c9e86e3...)', () => {
  // Arrays to collect console messages and page errors
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Collect console messages for inspection
    page.on('console', msg => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text()
      });
    });

    // Collect uncaught page errors (runtime exceptions in page)
    page.on('pageerror', err => {
      pageErrors.push({
        name: err.name,
        message: err.message,
        stack: err.stack
      });
    });
  });

  // Test initial page load and default state
  test('Initial load renders BST nodes in in-order (sorted) and correct counts', async ({ page }) => {
    const bst = new BSTPage(page);
    await bst.goto();

    // Basic page identity checks
    await expect(bst.title()).resolves.toContain('Binary Search Tree');
    await expect(bst.headingText()).resolves.toBe('Binary Search Tree (BST) Visualization');

    // There should be nine nodes based on the implementation's nums array
    const nodeCount = await bst.nodes().count();
    expect(nodeCount).toBe(9);

    // The inorder traversal implemented in the page should render nodes in ascending order
    const texts = await bst.nodeTexts();
    // Expected sorted ascending values from the given nums array
    const expected = ['1','3','4','6','7','8','10','13','14'];
    expect(texts).toEqual(expected);

    // Each node should have an associated connector (implementation appends a connector for each node)
    const connectorCount = await bst.connectors().count();
    expect(connectorCount).toBe(nodeCount);

    // Check that wrappers exist and each wrapper contains one connector followed by a node
    const wrapperCount = await bst.wrappers().count();
    expect(wrapperCount).toBe(nodeCount);

    // Verify for a few wrappers structure: first child is connector then node
    for (let i = 0; i < Math.min(3, wrapperCount); i++) {
      const wrapper = bst.wrappers().nth(i);
      const childCount = await wrapper.locator(':scope > *').count();
      // Expect at least 2 children (connector + node)
      expect(childCount).toBeGreaterThanOrEqual(2);

      // First visible child should have class 'connector'
      const firstChild = wrapper.locator(':scope > *').nth(0);
      const firstClass = await firstChild.getAttribute('class');
      expect(firstClass).toContain('connector');

      // Second child should be the node and contain the expected text
      const secondChild = wrapper.locator(':scope > *').nth(1);
      const secondClass = await secondChild.getAttribute('class');
      expect(secondClass).toContain('node');
      // Ensure the node's text matches the precomputed list in-order
      const nodeText = await secondChild.innerText();
      expect(expected).toContain(nodeText.trim());
    }
  });

  // Test that there are no interactive controls on the page (as per the provided HTML)
  test('Page contains no interactive controls (inputs, buttons, selects, forms)', async ({ page }) => {
    const bst = new BSTPage(page);
    await bst.goto();

    // The HTML implementation does not include forms/inputs/buttons; assert none exist
    const interactiveCount = await bst.interactiveControlsCount();
    expect(interactiveCount).toBe(0);
  });

  // Edge case: Attempt to access the page-scoped 'bst' identifier from the test context.
  // The script defines `const bst = new BinarySearchTree();` at top-level in a non-module script.
  // Top-level const/let do NOT attach to window; attempting to reference `bst` directly in page
  // context should produce a ReferenceError. We intentionally let this happen naturally and assert.
  test('Accessing top-level page identifier "bst" should produce a ReferenceError when referenced directly', async ({ page }) => {
    await page.goto('http://127.0.0.1:5500/workspace/html2test/html/4c9e86e3-cd2f-11f0-a735-f5f9b4634e99.html', { waitUntil: 'domcontentloaded' });

    // Attempt to directly evaluate `bst` in page context; this is expected to reject with a ReferenceError.
    let caught = null;
    try {
      // This will throw because `bst` is not a declared global variable accessible via the function scope of page.evaluate
      await page.evaluate(() => bst);
    } catch (err) {
      caught = err;
    }

    // Ensure an error was thrown and it's a ReferenceError (message depends on engine but typically contains 'bst is not defined' or 'ReferenceError')
    expect(caught).not.toBeNull();
    // The Playwright error message includes the original error text; check it mentions ReferenceError or 'bst' undefined
    const message = caught.message || '';
    const isReferenceError = message.includes('ReferenceError') || message.toLowerCase().includes('bst is not defined') || message.toLowerCase().includes('is not defined');
    expect(isReferenceError).toBeTruthy();
  });

  // Verify that loading the page does not produce unexpected page errors or console error messages
  test('No runtime page errors or console "error" messages on initial load', async ({ page }) => {
    const bst = new BSTPage(page);
    await bst.goto();

    // Allow a short time for any deferred errors to surface
    await page.waitForTimeout(100);

    // pageErrors array should be empty (no uncaught exceptions during load)
    expect(pageErrors.length).toBe(0);

    // No console messages of type 'error'
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  // Accessibility / visibility checks for rendered nodes
  test('Rendered nodes are visible and contain numeric text content', async ({ page }) => {
    const bst = new BSTPage(page);
    await bst.goto();

    const count = await bst.nodes().count();
    expect(count).toBeGreaterThan(0);

    // Check visibility and numeric content for each node
    for (let i = 0; i < count; i++) {
      const node = bst.nodes().nth(i);
      await expect(node).toBeVisible();

      const text = (await node.innerText()).trim();
      // Text should be a number string according to implementation
      expect(/^\d+$/.test(text)).toBeTruthy();
    }
  });
});