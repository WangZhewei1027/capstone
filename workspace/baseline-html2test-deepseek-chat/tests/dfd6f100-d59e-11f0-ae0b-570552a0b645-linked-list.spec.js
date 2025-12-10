import { test, expect } from '@playwright/test';

// Test file for Linked List visualization application
// URL: http://127.0.0.1:5500/workspace/baseline-html2test-deepseek-chat/html/dfd6f100-d59e-11f0-ae0b-570552a0b645.html
const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-deepseek-chat/html/dfd6f100-d59e-11f0-ae0b-570552a0b645.html';

// Page object encapsulating common interactions and queries
class LinkedListPage {
  constructor(page) {
    this.page = page;
    this.valueInput = page.locator('#valueInput');
    this.positionInput = page.locator('#positionInput');
    this.deleteValueInput = page.locator('#deleteValueInput');
    this.statusMessage = page.locator('#statusMessage');
    this.visualization = page.locator('#listVisualization');
    this.nextBtn = page.locator('#nextBtn');
  }

  async goto() {
    await this.page.goto(APP_URL);
    // wait for initial sample setup which runs on window.onload
    await this.statusMessage.waitFor({ state: 'visible', timeout: 2000 });
  }

  async clickButtonByText(text) {
    // find a button by its exact text
    await this.page.getByRole('button', { name: text }).click();
  }

  async addToHead(value) {
    await this.valueInput.fill(String(value));
    await this.clickButtonByText('Add to Head');
  }

  async addToTail(value) {
    await this.valueInput.fill(String(value));
    await this.clickButtonByText('Add to Tail');
  }

  async removeFromHead() {
    await this.clickButtonByText('Remove from Head');
  }

  async removeFromTail() {
    await this.clickButtonByText('Remove from Tail');
  }

  async findValue(value) {
    await this.valueInput.fill(String(value));
    await this.clickButtonByText('Find Value');
  }

  async clearList() {
    await this.clickButtonByText('Clear List');
  }

  async startTraversal() {
    await this.clickButtonByText('Start Traversal');
  }

  async nextNode() {
    await this.clickButtonByText('Next Node');
  }

  async resetTraversal() {
    await this.clickButtonByText('Reset');
  }

  async insertAtPosition(value, position) {
    await this.valueInput.fill(String(value));
    await this.positionInput.fill(String(position));
    await this.clickButtonByText('Insert');
  }

  async deleteByValue(value) {
    await this.deleteValueInput.fill(String(value));
    await this.clickButtonByText('Delete');
  }

  // returns the textContent of the data element at index position (0-based)
  async getNodeTextAt(index) {
    const locator = this.page.locator('.data').nth(index);
    await expect(locator).toBeVisible();
    return (await locator.textContent()).trim();
  }

  // returns the number of nodes currently rendered (elements with class .data)
  async getNodeCount() {
    return await this.page.locator('.data').count();
  }

  // checks whether node at index has highlight class 'current-node'
  async isNodeHighlighted(index) {
    const locator = this.page.locator('.data').nth(index);
    return await locator.evaluate((el) => el.classList.contains('current-node'));
  }

  async getStatusText() {
    return (await this.statusMessage.textContent()).trim();
  }

  async getStatusColor() {
    return await this.statusMessage.evaluate((el) => {
      return window.getComputedStyle(el).color;
    });
  }
}

