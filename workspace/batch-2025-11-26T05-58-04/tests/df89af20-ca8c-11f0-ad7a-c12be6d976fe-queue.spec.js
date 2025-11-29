import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-58-04/html/df89af20-ca8c-11f0-ad7a-c12be6d976fe.html';

// Page Object for the Queue demo page
class QueuePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.inputSelector = '#newElement';
    this.enqueueButtonSelector = '.controls > button:nth-of-type(1)';
    this.dequeueButtonSelector = '.controls > button:nth-of-type(2)';
    this.queueContainerSelector = '#queueContainer';
    this.queueItemSelector = '.queue-item';
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  // Enter text into the input
  async enterText(value) {
    await this.page.fill(this.inputSelector, value);
  }

  // Click the enqueue button (uses onclick handler defined inline in HTML)
  async clickEnqueue() {
    await this.page.click(this.enqueueButtonSelector);
  }

  // Click the dequeue button (uses onclick handler defined inline in HTML)
  async clickDequeue() {
    await this.page.click(this.dequeueButtonSelector);
  }

  // Return an array of texts of queue items (visual representation)
  async getQueueItemsText() {
    return this.page.$$eval(this.queueItemSelector, nodes => nodes.map(n => n.textContent));
  }

  // Return count of queue items
  async getQueueCount() {
    return this.page.$$eval(this.queueItemSelector, nodes => nodes.length);
  }

  // Read input value
  async getInputValue() {
    return this.page.$eval(this.inputSelector, el => el.value);
  }

  // Retrieve raw innerHTML of queue container for deeper assertions
  async getQueueContainerHTML() {
    return this.page.$eval(this.queueContainerSelector, el => el.innerHTML);
  }
}

