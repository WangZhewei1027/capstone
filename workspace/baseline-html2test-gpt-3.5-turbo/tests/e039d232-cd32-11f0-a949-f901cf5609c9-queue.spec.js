import { test, expect } from '@playwright/test';

// Page object model for the Queue demo
class QueuePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.url = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/e039d232-cd32-11f0-a949-f901cf5609c9.html';

    // Locators
    this.queueContainer = page.locator('#queue-container');
    this.enqueueInput = page.locator('#enqueue-input');
    this.enqueueBtn = page.locator('#enqueue-btn');
    this.dequeueBtn = page.locator('#dequeue-btn');
    this.peekBtn = page.locator('#peek-btn');
    this.clearBtn = page.locator('#clear-btn');
    this.message = page.locator('#message');
    this.queueElements = page.locator('.queue-element');
  }

  async goto() {
    await this.page.goto(this.url);
  }

  async enqueue(value) {
    await this.enqueueInput.fill(value);
    await this.enqueueBtn.click();
  }

  async dequeue() {
    await this.dequeueBtn.click();
  }

  async peek() {
    await this.peekBtn.click();
  }

  async clear() {
    await this.clearBtn.click();
  }

  async pressEnterInInput(value) {
    await this.enqueueInput.fill(value);
    await this.enqueueInput.press('Enter');
  }

  async getQueueTextContent() {
    return this.page.evaluate(() => {
      const container = document.getElementById('queue-container');
      return container ? container.innerText : '';
    });
  }
}

