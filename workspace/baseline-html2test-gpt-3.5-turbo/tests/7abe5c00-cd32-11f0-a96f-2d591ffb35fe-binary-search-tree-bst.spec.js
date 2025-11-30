import { test, expect } from '@playwright/test';

const APP_URL =
  'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/7abe5c00-cd32-11f0-a96f-2d591ffb35fe.html';

// Page Object Model for the BST demo page
class BSTPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.insertInput = page.locator('#insert-value');
    this.insertBtn = page.locator('#insert-btn');
    this.clearBtn = page.locator('#clear-btn');
    this.searchInput = page.locator('#search-value');
    this.searchBtn = page.locator('#search-btn');
    this.deleteInput = page.locator('#delete-value');
    this.deleteBtn = page.locator('#delete-btn');
    this.output = page.locator('#output');
    this.svg = page.locator('#bst-svg');
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async clickInsert(value) {
    await this.insertInput.fill(String(value));
    await this.insertBtn.click();
  }

  async clickSearch(value) {
    await this.searchInput.fill(String(value));
    await this.searchBtn.click();
  }

  async clickDelete(value) {
    await this.deleteInput.fill(String(value));
    await this.deleteBtn.click();
  }

  async clickClear() {
    await this.clearBtn.click();
  }

  async getOutputText() {
    return (await this.output.textContent()) || '';
  }

  async countSvgTextNodes() {
    return this.page.locator('#bst-svg text').count();
  }

  // Return an array of node values (from text elements) in the SVG (in-order drawing order)
  async getSvgNodeValues() {
    return this.page.$$eval('#bst-svg text', nodes => nodes.map(n => n.textContent && n.textContent.trim()));
  }

  // Return the fill attribute of the circle inside the g with aria-label "Node with value X"
  async getNodeCircleFill(value) {
    const selector = `#bst-svg g[aria-label="Node with value ${value}"] circle`;
    const loc = this.page.locator(selector);
    if ((await loc.count()) === 0) return null;
    return loc.first().getAttribute('fill');
  }

  // Check if a node group with a given value exists
  async hasNode(value) {
    return (await this.page.locator(`#bst-svg g[aria-label="Node with value ${value}"]`).count()) > 0;
  }

  // Helpers to intentionally click buttons without filling to trigger validation
  async clickInsertWithoutValue() {
    await this.insertInput.fill(''); // ensure empty
    await this.insertBtn.click();
  }

  async clickSearchWithoutValue() {
    await this.searchInput.fill('');
    await this.searchBtn.click();
  }

  async clickDeleteWithoutValue() {
    await this.deleteInput.fill('');
    await this.deleteBtn.click();
  }
}

