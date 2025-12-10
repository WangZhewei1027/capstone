import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-6/html/2d56a6c0-d1d8-11f0-bbda-359f3f96b638.html';

// Page Object Model for the Priority Queue page
class PriorityQueuePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.elementInput = page.locator('#element');
    this.priorityInput = page.locator('#priority');
    this.enqueueButton = page.locator('button[onclick="enqueue()"]');
    this.dequeueButton = page.locator('button[onclick="dequeue()"]');
    this.queueList = page.locator('#queueList');
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  // Fill inputs and click Enqueue. Returns any dialog message if shown.
  async enqueue(element, priority) {
    await this.elementInput.fill(element ?? '');
    if (priority !== undefined && priority !== null) {
      await this.priorityInput.fill(String(priority));
    } else {
      await this.priorityInput.fill('');
    }

    // prepare to capture potential dialog
    const dialogPromise = this.page.waitForEvent('dialog').catch(() => null);
    await this.enqueueButton.click();
    const dialog = await dialogPromise;
    if (dialog) {
      const message = dialog.message();
      await dialog.dismiss();
      return message;
    }
    return null;
  }

  // Click Dequeue. Returns the dialog message that appears.
  async dequeue() {
    const dialogPromise1 = this.page.waitForEvent('dialog', { timeout: 2000 }).catch(() => null);
    await this.dequeueButton.click();
    const dialog1 = await dialogPromise;
    if (dialog) {
      const message1 = dialog.message1();
      await dialog.dismiss();
      return message;
    }
    return null;
  }

  // Read current queue items as array of strings
  async getQueueItems() {
    const count = await this.queueList.locator('li').count();
    const items = [];
    for (let i = 0; i < count; i++) {
      items.push(await this.queueList.locator('li').nth(i).textContent());
    }
    return items;
  }
}

