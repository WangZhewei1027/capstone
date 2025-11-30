import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/4c9e5fd2-cd2f-11f0-a735-f5f9b4634e99.html';

test.describe('Queue Demonstration - E2E', () => {
  // Shared references for each test
  let consoleErrors = [];
  let pageErrors = [];
  let queuePage;

  // Page Object encapsulating common interactions and queries
  class QueuePage {
    constructor(page) {
      this.page = page;
      this.input = page.locator('#itemInput');
      this.enqueueButton = page.getByRole('button', { name: 'Enqueue' });
      this.dequeueButton = page.getByRole('button', { name: 'Dequeue' });
      this.queueItems = page.locator('#queue li');
      this.queueList = page.locator('#queue');
      this.heading = page.locator('h1');
    }

    // Helper to navigate to the app
    async goto() {
      await this.page.goto(APP_URL);
    }

    // Enqueue using UI: fills input and clicks Enqueue
    async enqueueItem(text) {
      await this.input.fill(text);
      await this.enqueueButton.click();
    }

    // Dequeue using UI: clicks Dequeue button
    async clickDequeue() {
      await this.dequeueButton.click();
    }

    // Directly invoke the global queue.dequeue() function and return its result
    // (this ensures we can assert the returned string when queue is empty)
    async evaluateDequeueReturn() {
      return await this.page.evaluate(() => {
        // Do not patch or redefine anything — call the existing function
        return queue.dequeue();
      });
    }

    // Get all items' text in the queue (in order)
    async getItemsText() {
      return await this.queueItems.allTextContents();
    }

    // Get count of items in the queue
    async getCount() {
      return await this.queueItems.count();
    }

    // Get current value of the input field
    async getInputValue() {
      return await this.input.inputValue();
    }

    // Check placeholder text for accessibility / UX
    async getPlaceholder() {
      return await this.input.getAttribute('placeholder');
    }
  }

  // Setup: navigate to page and attach console/pageerror listeners
  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // capture console messages of type 'error'
    page.on('console', message => {
      try {
        if (message.type() === 'error') {
          consoleErrors.push(message.text());
        }
      } catch (e) {
        // Swallow listener side-effects — the actual test should assert on captured errors
      }
    });

    // capture uncaught page errors
    page.on('pageerror', err => {
      try {
        pageErrors.push(err);
      } catch (e) {
        // ignore
      }
    });

    queuePage = new QueuePage(page);
    await queuePage.goto();
  });

  // Teardown assertions: ensure no unexpected runtime errors were emitted
  test.afterEach(async () => {
    // Assert there were no page 'pageerror' events
    expect(pageErrors.length, `Expected no uncaught page errors, but got: ${pageErrors.map(e => String(e)).join(' | ')}`).toBe(0);

    // Assert there were no console error messages
    expect(consoleErrors.length, `Expected no console.error messages, but got: ${consoleErrors.join(' | ')}`).toBe(0);
  });

  test('Initial load: queue is empty and UI elements are present', async () => {
    // Ensure the heading is present and meaningful
    await expect(queuePage.heading).toHaveText('Queue Demonstration');

    // Queue list should be present but contain no items
    expect(await queuePage.getCount()).toBe(0);

    // Input field should exist and have correct placeholder
    expect(await queuePage.getPlaceholder()).toBe('Enter item');

    // Both Enqueue and Dequeue buttons should be visible and enabled
    await expect(queuePage.enqueueButton).toBeVisible();
    await expect(queuePage.enqueueButton).toBeEnabled();
    await expect(queuePage.dequeueButton).toBeVisible();
    await expect(queuePage.dequeueButton).toBeEnabled();
  });

  test('Enqueue adds an item to the DOM and clears the input', async () => {
    // Add a single item via the UI
    await queuePage.enqueueItem('Alpha');

    // After enqueue: one list item with correct text
    expect(await queuePage.getCount()).toBe(1);
    const items = await queuePage.getItemsText();
    expect(items).toEqual(['Alpha']);

    // Input should be cleared after successful enqueue
    expect(await queuePage.getInputValue()).toBe('');
  });

  test('Enqueue respects trimming and ignores empty/whitespace-only submissions', async () => {
    // Enqueue with leading/trailing whitespace should trim and succeed
    await queuePage.enqueueItem('  Beta  ');
    let items = await queuePage.getItemsText();
    expect(items).toEqual(['Beta']);

    // Attempt to enqueue empty string -> should not create new items
    await queuePage.enqueueItem('');
    expect(await queuePage.getCount()).toBe(1);

    // Attempt to enqueue whitespace-only string -> should not create new items
    await queuePage.enqueueItem('    ');
    expect(await queuePage.getCount()).toBe(1);
  });

  test('Dequeue removes items in FIFO order', async () => {
    // Enqueue multiple items
    await queuePage.enqueueItem('first');
    await queuePage.enqueueItem('second');
    await queuePage.enqueueItem('third');

    // Verify order before dequeue
    let items = await queuePage.getItemsText();
    expect(items).toEqual(['first', 'second', 'third']);

    // Dequeue once via UI: should remove 'first'
    await queuePage.clickDequeue();
    items = await queuePage.getItemsText();
    expect(items).toEqual(['second', 'third']);

    // Dequeue again: should remove 'second'
    await queuePage.clickDequeue();
    items = await queuePage.getItemsText();
    expect(items).toEqual(['third']);

    // Dequeue final item: queue becomes empty
    await queuePage.clickDequeue();
    expect(await queuePage.getCount()).toBe(0);
  });

  test('Dequeue on empty queue returns the expected string and does not throw', async () => {
    // Ensure queue is empty to start
    expect(await queuePage.getCount()).toBe(0);

    // Call the queue.dequeue() function directly and assert its return value
    const result = await queuePage.evaluateDequeueReturn();
    expect(result).toBe('Queue is empty!');

    // Clicking Dequeue in the UI when empty should not add items or throw
    await queuePage.clickDequeue();
    expect(await queuePage.getCount()).toBe(0);
  });

  test('Accessibility & basic attributes: input has placeholder and buttons have accessible names', async () => {
    // Placeholder verification done previously; check button accessible names
    await expect(queuePage.enqueueButton).toHaveAttribute('onclick', 'enqueue()');
    await expect(queuePage.dequeueButton).toHaveAttribute('onclick', 'dequeue()');

    // Ensure buttons' labels match their visible text
    await expect(queuePage.enqueueButton).toHaveText('Enqueue');
    await expect(queuePage.dequeueButton).toHaveText('Dequeue');
  });
});