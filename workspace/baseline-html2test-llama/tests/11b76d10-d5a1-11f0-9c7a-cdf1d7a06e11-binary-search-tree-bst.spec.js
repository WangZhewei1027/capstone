import { test, expect } from '@playwright/test';

// Test file for Application ID: 11b76d10-d5a1-11f0-9c7a-cdf1d7a06e11
// Filename required by the spec: 11b76d10-d5a1-11f0-9c7a-cdf1d7a06e11-binary-search-tree-bst.spec.js
// This test suite validates UI structure, interactions, and observes runtime errors/console messages
// NOTE: Tests intentionally do not modify page JS or patch errors; they observe console logs and page errors as-is.

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-llama/html/11b76d10-d5a1-11f0-9c7a-cdf1d7a06e11.html';

// Simple page object for interacting with the BST page
class BSTPage {
  constructor(page) {
    this.page = page;
    this.rootInput = page.locator('#root');
    this.leftInput = page.locator('#left');
    this.rightInput = page.locator('#right');
    this.insertInput = page.locator('#insert');
    this.insertBtn = page.locator('#insert-btn');
    this.searchBtn = page.locator('#search-btn');
    this.form = page.locator('#tree-form');
    this.treeDiv = page.locator('#tree');
  }

  // navigate to the application URL
  async goto() {
    await this.page.goto(APP_URL);
  }

  // fill the insert input
  async fillInsert(value) {
    await this.insertInput.fill(value);
  }

  // click insert button
  async clickInsert() {
    await this.insertBtn.click();
  }

  // click search button
  async clickSearch() {
    await this.searchBtn.click();
  }

  // submit the form (by pressing Enter in root input)
  async submitFormByEnterInRoot() {
    await this.rootInput.press('Enter');
  }

  // get #tree innerHTML
  async treeInnerHTML() {
    return await this.treeDiv.evaluate((el) => el.innerHTML);
  }

  // get placeholder attributes for inputs (used in initial state assertions)
  async getPlaceholders() {
    return {
      root: await this.rootInput.getAttribute('placeholder'),
      left: await this.leftInput.getAttribute('placeholder'),
      right: await this.rightInput.getAttribute('placeholder'),
      insert: await this.insertInput.getAttribute('placeholder'),
    };
  }

  // get button texts
  async getButtonTexts() {
    return {
      insert: await this.insertBtn.textContent(),
      search: await this.searchBtn.textContent(),
    };
  }
}

