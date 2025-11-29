import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T06-09-42/html/7ff33f22-ca8e-11f0-814f-f15b2888551f.html';

// Page Object representing the Queue demo page
class QueuePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.itemInput = page.locator('#item-input');
    this.enqueueBtn = page.locator('#enqueue-btn');
    this.dequeueBtn = page.locator('#dequeue-btn');
    this.peekBtn = page.locator('#peek-btn');
    this.queueVisual = page.locator('#queue-visual');
    this.statusBox = page.locator('#status-box');
    this.statusMessage = page.locator('#status-message');
    this.frontLabel = page.locator('#front-label');
    this.rearLabel = page.locator('#rear-label');
  }

  async goto() {
    await this.page.goto(APP_URL);
    // Ensure initial render completed
    await expect(this.queueVisual).toBeVisible();
  }

  // Enqueue by clicking the button (assumes input already has value)
  async clickEnqueue() {
    await this.enqueueBtn.click();
  }

  // Enqueue using the helper to type and click
  async enqueue(value) {
    await this.itemInput.fill(value);
    await this.enqueueBtn.click();
  }

  // Enqueue by pressing Enter key
  async enqueueWithEnter(value) {
    await this.itemInput.fill(value);
    await this.itemInput.press('Enter');
  }

  async clickDequeue() {
    await this.dequeueBtn.click();
  }

  async clickPeek() {
    await this.peekBtn.click();
  }

  // Returns array of visible queue item texts in order
  async getQueueItems() {
    const items = await this.page.$$eval('#queue-visual .queue-item', nodes => nodes.map(n => n.textContent));
    return items;
  }

  // Returns the raw innerText of the status box
  async getStatusBoxText() {
    return (await this.statusBox.innerText()).trim();
  }

  // Returns the status message text (the floating temporary message)
  async getStatusMessageText() {
    return (await this.statusMessage.innerText()).trim();
  }

  async isStatusMessageVisible() {
    // This respects display: none -> hidden
    return await this.statusMessage.isVisible();
  }

  async getInputValue() {
    return await this.itemInput.inputValue();
  }

  async getActiveElementId() {
    return await this.page.evaluate(() => document.activeElement ? document.activeElement.id : null);
  }
}

