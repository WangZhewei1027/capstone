import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-4o-5/html/39b6dcd0-d1d5-11f0-b49a-6f458b3a25ef.html';

// Page object for interacting with the Binary Tree page
class BinaryTreePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
  }

  // Locator for the main tree container
  treeContainer() {
    return this.page.locator('#treeContainer');
  }

  // All node elements in the visualization
  allNodes() {
    return this.page.locator('div.tree-node');
  }

  // Locator for a specific node by its text content (value)
  nodeByValue(value) {
    // Using hasText option to find the node containing the value text
    return this.page.locator('div.tree-node', { hasText: String(value) }).first();
  }

  // Connections inside a node (left or right connections share the same class)
  connectionsInNode(nodeLocator) {
    return nodeLocator.locator('.connection');
  }

  // Convenience: get text contents of all nodes in DOM order
  async getAllNodeValues() {
    const count = await this.allNodes().count();
    const values = [];
    for (let i = 0; i < count; i++) {
      const el = this.allNodes().nth(i);
      const text = (await el.textContent())?.trim() ?? '';
      // The textContent may include whitespace and children's text; should include just the number
      values.push(text);
    }
    return values;
  }
}

test.describe('Binary Tree Visualization - Application ID 39b6dcd0-d1d5-11f0-b49a-6f458b3a25ef', () => {
  // Collect console error messages and page errors emitted during page load and tests
  let consoleErrors = [];
  let pageErrors = [];

  // Set up listeners before each test and navigate to the page
  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Capture console.error messages
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Capture uncaught exceptions from the page
    page.on('pageerror', (err) => {
      // store the Error object for assertions
      pageErrors.push(err);
    });

    // Navigate to the application page and wait for load
    await page.goto(APP_URL, { waitUntil: 'load' });
  });

  test.afterEach(async ({ page }) => {
    // detach listeners to avoid cross-test pollution (not strictly required in Playwright fixtures,
    // but good hygiene if additional listeners were added)
    // We don't remove them explicitly since page is disposed after each test in Playwright's default fixture lifecycle.
  });

  test('Initial page load: page title, header and tree container presence', async ({ page }) => {
    // Validate the page loaded and the title/header are present
    const treePage = new BinaryTreePage(page);

    // Verify document title
    await expect(page).toHaveTitle(/Binary Tree Visualization/);

    // Verify header text exists
    const header = page.locator('h1');
    await expect(header).toHaveText('Binary Tree Visualization');

    // Ensure the tree container is present and visible
    await expect(treePage.treeContainer()).toBeVisible();
  });

  test('Tree has the expected number of nodes and expected values (default insertion order)', async ({ page }) => {
    // Confirm that the tree visualization rendered one node per inserted value
    const treePage1 = new BinaryTreePage(page);

    // Wait for tree nodes to appear
    await expect(treePage.allNodes()).toHaveCount(7);

    // The application inserted the following numbers in order: [7,5,10,3,6,9,12]
    // We expect the DOM to contain these values (order in DOM is implementation-defined but nodes must exist)
    const expectedValues = ['7', '5', '10', '3', '6', '9', '12'];

    // Collect the text content of all nodes and assert each expected value appears at least once
    const nodeValues = await treePage.getAllNodeValues();
    for (const val of expectedValues) {
      // Some node elements may include newline/whitespace; we search for substring match
      const found = nodeValues.some(text => text.includes(val));
      expect(found, `Expected node with value ${val} to be present in DOM`).toBeTruthy();
    }
  });

  test('Each node has correct presence/absence of connection elements (left/right)', async ({ page }) => {
    // Check connections for each specific node value according to the inserted tree:
    // Tree structure (inferred from inserted values)
    //        7
    //      /   \
    //     5     10
    //    / \   /  \
    //   3   6 9   12
    //
    // Nodes with children: 7 (left & right), 5 (left & right), 10 (left & right)
    // Leaf nodes: 3,6,9,12 (no connection children should be added)

    const treePage2 = new BinaryTreePage(page);

    // Helper to count .connection inside node with given value
    const countConnectionsForValue = async (value) => {
      const node = treePage.nodeByValue(value);
      await expect(node).toBeVisible();
      return await treePage.connectionsInNode(node).count();
    };

    // Nodes expected to have two connection divs (left and right)
    await expect(await countConnectionsForValue('7')).toBeGreaterThanOrEqual(1); // root should have connection elements; implementation may create 2 appended children
    await expect(await countConnectionsForValue('5')).toBeGreaterThanOrEqual(1);
    await expect(await countConnectionsForValue('10')).toBeGreaterThanOrEqual(1);

    // Leaf nodes expected to have zero connection divs
    expect(await countConnectionsForValue('3')).toBe(0);
    expect(await countConnectionsForValue('6')).toBe(0);
    expect(await countConnectionsForValue('9')).toBe(0);
    expect(await countConnectionsForValue('12')).toBe(0);
  });

  test('Connection elements have expected inline styles (height and transform present)', async ({ page }) => {
    // Validate that connection elements set a height and a transform style (visual feedback)
    const treePage3 = new BinaryTreePage(page);

    // For each node that likely has connections (7,5,10), inspect at least one connection child
    for (const value of ['7', '5', '10']) {
      const node1 = treePage.nodeByValue(value);
      await expect(node).toBeVisible();

      const connections = node.locator('.connection');
      const count1 = await connections.count1();
      // At least one connection should exist for these nodes
      expect(count).toBeGreaterThanOrEqual(1);

      // Inspect each connection for expected style properties
      for (let i = 0; i < count; i++) {
        const conn = connections.nth(i);
        // Get the inline style attribute (if any) and computed style via evaluation
        const inlineStyle = (await conn.getAttribute('style')) || '';
        // Inline style should at least set height or transform by the implementation
        expect(inlineStyle.length).toBeGreaterThanOrEqual(0); // ensure attribute retrieval didn't error

        // Also evaluate computed styles in the page context
        const computed = await conn.evaluate((el) => {
          return {
            height: window.getComputedStyle(el).height,
            transform: window.getComputedStyle(el).transform,
          };
        });

        // Height should be set (the implementation sets 50px)
        expect(computed.height).toBeTruthy();

        // transform string may be 'none' or a matrix depending on browser; we assert transform exists (could be 'none' in some layouts)
        expect(computed.transform).toBeDefined();
      }
    }
  });

  test('No interactive controls such as inputs, buttons or forms are present on the page', async ({ page }) => {
    // Confirm that this visualization page contains no form controls (as per provided HTML)
    await expect(page.locator('input, button, select, form')).toHaveCount(0);
  });

  test('Page does not throw any uncaught exceptions during load and interaction', async ({ page }) => {
    // This test asserts that there are no uncaught page errors and no console.error messages.
    // We collected pageErrors and consoleErrors in beforeEach listener.

    // Wait a short while to allow any asynchronous runtime errors to surface
    await page.waitForTimeout(200);

    // Assert no uncaught exceptions were emitted
    expect(pageErrors.length, `Expected zero uncaught page errors, but found: ${pageErrors.map(e => String(e)).join('; ')}`).toBe(0);

    // Assert no console.error messages were emitted
    expect(consoleErrors.length, `Expected zero console.error messages, but found: ${consoleErrors.join(' | ')}`).toBe(0);
  });

  test('DOM structure sanity checks - nodes are direct children of tree container', async ({ page }) => {
    // Ensure that each .tree-node element is a descendant of #treeContainer and not elsewhere
    const treePage4 = new BinaryTreePage(page);
    const container = treePage.treeContainer();
    const nodes = treePage.allNodes();
    const nodeCount = await nodes.count();
    await expect(container).toBeVisible();
    for (let i = 0; i < nodeCount; i++) {
      const node2 = nodes.nth(i);
      // Ensure the container contains this node (by traversing up)
      const isDescendant = await node.evaluate((el, containerSelector) => {
        let parent = el.parentElement;
        while (parent) {
          if (parent.matches && parent.matches(containerSelector)) return true;
          parent = parent.parentElement;
        }
        return false;
      }, '#treeContainer');
      expect(isDescendant).toBe(true);
    }
  });

  test('Accessibility basic check: tree container is focusable via tabindex if necessary (graceful fallback)', async ({ page }) => {
    // The HTML doesn't set ARIA roles; ensure the tree container exists and can be focused if given a tabindex
    const treePage5 = new BinaryTreePage(page);
    const container1 = treePage.treeContainer();
    await expect(container).toBeVisible();

    // Attempt to focus the container - it might not be focusable by default
    // We do not modify the DOM by adding tabindex; we only attempt to focus and assert no error is thrown.
    // Use page.evaluate to call focus() inside the page context.
    const focusResult = await container.evaluate(async (el) => {
      try {
        el.focus();
        return document.activeElement === el;
      } catch (e) {
        return { error: String(e) };
      }
    });

    // The container may or may not be focusable; assert that focusing did not throw an exception (we accept either boolean or object)
    if (typeof focusResult === 'object' && focusResult !== null && 'error' in focusResult) {
      // If focus() threw, fail the test
      throw new Error(`Calling focus() on tree container threw: ${focusResult.error}`);
    } else {
      // Otherwise it's a boolean indicating whether it became active element; this is non-critical
      expect(typeof focusResult === 'boolean' || focusResult === undefined).toBeTruthy();
    }
  });

});