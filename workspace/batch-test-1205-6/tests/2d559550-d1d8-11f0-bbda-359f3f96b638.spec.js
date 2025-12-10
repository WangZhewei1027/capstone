import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-6/html/2d559550-d1d8-11f0-bbda-359f3f96b638.html';

/**
 * Page Object for interacting with the Queue Demonstration app.
 */
class QueuePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    // Captured last dialog message for convenience
    this.lastDialogMessage = null;
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async _clickAndHandleDialog(selector) {
    // Try to capture a dialog if it appears within a short timeout.
    const dialogPromise = this.page.waitForEvent('dialog', { timeout: 1000 }).catch(() => null);
    await this.page.click(selector);
    const dialog = await dialogPromise;
    if (dialog) {
      const msg = dialog.message();
      await dialog.accept();
      this.lastDialogMessage = msg;
      return msg;
    }
    this.lastDialogMessage = null;
    return null;
  }

  async enqueue(item) {
    await this.page.fill('#itemInput', item);
    // Enqueue may or may not trigger an alert. Capture if it does.
    return await this._clickAndHandleDialog('button[onclick="enqueue()"]');
  }

  async dequeue() {
    // Dequeue always triggers an alert in implementation. Capture it.
    return await this._clickAndHandleDialog('button[onclick="dequeue()"]');
  }

  async getQueueItems() {
    return await this.page.$$eval('#queueContainer .queue-item', nodes => nodes.map(n => n.textContent.trim()));
  }

  async getQueueContainerText() {
    return await this.page.$eval('#queueContainer', el => el.innerText.trim());
  }

  async getInputValue() {
    return await this.page.$eval('#itemInput', el => el.value);
  }
}

