import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/7abe34f2-cd32-11f0-a96f-2d591ffb35fe.html';

// Page Object for the Queue page to encapsulate actions and queries
class QueuePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input = page.locator('#enqueue-input');
    this.enqueueBtn = page.locator('#enqueue-btn');
    this.dequeueBtn = page.locator('#dequeue-btn');
    this.queueContainer = page.locator('#queue-container');
    this.queueElements = page.locator('#queue-container .queue-element');
    this.message = page.locator('#message');
    this.form = page.locator('#queue-form');
  }

  // Navigate to the app
  async goto() {
    await this.page.goto(APP_URL, { waitUntil: 'load' });
  }

  // Enqueue via filling input and submitting the form (clicking button)
  async enqueue(value) {
    await this.input.fill(value);
    await this.enqueueBtn.click();
  }

  // Click the Dequeue button
  async dequeue() {
    await this.dequeueBtn.click();
  }

  // Returns all visible queue item texts
  async getQueueItemsText() {
    return this.queueElements.allTextContents();
  }

  // Returns the message text
  async getMessageText() {
    return this.message.textContent();
  }

  // Returns the computed color of the message
  async getMessageColor() {
    return this.message.evaluate((el) => getComputedStyle(el).color);
  }

  // Number of queue items
  async countQueueItems() {
    return this.queueElements.count();
  }

  // Submit the form directly (useful for testing empty submits)
  async submitForm() {
    await this.form.evaluate((f) => f.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  }
}

