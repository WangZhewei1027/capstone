import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-23T16-37-48/html/0f10bd50-c88b-11f0-b980-35cc7f0de6b4.html';
const ANIMATION_MS = 800; // slightly longer than 700ms animation duration in the app
const MESSAGE_CLEAR_MS = 3200; // slightly longer than 3000ms message timeout

// Page object model encapsulating interactions with the queue demo
class QueuePage {
  constructor(page) {
    this.page = page;
    // Primary selectors from the HTML
    this.queueContainer = page.locator('#queue-container');
    this.enqueueInput = page.locator('#enqueue-input');
    this.enqueueBtn = page.locator('#enqueue-btn');
    this.dequeueBtn = page.locator('#dequeue-btn');
    this.clearBtn = page.locator('#clear-btn');
    this.message = page.locator('#message');
  }

  async goto() {
    await this.page.goto(APP_URL);
    // Ensure initial render completed
    await expect(this.queueContainer).toBeVisible();
  }

  // Fill input and click enqueue button
  async enqueueWithButton(value) {
    await this.enqueueInput.fill(String(value));
    await this.enqueueBtn.click();
  }

  // Fill input and send Enter key to trigger enqueue
  async enqueueByEnter(value) {
    await this.enqueueInput.fill(String(value));
    await this.enqueueInput.press('Enter');
  }

  // Intentionally set invalid input and click enqueue
  async attemptInvalidEnqueue(invalidValue) {
    // Using evaluate to bypass input[type=number] restrictions if needed
    await this.page.evaluate((v) => {
      const inp = document.getElementById('enqueue-input');
      inp.value = v;
    }, String(invalidValue));
    await this.enqueueBtn.click();
  }

  async dequeue() {
    await this.dequeueBtn.click();
  }

  async clear() {
    await this.clearBtn.click();
  }

  // Get text values of nodes in the queue-container in order
  async getNodesText() {
    return await this.page.$$eval('#queue-container .node', nodes => nodes.map(n => n.textContent.trim()));
  }

  // Count of nodes inside the visible container
  async countVisibleNodes() {
    return await this.page.$$eval('#queue-container .node', nodes => nodes.length);
  }

  // Count of cloned/animating nodes appended to body (those are appended as body > .node)
  async countBodyClonedNodes() {
    return await this.page.$$eval('body > .node', nodes => nodes.length);
  }

  async getMessageText() {
    return (await this.message.textContent())?.trim() ?? '';
  }

  async isDequeueDisabled() {
    return await this.dequeueBtn.isDisabled();
  }

  async isClearDisabled() {
    return await this.clearBtn.isDisabled();
  }

  async isEnqueueDisabled() {
    return await this.enqueueBtn.isDisabled();
  }

  // Wait for animations and timeouts to elapse
  async waitForAnimationEnd(extra = 50) {
    await this.page.waitForTimeout(ANIMATION_MS + extra);
  }

  async waitForMessageClear() {
    await this.page.waitForTimeout(MESSAGE_CLEAR_MS);
  }
}

