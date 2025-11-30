import { test, expect } from '@playwright/test';

// Test file: e039f943-cd32-11f0-a949-f901cf5609c9-binary-search-tree-bst.spec.js
// Purpose: Comprehensive end-to-end tests for the BST demo application.
// Note: Tests load the page as-is, observe console and page errors, and assert expected behavior.

// URL where the HTML is served
const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/e039f943-cd32-11f0-a949-f901cf5609c9.html';

// Simple page object to encapsulate repetitive operations and queries
class BSTPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    // Selectors
    this.input = page.locator('#valueInput');
    this.insertBtn = page.locator('#insertBtn');
    this.searchBtn = page.locator('#searchBtn');
    this.inorderBtn = page.locator('#inorderBtn');
    this.preorderBtn = page.locator('#preorderBtn');
    this.postorderBtn = page.locator('#postorderBtn');
    this.clearBtn = page.locator('#clearBtn');
    this.message = page.locator('#message');
    this.treeContainer = page.locator('#tree-container');
    this.svg = this.treeContainer.locator('svg');
  }

  async goto() {
    await this.page.goto(APP_URL, { waitUntil: 'load' });
  }

  // Insert a value via the input and Insert button
  async insert(value) {
    await this.input.fill(String(value));
    await this.insertBtn.click();
  }

  // Click search for a value (input should be set first)
  async search(value) {
    await this.input.fill(String(value));
    await this.searchBtn.click();
  }

  // Trigger traversal buttons
  async clickInorder() {
    await this.inorderBtn.click();
  }
  async clickPreorder() {
    await this.preorderBtn.click();
  }
  async clickPostorder() {
    await this.postorderBtn.click();
  }

  async clear() {
    await this.clearBtn.click();
  }

  async getMessageText() {
    return (await this.message.textContent())?.trim() ?? '';
  }

  // Count number of node circles rendered in the SVG
  async nodeCount() {
    // If no svg exists, return 0
    const svgExists = await this.svg.count();
    if (!svgExists) return 0;
    return await this.svg.locator('circle.node').count();
  }

  // Count number of lines (edges) rendered
  async lineCount() {
    const svgExists1 = await this.svg.count();
    if (!svgExists) return 0;
    return await this.svg.locator('line').count();
  }

  // Get titles (tooltips) from node groups to verify presence of particular nodes
  async getNodeTitles() {
    const svgExists2 = await this.svg.count();
    if (!svgExists) return [];
    return await this.svg.locator('g.node-group').evaluateAll(nodes => nodes.map(n => n.getAttribute('title')));
  }

  // Click a node with given numeric value by finding the g.node-group whose title matches
  async clickNodeByValue(value) {
    const title = `Value: ${value}`;
    const nodeGroup = this.svg.locator(`g.node-group[title="${title}"]`);
    await nodeGroup.click();
  }

  // Return how many circles have 'highlight' class currently
  async highlightedNodeCount() {
    const svgExists3 = await this.svg.count();
    if (!svgExists) return 0;
    return await this.svg.locator('circle.node.highlight').count();
  }

  // Utility: wait until message contains expected substring, with timeout
  async waitForMessageContains(substr, timeout = 10000) {
    await this.page.waitForFunction(
      (sel, expected) => {
        const el = document.querySelector(sel);
        return el && el.textContent && el.textContent.includes(expected);
      },
      '#message',
      substr,
      { timeout }
    );
  }
}