test.describe('Binary Search Tree (BST) Interactive Demo', () => {
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    // Collect console errors and page errors for each test
    consoleErrors = [];
    pageErrors = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('pageerror', err => {
      pageErrors.push(err.message);
    });
  });

  test('Initial page load shows expected layout and no runtime errors', async ({ page }) => {
    // Purpose: Verify the page loads, key UI controls exist, and there are no console/page errors on initial render.
    const bst = new BSTPage(page);
    await bst.goto();

    // Check title and heading presence
    await expect(page).toHaveTitle(/Binary Search Tree \(BST\) Demo/);
    await expect(page.locator('h1')).toHaveText('Binary Search Tree (BST) Interactive Demo');

    // Check presence of inputs and buttons
    await expect(bst.insertInput).toBeVisible();
    await expect(bst.insertBtn).toBeVisible();
    await expect(bst.clearBtn).toBeVisible();
    await expect(bst.searchInput).toBeVisible();
    await expect(bst.searchBtn).toBeVisible();
    await expect(bst.deleteInput).toBeVisible();
    await expect(bst.deleteBtn).toBeVisible();

    // Output area should be present and empty initially
    await expect(bst.output).toBeVisible();
    const initialOutput = await bst.getOutputText();
    expect(initialOutput.trim()).toBe('');

    // SVG should be present and initially empty (no text nodes)
    await expect(bst.svg).toBeVisible();
    const textCount = await bst.countSvgTextNodes();
    expect(textCount).toBe(0);

    // Assert there were no runtime console errors or page errors during load
    expect(consoleErrors, 'No console.error should be emitted on page load').toEqual([]);
    expect(pageErrors, 'No uncaught page error should occur on page load').toEqual([]);
  });

  test('Insert nodes updates in-order traversal and renders SVG nodes', async ({ page }) => {
    // Purpose: Insert a sequence of values and assert output messages, inorder traversal and SVG node counts.
    const bst1 = new BSTPage(page);
    await bst.goto();

    // Insert a set of values to create a balanced-ish BST
    const values = [50, 30, 70, 20, 40, 60, 80];
    for (let i = 0; i < values.length; i++) {
      const v = values[i];
      await bst.clickInsert(v);

      // Output should confirm insertion and show current inorder traversal
      const out = await bst.getOutputText();
      expect(out).toContain(`Inserted value: ${v}`);

      // Compute expected inorder for the prefix inserted values
      const prefix = values.slice(0, i + 1);
      const expectedInorder = [...prefix].sort((a, b) => a - b);
      expect(out).toContain(`In-Order Traversal: [${expectedInorder.join(', ')}]`);

      // The SVG should contain exactly prefix.length text nodes
      const count = await bst.countSvgTextNodes();
      expect(count).toBe(prefix.length);

      // The node texts in SVG should match the expected inorder (since drawAllNodes draws left->node->right)
      const svgValues = (await bst.getSvgNodeValues()).map(s => (s ? Number(s) : s));
      expect(svgValues).toEqual(expectedInorder);
    }

    // No console or page errors occurred while inserting
    expect(consoleErrors, 'No console.error should be emitted during insertions').toEqual([]);
    expect(pageErrors, 'No uncaught page error should occur during insertions').toEqual([]);
  });

  test('Prevent duplicate insertion with appropriate message and no tree change', async ({ page }) => {
    // Purpose: Ensure duplicates are not inserted and appropriate message is displayed.
    const bst2 = new BSTPage(page);
    await bst.goto();

    // Build a small tree
    await bst.clickInsert(10);
    await bst.clickInsert(5);
    await bst.clickInsert(15);

    const beforeCount = await bst.countSvgTextNodes();

    // Try to insert duplicate 10
    await bst.clickInsert(10);
    const out1 = await bst.getOutputText();
    expect(out).toContain('already exists in the BST (duplicates not allowed)');

    // Tree should not have changed
    const afterCount = await bst.countSvgTextNodes();
    expect(afterCount).toBe(beforeCount);

    // No console/page errors
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('Search highlights found node and clears search input', async ({ page }) => {
    // Purpose: Verify search finds a node, highlights it in the SVG, updates output, and clears the input.
    const bst3 = new BSTPage(page);
    await bst.goto();

    // Create tree with multiple nodes
    const inserts = [50, 30, 70, 60];
    for (const v of inserts) await bst.clickInsert(v);

    // Search for existing value 60
    await bst.clickSearch(60);
    const out2 = await bst.getOutputText();
    expect(out).toContain('Search: Value 60 found in the BST.');

    // The circle for node 60 should have the highlight fill color "#ffd54f"
    const fill = await bst.getNodeCircleFill(60);
    expect(fill).toBe('#ffd54f');

    // Search input should be cleared after search
    const searchVal = await page.locator('#search-value').inputValue();
    expect(searchVal).toBe('');

    // No console/page errors
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('Search for non-existent value gives not found message and does not highlight', async ({ page }) => {
    // Purpose: Searching a value not present should show NOT found and not highlight any node.
    const bst4 = new BSTPage(page);
    await bst.goto();

    // Insert a couple values
    await bst.clickInsert(5);
    await bst.clickInsert(15);

    // Search for a value not in tree
    await bst.clickSearch(999);
    const out3 = await bst.getOutputText();
    expect(out).toContain('Search: Value 999 NOT found.');

    // Ensure there is no node group with this value
    const exists = await bst.hasNode(999);
    expect(exists).toBe(false);

    // No console/page errors
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('Delete operations remove nodes correctly and update traversal; handle non-existent delete', async ({ page }) => {
    // Purpose: Test deleting leaf nodes, nodes with one child, nodes with two children, and deleting non-existent values.
    const bst5 = new BSTPage(page);
    await bst.goto();

    // Build tree: [50, 30, 70, 20, 40, 60, 80]
    const values1 = [50, 30, 70, 20, 40, 60, 80];
    for (const v of values) await bst.clickInsert(v);

    // Delete leaf node 20
    await bst.clickDelete(20);
    let out4 = await bst.getOutputText();
    expect(out).toContain('Deleted value: 20');
    expect(out).toContain('In-Order Traversal: [30, 40, 50, 60, 70, 80]');
    expect(await bst.countSvgTextNodes()).toBe(6);
    // The deleted value should no longer exist in the SVG
    expect(await bst.hasNode(20)).toBe(false);

    // Delete node 30 (which had one child after removing 20)
    await bst.clickDelete(30);
    out = await bst.getOutputText();
    expect(out).toContain('Deleted value: 30');
    expect(out).toContain('In-Order Traversal: [40, 50, 60, 70, 80]');
    expect(await bst.hasNode(30)).toBe(false);
    expect(await bst.countSvgTextNodes()).toBe(5);

    // Delete root 50 which has two children; ensure inorder updates
    await bst.clickDelete(50);
    out = await bst.getOutputText();
    expect(out).toContain('Deleted value: 50');
    // After removing 50, expected inorder is [40,60,70,80] given prior deletions
    expect(out).toContain('In-Order Traversal: [40, 60, 70, 80]');
    expect(await bst.hasNode(50)).toBe(false);
    expect(await bst.countSvgTextNodes()).toBe(4);

    // Try deleting a non-existent value
    await bst.clickDelete(9999);
    out = await bst.getOutputText();
    expect(out).toContain('Delete: Value 9999 not found in BST.');
    // Node count unchanged
    expect(await bst.countSvgTextNodes()).toBe(4);

    // No console/page errors
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('Clear button resets the tree and input fields', async ({ page }) => {
    // Purpose: Verify the Clear Tree button empties the BST, clears inputs and updates output accordingly.
    const bst6 = new BSTPage(page);
    await bst.goto();

    // Create a couple of nodes
    await bst.clickInsert(11);
    await bst.clickInsert(22);
    expect(await bst.countSvgTextNodes()).toBe(2);

    // Fill inputs to ensure they are cleared by the clear action
    await bst.insertInput.fill('123');
    await bst.searchInput.fill('456');
    await bst.deleteInput.fill('789');

    // Click clear
    await bst.clickClear();
    const out5 = await bst.getOutputText();
    expect(out).toContain('BST cleared.');

    // SVG should be empty
    expect(await bst.countSvgTextNodes()).toBe(0);

    // Inputs should be cleared
    expect(await bst.insertInput.inputValue()).toBe('');
    expect(await bst.searchInput.inputValue()).toBe('');
    expect(await bst.deleteInput.inputValue()).toBe('');

    // No console/page errors
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('Invalid or empty inputs produce helpful error messages for insert/search/delete', async ({ page }) => {
    // Purpose: Ensure UI validates empty or non-numeric inputs and prints appropriate messages.
    const bst7 = new BSTPage(page);
    await bst.goto();

    // Try to insert with empty input
    await bst.clickInsertWithoutValue();
    let out6 = await bst.getOutputText();
    expect(out).toContain('Please enter a valid number to insert.');

    // Try to search with empty input
    await bst.clickSearchWithoutValue();
    out = await bst.getOutputText();
    expect(out).toContain('Please enter a valid number to search.');

    // Try to delete with empty input
    await bst.clickDeleteWithoutValue();
    out = await bst.getOutputText();
    expect(out).toContain('Please enter a valid number to delete.');

    // Try to insert a non-numeric string via direct fill (inputs are type=number but we simulate accidental bad input)
    // Note: filling a non-numeric string into type=number will result in empty value, but we still assert validation message.
    await bst.insertInput.fill('not-a-number');
    await bst.insertBtn.click();
    out = await bst.getOutputText();
    expect(out).toContain('Please enter a valid number to insert.');

    // No console/page errors during invalid input tests
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test.afterEach(async ({}, testInfo) => {
    // Final sanity: Ensure no console or page errors were captured during the test.
    // If any were captured, fail with informative messages.
    if (consoleErrors.length > 0 || pageErrors.length > 0) {
      // Include errors in failure message to aid debugging
      const combined = [
        ...(consoleErrors.length ? ['Console errors:'].concat(consoleErrors) : []),
        ...(pageErrors.length ? ['Page errors:'].concat(pageErrors) : []),
      ].join('\n');
      // Force a test failure when errors were caught
      throw new Error(`Runtime errors were detected during the test:\n${combined}`);
    }
  });
});