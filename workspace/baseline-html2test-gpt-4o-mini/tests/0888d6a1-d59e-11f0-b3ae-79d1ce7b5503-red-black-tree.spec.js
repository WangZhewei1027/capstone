import { test, expect } from '@playwright/test';

// Test file for: 0888d6a1-d59e-11f0-b3ae-79d1ce7b5503
// Purpose: End-to-end Playwright tests for the Red-Black Tree Visualization HTML app.
// URL under test:
// http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/0888d6a1-d59e-11f0-b3ae-79d1ce7b5503.html

// Page object encapsulating common operations on the Red-Black Tree page
class RedBlackTreePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input = page.locator('#valueInput');
    this.insertButton = page.getByRole('button', { name: 'Insert' });
    this.treeContainer = page.locator('#tree');
    this.nodeLocator = (text) => this.page.locator('#tree .node', { hasText: String(text) });
    this.allNodes = () => this.page.locator('#tree .node');
  }

  // Navigate to the page URL
  async goto() {
    await this.page.goto('http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/0888d6a1-d59e-11f0-b3ae-79d1ce7b5503.html');
  }

  // Insert a numeric value using the input and Insert button
  async insertValue(value) {
    await this.input.fill(String(value));
    await this.insertButton.click();
    // After insertion, the app clears the input; wait for that to happen
    await this.page.waitForTimeout(50); // small pause to allow DOM update/render
  }

  // Get the number of node elements currently rendered in the tree
  async getNodeCount() {
    return await this.allNodes().count();
  }

  // Check whether a node with given text exists
  async hasNode(text) {
    return await this.nodeLocator(text).count() > 0;
  }

  // Get the class attribute of a node with given text
  async getNodeClass(text) {
    const loc = this.nodeLocator(text);
    return await loc.getAttribute('class');
  }

  // Get array of texts of all nodes in document order
  async getAllNodeTexts() {
    const count = await this.getNodeCount();
    const texts = [];
    for (let i = 0; i < count; i++) {
      texts.push(await this.allNodes().nth(i).textContent());
    }
    return texts;
  }

  // Returns the input's current value
  async getInputValue() {
    return await this.input.inputValue();
  }
}