test.describe('Binary Search Tree (BST) Demo - e039f943...', () => {
  let page;
  let bstPage;
  let pageErrors = [];
  let consoleErrors = [];

  // Increase timeout for tests that involve animations/sleep in the page (highlighting uses 700ms steps).
  test.setTimeout(30000);

  test.beforeEach(async ({ browser }) => {
    // Create new context/page per test to isolate state
    const context = await browser.newContext();
    page = await context.newPage();

    // Setup collectors for console errors and page errors
    pageErrors = [];
    consoleErrors = [];

    page.on('pageerror', (err) => {
      // Capture unhandled exceptions from page
      pageErrors.push(err);
    });

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    bstPage = new BSTPage(page);
    await bstPage.goto();
  });

  test.afterEach(async () => {
    // Assert that no page errors or console errors occurred during the test.
    // This ensures we observe and fail on unexpected runtime errors.
    expect(pageErrors, `Page had errors: ${pageErrors.map(e => String(e)).join(' | ')}`).toHaveLength(0);
    expect(consoleErrors, `Console had error messages: ${consoleErrors.join(' | ')}`).toHaveLength(0);

    // Close page/context
    await page.context().close();
  });

  test('Initial page load shows expected structure and default state', async () => {
    // Verify page title and main heading
    await expect(page).toHaveTitle(/Binary Search Tree/i);
    const heading = page.locator('h1');
    await expect(heading).toHaveText('Binary Search Tree (BST) Demo');

    // Controls exist
    await expect(bstPage.input).toBeVisible();
    await expect(bstPage.insertBtn).toBeVisible();
    await expect(bstPage.searchBtn).toBeVisible();
    await expect(bstPage.inorderBtn).toBeVisible();
    await expect(bstPage.preorderBtn).toBeVisible();
    await expect(bstPage.postorderBtn).toBeVisible();
    await expect(bstPage.clearBtn).toBeVisible();

    // Message area is empty by default
    const initialMessage = await bstPage.getMessageText();
    expect(initialMessage).toBe('', 'Expected message area to be empty on load');

    // Tree container initially empty (no svg)
    const nodes = await bstPage.nodeCount();
    expect(nodes).toBe(0);
  });

  test('Insert nodes builds tree visualization and messages update', async () => {
    // Insert a series of values to form a balanced-ish BST
    const values = [50, 30, 70, 20, 40, 60, 80];

    for (let i = 0; i < values.length; i++) {
      const val = values[i];
      // Insert value
      await bstPage.insert(val);

      // Message should confirm insertion (or error for duplicates)
      await bstPage.waitForMessageContains(`Inserted ${val} into BST.`, 3000);
      const messageText = await bstPage.getMessageText();
      expect(messageText).toContain(`Inserted ${val} into BST.`);

      // After insertion, the SVG should have nodes equal to i+1
      const nodeCount = await bstPage.nodeCount();
      expect(nodeCount).toBe(i + 1);
    }

    // After all insertions, check number of lines equals nodes - 1 (a tree with n nodes has n-1 edges)
    const finalNodeCount = await bstPage.nodeCount();
    const lineCount = await bstPage.lineCount();
    expect(finalNodeCount).toBe(values.length);
    expect(lineCount).toBe(values.length - 1);

    // Verify node tooltips/titles include all inserted values
    const titles = await bstPage.getNodeTitles();
    for (const v of values) {
      expect(titles).toContain(`Value: ${v}`);
    }
  });

  test('Inserting a duplicate value yields an error message and does not change tree', async () => {
    // Insert initial value
    await bstPage.insert(42);
    await bstPage.waitForMessageContains('Inserted 42 into BST.', 3000);
    expect(await bstPage.nodeCount()).toBe(1);

    // Attempt duplicate insert
    await bstPage.insert(42);

    // Duplicate should produce an error message indicating already exists
    await bstPage.waitForMessageContains('already exists in the BST', 3000);
    const msg = await bstPage.getMessageText();
    expect(msg).toMatch(/already exists in the BST/);

    // Node count should remain unchanged
    expect(await bstPage.nodeCount()).toBe(1);
  });

  test('Invalid input for insertion shows validation error', async () => {
    // Insert with empty input
    await bstPage.insert(''); // empty
    await bstPage.waitForMessageContains('Please enter a valid number.', 3000);
    let msg1 = await bstPage.getMessageText();
    expect(msg).toBe('Please enter a valid number.');

    // Insert with non-number (page input is type=number so fill with non-digit string still handled by parseInt => NaN)
    await bstPage.input.fill('not-a-number');
    await bstPage.insertBtn.click();
    await bstPage.waitForMessageContains('Please enter a valid number.', 3000);
    msg = await bstPage.getMessageText();
    expect(msg).toBe('Please enter a valid number.');
  });

  test('Search for existing and non-existing values animates and updates message', async () => {
    // Build small tree
    const values1 = [15, 10, 20, 8, 12];
    for (const v of values) {
      await bstPage.insert(v);
      await bstPage.waitForMessageContains(`Inserted ${v} into BST.`, 3000);
    }

    // Search existing value (12)
    await bstPage.search(12);
    // The search code animates highlights and then sets message "Value 12 found in BST."
    await bstPage.waitForMessageContains('found in BST.', 10000);
    let msg2 = await bstPage.getMessageText();
    expect(msg).toContain('Value 12 found in BST.');

    // Ensure no circles remain highlighted at the end of the search (highlight is removed by function)
    expect(await bstPage.highlightedNodeCount()).toBe(0);

    // Search non-existing value (999)
    await bstPage.search(999);
    await bstPage.waitForMessageContains('not found in BST', 10000);
    msg = await bstPage.getMessageText();
    expect(msg).toContain('Value 999 not found in BST.');
    expect(await bstPage.highlightedNodeCount()).toBe(0);
  });

  test('Traversal buttons animate and final completion message is shown', async () => {
    // Insert nodes to have a meaningful traversal
    const values2 = [25, 15, 35, 10, 20, 30, 40];
    for (const v of values) {
      await bstPage.insert(v);
      await bstPage.waitForMessageContains(`Inserted ${v} into BST.`, 3000);
    }

    // In-order traversal
    await bstPage.clickInorder();
    await bstPage.waitForMessageContains('In-order traversal complete.', 15000);
    let msg3 = await bstPage.getMessageText();
    expect(msg).toContain('In-order traversal complete.');

    // Pre-order traversal
    await bstPage.clickPreorder();
    await bstPage.waitForMessageContains('Pre-order traversal complete.', 15000);
    msg = await bstPage.getMessageText();
    expect(msg).toContain('Pre-order traversal complete.');

    // Post-order traversal
    await bstPage.clickPostorder();
    await bstPage.waitForMessageContains('Post-order traversal complete.', 15000);
    msg = await bstPage.getMessageText();
    expect(msg).toContain('Post-order traversal complete.');
  });

  test('Clicking a node highlights it and shows a click message', async () => {
    // Insert couple nodes
    await bstPage.insert(5);
    await bstPage.waitForMessageContains('Inserted 5 into BST.', 3000);
    await bstPage.insert(3);
    await bstPage.waitForMessageContains('Inserted 3 into BST.', 3000);

    // Click on node with value 3
    await bstPage.clickNodeByValue(3);

    // Message should show node clicked
    await bstPage.waitForMessageContains('Node clicked: 3', 3000);
    const msg4 = await bstPage.getMessageText();
    expect(msg).toBe('Node clicked: 3');

    // The clicked circle should have highlight class
    const highlighted = await bstPage.highlightedNodeCount();
    expect(highlighted).toBeGreaterThanOrEqual(1);
  });

  test('Clear button resets the tree and clears visual elements and messages', async () => {
    // Insert a couple nodes
    await bstPage.insert(100);
    await bstPage.waitForMessageContains('Inserted 100 into BST.', 3000);
    await bstPage.insert(50);
    await bstPage.waitForMessageContains('Inserted 50 into BST.', 3000);

    // Ensure nodes are present
    expect(await bstPage.nodeCount()).toBe(2);

    // Click clear
    await bstPage.clear();

    // After clear, tree container should have no svg nodes and message area should be cleared
    expect(await bstPage.nodeCount()).toBe(0);
    const msg5 = await bstPage.getMessageText();
    expect(msg).toBe('', 'Expected message to be empty after clearing the tree');
  });
});