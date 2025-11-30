import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/262784d6-cd2a-11f0-bee4-a3a342d77f94.html';

// Page Object for the Priority Queue page
class PriorityQueuePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.elementInput = page.locator('#elementInput');
    this.priorityInput = page.locator('#priorityInput');
    this.enqueueButton = page.getByRole('button', { name: 'Enqueue' });
    this.dequeueButton = page.getByRole('button', { name: 'Dequeue' });
    this.clearButton = page.getByRole('button', { name: 'Clear Queue' });
    this.queueContainer = page.locator('#queueContainer');
    this.queueItems = () => this.queueContainer.locator('.queue-item');
  }

  // Navigate to the app
  async goto() {
    await this.page.goto(APP_URL);
  }

  // Fill inputs and click Enqueue (no dialog handling here)
  async enqueue(element, priority) {
    await this.elementInput.fill(element);
    await this.priorityInput.fill(String(priority));
    await this.enqueueButton.click();
  }

  // Click Dequeue (no dialog handling here)
  async dequeue() {
    await this.dequeueButton.click();
  }

  // Click Clear Queue
  async clearQueue() {
    await this.clearButton.click();
  }

  // Return array of visible queue item texts
  async getQueueItemTexts() {
    const count = await this.queueItems().count();
    const texts = [];
    for (let i = 0; i < count; i++) {
      texts.push((await this.queueItems().nth(i).textContent())?.trim() || '');
    }
    return texts;
  }

  // Return number of queue items
  async getQueueItemCount() {
    return this.queueItems().count();
  }

  // Check placeholders for inputs
  async getElementPlaceholder() {
    return this.elementInput.getAttribute('placeholder');
  }

  async getPriorityPlaceholder() {
    return this.priorityInput.getAttribute('placeholder');
  }
}

