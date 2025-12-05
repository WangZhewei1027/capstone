import { test, expect } from '@playwright/test';

// Test file: 39b703e0-d1d5-11f0-b49a-6f458b3a25ef-binary-search-tree-bst.spec.js
// Purpose: End-to-end Playwright tests for the Binary Search Tree visualization app.
// The tests load the page as-is, observe console messages and page errors, and validate UI behavior.

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-4o-5/html/39b703e0-d1d5-11f0-b49a-6f458b3a25ef.html';

// Page Object Model for the BST application
class BSTPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input = page.locator('#value');
    this.insertButton = page.locator('button', { hasText: 'Insert Node' });
    this.container = page.locator('#bst-container');
    this.nodeLocator = page.locator('.node');
    this.lineLocator = page.locator('.line');
  }

  // Navigate to the app URL
  async goto() {
    await this.page.goto(APP_URL);
  }

  // Insert a value using the UI controls
  async insertValue(value) {
    await this.input.fill(String(value));
    // Wait for input to reflect value, then click insert
    await this.insertButton.click();
  }

  // Get array of node texts currently rendered
  async getNodeValues() {
    const count = await this.nodeLocator.count();
    const values = [];
    for (let i = 0; i < count; i++) {
      values.push((await this.nodeLocator.nth(i).innerText()).trim());
    }
    return values;
  }

  // Get number of line elements (used to draw tree connections)
  async getLineCount() {
    return this.lineLocator.count();
  }

  // Clear input field (direct UI operation)
  async clearInput() {
    await this.input.fill('');
  }
}