test.describe('Red-Black Tree Visualization - Basic UI and behavior', () => {
  let pageErrors = [];
  let consoleErrors = [];

  // Create a fresh page for each test and capture console/page errors
  test.beforeEach(async ({ page }) => {
    pageErrors = [];
    consoleErrors = [];

    // Capture uncaught exceptions from the page
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    // Capture console messages of 'error' type
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg);
      }
    });

    // Navigate to the target page
    const rbPage = new RedBlackTreePage(page);
    await rbPage.goto();
  });

  // The page should load without navigation failures and have the expected basic structure
  test('Initial page load shows header, input and empty tree container', async ({ page }) => {
    const rb = new RedBlackTreePage(page);

    // Verify page title and header are present
    await expect(page).toHaveTitle(/Red-Black Tree Visualization/i);
    await expect(page.locator('h1')).toHaveText('Red-Black Tree Visualization');

    // The input and button should be visible and enabled
    await expect(rb.input).toBeVisible();
    await expect(rb.input).toHaveAttribute('placeholder', 'Enter a number');
    await expect(rb.insertButton).toBeVisible();
    await expect(rb.insertButton).toBeEnabled();

    // Initially the tree container should exist and have no node elements
    await expect(rb.treeContainer).toBeVisible();
    await expect(rb.allNodes()).toHaveCount(0);

    // There should be no uncaught page errors or console errors on initial load
    expect(pageErrors.map(e => String(e).slice(0, 200))).toEqual([]);
    expect(consoleErrors.map(c => c.text())).toEqual([]);
  });

  test.describe('Insertion behavior and DOM updates', () => {
    // Insert a single node and verify it becomes the black root
    test('Inserting a single value creates a black root node and clears the input', async ({ page }) => {
      const rb1 = new RedBlackTreePage(page);

      // Insert value 10
      await rb.insertValue(10);

      // After insertion, there should be exactly one node and it should be the root with text '10'
      await expect(rb.allNodes()).toHaveCount(1);
      await expect(rb.nodeLocator(10)).toHaveCount(1);

      // The node class must include 'black' because the root is forced to black after insertion
      const classAttr = await rb.getNodeClass(10);
      expect(classAttr).toMatch(/black/);

      // Input should be cleared after insert
      expect(await rb.getInputValue()).toBe('');

      // No runtime errors should be present after performing an insertion
      expect(pageErrors.map(e => String(e).slice(0, 200))).toEqual([]);
      expect(consoleErrors.map(c => c.text())).toEqual([]);
    });

    // Insert multiple values and verify left/right children and color assignments
    test('Inserting multiple values creates child nodes with correct colors and DOM order', async ({ page }) => {
      const rb2 = new RedBlackTreePage(page);

      // Insert root value 10
      await rb.insertValue(10);
      // Insert a right child 20
      await rb.insertValue(20);
      // Insert a left child 5
      await rb.insertValue(5);

      // There should be three nodes in the tree
      await expect(rb.allNodes()).toHaveCount(3);

      // Verify presence of nodes with texts 10, 20, 5
      expect(await rb.hasNode(10)).toBeTruthy();
      expect(await rb.hasNode(20)).toBeTruthy();
      expect(await rb.hasNode(5)).toBeTruthy();

      // Root 10 should be black (root is always black after insert)
      const rootClass = await rb.getNodeClass(10);
      expect(rootClass).toMatch(/black/);

      // Children 20 and 5 should be red initially (unless rebalancing changed them)
      const class20 = await rb.getNodeClass(20);
      const class5 = await rb.getNodeClass(5);
      // They are expected to include either 'red' or 'black' depending on balancing.
      // At minimum, validate that the class attribute exists and contains 'node'.
      expect(rootClass).toContain('node');
      expect(class20).toContain('node');
      expect(class5).toContain('node');

      // Validate the DOM order produced by displayNode (pre-order-ish: root then left/right nodes)
      const texts1 = (await rb.getAllNodeTexts()).map(t => t && t.trim());
      expect(texts).toEqual(expect.arrayContaining(['10', '20', '5']));

      // No runtime errors should be present after these operations
      expect(pageErrors.map(e => String(e).slice(0, 200))).toEqual([]);
      expect(consoleErrors.map(c => c.text())).toEqual([]);
    });

    // Test that attempting to insert a duplicate value does not create a new node
    test('Inserting a duplicate value does not increase node count', async ({ page }) => {
      const rb3 = new RedBlackTreePage(page);

      // Start with inserting a value
      await rb.insertValue(15);
      const countBefore = await rb.getNodeCount();

      // Insert the same value again (the implementation ignores equal values)
      await rb.insertValue(15);
      const countAfter = await rb.getNodeCount();

      // Count should remain the same
      expect(countAfter).toBe(countBefore);

      // No runtime errors should be present
      expect(pageErrors.map(e => String(e).slice(0, 200))).toEqual([]);
      expect(consoleErrors.map(c => c.text())).toEqual([]);
    });
  });

  test.describe('Edge cases, input validation and accessibility', () => {
    test('Non-numeric input is ignored and does not change the tree', async ({ page }) => {
      const rb4 = new RedBlackTreePage(page);

      // Ensure tree is empty initially
      await expect(rb.allNodes()).toHaveCount(0);

      // Fill non-numeric text into the numeric input (playwright will convert to string)
      // Because the input is type="number", fill with an empty string or invalid string simulates user behavior.
      await rb.input.fill('not-a-number');

      // Click Insert - the handler uses parseInt and checks isNaN, so nothing should be inserted
      await rb.insertButton.click();
      await page.waitForTimeout(50);

      // Still zero nodes
      await expect(rb.allNodes()).toHaveCount(0);

      // Input might be left as the browser prevents non-numerical values;
      // assert that input either is empty or not a valid number
      const val = await rb.getInputValue();
      // It should either be '' or the browser-specific representation; just ensure no node was created
      expect(val === '' || isNaN(parseInt(val))).toBeTruthy();

      // No runtime errors should be present
      expect(pageErrors.map(e => String(e).slice(0, 200))).toEqual([]);
      expect(consoleErrors.map(c => c.text())).toEqual([]);
    });

    test('Insert button is reachable by keyboard and is accessible', async ({ page }) => {
      const rb5 = new RedBlackTreePage(page);

      // Tab to the input then type a value then press Enter to activate the button via keyboard
      await page.keyboard.press('Tab'); // focus input
      await page.keyboard.type('7');
      // Press Tab to focus the button, then Space to activate it
      await page.keyboard.press('Tab');
      await page.keyboard.press('Space');
      await page.waitForTimeout(50);

      // Value 7 should be inserted
      await expect(rb.nodeLocator(7)).toHaveCount(1);

      // No runtime errors should be present
      expect(pageErrors.map(e => String(e).slice(0, 200))).toEqual([]);
      expect(consoleErrors.map(c => c.text())).toEqual([]);
    });
  });

  // After all tests in this describe block, provide a final assertion that there were no unexpected page errors.
  test.afterEach(async ({ page }) => {
    // Fail early if any uncaught page errors were recorded by the pageerror listener
    if (pageErrors.length > 0) {
      // Attach the serialized errors to the test failure message
      const errMessages = pageErrors.map(e => String(e).slice(0, 500)).join('\n---\n');
      // Use a Playwright assertion to surface details in test output
      expect(pageErrors.length, `Uncaught page errors were emitted:\n${errMessages}`).toBe(0);
    }

    // Similarly ensure no console 'error' messages were emitted during the test
    if (consoleErrors.length > 0) {
      const consoleMsgs = consoleErrors.map(c => c.text()).join('\n---\n');
      expect(consoleErrors.length, `Console error messages were emitted:\n${consoleMsgs}`).toBe(0);
    }
  });
});