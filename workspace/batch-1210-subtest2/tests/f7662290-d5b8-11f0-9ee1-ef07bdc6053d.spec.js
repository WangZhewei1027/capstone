import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-subtest2/html/f7662290-d5b8-11f0-9ee1-ef07bdc6053d.html';

// Page Object for interacting with the Queue demo
class QueuePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async fillInput(value) {
    await this.page.fill('#queueInput', value);
  }

  async clearInput() {
    await this.page.fill('#queueInput', '');
  }

  async clickEnqueue() {
    await this.page.click("button[onclick='enqueue()']");
  }

  async clickDequeue() {
    await this.page.click("button[onclick='dequeue()']");
  }

  async clickViewQueue() {
    await this.page.click("button[onclick='viewQueue()']");
  }

  async getDisplayText() {
    return this.page.locator('#queueDisplay').innerText();
  }
}

test.describe('Queue Demonstration FSM - f7662290-d5b8-11f0-9ee1-ef07bdc6053d', () => {
  let consoleErrors;
  let pageErrors;
  let dialogs;
  let queuePage;

  // Setup before each test: create fresh page object, navigate, and capture console/page errors and dialogs
  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];
    dialogs = [];

    // Capture console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push({ text: msg.text(), location: msg.location() });
      }
    });

    // Capture unhandled page errors
    page.on('pageerror', error => {
      pageErrors.push(error);
    });

    // Capture and auto-accept dialogs; record messages
    page.on('dialog', async dialog => {
      try {
        dialogs.push(dialog.message());
        await dialog.accept();
      } catch (e) {
        // If accepting fails, record that as a page error
        pageErrors.push(e);
      }
    });

    queuePage = new QueuePage(page);
    await queuePage.goto();
  });

  // Teardown after each test: assert no console or page errors occurred during the test.
  test.afterEach(async () => {
    // These assertions ensure we observed any runtime console/page errors.
    expect(consoleErrors, `Expected no console.error messages during test, got: ${JSON.stringify(consoleErrors)}`).toHaveLength(0);
    expect(pageErrors, `Expected no uncaught page errors during test, got: ${JSON.stringify(pageErrors)}`).toHaveLength(0);
  });

  test('Initial state: Queue is Empty (S0_Empty) - display and updateDisplay() entry action', async () => {
    // Validate initial visual state matches FSM S0_Empty evidence.
    const display = await queuePage.getDisplayText();
    // The HTML implementation sets "Queue is empty" when the queue is empty.
    expect(display).toBe('Queue is empty');

    // No dialogs should have been shown on initial load.
    expect(dialogs).toHaveLength(0);
  });

  test('Enqueue from empty -> non-empty (S0_Empty -> S1_NonEmpty) via EnqueueItem', async () => {
    // Enqueue an item and verify transition to non-empty state and UI update.
    await queuePage.fillInput('Item1');
    await queuePage.clickEnqueue();

    const display = await queuePage.getDisplayText();
    // Evidence: queueDisplay.innerHTML = this.items.join(', ')
    expect(display).toBe('Item1');

    // No alert dialogs expected for successful enqueue.
    expect(dialogs).toHaveLength(0);
  });

  test('Multiple enqueues (S1_NonEmpty -> S1_NonEmpty) accumulate items correctly', async () => {
    // Enqueue three items sequentially
    await queuePage.fillInput('A');
    await queuePage.clickEnqueue();

    await queuePage.fillInput('B');
    await queuePage.clickEnqueue();

    await queuePage.fillInput('C');
    await queuePage.clickEnqueue();

    const display = await queuePage.getDisplayText();
    expect(display).toBe('A, B, C');

    // No unexpected dialogs
    expect(dialogs).toHaveLength(0);
  });

  test('Dequeue transitions: S1_NonEmpty -> S1_NonEmpty and S1_NonEmpty -> S0_Empty', async () => {
    // Enqueue two items then dequeue them step by step to validate transitions
    await queuePage.fillInput('First');
    await queuePage.clickEnqueue();

    await queuePage.fillInput('Second');
    await queuePage.clickEnqueue();

    // Validate initial state after enqueues
    let display = await queuePage.getDisplayText();
    expect(display).toBe('First, Second');

    // Dequeue once - should remove 'First' leaving 'Second'
    await queuePage.clickDequeue();
    display = await queuePage.getDisplayText();
    expect(display).toBe('Second');

    // Dequeue again - should remove 'Second' and display "Queue is empty"
    await queuePage.clickDequeue();
    display = await queuePage.getDisplayText();
    expect(display).toBe('Queue is empty');

    // At this point no alerts should have happened because dequeues on non-empty queue don't alert.
    // dialogs may contain other dialog messages if something else occurred; expect none.
    expect(dialogs).toHaveLength(0);
  });

  test('Dequeue when empty triggers alert "Queue is empty!" (edge case/error scenario)', async () => {
    // Ensure queue is empty
    let display = await queuePage.getDisplayText();
    expect(display).toBe('Queue is empty');

    // Click Dequeue on empty queue - should trigger an alert. We set up dialog listener in beforeEach to auto-accept.
    await queuePage.clickDequeue();

    // The dialog should have been recorded with the expected message.
    expect(dialogs.length).toBeGreaterThanOrEqual(1);
    // The most recent dialog should be the "Queue is empty!" alert from dequeue()
    const lastDialog = dialogs[dialogs.length - 1];
    expect(lastDialog).toBe('Queue is empty!');
  });

  test('Enqueue with empty input shows validation alert "Please enter a valid item."', async () => {
    // Ensure input is empty
    await queuePage.clearInput();
    await queuePage.clickEnqueue();

    expect(dialogs.length).toBeGreaterThanOrEqual(1);
    const lastDialog = dialogs[dialogs.length - 1];
    expect(lastDialog).toBe('Please enter a valid item.');
  });

  test('View Queue shows current items and handles empty queue edge case', async () => {
    // 1) For non-empty queue: enqueue items and click View Queue -> should alert with current items
    await queuePage.fillInput('X');
    await queuePage.clickEnqueue();
    await queuePage.fillInput('Y');
    await queuePage.clickEnqueue();

    // Click viewQueue - dialog recorded
    await queuePage.clickViewQueue();

    // Last dialog should show current queue contents
    expect(dialogs.length).toBeGreaterThanOrEqual(1);
    const lastDialogNonEmpty = dialogs[dialogs.length - 1];
    // Based on implementation, alert should be: "Current Queue: X, Y"
    expect(lastDialogNonEmpty).toBe('Current Queue: X, Y');

    // Clear recorded dialogs for the next part
    dialogs.length = 0;

    // 2) For empty queue: reload page to reset queue
    await queuePage.goto();
    // Click View Queue on empty queue
    await queuePage.clickViewQueue();

    // As implemented, viewQueue constructs alert("Current Queue: " + queue.view().join(', ') || "Queue is empty");
    // For an empty queue, queue.view().join(', ') === "" so the result becomes "Current Queue: " (the left side is non-empty string,
    // so || won't fall back). We assert that the message starts with "Current Queue:" to reflect actual behavior.
    expect(dialogs.length).toBeGreaterThanOrEqual(1);
    const lastDialogEmpty = dialogs[dialogs.length - 1];
    expect(typeof lastDialogEmpty).toBe('string');
    expect(lastDialogEmpty.startsWith('Current Queue:')).toBe(true);
  });

  test('Comprehensive scenario: enqueue, view, dequeue to empty, attempt extra dequeue (combination transitions)', async () => {
    // Enqueue items
    await queuePage.fillInput('One');
    await queuePage.clickEnqueue();
    await queuePage.fillInput('Two');
    await queuePage.clickEnqueue();

    // View current queue - should show "One, Two"
    await queuePage.clickViewQueue();
    expect(dialogs.pop()).toBe('Current Queue: One, Two');

    // Dequeue twice to get to empty
    await queuePage.clickDequeue();
    await queuePage.clickDequeue();
    let display = await queuePage.getDisplayText();
    expect(display).toBe('Queue is empty');

    // Extra dequeue should alert "Queue is empty!"
    await queuePage.clickDequeue();
    expect(dialogs.length).toBeGreaterThanOrEqual(1);
    const last = dialogs[dialogs.length - 1];
    expect(last).toBe('Queue is empty!');
  });
});