import { test, expect } from '@playwright/test';

const APP = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/e039f942-cd32-11f0-a949-f901cf5609c9.html';

test.describe('Binary Tree Visualizer - e039f942-cd32-11f0-a949-f901cf5609c9', () => {
  // Arrays to capture console errors and page errors for each test
  let consoleErrors = [];
  let pageErrors = [];

  // Page object for interacting with the app
  class TreePage {
    constructor(page) {
      this.page = page;
      this.input = page.locator('#nodeValueInput');
      this.insertBtn = page.locator('#insertBtn');
      this.deleteBtn = page.locator('#deleteBtn');
      this.traversalOutput = page.locator('#traversalOutput');
      this.message = page.locator('#message');
      this.canvas = page.locator('#treeCanvas');
      this.traversalButtons = {
        inorder: page.locator('button[data-traversal="inorder"]'),
        preorder: page.locator('button[data-traversal="preorder"]'),
        postorder: page.locator('button[data-traversal="postorder"]'),
        levelorder: page.locator('button[data-traversal="levelorder"]'),
      };
    }

    async goto() {
      await this.page.goto(APP);
    }

    // Helper to set the input value (string) and trigger focus events
    async setInput(value) {
      // Use fill to replace any existing value
      await this.input.fill(String(value));
      // blur to ensure any input processing completes
      await this.input.evaluate((el) => el.blur());
    }

    async clickInsert() {
      await this.insertBtn.click();
    }

    async clickDelete() {
      await this.deleteBtn.click();
    }

    async clickTraversal(type) {
      await this.traversalButtons[type].click();
    }

    async getMessageText() {
      return (await this.message.textContent()) || '';
    }

    async getTraversalText() {
      return (await this.traversalOutput.textContent()) || '';
    }

    async canvasExists() {
      return await this.canvas.count() > 0;
    }
  }

  // Setup listeners on page to capture console errors and exceptions
  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];
    page.on('console', (msg) => {
      // capture only console error-level messages to avoid noise
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    page.on('pageerror', (err) => {
      pageErrors.push(err.message);
    });
  });

  // After each test ensure no uncaught errors were emitted during the test.
  test.afterEach(async () => {
    // Assert there were no page errors or console errors
    expect(pageErrors, `Unexpected page errors: ${pageErrors.join(' | ')}`).toHaveLength(0);
    expect(consoleErrors, `Unexpected console.error logs: ${consoleErrors.join(' | ')}`).toHaveLength(0);
  });

  test('Initial load: UI elements present and default state', async ({ page }) => {
    // Purpose: Verify the page loads with expected controls and default empty state
    const tree = new TreePage(page);
    await tree.goto();

    // Check important interactive elements exist
    await expect(tree.input).toBeVisible();
    await expect(tree.insertBtn).toBeVisible();
    await expect(tree.deleteBtn).toBeVisible();
    await expect(tree.traversalButtons.inorder).toBeVisible();
    await expect(tree.traversalButtons.preorder).toBeVisible();
    await expect(tree.traversalButtons.postorder).toBeVisible();
    await expect(tree.traversalButtons.levelorder).toBeVisible();

    // Canvas should exist and have role img and aria-label
    const canvas = page.locator('#treeCanvas');
    await expect(canvas).toHaveAttribute('role', 'img');
    await expect(canvas).toHaveAttribute('aria-label', /Binary tree visualization/i);

    // Traversal output and message should be empty initially
    await expect(tree.traversalOutput).toHaveText('');
    await expect(tree.message).toHaveText('');
  });

  test('Traversal on empty tree shows informative message', async ({ page }) => {
    // Purpose: Clicking traversal buttons on an empty tree should show a helpful message
    const tree1 = new TreePage(page);
    await tree.goto();

    // Click inorder traversal when tree is empty
    await tree.clickTraversal('inorder');
    await expect(tree.getMessageText()).resolves.toContain('Tree is empty. Insert nodes first.');
    await expect(tree.traversalOutput).toHaveText('');

    // Clear message by navigating and try another traversal
    await tree.goto();
    await tree.clickTraversal('levelorder');
    await expect(tree.getMessageText()).resolves.toContain('Tree is empty. Insert nodes first.');
    await expect(tree.traversalOutput).toHaveText('');
  });

  test('Invalid insert / delete inputs produce validation messages', async ({ page }) => {
    // Purpose: Ensure validation messages appear for empty or non-integer inputs
    const tree2 = new TreePage(page);
    await tree.goto();

    // Insert with empty input
    await tree.setInput('');
    await tree.clickInsert();
    await expect(tree.getMessageText()).resolves.toContain('Please enter a valid integer to insert.');

    // Delete with empty input
    await tree.setInput('');
    await tree.clickDelete();
    await expect(tree.getMessageText()).resolves.toContain('Please enter a valid integer to delete.');

    // Non-integer input (decimal) - should be treated invalid by app logic
    await tree.setInput('3.14');
    await tree.clickInsert();
    await expect(tree.getMessageText()).resolves.toContain('Please enter a valid integer to insert.');
  });

  test('Insert nodes and verify all traversal outputs', async ({ page }) => {
    // Purpose: Insert a set of nodes and verify inorder, preorder, postorder, levelorder outputs
    const tree3 = new TreePage(page);
    await tree.goto();

    // Insert nodes to form a balanced-ish tree:
    // Insert order: 10,5,15,3,7,12,18
    const values = [10, 5, 15, 3, 7, 12, 18];
    for (const v of values) {
      await tree.setInput(String(v));
      await tree.clickInsert();
      // After each insertion, input should be cleared and no error message
      await expect(tree.input).toHaveValue('');
      await expect(tree.getMessageText()).resolves.toBe('');
      // traversalOutput should be cleared on insert
      await expect(tree.traversalOutput).toHaveText('');
    }

    // Verify inorder traversal
    await tree.clickTraversal('inorder');
    await expect(tree.getTraversalText()).resolves.toBe('In-order Traversal: 3, 5, 7, 10, 12, 15, 18');

    // Verify preorder traversal
    await tree.clickTraversal('preorder');
    await expect(tree.getTraversalText()).resolves.toBe('Pre-order Traversal: 10, 5, 3, 7, 15, 12, 18');

    // Verify postorder traversal
    await tree.clickTraversal('postorder');
    await expect(tree.getTraversalText()).resolves.toBe('Post-order Traversal: 3, 7, 5, 12, 18, 15, 10');

    // Verify level-order traversal
    await tree.clickTraversal('levelorder');
    await expect(tree.getTraversalText()).resolves.toBe('Level-order Traversal: 10, 5, 15, 3, 7, 12, 18');
  });

  test('Duplicate insertions are ignored', async ({ page }) => {
    // Purpose: Inserting a duplicate value should not create duplicates in traversals
    const tree4 = new TreePage(page);
    await tree.goto();

    await tree.setInput('10');
    await tree.clickInsert();
    await tree.setInput('10');
    await tree.clickInsert(); // duplicate

    // Only one value should appear in inorder traversal
    await tree.clickTraversal('inorder');
    await expect(tree.getTraversalText()).resolves.toBe('In-order Traversal: 10');
  });

  test('Deleting nodes: non-existent, leaf, and node with two children', async ({ page }) => {
    // Purpose: Validate deletion logic and messages for missing values
    const tree5 = new TreePage(page);
    await tree.goto();

    // Build tree again: 10,5,15,3,7,12,18
    const values1 = [10, 5, 15, 3, 7, 12, 18];
    for (const v of values) {
      await tree.setInput(String(v));
      await tree.clickInsert();
    }

    // Attempt to delete a non-existent value should show a message and not modify tree
    await tree.setInput('999');
    await tree.clickDelete();
    await expect(tree.getMessageText()).resolves.toContain('Value not found in tree.');
    // Ensure tree unchanged by checking inorder
    await tree.clickTraversal('inorder');
    await expect(tree.getTraversalText()).resolves.toBe('In-order Traversal: 3, 5, 7, 10, 12, 15, 18');

    // Delete a node with two children (15). Expect inorder to update accordingly.
    await tree.setInput('15');
    await tree.clickDelete();
    // After deletion traversalOutput cleared on deletion, so request traversal
    await tree.clickTraversal('inorder');
    // Expected inorder after deleting 15 (inorder successor approach): 3,5,7,10,12,18
    await expect(tree.getTraversalText()).resolves.toBe('In-order Traversal: 3, 5, 7, 10, 12, 18');

    // Delete a leaf node (3)
    await tree.setInput('3');
    await tree.clickDelete();
    await tree.clickTraversal('inorder');
    await expect(tree.getTraversalText()).resolves.toBe('In-order Traversal: 5, 7, 10, 12, 18');
  });

  test('Accessibility: controls have appropriate labels and aria attributes', async ({ page }) => {
    // Purpose: Check some basic accessibility attributes present in the DOM
    const tree6 = new TreePage(page);
    await tree.goto();

    // Controls container has an aria-label
    await expect(page.locator('#controls')).toHaveAttribute('aria-label', /Controls to create and traverse binary tree/i);

    // Canvas has aria-label and role
    await expect(page.locator('#treeCanvas')).toHaveAttribute('aria-label', /Binary tree visualization/i);
    await expect(page.locator('#treeCanvas')).toHaveAttribute('role', 'img');

    // Traversal output is marked live and atomic for screen readers
    await expect(tree.traversalOutput).toHaveAttribute('aria-live', 'polite');
    await expect(tree.traversalOutput).toHaveAttribute('aria-atomic', 'true');

    // Message region has role alert
    await expect(tree.message).toHaveAttribute('role', 'alert');
  });
});