test.describe('Queue FSM integration tests - df89af20-ca8c-11f0-ad7a-c12be6d976fe', () => {
  // Hold references to console messages and page errors for assertions
  let consoleMessages;
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    consoleErrors = [];
    pageErrors = [];

    // Listen to console events
    page.on('console', msg => {
      const text = msg.text();
      const type = msg.type();
      consoleMessages.push({ type, text });
      if (type === 'error') consoleErrors.push(text);
    });

    // Listen to unhandled page errors (uncaught exceptions)
    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    // No navigation here; tests will navigate as needed
  });

  test.afterEach(async () => {
    // Basic sanity assertions about runtime errors:
    // The application should not produce unexpected runtime exceptions.
    // We assert that there were no page-level uncaught exceptions.
    expect(pageErrors.length).toBe(0);

    // We also assert there were no console errors emitted.
    // It's okay if there are other console messages (logs/warnings), but errors should be empty.
    expect(consoleErrors.length).toBe(0);
  });

  test('Initial state should be empty: no visual queue items and input present', async ({ page }) => {
    const queuePage = new QueuePage(page);
    await queuePage.goto();

    // Validate initial DOM shows no queue items (FSM state: empty)
    expect(await queuePage.getQueueCount()).toBe(0);

    // Input should exist and be empty string
    expect(await queuePage.getInputValue()).toBe('');
  });

  test('Dequeue from empty should show alert (alerting state) and keep queue empty', async ({ page }) => {
    const queuePage = new QueuePage(page);
    await queuePage.goto();

    // Prepare to capture the dialog triggered by dequeue when empty
    let dialogMessage = null;
    page.once('dialog', async dialog => {
      dialogMessage = dialog.message();
      await dialog.dismiss();
    });

    // Click Dequeue when queue is empty -> should trigger native alert "Queue is empty!"
    await queuePage.clickDequeue();

    // Wait a tick for dialog handler to run
    await page.waitForTimeout(100);

    // Ensure dialog was shown with expected text (alerting on DEQUEUE_CLICKED from empty)
    expect(dialogMessage).toBe('Queue is empty!');

    // Queue should remain empty after dismissing alert
    expect(await queuePage.getQueueCount()).toBe(0);
  });

  test('Enqueue on empty transitions to nonEmpty: item appears and input is cleared (adding -> nonEmpty)', async ({ page }) => {
    const queuePage = new QueuePage(page);
    await queuePage.goto();

    // Enter a value and click Enqueue
    await queuePage.enterText('first');
    await queuePage.clickEnqueue();

    // After enqueue, the input should be cleared (behavior in enqueue())
    expect(await queuePage.getInputValue()).toBe('');

    // There should be exactly one queue-item with the expected text
    const items = await queuePage.getQueueItemsText();
    expect(items).toEqual(['first']);
  });

  test('Multiple enqueues preserve order (nonEmpty state behaviour)', async ({ page }) => {
    const queuePage = new QueuePage(page);
    await queuePage.goto();

    // Enqueue multiple items in sequence
    await queuePage.enterText('one');
    await queuePage.clickEnqueue();

    await queuePage.enterText('two');
    await queuePage.clickEnqueue();

    await queuePage.enterText('three');
    await queuePage.clickEnqueue();

    // Verify visual order (FIFO)
    const items = await queuePage.getQueueItemsText();
    expect(items).toEqual(['one', 'two', 'three']);

    // Confirm nonEmpty inferred from DOM (count > 0)
    expect(await queuePage.getQueueCount()).toBe(3);
  });

  test('Dequeue from nonEmpty removes head and transitions appropriately (removing -> nonEmpty or empty)', async ({ page }) => {
    const queuePage = new QueuePage(page);
    await queuePage.goto();

    // Setup: add two items
    await queuePage.enterText('alpha');
    await queuePage.clickEnqueue();
    await queuePage.enterText('beta');
    await queuePage.clickEnqueue();

    // Validate starting state has 2 items
    expect(await queuePage.getQueueCount()).toBe(2);

    // Dequeue once -> should remove 'alpha' and leave 'beta' -> still nonEmpty
    await queuePage.clickDequeue();
    expect(await queuePage.getQueueCount()).toBe(1);
    expect(await queuePage.getQueueItemsText()).toEqual(['beta']);

    // Dequeue second time -> should remove 'beta' and become empty
    // The dequeue when length>0 triggers shift() and update, no alert.
    await queuePage.clickDequeue();
    expect(await queuePage.getQueueCount()).toBe(0);
  });

  test('Enqueue with only whitespace is a noop (ENQUEUE_NOOP) and input behavior is preserved', async ({ page }) => {
    const queuePage = new QueuePage(page);
    await queuePage.goto();

    // Ensure starting from empty
    expect(await queuePage.getQueueCount()).toBe(0);

    // Enter whitespace and click enqueue -> JS trims and will not enqueue
    await queuePage.enterText('   ');
    await queuePage.clickEnqueue();

    // Because enqueue() only clears input when a value was added, the whitespace remains in the input
    expect(await queuePage.getQueueCount()).toBe(0);
    expect(await queuePage.getInputValue()).toBe('   ');
  });

  test('Enqueue noop when input empty on nonEmpty should not modify queue', async ({ page }) => {
    const queuePage = new QueuePage(page);
    await queuePage.goto();

    // Add one item
    await queuePage.enterText('x');
    await queuePage.clickEnqueue();

    expect(await queuePage.getQueueCount()).toBe(1);
    expect(await queuePage.getQueueItemsText()).toEqual(['x']);

    // Clear input and click Enqueue (no-op)
    await queuePage.enterText('');
    await queuePage.clickEnqueue();

    // Queue should remain unchanged
    expect(await queuePage.getQueueCount()).toBe(1);
    expect(await queuePage.getQueueItemsText()).toEqual(['x']);
  });

  test('DOM updates correspond to updateQueueDisplay on enter actions (visual feedback)', async ({ page }) => {
    const queuePage = new QueuePage(page);
    await queuePage.goto();

    // Enqueue an item and verify that the DOM was rebuilt (innerHTML non-empty)
    await queuePage.enterText('visible');
    await queuePage.clickEnqueue();

    const htmlAfterEnqueue = await queuePage.getQueueContainerHTML();
    expect(htmlAfterEnqueue).toContain('visible');

    // Dequeue so updateQueueDisplay clears it
    await queuePage.clickDequeue();
    const htmlAfterDequeue = await queuePage.getQueueContainerHTML();
    expect(htmlAfterDequeue.trim()).toBe('');
  });

  test('Smoke: no uncaught exceptions or console.error emitted during a series of operations', async ({ page }) => {
    const queuePage = new QueuePage(page);
    await queuePage.goto();

    // Perform a set of mixed operations including noop enqueue, valid enqueue, and dequeues
    await queuePage.enterText('');
    await queuePage.clickEnqueue(); // noop

    await queuePage.enterText('A');
    await queuePage.clickEnqueue();

    await queuePage.enterText('B');
    await queuePage.clickEnqueue();

    await queuePage.clickDequeue();
    await queuePage.clickDequeue();

    // Attempt extra dequeue to trigger alert and then confirm alert shown and dismissed
    let capturedDialog = null;
    page.once('dialog', async dialog => {
      capturedDialog = dialog.message();
      await dialog.dismiss();
    });
    await queuePage.clickDequeue();
    await page.waitForTimeout(100);
    expect(capturedDialog).toBe('Queue is empty!');

    // Final assertions about the DOM and runtime state
    expect(await queuePage.getQueueCount()).toBe(0);

    // Note: afterEach will assert that pageErrors.length === 0 and consoleErrors.length === 0,
    // which enforces that no unexpected runtime errors occurred during this smoke scenario.
  });
});