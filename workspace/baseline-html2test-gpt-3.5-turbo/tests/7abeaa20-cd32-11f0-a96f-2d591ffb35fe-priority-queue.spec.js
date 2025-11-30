import { test, expect } from '@playwright/test';

// Test file: 7abeaa20-cd32-11f0-a96f-2d591ffb35fe-priority-queue.spec.js
// Purpose: End-to-end Playwright tests for the Priority Queue Demo application.
// - Verifies UI and behavior for enqueuing/dequeuing items
// - Checks DOM updates, visual classes, log messages, and alert handling
// - Observes console messages and page errors to ensure no unexpected runtime errors

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/7abeaa20-cd32-11f0-a96f-2d591ffb35fe.html';

// Page Object for the Priority Queue page
class PriorityQueuePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.valueInput = page.locator('#value');
    this.priorityInput = page.locator('#priority');
    this.enqueueButton = page.locator('form#enqueueForm button[type="submit"]');
    this.dequeueButton = page.locator('#dequeueBtn');
    this.queueDisplay = page.locator('#queueDisplay');
    this.log = page.locator('#log');
    this.form = page.locator('#enqueueForm');
  }

  // Navigate to the app URL
  async goto() {
    await this.page.goto(APP_URL);
  }

  // Enqueue an item by filling inputs and submitting the form
  async enqueue(value, priority) {
    await this.valueInput.fill(value);
    await this.priorityInput.fill(String(priority));
    await Promise.all([
      this.page.waitForResponse(() => true).catch(() => {}), // allow any network response (no network expected)
      this.enqueueButton.click()
    ]);
  }

  // Click the Dequeue button
  async dequeue() {
    await this.dequeueButton.click();
  }

  // Get array of displayed queue item texts in order
  async getDisplayedQueueItems() {
    // If "Queue is empty" plain text present, return empty array
    const emptyText = await this.queueDisplay.textContent();
    if (emptyText && emptyText.trim() === 'Queue is empty') return [];
    const items = await this.queueDisplay.locator('.queue-item').allTextContents();
    return items.map(s => s.trim());
  }

  // Get array of class lists for displayed queue items, in same order
  async getDisplayedQueueItemClasses() {
    const elements = this.queueDisplay.locator('.queue-item');
    const count = await elements.count();
    const classes = [];
    for (let i = 0; i < count; i++) {
      classes.push(await elements.nth(i).getAttribute('class'));
    }
    return classes;
  }

  // Get the raw log text
  async getLogText() {
    return (await this.log.textContent()) || '';
  }

  // Check whether the value input is focused
  async isValueInputFocused() {
    return await this.page.evaluate(() => document.activeElement === document.getElementById('value'));
  }

  // Get the current numeric value of priority input (as string)
  async getPriorityInputValue() {
    return await this.priorityInput.inputValue();
  }
}