test.describe('Priority Queue Demo - End-to-End', () => {
  // Collect page errors and console messages for every test
  let pageErrors;
  let consoleMessages;

  test.beforeEach(async ({ page }) => {
    pageErrors = [];
    consoleMessages = [];

    // Listen for uncaught exceptions (pageerror)
    page.on('pageerror', (err) => {
      // store error message for assertions later
      pageErrors.push(err);
    });

    // Collect console messages
    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
  });

  test.afterEach(async () => {
    // Ensure that there were no uncaught page errors during the test run.
    // If errors exist, fail the test and include serialized error messages.
    if (pageErrors.length > 0) {
      const serialized = pageErrors.map(e => String(e)).join('\n---\n');
      throw new Error(`Uncaught page errors detected:\n${serialized}`);
    }
  });

  test('Initial page load shows inputs, buttons and empty queue', async ({ page }) => {
    // Purpose: verify the initial UI is rendered correctly and the queue is empty
    const pq = new PriorityQueuePage(page);
    await pq.goto();

    // Check page title and main heading are present
    await expect(page).toHaveTitle(/Priority Queue Demo/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Priority Queue Demo');

    // Inputs should have correct placeholders
    await expect(await pq.getElementPlaceholder()).toBe('Element to enqueue');
    await expect(await pq.getPriorityPlaceholder()).toBe('Priority');

    // Buttons should be visible
    await expect(pq.enqueueButton).toBeVisible();
    await expect(pq.dequeueButton).toBeVisible();
    await expect(pq.clearButton).toBeVisible();

    // Queue container should initially be empty
    await expect(pq.queueContainer).toBeVisible();
    const count = await pq.getQueueItemCount();
    expect(count).toBe(0);
  });

  test('Enqueue adds items and maintains ascending priority order (lower number = higher priority)', async ({ page }) => {
    // Purpose: verify items are inserted in the correct order based on numeric priority
    const pq = new PriorityQueuePage(page);
    await pq.goto();

    // Enqueue Task A with priority 5
    await pq.enqueue('Task A', 5);
    // Enqueue Task B with priority 2
    await pq.enqueue('Task B', 2);
    // Enqueue Task C with priority 3
    await pq.enqueue('Task C', 3);

    // Verify queue items count is 3
    expect(await pq.getQueueItemCount()).toBe(3);

    // Verify order: Task B (2), Task C (3), Task A (5)
    const texts = await pq.getQueueItemTexts();
    expect(texts[0]).toContain('Element: Task B, Priority: 2');
    expect(texts[1]).toContain('Element: Task C, Priority: 3');
    expect(texts[2]).toContain('Element: Task A, Priority: 5');
  });

  test('Dequeue removes highest priority item and shows alert with removed element', async ({ page }) => {
    // Purpose: confirm dequeue alerts the removed element and updates DOM accordingly
    const pq = new PriorityQueuePage(page);
    await pq.goto();

    // Enqueue two items
    await pq.enqueue('Alpha', 4);
    await pq.enqueue('Beta', 1); // Beta should be first (priority 1)

    // Ensure both items are present before dequeue
    expect(await pq.getQueueItemCount()).toBe(2);

    // Prepare dialog handler to capture alert text from dequeue
    const dialogPromise = page.waitForEvent('dialog');

    // Click Dequeue
    await pq.dequeue();

    // Wait for the dialog and assert its message
    const dialog = await dialogPromise;
    expect(dialog.message()).toBe('Dequeued element: Beta with priority: 1');
    await dialog.accept();

    // After dequeue, only one item should remain and it should be Alpha
    const texts = await pq.getQueueItemTexts();
    expect(texts.length).toBe(1);
    expect(texts[0]).toContain('Element: Alpha, Priority: 4');
  });

  test('Clear Queue removes all items from the DOM', async ({ page }) => {
    // Purpose: ensure clearQueue empties the internal queue and the DOM
    const pq = new PriorityQueuePage(page);
    await pq.goto();

    // Add three items
    await pq.enqueue('One', 1);
    await pq.enqueue('Two', 2);
    await pq.enqueue('Three', 3);
    expect(await pq.getQueueItemCount()).toBe(3);

    // Click Clear Queue
    await pq.clearQueue();

    // Verify no items remain
    expect(await pq.getQueueItemCount()).toBe(0);
    const texts = await pq.getQueueItemTexts();
    expect(texts).toEqual([]);
  });

  test('Enqueue with missing inputs triggers alert and does not add item', async ({ page }) => {
    // Purpose: test validation path where one or both inputs are missing
    const pq = new PriorityQueuePage(page);
    await pq.goto();

    // Ensure inputs are empty
    await pq.elementInput.fill('');
    await pq.priorityInput.fill('');

    // Wait for the alert dialog that should appear
    const dialogPromise = page.waitForEvent('dialog');
    await pq.enqueue('', '');

    const dialog = await dialogPromise;
    expect(dialog.message()).toBe('Please provide both element and priority.');
    await dialog.accept();

    // Queue should remain empty
    expect(await pq.getQueueItemCount()).toBe(0);
  });

  test('Enqueue with priority 0 is treated as missing (falsy) and triggers alert', async ({ page }) => {
    // Purpose: numeric priority of 0 should be considered falsy by the app and treated as missing
    const pq = new PriorityQueuePage(page);
    await pq.goto();

    // Fill element but set priority to 0
    await pq.elementInput.fill('ZeroPriority');
    await pq.priorityInput.fill('0');

    // Capture alert
    const dialogPromise = page.waitForEvent('dialog');
    await pq.enqueue('ZeroPriority', 0);

    const dialog = await dialogPromise;
    expect(dialog.message()).toBe('Please provide both element and priority.');
    await dialog.accept();

    // No item should be added
    expect(await pq.getQueueItemCount()).toBe(0);
  });

  test('Alerts during enqueue/dequeue are produced as expected and handled in tests', async ({ page }) => {
    // Purpose: exercise both success and failure alerts and ensure tests handle dialogs reliably
    const pq = new PriorityQueuePage(page);
    await pq.goto();

    // Attempt to dequeue empty queue -> should alert 'Queue is empty.'
    const dlg1 = page.waitForEvent('dialog');
    await pq.dequeue();
    const d1 = await dlg1;
    expect(d1.message()).toBe('Queue is empty.');
    await d1.accept();

    // Enqueue a valid item and ensure no alert is thrown during enqueue
    // (enqueue success path does not show an alert)
    await pq.enqueue('Solo', 1);
    expect(await pq.getQueueItemCount()).toBe(1);

    // Now dequeue -> should alert with the dequeued element
    const dlg2 = page.waitForEvent('dialog');
    await pq.dequeue();
    const d2 = await dlg2;
    expect(d2.message()).toBe('Dequeued element: Solo with priority: 1');
    await d2.accept();

    // Queue should be empty again
    expect(await pq.getQueueItemCount()).toBe(0);
  });
});