import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/1da0cd80-cd2f-11f0-a440-159d7b77af86.html';

// Page Object for the BST page to encapsulate interactions and queries
class BstPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input = page.locator('#nodeValue');
    this.insertButton = page.locator('button', { hasText: 'Insert Node' });
    this.treeContainer = page.locator('#tree');
    this.header = page.locator('h1');
  }

  // Navigate to the app page
  async goto() {
    await this.page.goto(APP_URL);
  }

  // Insert a value using the UI
  async insertValue(value) {
    // Use fill to set input; for number inputs this will attempt to set the value attribute
    await this.input.fill(String(value));
    await this.insertButton.click();
  }

  // Get texts of nodes in the order they appear in DOM
  async getNodeTexts() {
    const nodes = await this.page.locator('.node').allTextContents();
    // Trim whitespace for safety
    return nodes.map((t) => t.trim());
  }

  // Get number of nodes displayed
  async getNodeCount() {
    return await this.page.locator('.node').count();
  }

  // Get current input value
  async getInputValue() {
    return await this.input.inputValue();
  }

  // Check if tree container is empty
  async isTreeEmpty() {
    const count = await this.getNodeCount();
    return count === 0;
  }
}

// Group tests related to the Binary Search Tree application
test.describe('Binary Search Tree (BST) UI - Basic interactions and DOM updates', () => {
  // Will hold console messages and page errors observed during a test
  let consoleMessages;
  let pageErrors;

  // Attach listeners before each test to capture console and runtime errors
  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Capture console messages emitted by the page
    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Capture page runtime errors (unhandled exceptions)
    page.on('pageerror', (err) => {
      // err is an Error object; store its message for assertions
      pageErrors.push(String(err && err.message ? err.message : err));
    });
  });

  // Ensure listeners are removed (Playwright will clean up page between tests, but make intent explicit)
  test.afterEach(async () => {
    // nothing to explicitly teardown here because Playwright closes pages between tests by default
  });

  // Test initial page load and default state of the UI
  test('Initial load shows correct UI elements and empty tree', async ({ page }) => {
    const bst = new BstPage(page);
    await bst.goto();

    // Verify the document title and header
    await expect(page).toHaveTitle(/Binary Search Tree/);
    await expect(bst.header).toHaveText('Binary Search Tree');

    // Verify input and button are present and have expected attributes/text
    await expect(bst.input).toBeVisible();
    await expect(bst.input).toHaveAttribute('placeholder', 'Enter node value');
    await expect(bst.insertButton).toBeVisible();
    await expect(bst.insertButton).toHaveText('Insert Node');

    // Tree container should be empty on load
    expect(await bst.isTreeEmpty()).toBe(true);

    // No runtime page errors or console errors should have occurred on load
    const consoleErrorMessages = consoleMessages.filter((m) => m.type === 'error');
    expect(consoleErrorMessages).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  // Test inserting simple nodes and verifying DOM updates and order
  test('Inserting nodes updates the DOM in pre-order (root, left, right) and clears input', async ({ page }) => {
    const bst = new BstPage(page);
    await bst.goto();

    // Insert root 10, left 5, right 15
    await bst.insertValue('10');
    // After insert, input should be cleared
    expect(await bst.getInputValue()).toBe('');

    await bst.insertValue('5');
    expect(await bst.getInputValue()).toBe('');

    await bst.insertValue('15');
    expect(await bst.getInputValue()).toBe('');

    // Get texts of nodes as they appear in DOM (displayTree uses pre-order traversal)
    const nodeTexts = await bst.getNodeTexts();
    expect(nodeTexts).toEqual(['10', '5', '15']);

    // Node count should be 3
    expect(await bst.getNodeCount()).toBe(3);

    // Each node element should have the class 'node' and be visible
    const nodeLocators = page.locator('.node');
    const count = await nodeLocators.count();
    for (let i = 0; i < count; i++) {
      await expect(nodeLocators.nth(i)).toBeVisible();
    }

    // No runtime errors or console errors occurred during these interactions
    const consoleErrorMessages = consoleMessages.filter((m) => m.type === 'error');
    expect(consoleErrorMessages).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  // Test behavior when inserting duplicate values (duplicates go to the right in this implementation)
  test('Inserting duplicate values places them in the right subtree (duplicates go right)', async ({ page }) => {
    const bst = new BstPage(page);
    await bst.goto();

    // Insert three identical values
    await bst.insertValue('20');
    await bst.insertValue('20');
    await bst.insertValue('20');

    // Since duplicates go right, traversal order (pre-order) should be root then subsequent rights
    const nodeTexts = await bst.getNodeTexts();
    expect(nodeTexts).toEqual(['20', '20', '20']);
    expect(await bst.getNodeCount()).toBe(3);

    // Confirm there are no console errors or page runtime errors
    const consoleErrorMessages = consoleMessages.filter((m) => m.type === 'error');
    expect(consoleErrorMessages).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  // Test edge case: inserting a non-numeric value into the number input (the page will call parseInt)
  test('Inserting a non-numeric input results in a NaN node being inserted (parseInt behavior)', async ({ page }) => {
    const bst = new BstPage(page);
    await bst.goto();

    // Fill the number input with a non-numeric string. Fill will set the value attribute.
    await bst.insertValue('abc'); // parseInt('abc') => NaN; the app will insert NaN as a node value

    // Node text should show 'NaN' after insertion
    const nodeTexts = await bst.getNodeTexts();
    expect(nodeTexts.length).toBe(1);
    expect(nodeTexts[0]).toBe('NaN');

    // Input should be cleared after click
    expect(await bst.getInputValue()).toBe('');

    // No uncaught runtime errors should have been emitted (insertion of NaN is handled at JS level)
    const consoleErrorMessages = consoleMessages.filter((m) => m.type === 'error');
    expect(consoleErrorMessages).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  // Test clicking insert with empty input does not change tree
  test('Clicking Insert Node with empty input does not modify the tree', async ({ page }) => {
    const bst = new BstPage(page);
    await bst.goto();

    // Ensure tree is empty
    expect(await bst.isTreeEmpty()).toBe(true);

    // Click Insert Node with empty input
    await page.locator('button', { hasText: 'Insert Node' }).click();

    // Tree should remain empty
    expect(await bst.isTreeEmpty()).toBe(true);

    // No console or page errors were produced by clicking with empty input
    const consoleErrorMessages = consoleMessages.filter((m) => m.type === 'error');
    expect(consoleErrorMessages).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  // Test building a deeper tree and verifying node ordering and count
  test('Building a deeper BST results in correct DOM order and node count', async ({ page }) => {
    const bst = new BstPage(page);
    await bst.goto();

    // Insert a set of values to make a deeper tree
    const values = ['50', '30', '70', '20', '40', '60', '80'];
    for (const v of values) {
      await bst.insertValue(v);
    }

    // The display function uses pre-order traversal: root, left subtree, right subtree
    // For these inserts, expected pre-order should be: 50,30,20,40,70,60,80
    const expectedOrder = ['50', '30', '20', '40', '70', '60', '80'];
    const nodeTexts = await bst.getNodeTexts();
    expect(nodeTexts).toEqual(expectedOrder);
    expect(await bst.getNodeCount()).toBe(values.length);

    // No runtime errors were logged
    const consoleErrorMessages = consoleMessages.filter((m) => m.type === 'error');
    expect(consoleErrorMessages).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
});