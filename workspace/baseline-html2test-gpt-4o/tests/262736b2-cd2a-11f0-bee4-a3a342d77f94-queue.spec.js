import { test, expect } from '@playwright/test';

// Test file for: 262736b2-cd2a-11f0-bee4-a3a342d77f94.html
// Purpose: End-to-end tests for the Queue interactive demo.
// - Verifies UI elements, state updates, alerts, and edge cases.
// - Observes console messages and page errors for unexpected runtime errors.

const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/262736b2-cd2a-11f0-bee4-a3a342d77f94.html';

// Page Object Model for the Queue page
class QueuePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input = page.locator('#itemInput');
    this.enqueueButton = page.locator('button', { hasText: 'Enqueue' });
    this.dequeueButton = page.locator('button', { hasText: 'Dequeue' });
    this.queueDisplay = page.locator('#queueDisplay');
    this.heading = page.locator('h1');
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  // Enqueue an item. If a dialog is expected, caller should set up a dialog handler.
  async enqueue(text) {
    await this.input.fill(text);
    await this.enqueueButton.click();
  }

  // Dequeue an item. If a dialog is expected, caller should set up a dialog handler.
  async dequeue() {
    await this.dequeueButton.click();
  }

  // Returns array of text contents for items displayed in queue
  async getItems() {
    const count = await this.queueDisplay.locator('.item').count();
    const items = [];
    for (let i = 0; i < count; i++) {
      items.push(await this.queueDisplay.locator('.item').nth(i).innerText());
    }
    return items;
  }

  async getInputValue() {
    return await this.input.inputValue();
  }

  async getHeadingText() {
    return await this.heading.innerText();
  }

  async isEnqueueEnabled() {
    return await this.enqueueButton.isEnabled();
  }

  async isDequeueEnabled() {
    return await this.dequeueButton.isEnabled();
  }
}

