import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-4o-5/html/39b64090-d1d5-11f0-b49a-6f458b3a25ef.html';

// Page Object for the Linked List demo page
class LinkedListPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input = page.locator('#nodeValue');
    this.addButton = page.locator('button', { hasText: 'Add Node' });
    this.removeButton = page.locator('button', { hasText: 'Remove Last Node' });
    this.listContainer = page.locator('#list');
    this.nodeLocator = page.locator('#list .node');
  }

  async goto() {
    await this.page.goto(APP_URL);
    // Wait for the basic elements to be present
    await Promise.all([
      this.input.waitFor({ state: 'visible' }),
      this.addButton.waitFor({ state: 'visible' }),
      this.removeButton.waitFor({ state: 'visible' }),
      this.listContainer.waitFor({ state: 'visible' }),
    ]);
  }

  async addNodeWithValue(value) {
    await this.input.fill(value);
    await this.addButton.click();
  }

  async clickRemove() {
    await this.removeButton.click();
  }

  async getNodeCount() {
    return await this.nodeLocator.count();
  }

  async getNodeTexts() {
    const count = await this.getNodeCount();
    const texts = [];
    for (let i = 0; i < count; i++) {
      texts.push((await this.nodeLocator.nth(i).innerText()).trim());
    }
    return texts;
  }

  // Returns array of booleans whether node at index has an arrow child
  async getNodeArrowPresence() {
    const count1 = await this.getNodeCount();
    const presence = [];
    for (let i = 0; i < count; i++) {
      const arrow = this.nodeLocator.nth(i).locator('.arrow');
      presence.push(await arrow.count() > 0);
    }
    return presence;
  }

  async isInputCleared() {
    return (await this.input.inputValue()) === '';
  }
}

