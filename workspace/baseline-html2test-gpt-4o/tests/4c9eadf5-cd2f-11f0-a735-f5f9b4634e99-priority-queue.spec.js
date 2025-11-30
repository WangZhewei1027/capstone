import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/4c9eadf5-cd2f-11f0-a735-f5f9b4634e99.html';

// Page object to encapsulate interactions with the Priority Queue page
class PriorityQueuePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.itemInput = page.locator('#item');
    this.priorityInput = page.locator('#priority');
    this.enqueueButton = page.getByRole('button', { name: 'Enqueue' });
    this.dequeueButton = page.getByRole('button', { name: 'Dequeue Highest Priority Item' });
    this.queueList = page.locator('#priorityQueue');
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async enqueue(item, priority) {
    await this.itemInput.fill(String(item));
    await this.priorityInput.fill(String(priority));
    await this.enqueueButton.click();
  }

  async dequeue() {
    await this.dequeueButton.click();
  }

  async getQueueItemsText() {
    const items = await this.queueList.locator('li').allTextContents();
    // Normalize whitespace around entries
    return items.map(s => s.trim());
  }

  async countQueueItems() {
    return await this.queueList.locator('li').count();
  }
}

test.describe('Priority Queue Application - end-to-end', () => {
  // Collect console messages and page errors for each test to assert no unexpected errors occur
  let pageErrors;
  let consoleMessages;

  test.beforeEach(async ({ page }) => {
    pageErrors = [];
    consoleMessages = [];

    // Listen for uncaught exceptions on the page
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    // Capture console messages for later inspection
    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
  });

  test.afterEach(async () => {
    // After each test we will assert there were no uncaught page errors and no console errors.
    // This ensures the application didn't produce runtime errors during the interactions we performed.
    expect(pageErrors, 'No uncaught page errors should be present').toHaveLength(0);
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors, 'No console.error messages should be logged').toHaveLength(0);
  });

  test.describe('Initial load and UI elements', () => {
    test('Initial page load shows expected heading, inputs and an empty queue', async ({ page }) => {
      // Purpose: Verify the basic elements render and initial state is empty
      const pq = new PriorityQueuePage(page);
      await pq.goto();

      // Check heading is present
      const heading = page.locator('h1');
      await expect(heading).toHaveText('Priority Queue Example');

      // Inputs and buttons should be visible
      await expect(pq.itemInput).toBeVisible();
      await expect(pq.priorityInput).toBeVisible();
      await expect(pq.enqueueButton).toBeVisible();
      await expect(pq.dequeueButton).toBeVisible();

      // Queue should be empty initially
      const count = await pq.countQueueItems();
      expect(count).toBe(0);
    });
  });

  test.describe('Core interactions - enqueue and dequeue behavior', () => {
    test('Enqueue items with different priorities results in correct ordering and clears inputs', async ({ page }) => {
      // Purpose: Verify enqueue insertion orders by priority (lower numeric priority -> higher actual priority)
      const pq = new PriorityQueuePage(page);
      await pq.goto();

      // Add three items in a certain sequence with varying priorities
      await pq.enqueue('A', 5);
      // After first enqueue, only A should be present
      let items = await pq.getQueueItemsText();
      expect(items).toEqual(['A (Priority: 5)']);

      // Ensure inputs are cleared after enqueue
      await expect(pq.itemInput).toHaveValue('');
      await expect(pq.priorityInput).toHaveValue('');

      // Enqueue a higher-priority item (lower number)
      await pq.enqueue('B', 2);
      items = await pq.getQueueItemsText();
      // B should be before A
      expect(items).toEqual(['B (Priority: 2)', 'A (Priority: 5)']);

      // Enqueue another item with priority between B and A
      await pq.enqueue('C', 3);
      items = await pq.getQueueItemsText();
      // Final order should be B (2), C (3), A (5)
      expect(items).toEqual(['B (Priority: 2)', 'C (Priority: 3)', 'A (Priority: 5)']);
    });

    test('Dequeue removes the highest-priority (lowest number) item and updates the DOM', async ({ page }) => {
      // Purpose: Verify dequeue removes the front item and the DOM reflects the change
      const pq = new PriorityQueuePage(page);
      await pq.goto();

      // Prepare queue: B (2), C (3), A (5)
      await pq.enqueue('A', 5);
      await pq.enqueue('B', 2);
      await pq.enqueue('C', 3);

      let items = await pq.getQueueItemsText();
      expect(items).toEqual(['B (Priority: 2)', 'C (Priority: 3)', 'A (Priority: 5)']);

      // Click Dequeue; expect B removed
      await pq.dequeue();
      items = await pq.getQueueItemsText();
      expect(items).toEqual(['C (Priority: 3)', 'A (Priority: 5)']);

      // Dequeue again; expect C removed
      await pq.dequeue();
      items = await pq.getQueueItemsText();
      expect(items).toEqual(['A (Priority: 5)']);
    });
  });

  test.describe('Validation, alerts, and edge cases', () => {
    test('Shows alert when trying to enqueue with empty item and/or missing priority', async ({ page }) => {
      // Purpose: Ensure the application validates input and displays an alert for missing fields
      const pq = new PriorityQueuePage(page);
      await pq.goto();

      // Attempt to enqueue with both fields empty
      const dialogPromise1 = page.waitForEvent('dialog');
      await pq.enqueue('', ''); // fill("", "") then click
      const dialog1 = await dialogPromise1;
      expect(dialog1.message()).toBe('Please enter a valid item and priority.');
      await dialog1.dismiss();

      // Attempt to enqueue with item present but priority empty
      await pq.itemInput.fill('OnlyItem');
      const dialogPromise2 = page.waitForEvent('dialog');
      await pq.enqueue('OnlyItem', ''); // will click enqueue after filling inputs
      const dialog2 = await dialogPromise2;
      expect(dialog2.message()).toBe('Please enter a valid item and priority.');
      await dialog2.dismiss();

      // Attempt to enqueue with priority 0 which should be treated as falsy and trigger alert
      await pq.itemInput.fill('ZeroPriority');
      const dialogPromise3 = page.waitForEvent('dialog');
      // Fill 0 into the numeric field and click enqueue
      await pq.priorityInput.fill('0');
      await pq.enqueueButton.click();
      const dialog3 = await dialogPromise3;
      expect(dialog3.message()).toBe('Please enter a valid item and priority.');
      await dialog3.dismiss();

      // Ensure queue still empty after invalid attempts
      const count = await pq.countQueueItems();
      expect(count).toBe(0);
    });

    test('Negative priority values are accepted and treated as highest priority (lowest number)', async ({ page }) => {
      // Purpose: Validate that negative priorities (truthy) are accepted and become front of queue
      const pq = new PriorityQueuePage(page);
      await pq.goto();

      // Add a normal item
      await pq.enqueue('Normal', 10);
      // Add a negative-priority item which should be placed before 'Normal'
      await pq.enqueue('Negative', -1);

      const items = await pq.getQueueItemsText();
      // Negative (-1) should appear first because -1 < 10
      expect(items).toEqual(['Negative (Priority: -1)', 'Normal (Priority: 10)']);
    });
  });
});