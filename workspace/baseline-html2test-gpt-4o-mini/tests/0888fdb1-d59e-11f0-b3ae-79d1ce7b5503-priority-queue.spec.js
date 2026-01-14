import { test, expect } from '@playwright/test';

// URL of the served HTML page
const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/0888fdb1-d59e-11f0-b3ae-79d1ce7b5503.html';

// Page object model for the Priority Queue page
class PriorityQueuePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.valueInput = page.locator('#valueInput');
    this.priorityInput = page.locator('#priorityInput');
    this.enqueueBtn = page.locator('#enqueueBtn');
    this.dequeueBtn = page.locator('#dequeueBtn');
    this.queueDisplay = page.locator('#queueDisplay');
    this.itemLocator = this.queueDisplay.locator('.item');
  }

  // Navigate to the app
  async goto() {
    await this.page.goto(APP_URL);
  }

  // Enqueue an item using the UI
  async enqueue(value, priority) {
    await this.valueInput.fill(value);
    await this.priorityInput.fill(String(priority));
    await this.enqueueBtn.click();
  }

  // Click the Dequeue button (caller can handle dialog)
  async dequeue() {
    await this.dequeueBtn.click();
  }

  // Fetch visible item texts, in DOM order
  async getItemTexts() {
    const count = await this.itemLocator.count();
    const texts = [];
    for (let i = 0; i < count; i++) {
      texts.push(await this.itemLocator.nth(i).innerText());
    }
    return texts;
  }

  // Check if queue display is empty
  async isQueueEmpty() {
    return (await this.itemLocator.count()) === 0;
  }

  // Get current values of inputs
  async getInputValues() {
    return {
      value: await this.valueInput.inputValue(),
      priority: await this.priorityInput.inputValue(),
    };
  }
}