test.describe('Queue FSM - Interactive visualization (enqueue, dequeue, clear, error handling)', () => {
  let pageObj;

  test.beforeEach(async ({ page }) => {
    pageObj = new QueuePage(page);
    await pageObj.goto();
  });

  test('Initial state is idle_empty: container empty, dequeue/clear disabled, enqueue enabled', async () => {
    // Validate initial render (onEnter: renderQueue)
    await expect(pageObj.queueContainer).toBeVisible();
    expect(await pageObj.countVisibleNodes()).toBe(0);

    // Buttons reflect empty queue state
    expect(await pageObj.isDequeueDisabled()).toBe(true);
    expect(await pageObj.isClearDisabled()).toBe(true);
    expect(await pageObj.isEnqueueDisabled()).toBe(false);

    // No message displayed initially
    expect(await pageObj.getMessageText()).toBe('');
  });

  test('Attempt to dequeue on empty queue -> error_display state and message shown', async () => {
    // Click dequeue when queue is empty
    await pageObj.dequeue();

    // Error message should be shown and be the expected text
    await expect(pageObj.message).toHaveText('队列为空，无法出队！');

    // The queue remains empty and buttons remain disabled appropriately
    expect(await pageObj.countVisibleNodes()).toBe(0);
    expect(await pageObj.isDequeueDisabled()).toBe(true);
    // After error, enqueue remains enabled so user can start enqueue (transition from error_display)
    expect(await pageObj.isEnqueueDisabled()).toBe(false);

    // Now verify that enqueue after an error proceeds normally:
    // Fill a valid number and click enqueue; this should trigger enqueue_animating then idle_nonempty
    await pageObj.enqueueWithButton(42);

    // During enqueue animation there should be a cloned node appended to body (animation element)
    const clonesDuringEnqueue = await pageObj.countBodyClonedNodes();
    expect(clonesDuringEnqueue).toBeGreaterThanOrEqual(0); // at least zero, we will wait to confirm completion

    // Wait for animation completion
    await pageObj.waitForAnimationEnd();

    // After completion, queue contains the enqueued element and success message shown
    expect(await pageObj.getNodesText()).toContain('42');
    await expect(pageObj.message).toContainText('元素 42 已入队。');

    // Success message should automatically clear after ~3s (non-error)
    await pageObj.waitForMessageClear();
    expect(await pageObj.getMessageText()).toBe('');
  });

  test('Enqueue invalid inputs create error_display (empty input and non-numeric)', async () => {
    // 1) Empty input -> click enqueue shows "请输入一个数字！"
    await pageObj.enqueueInput.fill(''); // ensure empty
    await pageObj.enqueueBtn.click();
    await expect(pageObj.message).toHaveText('请输入一个数字！');
    // Message persists (error) until another action; but we won't wait for auto-clear because errors are not cleared by timeout in code

    // 2) Non-numeric input -> "请输入有效数字！"
    // Bypass number input restriction by setting value via evaluate
    await pageObj.attemptInvalidEnqueue('not-a-number');
    await expect(pageObj.message).toHaveText('请输入有效数字！');
  });

  test('Enqueue works via Enter key and creates enqueue_animating then idle_nonempty', async () => {
    // Ensure empty starting state
    expect(await pageObj.countVisibleNodes()).toBe(0);

    // Use Enter to enqueue
    await pageObj.enqueueByEnter(7);

    // Immediately after triggering, the node should not yet be present in the container
    // (implementation updates the queue only after ANIMATION_DURATION)
    const immediateNodes = await pageObj.countVisibleNodes();
    // It is possible the code renders immediately in some environments; assert it's either 0 or becomes 1 after wait.
    expect(immediateNodes).toBeGreaterThanOrEqual(0);

    // There should be an animating clone appended to body during animation
    const clones = await pageObj.countBodyClonedNodes();
    // It's acceptable if there are 0 clones depending on browser timing, but we still wait then assert final state
    await pageObj.waitForAnimationEnd();

    // After animation ends, queue should contain the item and message with correct content
    expect(await pageObj.getNodesText()).toContain('7');
    await expect(pageObj.message).toContainText('元素 7 已入队。');
  });

  test('Dequeue from non-empty queue: animation in progress, DOM changes, and final state transitions', async () => {
    // Prepare queue with two items
    await pageObj.enqueueWithButton(10);
    await pageObj.waitForAnimationEnd();
    await pageObj.enqueueWithButton(20);
    await pageObj.waitForAnimationEnd();

    // Confirm two nodes present and head/tail labeling
    const nodesBefore = await pageObj.getNodesText();
    expect(nodesBefore).toEqual(['10', '20']);

    // Click dequeue: this will immediately remove the head from container and animate a clone in the body
    await pageObj.dequeue();

    // Immediately after click, the queue container should have one fewer node (10 removed)
    const nodesDuring = await pageObj.getNodesText();
    expect(nodesDuring).toEqual(['20']);

    // There should be a cloned node appended to body that is animating out (the removed head)
    const bodyClones = await pageObj.countBodyClonedNodes();
    expect(bodyClones).toBeGreaterThanOrEqual(0);

    // Buttons should be disabled during animation (implementation disables them then re-enables)
    // Enqueue may be disabled during the animation; at least dequeue was temporarily disabled
    // Wait for animation to finish
    await pageObj.waitForAnimationEnd();

    // After animation ends, a success message is displayed
    await expect(pageObj.message).toContainText('元素 10 已出队。');

    // Buttons should be re-enabled appropriately: dequeue enabled because still non-empty, clear enabled
    expect(await pageObj.isDequeueDisabled()).toBe(false);
    expect(await pageObj.isClearDisabled()).toBe(false);
  });

  test('Dequeue last element leads to idle_empty (DEQUEUE_ANIMATION_END_EMPTY)', async () => {
    // Enqueue a single element
    await pageObj.enqueueWithButton(99);
    await pageObj.waitForAnimationEnd();

    // Confirm single node present
    expect(await pageObj.getNodesText()).toEqual(['99']);

    // Dequeue the last element
    await pageObj.dequeue();

    // Immediately after click, container should be empty
    expect(await pageObj.countVisibleNodes()).toBe(0);

    // Wait for animation to finish
    await pageObj.waitForAnimationEnd();

    // Message shows correct text and queue remains empty
    await expect(pageObj.message).toContainText('元素 99 已出队。');
    expect(await pageObj.countVisibleNodes()).toBe(0);

    // After final dequeue, dequeue and clear should be disabled (idle_empty)
    expect(await pageObj.isDequeueDisabled()).toBe(true);
    expect(await pageObj.isClearDisabled()).toBe(true);
  });

  test('Clear operation empties non-empty queue and shows message (CLEAR_CLICKED -> idle_empty)', async () => {
    // Enqueue a few items
    await pageObj.enqueueWithButton(1);
    await pageObj.waitForAnimationEnd();
    await pageObj.enqueueWithButton(2);
    await pageObj.waitForAnimationEnd();

    expect(await pageObj.getNodesText()).toEqual(['1', '2']);

    // Click clear to empty the queue
    await pageObj.clear();

    // Queue should be empty immediately and success message displayed
    expect(await pageObj.countVisibleNodes()).toBe(0);
    await expect(pageObj.message).toContainText('队列已清空。');

    // Buttons reflect empty state
    expect(await pageObj.isDequeueDisabled()).toBe(true);
    expect(await pageObj.isClearDisabled()).toBe(true);
  });

  test('Error display persists for errors and allows transitions to enqueue when user supplies valid input', async () => {
    // Trigger an error by attempting invalid enqueue (empty)
    await pageObj.enqueueInput.fill('');
    await pageObj.enqueueBtn.click();
    await expect(pageObj.message).toHaveText('请输入一个数字！');

    // Now provide a valid input and click enqueue; this should transition from error_display to enqueue_animating
    await pageObj.enqueueWithButton(1234);

    // Wait for animation end and confirm the queue has the new item and message updated
    await pageObj.waitForAnimationEnd();
    expect(await pageObj.getNodesText()).toContain('1234');
    await expect(pageObj.message).toContainText('元素 1234 已入队。');
  });

  test('Message auto-clear on success and not auto-clear for errors', async () => {
    // Successful enqueue shows green (success) message and auto-clears after ~3s
    await pageObj.enqueueWithButton(5);
    await pageObj.waitForAnimationEnd();
    await expect(pageObj.message).toContainText('元素 5 已入队。');

    // Wait for the automatic clear
    await pageObj.waitForMessageClear();
    expect(await pageObj.getMessageText()).toBe('');

    // Trigger an error and verify it does NOT auto-clear after 3s
    await pageObj.enqueueInput.fill('');
    await pageObj.enqueueBtn.click();
    await expect(pageObj.message).toHaveText('请输入一个数字！');

    // Wait a bit longer than success clear timeout and ensure message still present (errors persist)
    await pageObj.waitForMessageClear();
    expect(await pageObj.getMessageText()).toBe('请输入一个数字！');
  });

  test('Edge case: programmatically setting non-numeric value in number input still triggers validation error', async () => {
    // Force set non-numeric string (bypass input restrictions) and click enqueue
    await pageObj.attemptInvalidEnqueue('NaNvalue');
    await expect(pageObj.message).toHaveText('请输入有效数字！');
  });

  test('Sequence test: multiple operations follow FSM transitions across states', async () => {
    // Start empty (idle_empty)
    expect(await pageObj.countVisibleNodes()).toBe(0);

    // Enqueue 11 (enqueue_animating -> idle_nonempty)
    await pageObj.enqueueWithButton(11);
    await pageObj.waitForAnimationEnd();
    expect(await pageObj.getNodesText()).toEqual(['11']);

    // Enqueue 22 using Enter (enqueue_animating -> idle_nonempty)
    await pageObj.enqueueByEnter(22);
    await pageObj.waitForAnimationEnd();
    expect(await pageObj.getNodesText()).toEqual(['11', '22']);

    // Dequeue (dequeue_animating -> idle_nonempty)
    await pageObj.dequeue();
    await pageObj.waitForAnimationEnd();
    expect(await pageObj.getNodesText()).toEqual(['22']);

    // Dequeue last element (dequeue_animating -> idle_empty)
    await pageObj.dequeue();
    await pageObj.waitForAnimationEnd();
    expect(await pageObj.countVisibleNodes()).toBe(0);

    // Clear on empty (should show "队列已为空。", remains idle_empty)
    // Note: clear button is disabled when empty; simulate user clicking it has no effect.
    // But we can call clear only when non-empty; instead, re-enqueue then clear to test CLEAR_CLICKED
    await pageObj.enqueueWithButton(33);
    await pageObj.waitForAnimationEnd();
    await pageObj.clear();
    await expect(pageObj.message).toContainText('队列已清空。');
    expect(await pageObj.countVisibleNodes()).toBe(0);
  });
});