test.describe('Binary Search Tree (BST) interactive page', () => {
  // Test initial page load and default state
  test('Initial page load shows inputs, buttons and empty tree container', async ({ page }) => {
    const bst = new BSTPage(page);
    await bst.goto();

    // Verify the page title and heading are present
    await expect(page).toHaveTitle(/Binary Search Tree/);
    await expect(page.locator('h1')).toHaveText('Binary Search Tree');

    // Verify all expected input fields and buttons are visible
    await expect(bst.rootInput).toBeVisible();
    await expect(bst.leftInput).toBeVisible();
    await expect(bst.rightInput).toBeVisible();
    await expect(bst.insertInput).toBeVisible();
    await expect(bst.insertBtn).toBeVisible();
    await expect(bst.searchBtn).toBeVisible();

    // Verify placeholders on inputs (sanity check of DOM structure)
    const placeholders = await bst.getPlaceholders();
    expect(placeholders.root).toBe('Enter the root node\'s value');
    expect(placeholders.left).toBe('Enter the left child\'s value');
    expect(placeholders.right).toBe('Enter the right child\'s value');
    expect(placeholders.insert).toBe('Enter the value to insert');

    // Verify button labels
    const btnTexts = await bst.getButtonTexts();
    expect(btnTexts.insert.trim()).toBe('Insert');
    expect(btnTexts.search.trim()).toBe('Search');

    // Verify the tree container exists and initially empty (no DOM nodes inserted by script)
    const treeHtml = await bst.treeInnerHTML();
    expect(treeHtml.trim()).toBe('');
  });

  test.describe('Form submission and button interactions produce runtime errors and logs as expected', () => {
    // Test that submitting the form (creating the tree) results in a ReferenceError due to missing TreeNode
    test('Submitting the form triggers a runtime ReferenceError for missing TreeNode', async ({ page }) => {
      const bst1 = new BSTPage(page);
      await bst.goto();

      // Listen for pageerror event and capture it
      const [pageError] = await Promise.all([
        // wait for pageerror to be emitted when createTree runs
        page.waitForEvent('pageerror'),
        // Trigger form submit by pressing Enter in root input (this will dispatch the submit handler)
        bst.submitFormByEnterInRoot()
      ]);

      // Assert that the error mentions TreeNode (ReferenceError thrown when calling new TreeNode(...))
      const msg = pageError?.message ?? String(pageError);
      expect(msg).toMatch(/TreeNode/);

      // The tree container should remain unchanged (script errored before manipulating DOM)
      const treeHtml1 = await bst.treeInnerHTML();
      expect(treeHtml.trim()).toBe('');
    });

    // Test clicking Insert button when no root exists triggers a ReferenceError and does not create nodes
    test('Clicking Insert when tree.root is null results in ReferenceError and tree.root stays null', async ({ page }) => {
      const bst2 = new BSTPage(page);
      await bst.goto();

      // Ensure insert input has a value to be read by click handler
      await bst.fillInsert('5');

      // Wait for the pageerror event triggered by the insert click (new TreeNode in insert function)
      const [pageError] = await Promise.all([
        page.waitForEvent('pageerror'),
        bst.clickInsert()
      ]);

      // Confirm the error indicates TreeNode is missing
      const msg1 = pageError?.message ?? String(pageError);
      expect(msg).toMatch(/TreeNode/);

      // Inspect the global `tree` object to ensure root remains null (script couldn't create a node)
      const rootValue = await page.evaluate(() => {
        // window.tree should exist per script even if nodes were not created
        try {
          return window.tree?.root ?? null;
        } catch (e) {
          // return a sentinel in case of unexpected error reading the variable
          return '__EVAL_ERROR__';
        }
      });
      expect(rootValue).toBeNull();
    });

    // Test clicking Search logs "Value not found in the tree" and also triggers ReferenceError due to form submit
    test('Clicking Search logs not found and leads to ReferenceError from form submit', async ({ page }) => {
      const bst3 = new BSTPage(page);
      await bst.goto();

      // Put a value into the insert field (search handler reads the insert input)
      await bst.fillInsert('nonexistent');

      // Prepare to capture one console message (the search click logs a message) and a page error (form submit will error)
      const consolePromise = page.waitForEvent('console');
      const pageErrorPromise = page.waitForEvent('pageerror');

      // Perform click; search click handler runs first (should log "Value not found in the tree"), then form submit triggers createTree causing ReferenceError
      await bst.clickSearch();

      const consoleMsg = await consolePromise;
      const pageError = await pageErrorPromise;

      // Validate console output from search click -- should indicate not found
      const text = consoleMsg.text();
      expect(text).toContain('Value not found in the tree');

      // Validate the page error mentions TreeNode
      const errMsg = pageError?.message ?? String(pageError);
      expect(errMsg).toMatch(/TreeNode/);

      // Confirm the #tree container remains empty (no successful creation)
      const treeHtml2 = await bst.treeInnerHTML();
      expect(treeHtml.trim()).toBe('');
    });

    // Edge case: clicking Insert with an empty input still attempts to create a TreeNode and throws ReferenceError
    test('Clicking Insert with empty input still triggers ReferenceError', async ({ page }) => {
      const bst4 = new BSTPage(page);
      await bst.goto();

      // Ensure the insert input is empty
      await bst.fillInsert('');

      // Wait for the error triggered by new TreeNode in insert
      const [pageError] = await Promise.all([
        page.waitForEvent('pageerror'),
        bst.clickInsert()
      ]);

      const msg2 = pageError?.message ?? String(pageError);
      expect(msg).toMatch(/TreeNode/);

      // Confirm that tree.root remains null in the page context
      const rootValue1 = await page.evaluate(() => window.tree?.root ?? null);
      expect(rootValue).toBeNull();
    });
  });
});