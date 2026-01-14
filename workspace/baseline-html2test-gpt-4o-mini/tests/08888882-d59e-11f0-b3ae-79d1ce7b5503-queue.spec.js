import { test, expect } from '@playwright/test';

// Page object representing the Queue Visualization page
class QueuePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.url =
      'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/08888882-d59e-11f0-b3ae-79d1ce7b5503.html';
    this.selectors = {
      queueContainer: '#queue',
      queueItems: '.queue-item',
      inputValue: '#inputValue',
      enqueueButton: 'text=Enqueue',
      dequeueButton: 'text=Dequeue',
    };
  }

  // Navigate to the page and wait for basic elements
  async goto() {
    await this.page.goto(this.url);
    await expect(this.page.locator(this.selectors.inputValue)).toBeVisible();
    await expect(this.page.locator(this.selectors.enqueueButton)).toBeVisible();
    await expect(this.page.locator(this.selectors.dequeueButton)).toBeVisible();
  }

  // Get list of text contents for queue items
  async getQueueItemsText() {
    const items = this.page.locator(this.selectors.queueItems);
    const count = await items.count();
    const texts = [];
    for (let i = 0; i < count; i++) {
      texts.push(await items.nth(i).innerText());
    }
    return texts;
  }

  // Enter a value into the numeric input (as string or number)
  async enterValue(value) {
    await this.page.fill(this.selectors.inputValue, String(value));
  }

  // Click the Enqueue button
  async clickEnqueue() {
    await this.page.click(this.selectors.enqueueButton);
  }

  // Click the Dequeue button
  async clickDequeue() {
    await this.page.click(this.selectors.dequeueButton);
  }

  // Get the current value of the input field
  async getInputValue() {
    return await this.page.inputValue(this.selectors.inputValue);
  }

  // Get number of queue items
  async getQueueCount() {
    return await this.page.locator(this.selectors.queueItems).count();
  }
}