// Group tests related to Queue functionality
test.describe('Queue Data Structure Demo - End-to-End', () => {
  // arrays to collect console and page errors for each test
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Listen for console events and capture error-level logs
    page.on('console', (msg) => {
      // capture console messages flagged as errors
      if (msg.type() === 'error') {
        consoleErrors.push({
          text: msg.text(),
        });
      }
    });

    // Listen for uncaught exceptions on the page
    page.on('pageerror', (err) => {
      pageErrors.push({
        message: err.message,
        name: err.name,
        stack: err.stack,
      });
    });
  });

  test.afterEach(async () => {
    // Basic sanity: ensure no uncaught runtime errors were emitted to page
    // If there are any, fail the test and surface their content for debugging
    expect(pageErrors, 'No uncaught page errors should occur').toHaveLength(0);
    expect(consoleErrors, 'No console.error logs should be emitted').toHaveLength(0);
  });

  test('Initial load shows empty queue and controls are present', async ({ page }) => {
    // Purpose: Verify initial page state and presence of interactive elements and accessibility attributes
    const q = new QueuePage(page);
    await q.goto();

    // The queue container should have role=list and show "Queue is empty" text
    await expect(q.queueContainer).toHaveAttribute('role', 'list');
    await expect(q.queueContainer).toContainText('Queue is empty');

    // Input and all buttons should be visible and enabled
    await expect(q.enqueueInput).toBeVisible();
    await expect(q.enqueueBtn).toBeVisible();
    await expect(q.dequeueBtn).toBeVisible();
    await expect(q.peekBtn).toBeVisible();
    await expect(q.clearBtn).toBeVisible();

    // Message region should be visible (may be empty text initially)
    await expect(q.message).toBeVisible();

    // No queue-element elements should exist initially
    await expect(q.queueElements).toHaveCount(0);
  });

  test('Enqueue with empty input displays an error message', async ({ page }) => {
    // Purpose: Attempt to enqueue with no input and expect an error message to appear
    const q1 = new QueuePage(page);
    await q.goto();

    // Ensure input is empty
    await q.enqueueInput.fill('');
    await q.enqueueBtn.click();

    // The message should instruct user to enter a value and use error color
    await expect(q.message).toHaveText('Please enter a value to enqueue.');

    // Check computed style color corresponds to error (#d9534f -> rgb(217, 83, 79))
    const color = await q.message.evaluate(el => getComputedStyle(el).color);
    expect(color).toContain('217'); // crude check: rgb(217, 83, 79) includes 217
  });

  test('Enqueue elements updates visual queue, highlights front, and allows Enter key to enqueue', async ({ page }) => {
    // Purpose: Add multiple items via click and Enter key, verify display order and styles
    const q2 = new QueuePage(page);
    await q.goto();

    // Enqueue first item using click
    await q.enqueue('A');

    // Message should indicate enqueued
    await expect(q.message).toHaveText('Enqueued "A"');

    // One queue element should exist and be highlighted as front
    await expect(q.queueElements).toHaveCount(1);
    const first = q.queueElements.nth(0);
    await expect(first).toHaveText('A');
    await expect(first).toHaveAttribute('title', 'Front');

    // Verify front element background color set to #28a745 (rgb(40, 167, 69))
    const bgColor = await first.evaluate(el => getComputedStyle(el).backgroundColor);
    expect(bgColor).toContain('40'); // rgb(40, 167, 69) includes 40

    // Enqueue second item using Enter key
    await q.pressEnterInInput('B');

    // After enqueuing B, there should be two elements: A (front), then B
    await expect(q.queueElements).toHaveCount(2);
    await expect(q.queueElements.nth(0)).toHaveText('A');
    await expect(q.queueElements.nth(1)).toHaveText('B');

    // The first element should still be marked as Front
    await expect(q.queueElements.nth(0)).toHaveAttribute('title', 'Front');
  });

  test('Peek returns the front element without removing it', async ({ page }) => {
    // Purpose: Ensure peek displays front element text but does not modify queue
    const q3 = new QueuePage(page);
    await q.goto();

    // Setup: enqueue two items
    await q.enqueue('first');
    await q.enqueue('second');

    // Peek should show front element but not remove it
    await q.peek();
    await expect(q.message).toHaveText('Front element is: "first"');

    // Queue length should remain 2 and order unchanged
    await expect(q.queueElements).toHaveCount(2);
    await expect(q.queueElements.nth(0)).toHaveText('first');
    await expect(q.queueElements.nth(1)).toHaveText('second');
  });

  test('Dequeue removes front element and updates display and message', async ({ page }) => {
    // Purpose: Verify dequeue removes the front element and updates UI and message
    const q4 = new QueuePage(page);
    await q.goto();

    // Setup: enqueue items
    await q.enqueue('one');
    await q.enqueue('two');
    await q.enqueue('three');

    // Dequeue should remove 'one'
    await q.dequeue();
    await expect(q.message).toHaveText('Dequeued "one"');

    // Now front should be 'two' and queue length 2
    await expect(q.queueElements).toHaveCount(2);
    await expect(q.queueElements.nth(0)).toHaveText('two');
    await expect(q.queueElements.nth(0)).toHaveAttribute('title', 'Front');
  });

  test('Clear empties the queue and updates display and message', async ({ page }) => {
    // Purpose: Test clear operation both when queue has items and when already empty
    const q5 = new QueuePage(page);
    await q.goto();

    // Enqueue items
    await q.enqueue('x');
    await q.enqueue('y');

    // Clear should remove items and update the display
    await q.clear();
    await expect(q.message).toHaveText('Queue cleared.');

    // The container should show the "Queue is empty" fallback text
    await expect(q.queueContainer).toContainText('Queue is empty');

    // Now clicking clear again (when already empty) shows a friendly message and does not error
    await q.clear();
    await expect(q.message).toHaveText('Queue is already empty.');
  });

  test('Edge cases: Dequeue and Peek on empty queue show error messages', async ({ page }) => {
    // Purpose: Confirm proper error messages when operations are attempted on an empty queue
    const q6 = new QueuePage(page);
    await q.goto();

    // Ensure queue is empty initially
    await expect(q.queueElements).toHaveCount(0);

    // Dequeue on empty
    await q.dequeue();
    await expect(q.message).toHaveText('Queue is empty. Cannot dequeue.');
    // message should use error color (approx rgb(217,83,79))
    const dequeueColor = await q.message.evaluate(el => getComputedStyle(el).color);
    expect(dequeueColor).toContain('217');

    // Peek on empty
    await q.peek();
    await expect(q.message).toHaveText('Queue is empty. Nothing to peek.');
    const peekColor = await q.message.evaluate(el => getComputedStyle(el).color);
    expect(peekColor).toContain('217');
  });

  test('Accessibility: queue items have appropriate roles and aria attributes', async ({ page }) => {
    // Purpose: Check role attributes for list and listitems and aria-label on controls
    const q7 = new QueuePage(page);
    await q.goto();

    // Controls should have aria-labels
    await expect(q.enqueueInput).toHaveAttribute('aria-label', 'Input value to enqueue');
    await expect(q.enqueueBtn).toHaveAttribute('aria-label', 'Enqueue value');
    await expect(q.dequeueBtn).toHaveAttribute('aria-label', 'Dequeue value');
    await expect(q.peekBtn).toHaveAttribute('aria-label', 'Peek front value');
    await expect(q.clearBtn).toHaveAttribute('aria-label', 'Clear queue');

    // Enqueue two items to create listitems
    await q.enqueue('alpha');
    await q.enqueue('beta');

    // The container should have role=list and each element role=listitem
    await expect(q.queueContainer).toHaveAttribute('role', 'list');
    await expect(q.queueElements).toHaveCount(2);
    await expect(q.queueElements.nth(0)).toHaveAttribute('role', 'listitem');
    await expect(q.queueElements.nth(1)).toHaveAttribute('role', 'listitem');
  });
});