test.describe('Queue Demonstration App - 7abe34f2-cd32-11f0-a96f-2d591ffb35fe', () => {
  let consoleErrors;
  let pageErrors;

  // Attach listeners before each test to capture console errors and page errors.
  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Capture console messages of type 'error'
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Capture uncaught page exceptions
    page.on('pageerror', (err) => {
      // err is an Error object; push its message for assertions
      pageErrors.push(err.message || String(err));
    });
  });

  // Test initial load and default state of the application
  test('Initial page load shows empty queue and interactive controls are present', async ({ page }) => {
    const app = new QueuePage(page);
    // Navigate to the application
    await app.goto();

    // Title and header presence
    await expect(page).toHaveTitle(/Queue Demonstration/);
    await expect(page.locator('h1')).toHaveText('Queue Demonstration');

    // Queue container indicates empty state
    await expect(app.queueContainer).toHaveText('Queue is empty.');

    // Message area should be empty by default
    await expect(app.message).toHaveText('');

    // Input and buttons should exist and be enabled
    await expect(app.input).toBeVisible();
    await expect(app.enqueueBtn).toBeVisible();
    await expect(app.enqueueBtn).toBeEnabled();
    await expect(app.dequeueBtn).toBeVisible();
    await expect(app.dequeueBtn).toBeEnabled();

    // Accessibility roles: container should have role=list and items will have role=listitem when added
    await expect(app.queueContainer).toHaveAttribute('role', 'list');

    // No runtime errors or console errors occurred during initial load
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  // Test enqueuing a single element updates DOM and shows success message
  test('Enqueue single element updates DOM, clears input, and shows success message', async ({ page }) => {
    const app1 = new QueuePage(page);
    await app.goto();

    // Enqueue the element "A"
    await app.enqueue('A');

    // There should be exactly one queue element with text "A"
    await expect(app.queueElements).toHaveCount(1);
    await expect(app.queueElements.nth(0)).toHaveText('A');

    // The message element should display the success message with green color
    await expect(app.message).toHaveText('Enqueued "A"');
    const color = await app.getMessageColor();
    // '#28a745' corresponds to 'rgb(40, 167, 69)'
    expect(color).toBe('rgb(40, 167, 69)');

    // Input should be cleared and focused as per implementation (value becomes empty)
    await expect(app.input).toHaveValue('');

    // No runtime errors or console errors
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  // Test enqueuing multiple elements preserves FIFO order and marks first/last by DOM order
  test('Enqueue multiple elements preserves order (FIFO) and DOM reflects front/rear positions', async ({ page }) => {
    const app2 = new QueuePage(page);
    await app.goto();

    // Enqueue A, B, C
    await app.enqueue('A');
    await app.enqueue('B');
    await app.enqueue('C');

    // Verify count and order
    await expect(app.queueElements).toHaveCount(3);
    const texts = await app.getQueueItemsText();
    expect(texts).toEqual(['A', 'B', 'C']);

    // Each queue element should have role=listitem
    for (let i = 0; i < texts.length; i++) {
      await expect(app.queueElements.nth(i)).toHaveAttribute('role', 'listitem');
    }

    // Although pseudo-elements 'front' and 'rear' cannot be read directly, we can assert
    // that the first item is the front logically and the last is rear by order
    await expect(app.queueElements.first()).toHaveText('A');
    await expect(app.queueElements.last()).toHaveText('C');

    // No runtime errors or console errors
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  // Test dequeue behavior removes from the front and shows the correct message and color
  test('Dequeue removes element from front and updates message color and content', async ({ page }) => {
    const app3 = new QueuePage(page);
    await app.goto();

    // Seed queue with A, B, C
    await app.enqueue('A');
    await app.enqueue('B');
    await app.enqueue('C');

    // Dequeue once; should remove 'A'
    await app.dequeue();

    // Remaining items should be ['B', 'C']
    await expect(app.queueElements).toHaveCount(2);
    const remaining = await app.getQueueItemsText();
    expect(remaining).toEqual(['B', 'C']);

    // Message should indicate dequeued item; message color should be the red color '#d73a49' -> rgb(215,58,73)
    await expect(app.message).toHaveText('Dequeued "A"');
    const color1 = await app.getMessageColor();
    expect(color).toBe('rgb(215, 58, 73)');

    // No runtime errors or console errors
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  // Test dequeuing until empty and then an extra dequeue shows the appropriate empty message
  test('Dequeue until empty and ensure correct message when trying to dequeue from an empty queue', async ({ page }) => {
    const app4 = new QueuePage(page);
    await app.goto();

    // Ensure empty to start
    await expect(app.queueContainer).toHaveText('Queue is empty.');

    // Clicking dequeue on empty should show the empty message
    await app.dequeue();
    await expect(app.message).toHaveText('Queue is empty. Nothing to dequeue.');

    // Enqueue a single item and then dequeue to empty it
    await app.enqueue('X');
    await expect(app.queueElements).toHaveCount(1);
    await app.dequeue();

    // After removing last element, container should say empty
    await expect(app.queueContainer).toHaveText('Queue is empty.');
    // Dequeue again on empty should show the same empty message
    await app.dequeue();
    await expect(app.message).toHaveText('Queue is empty. Nothing to dequeue.');

    // No runtime errors or console errors
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  // Test submitting an empty value triggers validation message and does not modify queue
  test('Submitting empty input shows validation message and does not enqueue', async ({ page }) => {
    const app5 = new QueuePage(page);
    await app.goto();

    // Ensure empty queue initial state
    await expect(app.queueContainer).toHaveText('Queue is empty.');

    // Click Enqueue with empty input
    await app.enqueueBtn.click();

    // The app should display validation message and queue remains empty
    await expect(app.message).toHaveText('Please enter a non-empty element.');
    await expect(app.queueContainer).toHaveText('Queue is empty.');

    // No runtime errors or console errors
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  // Test MAX_QUEUE_SIZE behavior: filling to max and then attempting to add one more
  test('Queue respects MAX_QUEUE_SIZE and shows a full-queue message when exceeded', async ({ page }) => {
    const app6 = new QueuePage(page);
    await app.goto();

    // Enqueue up to MAX_QUEUE_SIZE (20). Use numbered strings to keep values distinct.
    const MAX = 20;
    for (let i = 1; i <= MAX; i++) {
      await app.enqueue(String(i));
    }

    // Ensure we have 20 items
    await expect(app.queueElements).toHaveCount(MAX);

    // Attempt to enqueue one more item; expected failure message about being full
    await app.enqueue('overflow');

    // The message should state it's full and suggest dequeuing
    await expect(app.message).toHaveText(`Queue is full (max size ${MAX}). Dequeue an element first.`);

    // Ensure count still equals MAX (no extra element added)
    await expect(app.queueElements).toHaveCount(MAX);

    // No runtime errors or console errors
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  // Final check ensuring that no console errors or page errors occurred throughout interactions.
  // This test is intentionally last and consolidates the expectation that the app runs without runtime exceptions.
  test('No console.error or uncaught page errors occurred during tests', async ({ page }) => {
    const app7 = new QueuePage(page);
    await app.goto();

    // Perform a couple of representative interactions
    await app.enqueue('final-check-1');
    await app.dequeue();

    // Assert that our error collectors are empty
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
});