test.describe('Priority Queue Demo - 0888fdb1-d59e-11f0-b3ae-79d1ce7b5503', () => {
  // Arrays to collect runtime errors and console error messages
  let pageErrors;
  let consoleErrors;

  // Attach listeners in beforeEach so each test gets a fresh collection
  test.beforeEach(async ({ page }) => {
    pageErrors = [];
    consoleErrors = [];

    // Collect uncaught page errors (ReferenceError, TypeError, etc.)
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    // Collect console messages; keep only error-level console messages
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push({
          text: msg.text(),
          location: msg.location(),
        });
      }
    });
  });

  // After each test ensure there were no unexpected runtime errors
  test.afterEach(async () => {
    // Assert no uncaught exceptions happened during test
    expect(pageErrors.length, `Expected no page errors, but found: ${pageErrors.map(e => String(e)).join(' | ')}`).toBe(0);
    // Assert no console.error messages were emitted
    expect(consoleErrors.length, `Expected no console.error messages, but found: ${consoleErrors.map(e => e.text).join(' | ')}`).toBe(0);
  });

  test.describe('Initial page load and default state', () => {
    test('should load the page and display initial empty queue', async ({ page }) => {
      // Purpose: Verify page loads and the queue display is empty initially
      const app = new PriorityQueuePage(page);
      await app.goto();

      await expect(page).toHaveTitle(/Priority Queue Demo/i);

      // Verify inputs and buttons are visible
      await expect(app.valueInput).toBeVisible();
      await expect(app.priorityInput).toBeVisible();
      await expect(app.enqueueBtn).toBeVisible();
      await expect(app.dequeueBtn).toBeVisible();
      await expect(app.queueDisplay).toBeVisible();

      // Initially there should be no items in the queue display
      expect(await app.isQueueEmpty()).toBe(true);

      // Input placeholders are present
      expect(await app.valueInput.getAttribute('placeholder')).toBe('Enter value');
      expect(await app.priorityInput.getAttribute('placeholder')).toBe('Enter priority (lower means higher priority)');
    });
  });

  test.describe('Enqueue behavior and ordering', () => {
    test('should enqueue a single item and clear inputs', async ({ page }) => {
      // Purpose: Ensure enqueue adds an item, displays it, and clears inputs
      const app1 = new PriorityQueuePage(page);
      await app.goto();

      // Enqueue a valid item
      await app.enqueue('taskA', 10);

      // After enqueue, queue display should show one item with exact text
      const items = await app.getItemTexts();
      expect(items.length).toBe(1);
      expect(items[0]).toBe('Value: taskA, Priority: 10');

      // Inputs should be cleared by the app code after successful enqueue
      const inputs = await app.getInputValues();
      expect(inputs.value).toBe('');
      expect(inputs.priority).toBe('');
    });

    test('should maintain priority order (lower number = higher priority)', async ({ page }) => {
      // Purpose: Enqueue multiple items with different priorities and verify sort order
      const app2 = new PriorityQueuePage(page);
      await app.goto();

      // Add three items with different priorities
      await app.enqueue('lowPriority', 100);
      await app.enqueue('highPriority', 1);
      await app.enqueue('mediumPriority', 50);

      // The display should sort items by numeric priority ascending (1, 50, 100)
      const items1 = await app.getItemTexts();
      expect(items).toEqual([
        'Value: highPriority, Priority: 1',
        'Value: mediumPriority, Priority: 50',
        'Value: lowPriority, Priority: 100',
      ]);
    });

    test('should show alert when trying to enqueue with invalid inputs', async ({ page }) => {
      // Purpose: Verify error handling when enqueue is attempted with missing or invalid inputs
      const app3 = new PriorityQueuePage(page);
      await app.goto();

      // Try to enqueue with empty inputs; app should show an alert
      const [dialog] = await Promise.all([
        page.waitForEvent('dialog'),
        app.enqueueBtn.click(), // click with empty fields
      ]);

      expect(dialog.type()).toBe('alert');
      expect(dialog.message()).toBe('Please enter a valid value and priority.');
      await dialog.dismiss();

      // Ensure still empty
      expect(await app.isQueueEmpty()).toBe(true);
    });
  });

  test.describe('Dequeue behavior and alerts', () => {
    test('should dequeue the highest priority item and show alert with removed item', async ({ page }) => {
      // Purpose: Ensure dequeue removes the correct item and shows an alert summary
      const app4 = new PriorityQueuePage(page);
      await app.goto();

      // Enqueue two items
      await app.enqueue('job1', 20);
      await app.enqueue('job2', 10); // higher priority (smaller number)

      // Verify initial order: job2 then job1
      expect(await app.getItemTexts()).toEqual([
        'Value: job2, Priority: 10',
        'Value: job1, Priority: 20',
      ]);

      // Click Dequeue and capture the alert that reports the removed item
      const dialogPromise = page.waitForEvent('dialog');
      await app.dequeue();
      const dialog = await dialogPromise;
      expect(dialog.type()).toBe('alert');
      expect(dialog.message()).toBe('Dequeued: Value: job2, Priority: 10');
      await dialog.dismiss();

      // After dequeue, only job1 should remain
      expect(await app.getItemTexts()).toEqual(['Value: job1, Priority: 20']);
    });

    test('should alert when dequeuing an empty queue', async ({ page }) => {
      // Purpose: Verify user is notified when attempting to dequeue from an empty queue
      const app5 = new PriorityQueuePage(page);
      await app.goto();

      // Ensure empty state
      expect(await app.isQueueEmpty()).toBe(true);

      // Click Dequeue and assert alert content
      const dialogPromise1 = page.waitForEvent('dialog');
      await app.dequeue();
      const dialog1 = await dialogPromise;
      expect(dialog.type()).toBe('alert');
      expect(dialog.message()).toBe('Queue is empty!');
      await dialog.dismiss();
    });
  });

  test.describe('DOM and visual checks', () => {
    test('items have expected class and are visible after enqueue', async ({ page }) => {
      // Purpose: Verify that created item elements have the expected class name and are visible
      const app6 = new PriorityQueuePage(page);
      await app.goto();

      await app.enqueue('visibleTask', 2);

      // There should be one element with class 'item' inside queueDisplay
      const count1 = await app.itemLocator.count1();
      expect(count).toBe(1);

      // Check class and visibility
      await expect(app.itemLocator.first()).toHaveClass(/item/);
      await expect(app.itemLocator.first()).toBeVisible();

      // Text content correctness
      expect(await app.itemLocator.first().innerText()).toBe('Value: visibleTask, Priority: 2');
    });
  });
});