test.describe('Linked List Visualization - Comprehensive E2E', () => {
  let pageErrors;
  let consoleErrors;

  test.beforeEach(async ({ page }) => {
    // collect page errors and console error messages for assertions
    pageErrors = [];
    consoleErrors = [];

    page.on('pageerror', (err) => {
      pageErrors.push(String(err && err.message ? err.message : err));
    });

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
  });

  test.describe('Initial load and default state', () => {
    test('should load the page and render sample linked list with correct nodes', async ({ page }) => {
      const app = new LinkedListPage(page);
      await app.goto();

      // There should be 4 nodes initially: 5,10,20,30 (after addToHead(5) and tails 10,20,30)
      await expect(app.visualization).toBeVisible();

      // Assert node count and exact values at positions
      const count = await app.getNodeCount();
      expect(count).toBe(4);

      const node0 = await app.getNodeTextAt(0);
      const node1 = await app.getNodeTextAt(1);
      const node2 = await app.getNodeTextAt(2);
      const node3 = await app.getNodeTextAt(3);

      expect(node0).toBe('5');
      expect(node1).toBe('10');
      expect(node2).toBe('20');
      expect(node3).toBe('30');

      // The status message should indicate sample creation
      const status = await app.getStatusText();
      expect(status).toContain('Sample linked list created');

      // Next button should be disabled initially
      await expect(app.nextBtn).toBeDisabled();

      // Assert there were no uncaught page errors and no console errors at load
      expect(pageErrors).toEqual([]);
      expect(consoleErrors).toEqual([]);
    });
  });

  test.describe('Basic operations: add, remove, find, clear', () => {
    test('should add values to head and tail and update DOM and status', async ({ page }) => {
      const app = new LinkedListPage(page);
      await app.goto();

      // Add to head value 1 -> becomes new node-0
      await app.addToHead(1);
      await expect(app.statusMessage).toHaveText(/Added 1 to the head of the list/);
      expect(await app.getNodeTextAt(0)).toBe('1');

      // Add to tail value 99 -> becomes last node
      await app.addToTail(99);
      await expect(app.statusMessage).toHaveText(/Added 99 to the tail of the list/);
      const countAfter = await app.getNodeCount();
      expect(countAfter).toBe(6); // initial 4 + 1 head + 1 tail

      // Last node text should be 99
      const lastIndex = countAfter - 1;
      expect(await app.getNodeTextAt(lastIndex)).toBe('99');

      // No unexpected runtime errors
      expect(pageErrors).toEqual([]);
      expect(consoleErrors).toEqual([]);
    });

    test('should remove from head and tail and reflect changes', async ({ page }) => {
      const app = new LinkedListPage(page);
      await app.goto();

      // Add a known head and tail to ensure deterministic removals
      await app.addToHead(1000); // new head
      await app.addToTail(2000); // new tail
      const beforeCount = await app.getNodeCount();
      expect(beforeCount).toBe(6);

      // Remove from head should remove 1000
      await app.removeFromHead();
      await expect(app.statusMessage).toHaveText(/Removed node from the head/);
      expect(await app.getNodeTextAt(0)).not.toBe('1000');
      const afterRemoveHeadCount = await app.getNodeCount();
      expect(afterRemoveHeadCount).toBe(5);

      // Remove from tail should remove 2000
      await app.removeFromTail();
      await expect(app.statusMessage).toHaveText(/Removed node from the tail/);
      const afterRemoveTailCount = await app.getNodeCount();
      expect(afterRemoveTailCount).toBe(4);

      // No runtime errors
      expect(pageErrors).toEqual([]);
      expect(consoleErrors).toEqual([]);
    });

    test('should find existing and non-existing values and show appropriate messages', async ({ page }) => {
      const app = new LinkedListPage(page);
      await app.goto();

      // Find existing value 20 which is at position 2 in initial list
      await app.findValue(20);
      await expect(app.statusMessage).toHaveText(/Value 20 found at position 2/);

      // Find a non-existing value
      await app.findValue(9999);
      await expect(app.statusMessage).toHaveText(/Value 9999 not found in the list/);

      // Invalid input (blank) should produce an error message and red color
      await app.valueInput.fill('');
      await app.clickButtonByText('Find Value');
      await expect(app.statusMessage).toHaveText(/Please enter a valid number/);
      const color = await app.getStatusColor();
      // #dc3545 -> rgb(220, 53, 69)
      expect(color).toBe('rgb(220, 53, 69)');

      expect(pageErrors).toEqual([]);
      expect(consoleErrors).toEqual([]);
    });

    test('clear list should reset visualization and traversal state', async ({ page }) => {
      const app = new LinkedListPage(page);
      await app.goto();

      await app.clearList();
      await expect(app.statusMessage).toHaveText(/List cleared/);

      // visualization should show "The list is empty" paragraph
      await expect(app.visualization).toContainText('The list is empty');

      // next button should be disabled and no nodes present
      await expect(app.nextBtn).toBeDisabled();
      expect(await app.getNodeCount()).toBe(0);

      expect(pageErrors).toEqual([]);
      expect(consoleErrors).toEqual([]);
    });
  });

  test.describe('Advanced operations: insert at position & delete by value', () => {
    test('should insert at a valid position and reject invalid positions', async ({ page }) => {
      const app = new LinkedListPage(page);
      await app.goto();

      // Insert value 15 at position 2 => expected new order: 5,10,15,20,30
      await app.insertAtPosition(15, 2);
      await expect(app.statusMessage).toHaveText(/Inserted 15 at position 2/);
      expect(await app.getNodeTextAt(2)).toBe('15');

      // Attempt to insert at invalid position (greater than size)
      await app.insertAtPosition(999, 999);
      await expect(app.statusMessage).toHaveText(/Invalid position/);
      const color = await app.getStatusColor();
      expect(color).toBe('rgb(220, 53, 69)'); // error color

      expect(pageErrors).toEqual([]);
      expect(consoleErrors).toEqual([]);
    });

    test('should delete by value when present and show error when not found', async ({ page }) => {
      const app = new LinkedListPage(page);
      await app.goto();

      // Delete existing value 20
      await app.deleteByValue(20);
      await expect(app.statusMessage).toHaveText(/Deleted node with value 20/);
      // Ensure 20 is no longer present among data elements
      const texts = await page.locator('.data').allTextContents();
      expect(texts.find(t => t.trim() === '20')).toBeUndefined();

      // Attempt to delete value that does not exist
      await app.deleteByValue(424242);
      await expect(app.statusMessage).toHaveText(/Value 424242 not found in the list/);
      const color = await app.getStatusColor();
      expect(color).toBe('rgb(220, 53, 69)'); // error color

      expect(pageErrors).toEqual([]);
      expect(consoleErrors).toEqual([]);
    });
  });

  test.describe('Traversal: start, next, reset and end behavior', () => {
    test('should start traversal highlight head, advance on next, and finish correctly', async ({ page }) => {
      const app = new LinkedListPage(page);
      await app.goto();

      // Start traversal: should enable Next Node button and highlight node-0
      await app.startTraversal();
      await expect(app.statusMessage).toHaveText(/Traversal started/);
      await expect(app.nextBtn).toBeEnabled();

      // head (node-0) should be highlighted immediately after starting traversal
      expect(await app.isNodeHighlighted(0)).toBe(true);

      // Click Next Node: per implementation, status will show current node value (head),
      // and highlighting will move to next node (node-1)
      await app.nextNode();
      await expect(app.statusMessage).toHaveText(/Current node value: 5/);
      expect(await app.isNodeHighlighted(1)).toBe(true);

      // Continue clicking Next Node until the end; expect "Reached the end of the list"
      // Initial sample has 4 nodes: indices 0..3. We have already advanced once.
      await app.nextNode(); // should show current node value: 10 and highlight node-2
      await expect(app.statusMessage).toHaveText(/Current node value:/);

      await app.nextNode(); // advance further
      await expect(app.statusMessage).toHaveText(/Current node value:/);

      // One more click should eventually reach end and disable next button
      // Number of clicks to exhaust traversal depends on implementation; ensure we loop safely
      for (let i = 0; i < 4; i++) {
        await app.nextNode();
        const txt = await app.getStatusText();
        if (/Reached the end of the list/.test(txt)) break;
      }

      await expect(app.statusMessage).toHaveText(/Reached the end of the list/);
      await expect(app.nextBtn).toBeDisabled();

      expect(pageErrors).toEqual([]);
      expect(consoleErrors).toEqual([]);
    });

    test('reset traversal should clear traversal state and remove highlighting', async ({ page }) => {
      const app = new LinkedListPage(page);
      await app.goto();

      // Start then reset traversal
      await app.startTraversal();
      await expect(app.nextBtn).toBeEnabled();
      await app.resetTraversal();

      // After reset, next button disabled and no nodes highlighted
      await expect(app.nextBtn).toBeDisabled();
      const nodeCount = await app.getNodeCount();
      for (let i = 0; i < nodeCount; i++) {
        expect(await app.isNodeHighlighted(i)).toBe(false);
      }

      await expect(app.statusMessage).toHaveText(/Traversal reset/);
      expect(pageErrors).toEqual([]);
      expect(consoleErrors).toEqual([]);
    });
  });

  test.describe('Edge cases and validation messages', () => {
    test('should show validation error when attempting operations with invalid inputs', async ({ page }) => {
      const app = new LinkedListPage(page);
      await app.goto();

      // Blank input for Add to Head
      await app.valueInput.fill('');
      await app.clickButtonByText('Add to Head');
      await expect(app.statusMessage).toHaveText(/Please enter a valid number/);
      expect(await app.getStatusColor()).toBe('rgb(220, 53, 69)');

      // Clear list then remove from head should produce "List is already empty"
      await app.clearList();
      await app.removeFromHead();
      await expect(app.statusMessage).toHaveText(/List is already empty/);
      expect(await app.getStatusColor()).toBe('rgb(220, 53, 69)');

      // Try delete by value with blank input
      await app.deleteByValue('');
      await expect(app.statusMessage).toHaveText(/Please enter a valid number/);
      expect(await app.getStatusColor()).toBe('rgb(220, 53, 69)');

      expect(pageErrors).toEqual([]);
      expect(consoleErrors).toEqual([]);
    });
  });
});