test.describe('Queue Demonstration - End-to-End', () => {
  // Arrays to capture console messages and page errors for each test
  let consoleMessages = [];
  let pageErrors = [];
  let consoleListener;
  let pageErrorListener;

  // Attach listeners before each test and navigate to the page
  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    consoleListener = (msg) => {
      consoleMessages.push(msg);
    };
    pageErrorListener = (err) => {
      pageErrors.push(err);
    };

    page.on('console', consoleListener);
    page.on('pageerror', pageErrorListener);

    // Go to application URL
    const queuePage = new QueuePage(page);
    await queuePage.goto();
  });

  // Remove listeners after each test and assert there were no unexpected errors
  test.afterEach(async ({ page }) => {
    page.off('console', consoleListener);
    page.off('pageerror', pageErrorListener);

    // Assert there are no uncaught page errors (ReferenceError, SyntaxError, TypeError, etc.)
    expect(pageErrors.length, `Expected no page errors, but got: ${pageErrors.map(e => String(e)).join(' | ')}`).toBe(0);

    // Fail if any console message of type 'error' was emitted
    const errorConsoleMsgs = consoleMessages.filter(m => m.type() === 'error');
    expect(errorConsoleMsgs.length, `Expected no console.error messages, but got: ${errorConsoleMsgs.map(m => m.text()).join(' | ')}`).toBe(0);
  });

  // Test initial page load and default state
  test('Initial load shows heading and empty queue', async ({ page }) => {
    // Purpose: Verify that the page loads and the queue is initially empty.
    const q = new QueuePage(page);

    // Heading text is present and correct
    await expect(q.heading).toHaveText('Queue Demonstration');

    // Input exists and placeholder is correct
    await expect(q.input).toHaveAttribute('placeholder', 'Enter item to enqueue');

    // Buttons are visible and enabled
    expect(await q.isEnqueueEnabled()).toBe(true);
    expect(await q.isDequeueEnabled()).toBe(true);

    // Queue display contains no items initially
    const items = await q.getItems();
    expect(items.length).toBe(0);
  });

  // Test enqueuing a single item updates the DOM and clears the input
  test('Enqueue single item updates display and clears input', async ({ page }) => {
    // Purpose: Ensure that entering a value and clicking Enqueue appends an item and clears input.
    const q = new QueuePage(page);

    // Enqueue 'A' and verify results
    await q.enqueue('A');

    const items = await q.getItems();
    expect(items).toEqual(['A']);

    // Input should be cleared after enqueue
    expect(await q.getInputValue()).toBe('');
  });

  // Test enqueuing multiple items preserves FIFO order
  test('Enqueue multiple items preserves FIFO order', async ({ page }) => {
    // Purpose: Verify multiple enqueues append items in order.
    const q = new QueuePage(page);

    await q.enqueue('First');
    await q.enqueue('Second');
    await q.enqueue('Third');

    const items = await q.getItems();
    expect(items).toEqual(['First', 'Second', 'Third']);
  });

  // Test dequeue behavior with non-empty queue shows alert and removes first item
  test('Dequeue removes first item and shows alert with dequeued value', async ({ page }) => {
    // Purpose: When dequeuing from a non-empty queue, the first item is removed and an alert shows the dequeued item.
    const q = new QueuePage(page);

    // Enqueue some items
    await q.enqueue('One');
    await q.enqueue('Two');
    await q.enqueue('Three');

    // Prepare to capture the alert dialog that should appear on dequeue
    const [dialog] = await Promise.all([
      page.waitForEvent('dialog'),
      q.dequeue(), // trigger dequeue which will show alert for dequeued item
    ]);

    // Dialog text should mention the dequeued item 'One'
    expect(dialog.message()).toBe('Dequeued item: One');
    await dialog.accept();

    // After dismissing dialog, queue should no longer have 'One' and should keep the remaining items
    const items = await q.getItems();
    expect(items).toEqual(['Two', 'Three']);
  });

  // Test dequeue on empty queue shows the appropriate alert
  test('Dequeue on empty queue shows "Queue is empty" alert', async ({ page }) => {
    // Purpose: Verify the app alerts the user when attempting to dequeue from an empty queue.
    const q = new QueuePage(page);

    // Ensure queue is empty at start of test
    const startItems = await q.getItems();
    expect(startItems.length).toBe(0);

    // Capture the alert dialog triggered by dequeue
    const [dialog] = await Promise.all([
      page.waitForEvent('dialog'),
      q.dequeue(),
    ]);

    expect(dialog.message()).toBe('Queue is empty, cannot dequeue.');
    await dialog.accept();

    // Still empty after attempting to dequeue
    const itemsAfter = await q.getItems();
    expect(itemsAfter.length).toBe(0);
  });

  // Test enqueue with empty/whitespace input triggers an alert
  test('Enqueue with empty or whitespace-only input triggers validation alert', async ({ page }) => {
    // Purpose: Ensure that submitting an empty or whitespace-only input does not enqueue and shows an alert.
    const q = new QueuePage(page);

    // Make sure input is empty and try to enqueue -> should alert
    await q.input.fill('');
    const [dialog1] = await Promise.all([
      page.waitForEvent('dialog'),
      q.enqueue(''), // clicking enqueue with empty input triggers alert
    ]);
    expect(dialog1.message()).toBe('Please enter an item to enqueue.');
    await dialog1.accept();

    // Try whitespace-only input; should still alert and not add item
    await q.input.fill('   ');
    const [dialog2] = await Promise.all([
      page.waitForEvent('dialog'),
      q.enqueue('   '),
    ]);
    expect(dialog2.message()).toBe('Please enter an item to enqueue.');
    await dialog2.accept();

    // The queue should remain empty
    const items = await q.getItems();
    expect(items.length).toBe(0);
  });

  // Test trimming behavior: input with surrounding spaces should enqueue trimmed value
  test('Enqueue trims input whitespace before adding to queue', async ({ page }) => {
    // Purpose: Confirm that values are trimmed before enqueueing (e.g., '  val  ' -> 'val').
    const q = new QueuePage(page);

    await q.enqueue('  trimmedValue  ');

    const items = await q.getItems();
    // The implementation uses value.trim() before enqueue, so stored value should be 'trimmedValue'
    expect(items).toEqual(['trimmedValue']);
  });

  // Accessibility and UI state checks
  test('Interactive controls are accessible and focusable', async ({ page }) => {
    // Purpose: Ensure the input and buttons are focusable and have visible names.
    const q = new QueuePage(page);

    // Input can receive focus
    await q.input.focus();
    expect(await q.page.evaluate(() => document.activeElement.id)).toBe('itemInput');

    // Buttons have visible text
    await expect(q.enqueueButton).toHaveText('Enqueue');
    await expect(q.dequeueButton).toHaveText('Dequeue');

    // Tab order: after focusing input, pressing Tab should focus the Enqueue button (common expectation)
    await q.input.focus();
    await page.keyboard.press('Tab');
    // One of the buttons should be focused (Enqueue or Dequeue). Check that activeElement is a button.
    const activeTag = await page.evaluate(() => document.activeElement.tagName);
    expect(activeTag).toBe('BUTTON');
  });
});