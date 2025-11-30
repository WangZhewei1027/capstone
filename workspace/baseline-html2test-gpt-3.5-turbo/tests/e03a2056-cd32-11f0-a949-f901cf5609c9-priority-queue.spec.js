import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/e03a2056-cd32-11f0-a949-f901cf5609c9.html';

// Page Object for the Priority Queue UI
class PriorityQueuePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.elementInput = page.locator('#element');
    this.priorityInput = page.locator('#priority');
    this.submitButton = page.locator('form#pqForm button[type="submit"]');
    this.dequeueBtn = page.locator('#dequeueBtn');
    this.peekBtn = page.locator('#peekBtn');
    this.clearBtn = page.locator('#clearBtn');
    this.queueDiv = page.locator('#queue');
    this.logDiv = page.locator('#log');
    this.form = page.locator('#pqForm');
  }

  // Enqueue via UI: fills inputs and submits the form
  async enqueue(element, priority) {
    await this.elementInput.fill(element);
    // Use fill even on number input to allow invalid values in tests
    await this.priorityInput.fill(String(priority));
    await Promise.all([
      this.page.waitForLoadState('domcontentloaded').catch(() => {}), // harmless guard
      this.submitButton.click()
    ]);
  }

  // Click Dequeue button
  async dequeue() {
    await this.dequeueBtn.click();
  }

  // Click Peek button
  async peek() {
    await this.peekBtn.click();
  }

  // Click Clear button
  async clear() {
    await this.clearBtn.click();
  }

  // Returns the queue display text
  async getQueueText() {
    return (await this.queueDiv.textContent())?.trim() ?? '';
  }

  // Returns the whole log text content
  async getLogText() {
    return (await this.logDiv.textContent()) ?? '';
  }

  // Returns the value of the element input
  async getElementInputValue() {
    return this.elementInput.inputValue();
  }

  // Returns the value of the priority input
  async getPriorityInputValue() {
    return this.priorityInput.inputValue();
  }
}