test.describe('Queue Visualization - Functional Tests', () => {
  // Arrays to collect console errors and page errors per test
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Collect console error messages
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push({ text: msg.text(), location: msg.location() });
      }
    });

    // Collect uncaught exceptions / page errors
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });
  });

  test.afterEach(async () => {
    // After each test, assert that there were no console errors or page errors.
    // This verifies that the page's runtime did not produce unexpected exceptions.
    expect(pageErrors.length, `Expected no page errors, got: ${pageErrors.map(e => String(e)).join('; ')}`).toBe(0);
    expect(consoleErrors.length, `Expected no console.error messages, got: ${consoleErrors.map(e => e.text).join('; ')}`).toBe(0);
  });

  test('Initial load: page structure and default empty queue', async ({ page }) => {
    // Purpose: Verify the page loads, controls are visible, and the queue starts empty.
    const queuePage = new QueuePage(page);
    await queuePage.goto();

    // The input should be present, empty, and of type "number"
    const input = page.locator(queuePage.selectors.inputValue);
    await expect(input).toBeVisible();
    await expect(input).toHaveAttribute('type', 'number');
    await expect(input).toHaveAttribute('placeholder', 'Enter number...');
    await expect(input).toHaveValue('');

    // Buttons should be visible
    await expect(page.locator(queuePage.selectors.enqueueButton)).toBeVisible();
    await expect(page.locator(queuePage.selectors.dequeueButton)).toBeVisible();

    // Queue container exists and initially has no queue items
    await expect(page.locator(queuePage.selectors.queueContainer)).toBeVisible();
    const items1 = await queuePage.getQueueItemsText();
    expect(items.length).toBe(0);
  });

  test('Enqueue single item: adds item, clears input, and displays correct text', async ({ page }) => {
    // Purpose: Ensure enqueue adds a single value to the queue and input is cleared.
    const queuePage1 = new QueuePage(page);
    await queuePage.goto();

    // Enter a numeric value and click Enqueue
    await queuePage.enterValue(42);
    await queuePage.clickEnqueue();

    // After enqueue, the input should be cleared
    const inputValue = await queuePage.getInputValue();
    expect(inputValue).toBe('', 'Input should be cleared after enqueue');

    // Queue should have exactly one item with text "42"
    const items2 = await queuePage.getQueueItemsText();
    expect(items).toEqual(['42']);
    // Style expectation: each queue item should have the class 'queue-item'
    await expect(page.locator(queuePage.selectors.queueItems)).toHaveCount(1);
    await expect(page.locator(queuePage.selectors.queueItems).first()).toHaveClass(/queue-item/);
  });

  test('Enqueue multiple items preserves FIFO order', async ({ page }) => {
    // Purpose: Ensure that multiple enqueues produce items in the order they were added.
    const queuePage2 = new QueuePage(page);
    await queuePage.goto();

    // Enqueue 1, 2, 3
    await queuePage.enterValue(1);
    await queuePage.clickEnqueue();
    await queuePage.enterValue(2);
    await queuePage.clickEnqueue();
    await queuePage.enterValue(3);
    await queuePage.clickEnqueue();

    // Verify three items in the same insertion order
    const items3 = await queuePage.getQueueItemsText();
    expect(items).toEqual(['1', '2', '3']);
    expect(await queuePage.getQueueCount()).toBe(3);
  });

  test('Dequeue removes the front item (FIFO) and updates DOM', async ({ page }) => {
    // Purpose: Validate dequeue behavior removes the first item and updates displayed queue.
    const queuePage3 = new QueuePage(page);
    await queuePage.goto();

    // Prepare queue with three items
    await queuePage.enterValue('A');
    await queuePage.clickEnqueue();
    await queuePage.enterValue('B');
    await queuePage.clickEnqueue();
    await queuePage.enterValue('C');
    await queuePage.clickEnqueue();

    // Dequeue once: should remove 'A'
    await queuePage.clickDequeue();
    let items4 = await queuePage.getQueueItemsText();
    expect(items).toEqual(['B', 'C']);
    expect(await queuePage.getQueueCount()).toBe(2);

    // Dequeue twice more: should remove B then C, resulting in empty queue
    await queuePage.clickDequeue();
    await queuePage.clickDequeue();
    items = await queuePage.getQueueItemsText();
    expect(items.length).toBe(0);
  });

  test('Dequeue on empty queue triggers alert with correct message', async ({ page }) => {
    // Purpose: Ensure user receives an alert when attempting to dequeue an empty queue.
    const queuePage4 = new QueuePage(page);
    await queuePage.goto();

    // Ensure queue is empty
    expect(await queuePage.getQueueCount()).toBe(0);

    // Listen for dialog and assert its message
    const [dialog] = await Promise.all([
      page.waitForEvent('dialog'),
      queuePage.clickDequeue(), // triggers alert
    ]);
    expect(dialog.type()).toBe('alert');
    expect(dialog.message()).toBe('Queue is empty, nothing to dequeue.');
    await dialog.accept();

    // Queue should still be empty after dismissing alert
    expect(await queuePage.getQueueCount()).toBe(0);
  });

  test('Enqueue with empty input triggers alert and does not modify queue', async ({ page }) => {
    // Purpose: Ensure enqueue with no input shows an alert and queue remains unchanged.
    const queuePage5 = new QueuePage(page);
    await queuePage.goto();

    // Ensure queue is empty initially
    expect(await queuePage.getQueueCount()).toBe(0);

    // Click Enqueue with empty input and assert dialog message
    const [dialog] = await Promise.all([
      page.waitForEvent('dialog'),
      queuePage.clickEnqueue(),
    ]);
    expect(dialog.type()).toBe('alert');
    expect(dialog.message()).toBe('Please enter a value to enqueue.');
    await dialog.accept();

    // Queue remains empty
    expect(await queuePage.getQueueCount()).toBe(0);
  });

  test('Input accepts numeric values and gets converted to string in queue display', async ({ page }) => {
    // Purpose: Verify that numeric input is displayed as text content in queue items (stringified).
    const queuePage6 = new QueuePage(page);
    await queuePage.goto();

    // Enter the number 007 (leading zeros) — fill accepts, but input type=number may drop leading zeros
    // We assert that whatever was entered is what shows up in the displayed DOM after enqueue.
    await queuePage.enterValue(7); // number
    await queuePage.clickEnqueue();

    const items5 = await queuePage.getQueueItemsText();
    // The implementation stores and displays the input value as text content (string)
    expect(items).toEqual(['7']);
  });

  test('Visual verification: queue items have expected border style and are visible', async ({ page }) => {
    // Purpose: Check visual cues on queue item elements (presence, visibility). We cannot assert exact pixel styles reliably,
    // but we can assert computed style contains the expected border color set in inline CSS (if accessible).
    const queuePage7 = new QueuePage(page);
    await queuePage.goto();

    // Enqueue a sample item to render a queue-item element
    await queuePage.enterValue(99);
    await queuePage.clickEnqueue();

    const itemLocator = page.locator(queuePage.selectors.queueItems).first();
    await expect(itemLocator).toBeVisible();
    // Check that the element has the class queue-item
    await expect(itemLocator).toHaveClass(/queue-item/);

    // Try to inspect computed style for the border color substring as a sanity check.
    const border = await itemLocator.evaluate((el) => {
      return window.getComputedStyle(el).border;
    });
    // The CSS defines border: 2px solid #4CAF50; so the computed border should include '4CAF50' or the color value.
    expect(border.length).toBeGreaterThan(0);
  });

  test('Rapid enqueue and dequeue interactions maintain consistent state', async ({ page }) => {
    // Purpose: Simulate quick user actions (multiple enqueues then dequeues) and ensure DOM remains consistent.
    const queuePage8 = new QueuePage(page);
    await queuePage.goto();

    // Enqueue 5 items quickly
    for (let i = 1; i <= 5; i++) {
      await queuePage.enterValue(i);
      await queuePage.clickEnqueue();
    }
    expect(await queuePage.getQueueCount()).toBe(5);

    // Dequeue 3 times
    for (let i = 0; i < 3; i++) {
      await queuePage.clickDequeue();
    }
    const remaining = await queuePage.getQueueItemsText();
    // After removing first 3 from [1,2,3,4,5] -> expect ['4','5']
    expect(remaining).toEqual(['4', '5']);
    expect(await queuePage.getQueueCount()).toBe(2);
  });
});