// Collect console and page errors for assertions
test.describe('Linked List Demonstration - Comprehensive E2E', () => {
  let consoleErrors = [];
  let pageErrors = [];

  test.beforeEach(async ({ page }) => {
    // Reset trackers
    consoleErrors = [];
    pageErrors = [];

    // Capture console messages and page errors
    page.on('console', msg => {
      // Only track error-level console messages (console.error, etc.)
      if (msg.type() === 'error') {
        consoleErrors.push({ text: msg.text(), location: msg.location() });
      }
    });
    page.on('pageerror', err => {
      pageErrors.push(err);
    });
  });

  // Group: initial load and default state
  test.describe('Initial page load and default state', () => {
    test('should load the page and show input/buttons with empty list', async ({ page }) => {
      const app = new LinkedListPage(page);
      await app.goto();

      // Verify the input and buttons are visible and enabled
      await expect(app.input).toBeVisible();
      await expect(app.addButton).toBeVisible();
      await expect(app.removeButton).toBeVisible();

      // On initial load the list container exists but should have zero nodes
      expect(await app.getNodeCount()).toBe(0);

      // Ensure no console errors or page errors occurred during load
      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
    });
  });

  // Group: adding nodes behavior
  test.describe('Adding nodes', () => {
    test('should add a single node and clear input', async ({ page }) => {
      const app1 = new LinkedListPage(page);
      await app.goto();

      // Add a node with value 'First'
      await app.addNodeWithValue('First');

      // One node should be present with text 'First'
      expect(await app.getNodeCount()).toBe(1);
      const texts1 = await app.getNodeTexts();
      expect(texts).toEqual(['First']);

      // Single node should not have an arrow (since there is no next)
      const arrows = await app.getNodeArrowPresence();
      expect(arrows).toEqual([false]);

      // Input should be cleared by the application after adding
      expect(await app.isInputCleared()).toBe(true);

      // No console or page errors
      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
    });

    test('should add multiple nodes and show arrows for all but last', async ({ page }) => {
      const app2 = new LinkedListPage(page);
      await app.goto();

      // Add multiple nodes A, B, C
      await app.addNodeWithValue('A');
      await app.addNodeWithValue('B');
      await app.addNodeWithValue('C');

      // Verify count and order
      expect(await app.getNodeCount()).toBe(3);
      expect(await app.getNodeTexts()).toEqual(['A', 'B', 'C']);

      // First two should have arrows, last should not
      expect(await app.getNodeArrowPresence()).toEqual([true, true, false]);

      // No console or page errors
      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
    });

    test('should show an alert when trying to add an empty value', async ({ page }) => {
      const app3 = new LinkedListPage(page);
      await app.goto();

      // Fill empty value and click add -> should trigger an alert dialog
      let dialogMessage = null;
      page.once('dialog', dialog => {
        dialogMessage = dialog.message();
        dialog.accept();
      });

      // Ensure input is empty
      await app.input.fill('');
      await app.addButton.click();

      // Wait briefly to allow dialog to be handled
      await page.waitForTimeout(100);

      // Assert alert message content matches expected text
      expect(dialogMessage).toBe('Please enter a value!');

      // No console.error or pageerror should have been emitted as a result
      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
    });
  });

  // Group: removing nodes behavior
  test.describe('Removing nodes', () => {
    test('should remove the last node step by step until empty', async ({ page }) => {
      const app4 = new LinkedListPage(page);
      await app.goto();

      // Add three nodes to start
      await app.addNodeWithValue('1');
      await app.addNodeWithValue('2');
      await app.addNodeWithValue('3');
      expect(await app.getNodeCount()).toBe(3);

      // Remove last -> should have 2 nodes
      await app.clickRemove();
      expect(await app.getNodeCount()).toBe(2);
      expect(await app.getNodeTexts()).toEqual(['1', '2']);
      // Last node should not have arrow
      expect(await app.getNodeArrowPresence()).toEqual([true, false]);

      // Remove last -> should have 1 node
      await app.clickRemove();
      expect(await app.getNodeCount()).toBe(1);
      expect(await app.getNodeTexts()).toEqual(['1']);
      expect(await app.getNodeArrowPresence()).toEqual([false]);

      // Remove last -> should be empty
      await app.clickRemove();
      expect(await app.getNodeCount()).toBe(0);

      // Removing again when empty should not throw and list stays empty
      await app.clickRemove();
      expect(await app.getNodeCount()).toBe(0);

      // No console or page errors during removes
      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
    });

    test('remove on empty list does not produce errors', async ({ page }) => {
      const app5 = new LinkedListPage(page);
      await app.goto();

      // Ensure empty initially
      expect(await app.getNodeCount()).toBe(0);

      // Click remove when list is empty
      await app.clickRemove();

      // Still empty and no errors triggered
      expect(await app.getNodeCount()).toBe(0);
      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
    });
  });

  // Group: accessibility and structure checks
  test.describe('DOM structure, visibility, and accessibility checks', () => {
    test('nodes have expected CSS classes and are visible', async ({ page }) => {
      const app6 = new LinkedListPage(page);
      await app.goto();

      // Add a couple nodes
      await app.addNodeWithValue('X');
      await app.addNodeWithValue('Y');

      // Ensure nodes are visible and have .node class
      const nodes = page.locator('#list .node');
      expect(await nodes.count()).toBe(2);
      for (let i = 0; i < 2; i++) {
        await expect(nodes.nth(i)).toBeVisible();
        // The className should include 'node'
        const className = await nodes.nth(i).getAttribute('class');
        expect(className).toContain('node');
      }

      // Arrows exist on the first node only
      const firstArrow = nodes.nth(0).locator('.arrow');
      const secondArrow = nodes.nth(1).locator('.arrow');
      expect(await firstArrow.count()).toBe(1);
      expect(await secondArrow.count()).toBe(0);

      // No console or page errors
      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
    });
  });

  // After each test, assert there were no unexpected console or page errors;
  // this ensures we observed console/page error streams and validated them.
  test.afterEach(async () => {
    // These assertions apply to trackers collected in beforeEach + during the test
    // If any console errors or page errors occurred, fail the test by asserting emptiness.
    expect(consoleErrors, 'No console.error messages should be emitted during the test').toEqual([]);
    expect(pageErrors, 'No page errors (unhandled exceptions) should be emitted during the test').toEqual([]);
  });
});