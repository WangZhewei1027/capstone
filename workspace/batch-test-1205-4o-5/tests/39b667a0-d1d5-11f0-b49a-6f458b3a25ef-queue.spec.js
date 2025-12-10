import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-4o-5/html/39b667a0-d1d5-11f0-b49a-6f458b3a25ef.html';

// Page Object Model for the Queue demo page
class QueuePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input = page.locator('#queueInput');
    this.enqueueBtn = page.locator('#enqueueBtn');
    this.dequeueBtn = page.locator('#dequeueBtn');
    this.queueDisplay = page.locator('#queueDisplay');
    this.heading = page.locator('h1');
  }

  // Navigate to the app URL
  async goto() {
    await this.page.goto(APP_URL);
  }

  // Fill the input with value
  async fillInput(value) {
    await this.input.fill(value);
  }

  // Click enqueue button
  async clickEnqueue() {
    await this.enqueueBtn.click();
  }

  // Click dequeue button
  async clickDequeue() {
    await this.dequeueBtn.click();
  }

  // Convenience method: enqueue a value via UI
  async enqueue(value) {
    await this.fillInput(value);
    await this.clickEnqueue();
  }

  // Get the visible text of the queue display
  async getDisplayText() {
    return (await this.queueDisplay.innerText()).trim();
  }

  // Get the current value of the input
  async getInputValue() {
    return this.input.inputValue();
  }

  // Check whether the enqueue button is visible/enabled
  async isEnqueueVisible() {
    return this.enqueueBtn.isVisible();
  }

  // Check whether the dequeue button is visible/enabled
  async isDequeueVisible() {
    return this.dequeueBtn.isVisible();
  }

  // Get heading text
  async getHeading() {
    return this.heading.innerText();
  }
}

