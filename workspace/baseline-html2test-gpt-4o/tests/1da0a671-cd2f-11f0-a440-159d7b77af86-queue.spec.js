import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/1da0a671-cd2f-11f0-a440-159d7b77af86.html';

test.describe('Queue Concept Demonstration (1da0a671-cd2f-11f0-a440-159d7b77af86)', () => {
  // Arrays to collect console errors and page errors for each test
  let consoleErrors;
  let pageErrors;

  // Page object model for interacting with the Queue demo
  class QueuePage {
    constructor(page) {
      this.page = page;
      this.input = page.locator('#enqueueInput');
      this.enqueueButton = page.getByRole('button', { name: 'Enqueue' });
      this.dequeueButton = page.getByRole('button', { name: 'Dequeue' });
      this.peekButton = page.getByRole('button', { name: 'Peek' });
      this.queueList = page.locator('#queueList');
      this.queueItems = page.locator('#queueList li');
    }

    // Navigate to the app
    async goto() {
      await this.page.goto(APP_URL);
    }

    // Enqueue an item using the input and Enqueue button
    async enqueue(item) {
      await this.input.fill(item);
      await this.enqueueButton.click();
    }

    // Click Dequeue and wait for the alert, returning its message
    async dequeueAndGetAlertMessage() {
      const [dialog] = await Promise.all([
        this.page.waitForEvent('dialog'),
        this.dequeueButton.click(),
      ]);
      const message = dialog.message();
      await dialog.accept();
      return message;
    }

    // Click Peek and wait for the alert, returning its message
    async peekAndGetAlertMessage() {
      const [dialog] = await Promise.all([
        this.page.waitForEvent('dialog'),
        this.peekButton.click(),
      ]);
      const message = dialog.message();
      await dialog.accept();
      return message;
    }

    // Get array of text contents of list items in order
    async getQueueItemsText() {
      const count = await this.queueItems.count();
      const texts = [];
      for (let i = 0; i < count; i++) {
        texts.push(await this.queueItems.nth(i).textContent());
      }
      return texts;
    }

    // Get current value of the input
    async getInputValue() {
      return await this.input.inputValue();
    }
  }

  // Setup: run before each test. Create fresh listener arrays and navigate.
  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Capture console messages and only store errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push({
          text: msg.text(),
          location: msg.location ? msg.location() : null,
        });
      }
    });

    // Capture unhandled page errors
    page.on('pageerror', err => {
      pageErrors.push(String(err));
    });

    // Navigate to the application under test
    await page.goto(APP_URL);
  });

  // Teardown: after each test, assert that there were no unexpected runtime errors
  test.afterEach(async () => {
    // These assertions ensure that the page did not emit any console.error or page error events.
    // If the application naturally throws errors (ReferenceError, TypeError, etc.), these assertions will fail,
    // surfacing those issues (per the requirement to observe and assert console/page errors).
    expect(consoleErrors, `Expected no console.error entries; found: ${JSON.stringify(consoleErrors, null, 2)}`).toHaveLength(0);
    expect(pageErrors, `Expected no page errors; found: ${JSON.stringify(pageErrors, null, 2)}`).toHaveLength(0);
  });

  // Group tests related to initial state and basic visibility
  test.describe('Initial load and UI elements', () => {
    test('Initial page load shows controls and an empty queue', async ({ page }) => {
      // Purpose: verify that the input and buttons are visible and the queue list is empty on initial load
      const q = new QueuePage(page);
      await expect(q.input).toBeVisible();
      await expect(q.enqueueButton).toBeVisible();
      await expect(q.dequeueButton).toBeVisible();
      await expect(q.peekButton).toBeVisible();

      // The queue list should contain no list items initially
      await expect(q.queueItems).toHaveCount(0);
    });
  });

  // Group tests that exercise enqueue, peek, dequeue behaviors
  test.describe('Queue operations: enqueue, peek, dequeue', () => {
    test('Enqueue a single item adds it to the list and clears the input', async ({ page }) => {
      // Purpose: ensure enqueue updates the DOM and clears the input
      const q = new QueuePage(page);
      await q.enqueue('first-item');

      // One item should be present with the correct text
      await expect(q.queueItems).toHaveCount(1);
      const items = await q.getQueueItemsText();
      expect(items).toEqual(['first-item']);

      // Input should be cleared after enqueue
      expect(await q.getInputValue()).toBe('');
    });

    test('Enqueue multiple items preserves FIFO order', async ({ page }) => {
      // Purpose: enqueue multiple items and verify their order in the DOM is FIFO
      const q = new QueuePage(page);
      await q.enqueue('a');
      await q.enqueue('b');
      await q.enqueue('c');

      await expect(q.queueItems).toHaveCount(3);
      const items = await q.getQueueItemsText();
      expect(items).toEqual(['a', 'b', 'c']);
    });

    test('Peek shows an alert with the front item and does not remove it', async ({ page }) => {
      // Purpose: verify peek alert message and that queue remains unchanged
      const q = new QueuePage(page);
      await q.enqueue('alpha');
      await q.enqueue('beta');

      // Peek should show 'alpha' in the alert and queue should remain unchanged
      const peekMessage = await q.peekAndGetAlertMessage();
      expect(peekMessage).toBe('Peek at front item: alpha');

      // Ensure items still present and in same order
      const itemsAfterPeek = await q.getQueueItemsText();
      expect(itemsAfterPeek).toEqual(['alpha', 'beta']);
    });

    test('Dequeue shows an alert with the removed item and updates the list', async ({ page }) => {
      // Purpose: verify dequeue removes front element and alert contains removed value
      const q = new QueuePage(page);
      await q.enqueue('one');
      await q.enqueue('two');

      const dequeueMessage = await q.dequeueAndGetAlertMessage();
      expect(dequeueMessage).toBe('Dequeued item: one');

      // Now only 'two' should remain
      await expect(q.queueItems).toHaveCount(1);
      const remaining = await q.getQueueItemsText();
      expect(remaining).toEqual(['two']);
    });
  });

  // Edge case tests for empty queue scenarios
  test.describe('Edge cases and empty queue behavior', () => {
    test('Dequeue on an empty queue displays an alert indicating the queue is empty and does not crash', async ({ page }) => {
      // Purpose: ensure calling dequeue when empty triggers alert with message "Queue is empty!" and no DOM errors occur
      const q = new QueuePage(page);

      // Ensure queue is empty to start
      await expect(q.queueItems).toHaveCount(0);

      // Dequeue should alert with the empty message
      const message = await q.dequeueAndGetAlertMessage();
      expect(message).toBe('Dequeued item: Queue is empty!');

      // Still empty after operation
      await expect(q.queueItems).toHaveCount(0);
    });

    test('Peek on an empty queue displays an alert indicating the queue is empty and does not remove items', async ({ page }) => {
      // Purpose: ensure peek on empty returns the expected empty message and queue remains empty
      const q = new QueuePage(page);

      // Confirm empty
      await expect(q.queueItems).toHaveCount(0);

      const message = await q.peekAndGetAlertMessage();
      expect(message).toBe('Peek at front item: Queue is empty!');

      // Queue remains empty
      await expect(q.queueItems).toHaveCount(0);
    });

    test('Dequeuing repeatedly until empty behaves predictably', async ({ page }) => {
      // Purpose: dequeue multiple times and verify behavior transitions to empty case gracefully
      const q = new QueuePage(page);
      await q.enqueue('x');
      await q.enqueue('y');

      // First dequeue removes 'x'
      const m1 = await q.dequeueAndGetAlertMessage();
      expect(m1).toBe('Dequeued item: x');

      // Second dequeue removes 'y'
      const m2 = await q.dequeueAndGetAlertMessage();
      expect(m2).toBe('Dequeued item: y');

      // Now queue is empty; another dequeue yields the empty message
      const m3 = await q.dequeueAndGetAlertMessage();
      expect(m3).toBe('Dequeued item: Queue is empty!');

      await expect(q.queueItems).toHaveCount(0);
    });
  });

  // Accessibility and visibility checks
  test.describe('Accessibility and visibility', () => {
    test('Input has a placeholder and is focusable', async ({ page }) => {
      // Purpose: ensure the input has expected placeholder text and can receive focus
      const q = new QueuePage(page);
      await expect(q.input).toHaveAttribute('placeholder', 'Enter item to enqueue');
      await q.input.focus();
      // After focusing, the activeElement should be the input
      const activeId = await page.evaluate(() => document.activeElement.id);
      expect(activeId).toBe('enqueueInput');
    });

    test('Buttons are visible and have accessible names', async ({ page }) => {
      // Purpose: verify buttons are rendered and discoverable via accessibility roles
      const q = new QueuePage(page);
      await expect(q.enqueueButton).toBeVisible();
      await expect(q.dequeueButton).toBeVisible();
      await expect(q.peekButton).toBeVisible();
      // Confirm accessible names
      expect(await q.enqueueButton.innerText()).toBe('Enqueue');
      expect(await q.dequeueButton.innerText()).toBe('Dequeue');
      expect(await q.peekButton.innerText()).toBe('Peek');
    });
  });
});