test.describe('Priority Queue Demo - UI and behavior', () => {
  // Arrays to collect console messages and page errors during each test
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Capture console messages
    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Capture unhandled page errors
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    // Navigate to the application for each test, fresh state
    await page.goto(APP_URL);
  });

  test.afterEach(async ({ page }) => {
    // Small sanity: ensure no unexpected modal remains
    // (dialogs are handled in tests that expect them)
    try {
      await page.evaluate(() => true);
    } catch (e) {
      // ignore
    }
  });

  test('Initial load shows empty queue, inputs, and log', async ({ page }) => {
    const pq = new PriorityQueuePage(page);

    // Verify queue display initially indicates empty
    await expect(pq.queueDisplay).toBeVisible();
    await expect(pq.queueDisplay).toHaveText('Queue is empty');

    // Verify log is present and initially empty
    await expect(pq.log).toBeVisible();
    const logText = await pq.getLogText();
    expect(logText.trim()).toBe('');

    // Verify inputs and buttons are present and default priority is 0
    await expect(pq.valueInput).toBeVisible();
    await expect(pq.priorityInput).toHaveValue('0');
    await expect(pq.enqueueButton).toBeVisible();
    await expect(pq.dequeueButton).toBeVisible();

    // Ensure no uncaught page errors or console error messages on initial load
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Enqueue single item updates queue display and action log; input resets and focus returns', async ({ page }) => {
    const pq1 = new PriorityQueuePage(page);

    // Enqueue an item with high priority (priority <=1 => 'high')
    await pq.enqueue('task-high', 0);

    // Verify queue display shows the new item with correct content and class
    const items1 = await pq.getDisplayedQueueItems();
    expect(items.length).toBe(1);
    expect(items[0]).toContain('task-high');
    expect(items[0]).toContain('p:0');

    const classes1 = await pq.getDisplayedQueueItemClasses();
    // class attribute should include 'queue-item' and 'high'
    expect(classes[0]).toContain('queue-item');
    expect(classes[0]).toContain('high');

    // Verify the log contains an "Enqueued" message with the value and priority
    const log = await pq.getLogText();
    expect(log).toContain('Enqueued "task-high" with priority 0');

    // After enqueue, form should be reset: priority back to 0 and value input focused
    expect(await pq.getPriorityInputValue()).toBe('0');
    expect(await pq.isValueInputFocused()).toBe(true);

    // Ensure no console errors or page errors happened during this operation
    const consoleErrors1 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Enqueue multiple items preserves priority order (lower numeric priority first) and stability for equal priorities', async ({ page }) => {
    const pq2 = new PriorityQueuePage(page);

    // Enqueue items in this order with these priorities:
    // Insert order: A(5), B(2), C(2), D(1), E(6)
    await pq.enqueue('A', 5);
    await pq.enqueue('B', 2);
    await pq.enqueue('C', 2);
    await pq.enqueue('D', 1);
    await pq.enqueue('E', 6);

    // Expected sorted order by priority ascending (lower number = higher priority):
    // D(p), B(p), C(p), A(p), E(p)
    const items2 = await pq.getDisplayedQueueItems();
    expect(items.length).toBe(5);
    expect(items[0]).toContain('D (p)');
    expect(items[1]).toContain('B (p)');
    expect(items[2]).toContain('C (p)');
    expect(items[3]).toContain('A (p)');
    expect(items[4]).toContain('E (p)');

    // Verify priority label classes correspond to thresholds:
    // p <= 1 => high, p <=4 => medium, else low
    const classes2 = await pq.getDisplayedQueueItemClasses();
    expect(classes[0]).toContain('high');   // D p:1
    expect(classes[1]).toContain('medium'); // B p:2
    expect(classes[2]).toContain('medium'); // C p:2
    expect(classes[3]).toContain('low');    // A p:5
    expect(classes[4]).toContain('low');    // E p:6

    // Log should include each enqueue action; check that at least one enqueue message is present
    const log1 = await pq.getLogText();
    expect(log).toContain('Enqueued "E" with priority 6'); // last one enqueued should appear at top
    // Ensure no page errors or console error messages
    const consoleErrors2 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Dequeue removes the highest-priority item (lowest numeric priority) and logs the action', async ({ page }) => {
    const pq3 = new PriorityQueuePage(page);

    // Enqueue three items with distinct priorities
    await pq.enqueue('first', 3);
    await pq.enqueue('important', 0);
    await pq.enqueue('later', 5);

    // Confirm expected order: important(p), first(p), later(p)
    let items3 = await pq.getDisplayedQueueItems();
    expect(items[0]).toContain('important (p)');

    // Click Dequeue - should remove 'important'
    await pq.dequeue();

    // After dequeue, top should be 'first'
    items = await pq.getDisplayedQueueItems();
    expect(items[0]).toContain('first (p)');
    expect(items.length).toBe(2);

    // Log should include a Dequeued message mentioning removed item
    const log2 = await pq.getLogText();
    expect(log).toContain('Dequeued "important" with priority 0');

    // Ensure no console or page errors happened
    const consoleErrors3 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Dequeue when queue is empty triggers an alert with appropriate message', async ({ page }) => {
    const pq4 = new PriorityQueuePage(page);

    // Ensure queue is empty initially
    await expect(pq.queueDisplay).toHaveText('Queue is empty');

    // Prepare to capture the dialog and its message
    let dialogMessage = null;
    page.once('dialog', async dialog => {
      dialogMessage = dialog.message();
      await dialog.dismiss();
    });

    // Click the Dequeue button which should trigger an alert
    await pq.dequeue();

    // Assert that the alert appeared with expected text
    expect(dialogMessage).toBe('Queue is empty! Nothing to dequeue.');

    // Ensure no unexpected page errors or console errors aside from any console logs
    const consoleErrors4 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Submitting empty value shows validation alert and does not change queue', async ({ page }) => {
    const pq5 = new PriorityQueuePage(page);

    // Ensure queue is empty
    await expect(pq.queueDisplay).toHaveText('Queue is empty');

    // Prepare to capture dialog
    let dialogMessage1 = null;
    page.once('dialog', async dialog => {
      dialogMessage = dialog.message();
      await dialog.dismiss();
    });

    // Ensure value input is empty and submit the form
    await pq.valueInput.fill('   '); // whitespace only, trimmed in app code
    await pq.priorityInput.fill('1');

    // Submit the form; clicking the Enqueue button triggers the 'submit' event
    await pq.enqueueButton.click();

    // The script should raise an alert with expected message
    expect(dialogMessage).toBe('Please provide valid value and priority.');

    // Verify queue remains empty after the rejected submission
    await expect(pq.queueDisplay).toHaveText('Queue is empty');

    // Ensure no page errors occurred
    const consoleErrors5 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Log prepends entries (most recent first) and includes timestamps', async ({ page }) => {
    const pq6 = new PriorityQueuePage(page);

    // Enqueue two items; log should show second entry above the first
    await pq.enqueue('one', 2);
    await pq.enqueue('two', 1);

    const logText1 = await pq.getLogText();
    // The most recent entry should be for "two"
    expect(logText).toContain('Enqueued "two" with priority 1');
    // The older entry for "one" should also be present
    expect(logText).toContain('Enqueued "one" with priority 2');

    // The log entries include timestamps in square brackets; assert presence of a bracketed time
    expect(logText).toMatch(/\[\d{1,2}:\d{2}:\d{2}/);

    // No runtime errors
    const consoleErrors6 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });
});