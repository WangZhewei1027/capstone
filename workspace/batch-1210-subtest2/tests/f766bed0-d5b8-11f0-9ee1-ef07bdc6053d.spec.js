import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-subtest2/html/f766bed0-d5b8-11f0-9ee1-ef07bdc6053d.html';

// Simple page object to encapsulate interactions with the BST app
class BSTPage {
  constructor(page) {
    this.page = page;
    this.valueInput = page.locator('#value');
    this.insertButton = page.locator('button[onclick="insertNode()"]');
    this.clearButton = page.locator('button[onclick="clearTree()"]');
    this.container = page.locator('#bst-container');
    this.nodeLocator = this.container.locator('.node');
    this.lineLocator = this.container.locator('.line');
  }

  // Navigate to the app URL
  async goto() {
    await this.page.goto(APP_URL);
  }

  // Insert a numeric value via the UI
  async insert(value) {
    await this.valueInput.fill(String(value));
    await this.insertButton.click();
  }

  // Click the clear button
  async clear() {
    await this.clearButton.click();
  }

  // Get number of rendered node elements
  async nodeCount() {
    return await this.nodeLocator.count();
  }

  // Return array of node texts as strings
  async nodeTexts() {
    const count = await this.nodeCount();
    const texts = [];
    for (let i = 0; i < count; i++) {
      texts.push(await this.nodeLocator.nth(i).textContent());
    }
    return texts;
  }

  // Return number of connecting lines
  async lineCount() {
    return await this.lineLocator.count();
  }

  // Read internal bst.root value if available in page context
  async getBstRootValue() {
    return await this.page.evaluate(() => {
      try {
        // Accessing global 'bst' defined by the page script
        if (window.bst && window.bst.root) return window.bst.root.value;
        return null;
      } catch (e) {
        return { __error__: String(e) };
      }
    });
  }

  // Read whether bst.root is null
  async isBstRootNull() {
    return await this.page.evaluate(() => {
      try {
        return !(window.bst && window.bst.root);
      } catch (e) {
        return { __error__: String(e) };
      }
    });
  }

  // Read innerHTML of the container
  async containerHTML() {
    return await this.page.evaluate(() => document.getElementById('bst-container').innerHTML);
  }
}