test.describe('Binary Search Tree Visualization - BST', () => {
  let consoleMessages;
  let pageErrors;

  // Set up logging of console messages and page errors before each test,
  // and navigate to the application page.
  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Capture console events
    page.on('console', msg => {
      // collect messages for later assertions
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Capture uncaught exceptions on the page
    page.on('pageerror', err => {
      // collect Error objects for later assertions
      pageErrors.push(err);
    });
  });

  // Group tests related to initial page state and basic elements
  test.describe('Initial load and UI elements', () => {
    test('should load the page and display key UI elements', async ({ page }) => {
      const bst = new BSTPage(page);
      await bst.goto();

      // Verify document title is correct
      await expect(page).toHaveTitle(/Binary Search Tree Visualization/);

      // Verify input and button are visible
      await expect(bst.input).toBeVisible();
      await expect(bst.insertButton).toBeVisible();

      // Verify placeholder text on input
      const placeholder = await bst.input.getAttribute('placeholder');
      expect(placeholder).toBe('Enter a number');

      // Verify container exists and is initially empty
      await expect(bst.container).toBeVisible();
      const initialNodeCount = await bst.nodeLocator.count();
      expect(initialNodeCount).toBe(0);

      // Assert that there were no uncaught page errors during load
      // (we record errors, but do not modify the page or catch exceptions)
      expect(pageErrors.length).toBe(0);
    });
  });

  // Tests for inserting nodes and verifying DOM updates
  test.describe('Insertion behavior and DOM updates', () => {
    test('should insert a single node and render it in the container', async ({ page }) => {
      const bst1 = new BSTPage(page);
      await bst.goto();

      // Insert 10 and verify the node appears
      await bst.insertValue(10);

      // After insertion, input should be cleared
      await expect(bst.input).toHaveValue('');

      // One node should be present with the text '10'
      await expect(bst.nodeLocator).toHaveCount(1);
      await expect(bst.nodeLocator.first()).toHaveText('10');

      // No unexpected page errors
      expect(pageErrors.length).toBe(0);
    });

    test('should insert multiple nodes and maintain BST ordering in structure', async ({ page }) => {
      const bst2 = new BSTPage(page);
      await bst.goto();

      // Insert nodes: root 10, left 5, right 15
      await bst.insertValue(10);
      await bst.insertValue(5);
      await bst.insertValue(15);

      // There should be 3 node elements rendered
      await expect(bst.nodeLocator).toHaveCount(3);

      // The draw function appends nodes in pre-order: root, then left subtree, then right subtree.
      // Assert presence of values (order-sensitive check)
      const values1 = await bst.getNodeValues();
      // Expect the sequence to include the three numbers; enforce the likely pre-order arrangement
      expect(values[0]).toBe('10');
      // left child should be somewhere after root
      expect(values).toContain('5');
      // right child should be somewhere after left (in this drawing logic)
      expect(values).toContain('15');

      // There should be at least one line element because root has children
      const lineCount = await bst.getLineCount();
      expect(lineCount).toBeGreaterThan(0);

      // No page errors thrown
      expect(pageErrors.length).toBe(0);
    });

    test('should handle deeper insertions and render multiple levels', async ({ page }) => {
      const bst3 = new BSTPage(page);
      await bst.goto();

      // Insert a sequence that creates multiple levels
      const sequence = [50, 30, 70, 20, 40, 60, 80, 10, 25];
      for (const val of sequence) {
        await bst.insertValue(val);
      }

      // Validate node count matches inserted values
      await expect(bst.nodeLocator).toHaveCount(sequence.length);

      // Validate some specific nodes exist in the DOM
      const values2 = await bst.getNodeValues();
      expect(values).toContain('50');
      expect(values).toContain('20');
      expect(values).toContain('80');

      // There should be line elements because multiple nodes have children
      const lineCount1 = await bst.getLineCount();
      expect(lineCount).toBeGreaterThan(0);

      // Confirm no JS errors were captured on the page
      expect(pageErrors.length).toBe(0);
    });
  });

  // Tests for edge cases, alerts, and invalid input handling
  test.describe('Edge cases and error handling', () => {
    test('should show an alert when inserting an invalid (non-numeric or empty) value', async ({ page }) => {
      const bst4 = new BSTPage(page);
      await bst.goto();

      // Listen for dialog (alert) events and assert text
      let dialogMessage = null;
      page.once('dialog', async (dialog) => {
        dialogMessage = dialog.message();
        await dialog.accept(); // accept the alert so test can continue
      });

      // Ensure input is empty and click insert -> should trigger alert
      await bst.clearInput();
      await bst.insertButton.click();

      // Wait briefly to ensure dialog was handled
      await page.waitForTimeout(100);

      // Validate the alert text matches the application's message
      expect(dialogMessage).toBe('Please enter a valid number.');

      // Ensure no new nodes were created
      await expect(bst.nodeLocator).toHaveCount(0);

      // No page-level errors (alerts do not produce pageerror)
      expect(pageErrors.length).toBe(0);
    });

    test('should ignore non-numeric characters when typed into the number input and only accept numeric insertion', async ({ page }) => {
      const bst5 = new BSTPage(page);
      await bst.goto();

      // The input has type="number". Playwright can fill non-numeric text, but the page code uses parseInt.
      // Fill with text that includes numeric prefix and non-numeric suffix
      await bst.input.fill('123abc');

      // Click insert - parseInt('123abc') returns 123 in JS
      await bst.insertButton.click();

      // One node should be inserted with value '123'
      await expect(bst.nodeLocator).toHaveCount(1);
      await expect(bst.nodeLocator.first()).toHaveText('123');

      // Input should be cleared after successful insert
      await expect(bst.input).toHaveValue('');

      // No uncaught page errors
      expect(pageErrors.length).toBe(0);
    });
  });

  // Tests to observe console messages and ensure no unexpected JS exceptions were emitted
  test.describe('Console and page error monitoring', () => {
    test('should not emit console errors or uncaught exceptions during typical interactions', async ({ page }) => {
      const bst6 = new BSTPage(page);
      await bst.goto();

      // Perform some operations that exercise the code
      await bst.insertValue(1);
      await bst.insertValue(2);
      await bst.insertValue(0);

      // Wait for potential async console messages to be emitted
      await page.waitForTimeout(100);

      // Inspect captured console messages and page errors
      const errorConsoleMessages = consoleMessages.filter(m => m.type === 'error');
      // Assert there are no console.error invocations
      expect(errorConsoleMessages.length).toBe(0);

      // Assert there were no uncaught page errors (exceptions)
      expect(pageErrors.length).toBe(0);
    });

    test('should capture any page errors if they naturally occur (test will fail if unexpected errors exist)', async ({ page }) => {
      const bst7 = new BSTPage(page);
      await bst.goto();

      // Intentionally perform normal operations and then assert there are no page errors.
      // This test exists to record and assert on any naturally occurring runtime errors.
      await bst.insertValue(9);
      await bst.insertValue(3);
      await bst.insertValue(12);

      // Small delay to allow any synchronous errors to propagate to the pageerror handler
      await page.waitForTimeout(100);

      // If there are page errors, surface them in the assertion message for easier debugging
      if (pageErrors.length > 0) {
        // Build a readable list of error messages
        const messages = pageErrors.map(e => e && e.message ? e.message : String(e)).join('; |; ');
        throw new Error(`Expected no uncaught page errors, but found ${pageErrors.length}: ${messages}`);
      }

      // Otherwise, explicitly assert zero errors
      expect(pageErrors.length).toBe(0);
    });
  });
});