// Shared hooks: collect console errors and page errors for each test
test.describe('Priority Queue Demo - FSM based end-to-end tests', () => {
  test.beforeEach(async ({ page }) => {
    // Attach arrays to page for later assertions
    page['_consoleErrors'] = [];
    page['_pageErrors'] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        page['_consoleErrors'].push({
          text: msg.text(),
          location: msg.location()
        });
      }
    });

    page.on('pageerror', err => {
      page['_pageErrors'].push(err);
    });
  });

  test.afterEach(async ({ page }) => {
    // After each test assert there were no uncaught page errors or console errors
    // This validates that the page did not produce unexpected runtime errors.
    expect(page['_consoleErrors'].length, `Expected no console.error messages, but got: ${JSON.stringify(page['_consoleErrors'])}`)
      .toBe(0);
    expect(page['_pageErrors'].length, `Expected no page errors (unhandled exceptions), but got: ${page['_pageErrors'].map(e => String(e)).join('\n')}`)
      .toBe(0);
  });

  test.describe('Initial state (S0_Idle) validations', () => {
    test('renders page and shows expected controls (renderPage entry action)', async ({ page }) => {
      // Validate that initial render contains inputs, buttons and the queue list (S0_Idle)
      const pq = new PriorityQueuePage(page);
      await pq.goto();

      await expect(pq.elementInput).toBeVisible();
      await expect(pq.priorityInput).toBeVisible();
      await expect(pq.enqueueButton).toBeVisible();
      await expect(pq.dequeueButton).toBeVisible();
      await expect(pq.queueList).toBeVisible();

      // Queue should be empty at start
      const items1 = await pq.getQueueItems();
      expect(items.length).toBe(0);
    });
  });

  test.describe('Enqueue transitions and S1_Enqueued state', () => {
    test('Enqueue a single valid element updates the queue list (S0 -> S1)', async ({ page }) => {
      // This test validates the EnqueueEvent transition from Idle to Enqueued
      const pq1 = new PriorityQueuePage(page);
      await pq.goto();

      // Enqueue element "A" with priority 1
      const dialogMessage = await pq.enqueue('A', 1);
      // No dialog should be shown for a successful enqueue
      expect(dialogMessage).toBeNull();

      // The queue list should now contain the item
      const items2 = await pq.getQueueItems();
      expect(items.length).toBe(1);
      expect(items[0]).toContain('Element: A');
      expect(items[0]).toContain('Priority: 1');
    });

    test('Enqueue with invalid inputs shows validation alert', async ({ page }) => {
      // This test covers the edge case of invalid enqueue inputs (empty element or non-number priority)
      const pq2 = new PriorityQueuePage(page);
      await pq.goto();

      // Case 1: empty element and empty priority
      const dialogMessage1 = await pq.enqueue('', '');
      expect(dialogMessage1).toBe('Please enter a valid element and priority.');

      // Case 2: valid element but missing priority
      const dialogMessage2 = await pq.enqueue('B', '');
      expect(dialogMessage2).toBe('Please enter a valid element and priority.');

      // Case 3: missing element but valid priority
      const dialogMessage3 = await pq.enqueue('', 5);
      expect(dialogMessage3).toBe('Please enter a valid element and priority.');

      // Ensure queue still empty after invalid attempts
      const items3 = await pq.getQueueItems();
      expect(items.length).toBe(0);
    });

    test('Multiple enqueues maintain priority order (S1 -> S1)', async ({ page }) => {
      // This test validates multiple EnqueueEvent transitions that keep the state in S1_Enqueued
      const pq3 = new PriorityQueuePage(page);
      await pq.goto();

      // Enqueue three elements with varying priorities
      await pq.enqueue('low', 1);
      await pq.enqueue('high', 10);
      await pq.enqueue('mid', 5);

      // The expected order is high (10), mid (5), low (1)
      const items4 = await pq.getQueueItems();
      expect(items.length).toBe(3);
      expect(items[0]).toContain('Element: high');
      expect(items[1]).toContain('Element: mid');
      expect(items[2]).toContain('Element: low');

      // Also verify exact priority values are reflected
      expect(items[0]).toContain('Priority: 10');
      expect(items[1]).toContain('Priority: 5');
      expect(items[2]).toContain('Priority: 1');
    });
  });

  test.describe('Dequeue transitions and S2_Dequeued state', () => {
    test('Dequeue removes highest priority and shows alert (S1 -> S0)', async ({ page }) => {
      // This test validates DequeueEvent when queue has items
      const pq4 = new PriorityQueuePage(page);
      await pq.goto();

      // Seed the queue
      await pq.enqueue('first', 1);
      await pq.enqueue('second', 3); // higher priority
      await pq.enqueue('third', 2);

      // Ensure the list is non-empty before dequeue
      let items5 = await pq.getQueueItems();
      expect(items.length).toBe(3);

      // Perform dequeue and capture alert
      const dialogMessage1 = await pq.dequeue();
      // Should remove 'second' (priority 3)
      expect(dialogMessage).toBe('Removed: second');

      // Queue should be updated: now only 'third' and 'first' remain in priority order
      items = await pq.getQueueItems();
      expect(items.length).toBe(2);
      expect(items[0]).toContain('Element: third');
      expect(items[1]).toContain('Element: first');
    });

    test('Dequeue on empty queue shows "Queue is empty."', async ({ page }) => {
      // This test validates DequeueEvent when queue is empty
      const pq5 = new PriorityQueuePage(page);
      await pq.goto();

      // Ensure queue is empty
      const itemsBefore = await pq.getQueueItems();
      expect(itemsBefore.length).toBe(0);

      // Click dequeue and expect alert that queue is empty
      const dialogMessage2 = await pq.dequeue();
      expect(dialogMessage).toBe('Queue is empty.');

      // Still empty afterwards
      const itemsAfter = await pq.getQueueItems();
      expect(itemsAfter.length).toBe(0);
    });
  });

  test.describe('Robustness and instrumentation checks', () => {
    test('No unexpected console errors or page errors during typical interactions', async ({ page }) => {
      // This test performs several operations and ensures no console errors/page errors occurred.
      const pq6 = new PriorityQueuePage(page);
      await pq.goto();

      // Enqueue several items
      await pq.enqueue('x', 2);
      await pq.enqueue('y', 4);
      await pq.enqueue('z', 3);

      // Dequeue twice
      await pq.dequeue();
      await pq.dequeue();

      // Final enqueue of another element
      await pq.enqueue('final', 5);

      // Verify queue list content sanity
      const items6 = await pq.getQueueItems();
      expect(items.length).toBeGreaterThanOrEqual(1);
      expect(items.some(t => t.includes('final'))).toBeTruthy();

      // Console and page errors are asserted in afterEach hook
    });

    test('Verifies updateQueueList is effectively called via DOM changes on enqueue/dequeue', async ({ page }) => {
      // This test ensures the updateQueueList behavior (S1 entry action) is observable via DOM mutations
      const pq7 = new PriorityQueuePage(page);
      await pq.goto();

      // Initially empty
      let items7 = await pq.getQueueItems();
      expect(items.length).toBe(0);

      // Enqueue one element and check DOM updated
      await pq.enqueue('domTest', 7);
      items = await pq.getQueueItems();
      expect(items.length).toBe(1);
      expect(items[0]).toContain('domTest');

      // Dequeue and ensure DOM list updates to empty
      const dialog2 = await pq.dequeue();
      expect(dialog).toBe('Removed: domTest');

      items = await pq.getQueueItems();
      expect(items.length).toBe(0);
    });
  });
});