test.describe('Queue Demonstration - FSM tests', () => {
  let consoleErrors;
  let pageErrors;
  let pageWarnings;
  let pageInfos;

  test.beforeEach(async ({ page }) => {
    // Collect console messages and page errors for assertions
    consoleErrors = [];
    pageErrors = [];
    pageWarnings = [];
    pageInfos = [];

    page.on('console', msg => {
      const type = msg.type();
      if (type === 'error') consoleErrors.push(msg.text());
      else if (type === 'warning') pageWarnings.push(msg.text());
      else pageInfos.push({ type, text: msg.text() });
    });

    page.on('pageerror', err => {
      pageErrors.push(String(err));
    });
  });

  test.afterEach(async () => {
    // After each test ensure there are no uncaught runtime errors logged to console or page.
    // This asserts the page ran without unexpected ReferenceError/SyntaxError/TypeError in the console.
    expect(pageErrors, 'No uncaught page errors should occur').toEqual([]);
    expect(consoleErrors, 'No console.error messages should be emitted').toEqual([]);
  });

  test('Initial state (S0_Idle): queue is empty and input exists', async ({ page }) => {
    // Validate the initial Idle state: no items in queue, input present and empty
    const q = new QueuePage(page);
    await q.goto();

    // The queue container should start empty
    const items = await q.getQueueItems();
    expect(items.length).toBe(0);

    const containerText = await q.getQueueContainerText();
    expect(containerText).toBe('', 'Queue container should be empty on initial load');

    const inputValue = await q.getInputValue();
    expect(inputValue).toBe('', 'Input should be empty on initial load');
  });

  test('Enqueue valid item transitions to Item Added (S0 -> S1) and clears input (S1 -> S0)', async ({ page }) => {
    // This test validates:
    // - Enqueue button enqueues a trimmed, non-empty item
    // - updateQueueDisplay() is called resulting in DOM change (item appears)
    // - input field is cleared after enqueue (input validation transition)
    const q1 = new QueuePage(page);
    await q.goto();

    // Enqueue an item
    const dialogMessage = await q.enqueue('Alpha');

    // Enqueue for valid item should NOT produce an alert (dialogMessage === null)
    expect(dialogMessage).toBeNull();

    // The queue container should now contain the enqueued item
    const items1 = await q.getQueueItems();
    expect(items).toEqual(['Alpha']);

    // Input should be cleared after enqueue
    const inputValue1 = await q.getInputValue();
    expect(inputValue).toBe('', 'Input should be cleared after a successful enqueue');

    // Ensure the visible DOM contains exactly one .queue-item with the expected text
    const containerText1 = await q.getQueueContainerText();
    expect(containerText).toContain('Alpha');
  });

  test('Enqueue with only whitespace triggers validation alert (edge case)', async ({ page }) => {
    // Edge case: input with only whitespace should be considered empty and trigger alert
    const q2 = new QueuePage(page);
    await q.goto();

    // Fill with whitespace and click enqueue
    const dialogMessage1 = await q.enqueue('    ');

    // Implementation trims the input and should alert "Please enter a valid item."
    expect(dialogMessage).toBe('Please enter a valid item.');

    // Queue should remain empty
    const items2 = await q.getQueueItems();
    expect(items.length).toBe(0);

    // Input should remain (implementation does not clear invalid input in code path),
    // but in this implementation it's not cleared. We just check that the queue unchanged.
  });

  test('Dequeue on empty queue shows "Queue is empty" alert (S0 -> S3)', async ({ page }) => {
    // Validate dequeuing an empty queue yields alert 'Queue is empty' and display remains empty
    const q3 = new QueuePage(page);
    await q.goto();

    // Ensure queue empty
    expect(await q.getQueueItems()).toEqual([]);

    const dialogMessage2 = await q.dequeue();
    expect(dialogMessage).toBe('Queue is empty');

    // Display should remain empty
    expect(await q.getQueueItems()).toEqual([]);
  });

  test('Dequeue removes items and triggers appropriate alerts (S2 transitions and guards)', async ({ page }) => {
    // This test covers:
    // - Enqueue multiple items
    // - Dequeue when queue is non-empty: alert "Dequeued: <item>", display updated
    // - Dequeue until empty and then dequeuing again triggers "Queue is empty"
    const q4 = new QueuePage(page);
    await q.goto();

    // Enqueue two items: "one", "two"
    await q.enqueue('one');
    await q.enqueue('two');

    // Verify both items present in FIFO order
    let items3 = await q.getQueueItems();
    expect(items).toEqual(['one', 'two']);

    // Dequeue once: should alert dequeued item "one", and display should now show only "two"
    let dialogMessage3 = await q.dequeue();
    expect(dialogMessage).toBe('Dequeued: one');
    items = await q.getQueueItems();
    expect(items).toEqual(['two'], 'After dequeuing once, only "two" should remain');

    // Dequeue again: should alert dequeued item "two", and display should become empty
    dialogMessage = await q.dequeue();
    expect(dialogMessage).toBe('Dequeued: two');
    items = await q.getQueueItems();
    expect(items).toEqual([], 'After dequeuing twice, queue should be empty');

    // Dequeue once more: now should alert "Queue is empty" (guard leading to S3)
    dialogMessage = await q.dequeue();
    expect(dialogMessage).toBe('Queue is empty');
    items = await q.getQueueItems();
    expect(items).toEqual([], 'Queue remains empty after dequeue on empty');
  });

  test('Mixed interactions: enqueue, invalid enqueue, dequeue sequence validates all state transitions and visual feedback', async ({ page }) => {
    // This comprehensive scenario combines typical and edge interactions to verify FSM behavior:
    // 1. Start idle
    // 2. Attempt invalid enqueue -> validation alert
    // 3. Enqueue two items -> items appear
    // 4. Dequeue one -> correct alert and remaining items
    // 5. Enqueue another item -> queue order respected
    // 6. Dequeue until empty -> alerts expected, final empty state
    const q5 = new QueuePage(page);
    await q.goto();

    // 1. Start idle
    expect(await q.getQueueItems()).toEqual([]);

    // 2. Invalid enqueue (empty)
    let dialog1 = await q.enqueue('');
    expect(dialog).toBe('Please enter a valid item.');
    expect(await q.getQueueItems()).toEqual([]);

    // 3. Enqueue two items
    await q.enqueue('first');
    await q.enqueue('second');
    expect(await q.getQueueItems()).toEqual(['first', 'second']);

    // 4. Dequeue one
    dialog = await q.dequeue();
    expect(dialog).toBe('Dequeued: first');
    expect(await q.getQueueItems()).toEqual(['second']);

    // 5. Enqueue another item; queue should be FIFO: second, third
    await q.enqueue('third');
    expect(await q.getQueueItems()).toEqual(['second', 'third']);

    // 6. Dequeue twice to empty
    dialog = await q.dequeue();
    expect(dialog).toBe('Dequeued: second');
    dialog = await q.dequeue();
    expect(dialog).toBe('Dequeued: third');

    // Final: dequeue on empty triggers Queue is empty
    dialog = await q.dequeue();
    expect(dialog).toBe('Queue is empty');
    expect(await q.getQueueItems()).toEqual([]);
  });
});