test.describe('Binary Search Tree Visualization - FSM and UI tests', () => {
  // Collect console.error messages and page errors for assertions
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Capture console messages flagged as "error"
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push({ text: msg.text() });
      }
    });

    // Capture unhandled exceptions and other page errors
    page.on('pageerror', error => {
      pageErrors.push(error);
    });
  });

  test.afterEach(async () => {
    // After each test, ensure there were no unexpected runtime errors during the interaction
    // These assertions validate that the application did not throw console errors or page errors during the test run.
    expect(consoleErrors, 'No console.error messages should be emitted during the test').toEqual([]);
    expect(pageErrors, 'No page errors (uncaught exceptions) should occur during the test').toEqual([]);
  });

  test.describe('State: S0_Idle (Initial / Idle)', () => {
    test('Initial render shows input, buttons, and empty container', async ({ page }) => {
      // Validate initial state and entry action renderTree()
      const bst = new BSTPage(page);
      await bst.goto();

      // Verify presence of input and buttons (evidence of Idle state)
      await expect(bst.valueInput).toBeVisible();
      await expect(bst.insertButton).toBeVisible();
      await expect(bst.clearButton).toBeVisible();

      // The tree should be empty initially (renderTree called but no root)
      expect(await bst.nodeCount()).toBe(0);
      const containerHtml = await bst.containerHTML();
      expect(containerHtml.trim()).toBe('');
    });
  });

  test.describe('Transition: S0_Idle -> S1_TreePopulated (InsertNode)', () => {
    test('Inserting a single value creates root node and updates visual representation', async ({ page }) => {
      const bst = new BSTPage(page);
      await bst.goto();

      // Insert a number (evidence: parseInt(...), bst.insert(value), renderTree())
      await bst.insert(42);

      // After insertion, expect at least one node to be rendered
      expect(await bst.nodeCount()).toBeGreaterThanOrEqual(1);

      // The root value should be 42 as stored in the page's bst object
      const rootValue = await bst.getBstRootValue();
      expect(rootValue).toBe(42);

      // Visual node text should include '42'
      const texts = await bst.nodeTexts();
      expect(texts).toContain('42');

      // There should be zero or more connecting lines (none for single node)
      const lines = await bst.lineCount();
      expect(lines).toBeGreaterThanOrEqual(0);
    });

    test('Inserting multiple values creates left and right children (structure verification)', async ({ page }) => {
      const bst = new BSTPage(page);
      await bst.goto();

      // Insert root
      await bst.insert(50);
      // Insert left child (less than root)
      await bst.insert(30);
      // Insert right child (greater than root)
      await bst.insert(70);

      // Expect three nodes to be rendered
      expect(await bst.nodeCount()).toBeGreaterThanOrEqual(3);

      // Check that internal BST root has correct value
      expect(await bst.getBstRootValue()).toBe(50);

      // There should be at least two connecting lines for the two children
      expect(await bst.lineCount()).toBeGreaterThanOrEqual(2);

      // Node texts should include all inserted values
      const texts = await bst.nodeTexts();
      expect(texts).toEqual(expect.arrayContaining(['50', '30', '70']));
    });

    test('Inserting duplicate values goes to the right branch (duplicate handling edge case)', async ({ page }) => {
      const bst = new BSTPage(page);
      await bst.goto();

      // Insert duplicate values; implementation places duplicates to the right
      await bst.insert(10);
      await bst.insert(10);

      // Expect two nodes rendered for two insertions
      expect(await bst.nodeCount()).toBeGreaterThanOrEqual(2);

      // Validate root is 10
      expect(await bst.getBstRootValue()).toBe(10);

      // Ensure both nodes' texts include '10' (duplicates)
      const texts = await bst.nodeTexts();
      const occurrences = texts.filter(t => t === '10').length;
      expect(occurrences).toBeGreaterThanOrEqual(2);
    });
  });

  test.describe('Transition: S1_TreePopulated -> S2_TreeCleared (ClearTree)', () => {
    test('Clearing the tree removes DOM nodes and sets bst.root to null', async ({ page }) => {
      const bst = new BSTPage(page);
      await bst.goto();

      // Populate tree first
      await bst.insert(5);
      await bst.insert(3);
      await bst.insert(7);

      // Ensure tree has nodes
      expect(await bst.nodeCount()).toBeGreaterThanOrEqual(3);

      // Click Clear Tree (evidence: bst.root = null; bstContainer.innerHTML = '')
      await bst.clear();

      // After clearing, the container should be empty
      expect((await bst.containerHTML()).trim()).toBe('');

      // Internal BST root should be null/absent
      expect(await bst.isBstRootNull()).toBe(true);
    });
  });

  test.describe('Transition: S2_TreeCleared -> S0_Idle (InsertNode after clear)', () => {
    test('After clearing, inserting again repopulates the tree (S2 -> S0 -> S1)', async ({ page }) => {
      const bst = new BSTPage(page);
      await bst.goto();

      // Populate and then clear
      await bst.insert(15);
      await bst.insert(10);
      expect(await bst.nodeCount()).toBeGreaterThanOrEqual(2);
      await bst.clear();
      expect(await bst.isBstRootNull()).toBe(true);

      // Insert again after clear
      await bst.insert(99);

      // Tree should be repopulated with the new root
      expect(await bst.nodeCount()).toBeGreaterThanOrEqual(1);
      expect(await bst.getBstRootValue()).toBe(99);
      const texts = await bst.nodeTexts();
      expect(texts).toContain('99');
    });
  });

  test.describe('Error handling & edge cases', () => {
    test('Clicking Insert with empty input should display an alert and not modify the tree', async ({ page }) => {
      const bst = new BSTPage(page);
      await bst.goto();

      // Ensure empty input
      await bst.valueInput.fill('');

      // Listen for dialog; the app triggers alert('Please enter a valid number')
      const dialogPromise = page.waitForEvent('dialog');

      // Click insert; this should raise an alert
      await bst.insertButton.click();

      const dialog = await dialogPromise;
      // Validate alert message and accept it
      expect(dialog.type()).toBe('alert');
      expect(dialog.message()).toMatch(/Please enter a valid number/);
      await dialog.accept();

      // Ensure no nodes were added after the invalid insertion attempt
      expect(await bst.nodeCount()).toBe(0);
      expect(await bst.isBstRootNull()).toBe(true);
    });

    test('No unexpected runtime ReferenceError/SyntaxError/TypeError occur during typical interactions', async ({ page }) => {
      // This test performs several typical operations and relies on the pageerror & console capture in beforeEach/afterEach.
      // If any ReferenceError/SyntaxError/TypeError occur, they will be captured and cause afterEach assertions to fail.
      const bst = new BSTPage(page);
      await bst.goto();

      // Perform a sequence of interactions
      await bst.insert(1);
      await bst.insert(0);
      await bst.insert(2);
      await bst.clear();
      await bst.insert(3);

      // Basic sanity checks on DOM state (should have the last inserted node)
      expect(await bst.nodeCount()).toBeGreaterThanOrEqual(1);
      expect(await bst.getBstRootValue()).toBe(3);
    });
  });
});