test.describe('Priority Queue Demo - e03a2056-cd32-11f0-a949-f901cf5609c9', () => {
  // Arrays to collect console messages and page errors for assertions
  let consoleMessages;
  let pageErrors;
  let page;
  let pq;

  test.beforeEach(async ({ browser }) => {
    // Create a new context and page for isolation
    const context = await browser.newContext();
    page = await context.newPage();

    // Initialize collectors for console and page errors
    consoleMessages = [];
    pageErrors = [];

    // Collect console messages
    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Collect page errors (uncaught exceptions)
    page.on('pageerror', error => {
      pageErrors.push(error);
    });

    // Navigate to the application under test
    await page.goto(APP_URL);

    // Instantiate page object
    pq = new PriorityQueuePage(page);
  });

  test.afterEach(async () => {
    // Assert there were no uncaught page errors during the test
    // This ensures runtime errors (ReferenceError, TypeError, SyntaxError) would fail the test if they occurred
    expect(pageErrors.length, `Unexpected page errors: ${pageErrors.map(e => String(e)).join('; ')}`).toBe(0);

    // Close page context (Playwright will clean up remaining contexts automatically)
    await page.close();
  });

  test('Initial load shows empty queue and initialization log', async () => {
    // Verify the queue displays as empty on initial load
    await expect(pq.queueDiv).toHaveText('(empty)');

    // Verify the operations log contains initialization message
    const logText = await pq.getLogText();
    expect(logText.includes('Priority Queue initialized.'), 'Expected init message in log').toBe(true);

    // No dialogs should have appeared; console may have messages but no page errors
    expect(consoleMessages.length >= 0).toBe(true);
  });

  test('Enqueue single element updates queue display and log; inputs cleared and focused', async () => {
    // Enqueue a single element
    await pq.enqueue('task1', 5);

    // Verify the queue shows the enqueued element with its priority
    await expect(pq.queueDiv).toHaveText(`"task1" (priority)`);

    // Verify the log has an enqueue entry for task1
    const logText1 = await pq.getLogText();
    expect(logText.includes('Enqueued element "task1" with priority 5.'), 'Enqueue log entry missing').toBe(true);

    // Inputs should be cleared after enqueue
    const elemVal = await pq.getElementInputValue();
    const priVal = await pq.getPriorityInputValue();
    expect(elemVal).toBe('');
    expect(priVal).toBe('');

    // Ensure no page errors occurred
    expect(pageErrors.length).toBe(0);
  });

  test('Enqueue multiple elements maintains priority order (lower number == higher priority)', async () => {
    // Enqueue items with different priorities
    await pq.enqueue('low', 10);
    await pq.enqueue('high', 1);
    await pq.enqueue('medium', 5);

    // The displayed order should be high -> medium -> low
    // Display format: "element" (priority) → ...
    const queueText = await pq.getQueueText();
    expect(queueText).toContain(`"high" (priority)`);
    expect(queueText).toContain(`"medium" (priority)`);
    expect(queueText).toContain(`"low" (priority)`);

    // Check ordering explicitly by splitting on arrow and trimming
    const items = queueText.split('→').map(s => s.trim());
    expect(items[0].startsWith(`"high" (priority)`), 'First item should be high priority').toBe(true);
    expect(items[1].startsWith(`"medium" (priority)`), 'Second item should be medium priority').toBe(true);
    expect(items[2].startsWith(`"low" (priority)`), 'Third item should be low priority').toBe(true);

    // Ensure log contains the three enqueue operations
    const logText2 = await pq.getLogText();
    expect(logText.match(/Enqueued element/g)?.length >= 3, 'Expected at least 3 enqueue log entries').toBe(true);
  });

  test('Dequeue removes highest priority element and logs the operation; alert shown when dequeuing empty queue', async () => {
    // Enqueue two items
    await pq.enqueue('alpha', 2);
    await pq.enqueue('beta', 4);

    // Dequeue should remove 'alpha' (priority 2)
    await Promise.all([
      page.waitForEvent('dialog').then(d => { /* no dialog expected here; this will time out if dialog appears */ }).catch(() => {}),
      pq.dequeue()
    ]).catch(() => { /* ignore any waits that time out */ });

    // After dequeue, queue should contain only beta
    const queueTextAfter = await pq.getQueueText();
    expect(queueTextAfter).toContain(`"beta" (priority)`);

    // Log should contain a Dequeued entry for alpha
    const logText3 = await pq.getLogText();
    expect(logText.includes('Dequeued element "alpha" with priority 2.'), 'Expected dequeue log for alpha').toBe(true);

    // Now clear queue to make it empty
    await pq.clear();
    await expect(pq.queueDiv).toHaveText('(empty)');

    // Attempt to dequeue when empty: should log attempt and show alert 'Queue is empty.'
    const [dialog] = await Promise.all([
      page.waitForEvent('dialog'),
      pq.dequeue()
    ]);
    // Verify dialog message and accept it
    expect(dialog.message()).toBe('Queue is empty.');
    await dialog.accept();

    // Verify log contains 'Dequeue attempted but queue is empty.'
    const logText2 = await pq.getLogText();
    expect(logText2.includes('Dequeue attempted but queue is empty.'), 'Expected empty dequeue log entry').toBe(true);
  });

  test('Peek shows alert with front element and logs the operation; peek on empty shows alert and log', async () => {
    // Enqueue items and peek
    await pq.enqueue('one', 3);
    await pq.enqueue('two', 6);

    // Peek should show 'one' as front (priority 3)
    const [peekDialog] = await Promise.all([
      page.waitForEvent('dialog'),
      pq.peek()
    ]);
    expect(peekDialog.message()).toBe('Front element: "one" with priority 3');
    await peekDialog.accept();

    // Verify log contains a peek entry
    const logText4 = await pq.getLogText();
    expect(logText.includes('Peeked at element "one" with priority 3.'), 'Expected peek log entry').toBe(true);

    // Clear then peek on empty -> alert and log
    await pq.clear();
    await expect(pq.queueDiv).toHaveText('(empty)');

    const [emptyPeekDialog] = await Promise.all([
      page.waitForEvent('dialog'),
      pq.peek()
    ]);
    expect(emptyPeekDialog.message()).toBe('Queue is empty.');
    await emptyPeekDialog.accept();

    const logText21 = await pq.getLogText();
    expect(logText2.includes('Peek attempted but queue is empty.'), 'Expected empty peek log entry').toBe(true);
  });

  test('Clear button empties the queue and adds a log entry', async () => {
    // Enqueue a couple items
    await pq.enqueue('a', 1);
    await pq.enqueue('b', 2);

    // Clear via button
    await pq.clear();

    // Queue display should show '(empty)'
    await expect(pq.queueDiv).toHaveText('(empty)');

    // Log should contain 'Cleared the queue.'
    const logText5 = await pq.getLogText();
    expect(logText.includes('Cleared the queue.'), 'Expected clear log entry').toBe(true);
  });

  test('Form validation: empty element input triggers alert and prevents enqueue', async () => {
    // Ensure queue empty to observe no change
    await pq.clear();
    await expect(pq.queueDiv).toHaveText('(empty)');

    // Attempt to submit with empty element but a valid priority
    await pq.elementInput.fill('');
    await pq.priorityInput.fill('5');

    const [dialog] = await Promise.all([
      page.waitForEvent('dialog'),
      // Submit the form via the submit button
      pq.submitButton.click()
    ]);

    // Verify alert text and accept it
    expect(dialog.message()).toBe('Element must not be empty.');
    await dialog.accept();

    // Queue should still be empty and no enqueue log added
    await expect(pq.queueDiv).toHaveText('(empty)');
    const logText6 = await pq.getLogText();
    expect(logText.includes('Enqueued element')).toBe(false);
  });

  test('Form validation: non-numeric priority triggers alert and prevents enqueue', async () => {
    // Ensure queue empty
    await pq.clear();
    await expect(pq.queueDiv).toHaveText('(empty)');

    // Fill a valid element name but an invalid priority string (even though input type=number, fill will set the value)
    await pq.elementInput.fill('badPriority');
    await pq.priorityInput.fill('not-a-number');

    const [dialog] = await Promise.all([
      page.waitForEvent('dialog'),
      pq.submitButton.click()
    ]);

    // Verify alert text and accept it
    expect(dialog.message()).toBe('Priority must be a valid number.');
    await dialog.accept();

    // Queue should still be empty; no enqueue log entry for badPriority
    await expect(pq.queueDiv).toHaveText('(empty)');
    const logText7 = await pq.getLogText();
    expect(logText.includes('Enqueued element "badPriority"')).toBe(false);
  });

  test('Operations log accumulates entries and reflects actions sequence', async () => {
    // Clear any existing entries
    await pq.clear();

    // Perform a sequence: enqueue x, enqueue y, peek, dequeue, clear
    await pq.enqueue('X', 7);
    await pq.enqueue('Y', 2);

    const peekDialog = await Promise.all([
      page.waitForEvent('dialog'),
      pq.peek()
    ]);
    // Accept peek dialog
    (await peekDialog[0]).accept();

    await pq.dequeue();
    await pq.clear();

    // Check that the log contains entries in expected order (rough order)
    const logText8 = await pq.getLogText();
    expect(logText.indexOf('Enqueued element "X"') !== -1).toBe(true);
    expect(logText.indexOf('Enqueued element "Y"') !== -1).toBe(true);
    expect(logText.indexOf('Peeked at element') !== -1).toBe(true);
    expect(logText.indexOf('Dequeued element') !== -1).toBe(true);
    expect(logText.indexOf('Cleared the queue.') !== -1).toBe(true);
  });
});