test.describe('Queue Demonstration - end-to-end tests', () => {
  // Arrays to collect console messages and page errors for each test
  let consoleMessages;
  let pageErrors;

  // Setup before each test: navigate to page and attach listeners to capture console/page errors
  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Capture console messages
    page.on('console', (msg) => {
      // store the text and type for later assertions
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Capture page errors (uncaught exceptions)
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });
  });

  // Test the initial page load and default state
  test('Initial load: UI controls visible and queue is empty', async ({ page }) => {
    const q = new QueuePage(page);
    // Navigate to the application page
    await q.goto();

    // Verify heading text exists and is correct
    await expect(q.getHeading()).resolves.toContain('Queue Demonstration');

    // Ensure input and buttons are visible
    await expect(q.input).toBeVisible();
    await expect(q.enqueueBtn).toBeVisible();
    await expect(q.dequeueBtn).toBeVisible();

    // On initial load, the queue display should be empty (no items)
    const displayText = await q.getDisplayText();
    expect(displayText).toBe('', 'Queue display should be empty on initial load');

    // Ensure no console errors were emitted during load
    const errorConsoleMsgs = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleMsgs.length).toBe(0);

    // Ensure no uncaught page errors
    expect(pageErrors.length).toBe(0);
  });

  // Test enqueue functionality: adding items updates the display and clears the input
  test('Enqueueing items updates display and clears input', async ({ page }) => {
    const q1 = new QueuePage(page);
    await q.goto();

    // Enqueue first item
    await q.enqueue('A');

    // After enqueue, input should be cleared
    expect(await q.getInputValue()).toBe('', 'Input should be cleared after successful enqueue');

    // Display should show the single enqueued item
    expect(await q.getDisplayText()).toBe('A');

    // Enqueue second item
    await q.enqueue('B');

    // Display should show items in FIFO order separated by comma and space as defined by display()
    expect(await q.getDisplayText()).toBe('A, B');

    // Enqueue third item
    await q.enqueue('C');
    expect(await q.getDisplayText()).toBe('A, B, C');

    // Ensure no console errors or page errors occurred during enqueue operations
    const errorConsoleMsgs1 = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleMsgs.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Test dequeue functionality: removing items follows FIFO and shows alerts with dequeued value
  test('Dequeue removes items in FIFO order and shows alert with dequeued value', async ({ page }) => {
    const q2 = new QueuePage(page);
    await q.goto();

    // Prepare queue by enqueuing items X, Y, Z
    await q.enqueue('X');
    await q.enqueue('Y');
    await q.enqueue('Z');

    // Dequeue should alert "Dequeued: X" and remove X from display
    const dialog1 = page.waitForEvent('dialog');
    await q.clickDequeue();
    const d1 = await dialog1;
    expect(d1.message()).toBe('Dequeued: X');
    await d1.accept();

    // After dismissing alert, display should be "Y, Z"
    expect(await q.getDisplayText()).toBe('Y, Z');

    // Dequeue again -> "Dequeued: Y"
    const dialog2 = page.waitForEvent('dialog');
    await q.clickDequeue();
    const d2 = await dialog2;
    expect(d2.message()).toBe('Dequeued: Y');
    await d2.accept();
    expect(await q.getDisplayText()).toBe('Z');

    // Dequeue final item -> "Dequeued: Z"
    const dialog3 = page.waitForEvent('dialog');
    await q.clickDequeue();
    const d3 = await dialog3;
    expect(d3.message()).toBe('Dequeued: Z');
    await d3.accept();
    // Now queue should be empty again
    expect(await q.getDisplayText()).toBe('');

    // Ensure no uncaught page errors or console error messages occurred during dequeues
    const errorConsoleMsgs2 = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleMsgs.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Test edge case: Dequeue on empty queue should alert "Queue is empty"
  test('Dequeue on empty queue shows "Queue is empty" alert and leaves display empty', async ({ page }) => {
    const q3 = new QueuePage(page);
    await q.goto();

    // Ensure queue is empty initially
    expect(await q.getDisplayText()).toBe('');

    // Click dequeue and expect an alert with "Queue is empty"
    const dialogEvent = page.waitForEvent('dialog');
    await q.clickDequeue();
    const dialog = await dialogEvent;
    expect(dialog.message()).toBe('Queue is empty');
    await dialog.accept();

    // Display should remain empty
    expect(await q.getDisplayText()).toBe('');

    // No console or page errors expected
    const errorConsoleMsgs3 = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleMsgs.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Test edge case: Enqueue with empty input should trigger an alert prompting the user
  test('Enqueue with empty input triggers "Please enter a value to enqueue." alert', async ({ page }) => {
    const q4 = new QueuePage(page);
    await q.goto();

    // Ensure input is empty
    await q.fillInput('');
    expect(await q.getInputValue()).toBe('');

    // Clicking enqueue with empty input should show alert
    const dialogEvent1 = page.waitForEvent('dialog');
    await q.clickEnqueue();
    const dialog1 = await dialogEvent;
    expect(dialog.message()).toBe('Please enter a value to enqueue.');
    await dialog.accept();

    // Queue display should still be empty
    expect(await q.getDisplayText()).toBe('');

    // No console or page errors expected
    const errorConsoleMsgs4 = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleMsgs.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Monitor console and page errors across a sequence of interactions to ensure stability
  test('Console and runtime error monitoring across interactions', async ({ page }) => {
    const q5 = new QueuePage(page);
    await q.goto();

    // Perform a sequence of valid and invalid operations
    await q.enqueue('1');
    await q.enqueue('2');

    // Dequeue once
    const d11 = page.waitForEvent('dialog');
    await q.clickDequeue();
    const dialog11 = await d1;
    expect(dialog1.message()).toBe('Dequeued: 1');
    await dialog1.accept();

    // Attempt enqueue with empty value to produce alert
    const d21 = page.waitForEvent('dialog');
    await q.clickEnqueue();
    const dialog21 = await d2;
    expect(dialog2.message()).toBe('Please enter a value to enqueue.');
    await dialog2.accept();

    // Finally, dequeue remaining and empty the queue
    const d31 = page.waitForEvent('dialog');
    await q.clickDequeue();
    const dialog31 = await d3;
    expect(dialog3.message()).toBe('Dequeued: 2');
    await dialog3.accept();

    // After all interactions, assert there are no uncaught page errors and no console errors
    const errorConsoleMsgs5 = consoleMessages.filter(m => m.type === 'error');
    // We expect zero console error messages
    expect(errorConsoleMsgs.length).toBe(0, `Expected no console error messages, but found: ${JSON.stringify(errorConsoleMsgs)}`);
    // We also expect no uncaught page errors
    expect(pageErrors.length).toBe(0, `Expected no page errors, but found: ${pageErrors.map(e => e.message).join('; ')}`);
  });
});