test.describe('Queue (FIFO) Demonstration - FSM and UI integration tests', () => {
  // Collect console messages and page errors for each test so we can assert no runtime errors occurred.
  let consoleMessages;
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    consoleErrors = [];
    pageErrors = [];

    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });
  });

  // Helper assertion to ensure no uncaught page errors or console.error calls occurred.
  async function assertNoRuntimeErrors() {
    expect(pageErrors.length, `Unexpected page errors: ${pageErrors.map(e => e.message || e.toString()).join('\n')}`).toBe(0);
    expect(consoleErrors.length, `Unexpected console.error messages: ${consoleErrors.join('\n')}`).toBe(0);
  }

  test('Initial state (idle) renders empty queue and status correctly', async ({ page }) => {
    // This test validates the initial FSM state "idle" where renderQueue should have been called.
    const qp = new QueuePage(page);
    await qp.goto();

    // Confirm visual shows "Queue is empty." (empty state)
    await expect(qp.queueVisual).toContainText('Queue is empty.');

    // Check status box reflects an empty queue (Is Empty? true, Size: 0, Front Element N/A)
    const statusText = await qp.getStatusBoxText();
    expect(statusText).toContain('Is Empty? true');
    expect(statusText).toContain('Size: 0');
    expect(statusText).toContain('Front Element (Peek): N/A');
    expect(statusText).toContain('Current Queue: []');

    // Check FRONT and REAR labels exist
    await expect(qp.frontLabel).toBeVisible();
    await expect(qp.rearLabel).toBeVisible();

    // No runtime errors
    await assertNoRuntimeErrors();
  });

  test('Enqueue a single item -> transitions enqueueing -> idle; UI updates and input is focused', async ({ page }) => {
    // This validates ENQUEUE_CLICKED -> enqueueing (onEnter enqueueItem) -> ITEM_ENQUEUED -> idle (onExit renderQueue)
    const qp = new QueuePage(page);
    await qp.goto();

    // Type and click enqueue
    await qp.enqueue('A');

    // Status message should appear immediately with success text
    await expect(qp.statusMessage).toBeVisible();
    await expect(qp.statusMessage).toHaveText(/Enqueued "A" to the queue\./);

    // The queue visual should contain one item "A"
    const items = await qp.getQueueItems();
    expect(items).toEqual(['A']);

    // Status box should reflect size 1 and front element "A"
    const statusText = await qp.getStatusBoxText();
    expect(statusText).toContain('Is Empty? false');
    expect(statusText).toContain('Size: 1');
    expect(statusText).toContain('Front Element (Peek): A');
    expect(statusText).toContain('Current Queue: [A]');

    // Input should be cleared and focused after successful enqueue (per implementation itemInput.value = '' and focus())
    expect(await qp.getInputValue()).toBe('');
    expect(await qp.getActiveElementId()).toBe('item-input');

    // The transient status message hides after ~3s; wait for it to disappear (allow small margin)
    await expect(qp.statusMessage).toBeVisible();
    await qp.page.waitForTimeout(3500);
    await expect(qp.statusMessage).toBeHidden();

    // No runtime errors
    await assertNoRuntimeErrors();
  });

  test('Enqueue multiple items preserves FIFO order', async ({ page }) => {
    // This validates repeated ENQUEUE_CLICKED events and the resulting queue order
    const qp = new QueuePage(page);
    await qp.goto();

    // Enqueue X, Y, Z via clicking
    await qp.enqueue('X');
    await expect(qp.statusMessage).toBeVisible();
    // Wait for message to clear briefly before next to reduce flakiness (but not strictly necessary)
    await qp.page.waitForTimeout(100);
    await qp.enqueue('Y');
    await qp.page.waitForTimeout(100);
    await qp.enqueue('Z');

    // Now verify order is X, Y, Z
    const items = await qp.getQueueItems();
    expect(items).toEqual(['X', 'Y', 'Z']);

    // Status box size should be 3 and front element X
    const statusText = await qp.getStatusBoxText();
    expect(statusText).toContain('Size: 3');
    expect(statusText).toContain('Front Element (Peek): X');
    expect(statusText).toContain('Current Queue: [X, Y, Z]');

    // No runtime errors
    await assertNoRuntimeErrors();
  });

  test('Dequeue from non-empty removes front element and updates UI', async ({ page }) => {
    // This validates DEQUEUE_CLICKED -> dequeueing (onEnter dequeueItem) -> ITEM_DEQUEUED -> idle (onExit renderQueue)
    const qp = new QueuePage(page);
    await qp.goto();

    // Prepare queue with two items: M, N
    await qp.enqueue('M');
    await qp.page.waitForTimeout(50);
    await qp.enqueue('N');

    // Dequeue once
    await qp.clickDequeue();

    // Status message should indicate dequeued "M"
    await expect(qp.statusMessage).toBeVisible();
    await expect(qp.statusMessage).toHaveText(/Dequeued "M" from the front\./);

    // Queue items should now contain only "N"
    const itemsAfter = await qp.getQueueItems();
    expect(itemsAfter).toEqual(['N']);

    // Status box should reflect size 1 and front element N
    const statusText = await qp.getStatusBoxText();
    expect(statusText).toContain('Size: 1');
    expect(statusText).toContain('Front Element (Peek): N');
    expect(statusText).toContain('Current Queue: [N]');

    // No runtime errors
    await assertNoRuntimeErrors();
  });

  test('Dequeue from empty queue triggers error message and does not crash', async ({ page }) => {
    // This validates DEQUEUE_CLICKED when queue is empty -> QUEUE_EMPTY transition handled by showing error
    const qp = new QueuePage(page);
    await qp.goto();

    // Ensure empty to start
    await expect(qp.queueVisual).toContainText('Queue is empty.');

    // Click dequeue on empty queue
    await qp.clickDequeue();

    // Status message should show the appropriate error
    await expect(qp.statusMessage).toBeVisible();
    await expect(qp.statusMessage).toHaveText('Cannot dequeue. The queue is empty.');

    // Queue should remain empty and status box still reflect empty
    const items = await qp.getQueueItems();
    expect(items).toEqual([]);
    const statusText = await qp.getStatusBoxText();
    expect(statusText).toContain('Is Empty? true');
    expect(statusText).toContain('Size: 0');

    // No runtime errors (ensure the app handled the empty case gracefully)
    await assertNoRuntimeErrors();
  });

  test('Peek on empty queue shows error and does not change state', async ({ page }) => {
    // This validates PEEK_CLICKED on empty queue -> QUEUE_EMPTY transition (error)
    const qp = new QueuePage(page);
    await qp.goto();

    // Click peek when empty
    await qp.clickPeek();

    // Error message shown
    await expect(qp.statusMessage).toBeVisible();
    await expect(qp.statusMessage).toHaveText('Cannot peek. The queue is empty.');

    // Status box unchanged
    const statusText = await qp.getStatusBoxText();
    expect(statusText).toContain('Is Empty? true');
    expect(statusText).toContain('Size: 0');

    // No runtime errors
    await assertNoRuntimeErrors();
  });

  test('Peek on non-empty queue shows front element and leaves queue intact', async ({ page }) => {
    // This validates PEEK_CLICKED -> peeking (onEnter peekItem) -> ITEM_PEEKED -> idle transitions with noop onExit
    const qp = new QueuePage(page);
    await qp.goto();

    // Enqueue two items P, Q
    await qp.enqueue('P');
    await qp.page.waitForTimeout(50);
    await qp.enqueue('Q');

    // Peek should show front element P and not remove it
    await qp.clickPeek();
    await expect(qp.statusMessage).toBeVisible();
    await expect(qp.statusMessage).toHaveText(/Peeked! The front element is "P"\./);

    // Queue should remain [P, Q]
    const items = await qp.getQueueItems();
    expect(items).toEqual(['P', 'Q']);

    // Status box should still show Size: 2 and Front Element (Peek): P
    const statusText = await qp.getStatusBoxText();
    expect(statusText).toContain('Size: 2');
    expect(statusText).toContain('Front Element (Peek): P');

    // No runtime errors
    await assertNoRuntimeErrors();
  });

  test('Attempt to enqueue with empty input shows INPUT_EMPTY error message', async ({ page }) => {
    // This validates ENQUEUE_CLICKED with empty input -> INPUT_EMPTY transition
    const qp = new QueuePage(page);
    await qp.goto();

    // Ensure input is empty
    await qp.itemInput.fill('');
    // Click enqueue
    await qp.clickEnqueue();

    // Error message expected
    await expect(qp.statusMessage).toBeVisible();
    await expect(qp.statusMessage).toHaveText('Input cannot be empty.');

    // Queue should remain empty
    const items = await qp.getQueueItems();
    expect(items).toEqual([]);

    // No runtime errors
    await assertNoRuntimeErrors();
  });

  test('Keyboard Enter on input triggers enqueue (ENQUEUE_CLICKED via input)', async ({ page }) => {
    // This validates the trigger mapping ENQUEUE_CLICKED includes #item-input handling Enter key
    const qp = new QueuePage(page);
    await qp.goto();

    // Use Enter to enqueue
    await qp.enqueueWithEnter('EnterItem');

    // Verify item enqueued
    const items = await qp.getQueueItems();
    expect(items).toEqual(['EnterItem']);

    // Status message indicates enqueue
    await expect(qp.statusMessage).toBeVisible();
    await expect(qp.statusMessage).toHaveText(/Enqueued "EnterItem" to the queue\./);

    // No runtime errors
    await assertNoRuntimeErrors();
  });

  test('Stress test: multiple enqueues and dequeues maintain expected FIFO behavior and status updates', async ({ page }) => {
    // This test simulates a sequence of events to exercise multiple FSM transitions and edge conditions.
    const qp = new QueuePage(page);
    await qp.goto();

    // Enqueue 1..5
    for (let i = 1; i <= 5; i++) {
      await qp.enqueue(String(i));
      // small delay for UI transient messages not to overlap too much
      await qp.page.waitForTimeout(40);
    }

    // Dequeue twice (should remove 1 and 2)
    await qp.clickDequeue();
    await qp.page.waitForTimeout(40);
    await qp.clickDequeue();

    // Peek should show '3'
    await qp.clickPeek();
    await expect(qp.statusMessage).toBeVisible();
    await expect(qp.statusMessage).toHaveText(/Peeked! The front element is "3"\./);

    // Remaining queue should be [3,4,5]
    const items = await qp.getQueueItems();
    expect(items).toEqual(['3', '4', '5']);
    const statusText = await qp.getStatusBoxText();
    expect(statusText).toContain('Size: 3');
    expect(statusText).toContain('Front Element (Peek): 3');

    // Dequeue all to empty the queue
    await qp.clickDequeue(); // removes 3
    await qp.page.waitForTimeout(20);
    await qp.clickDequeue(); // removes 4
    await qp.page.waitForTimeout(20);
    await qp.clickDequeue(); // removes 5
    await qp.page.waitForTimeout(20);

    // Now queue should be empty and a subsequent dequeue should show error
    await expect(qp.queueVisual).toContainText('Queue is empty.');
    await qp.clickDequeue();
    await expect(qp.statusMessage).toBeVisible();
    await expect(qp.statusMessage).toHaveText('Cannot dequeue. The queue is empty.');

    // No runtime errors
    await assertNoRuntimeErrors();
  });
});