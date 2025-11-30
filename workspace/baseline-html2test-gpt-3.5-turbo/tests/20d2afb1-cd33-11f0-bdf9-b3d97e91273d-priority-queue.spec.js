import { test, expect } from '@playwright/test';

const APP_URL =
  'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/20d2afb1-cd33-11f0-bdf9-b3d97e91273d.html';

// Page Object for the Priority Queue page to encapsulate interactions and selectors
class PriorityQueuePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.itemInput = page.locator('#itemInput');
    this.priorityInput = page.locator('#priorityInput');
    this.enqueueBtn = page.locator('#enqueueBtn');
    this.dequeueBtn = page.locator('#dequeueBtn');
    this.queueBody = page.locator('#queueBody');
    this.outputArea = page.locator('#outputArea');
  }

  // Navigate to the app and wait for it to be interactive
  async goto() {
    await this.page.goto(APP_URL);
    await this.page.waitForLoadState('domcontentloaded');
    // Ensure initial UI paint
    await expect(this.page.locator('h1')).toHaveText('Priority Queue Demo');
  }

  // Fill inputs (will trigger input listeners)
  async fillInputs(item, priority) {
    await this.itemInput.fill(item);
    await this.priorityInput.fill(priority);
  }

  // Click the enqueue button (will be disabled when invalid)
  async clickEnqueue() {
    await this.enqueueBtn.click();
  }

  // Click the dequeue button
  async clickDequeue() {
    await this.dequeueBtn.click();
  }

  // Return whether enqueue button is disabled
  async isEnqueueDisabled() {
    return await this.enqueueBtn.isDisabled();
  }

  // Return whether dequeue button is disabled
  async isDequeueDisabled() {
    return await this.dequeueBtn.isDisabled();
  }

  // Read the visible output area text
  async getOutputText() {
    return (await this.outputArea.textContent()) ?? '';
  }

  // Get queue tbody inner text (for human-readable assertions)
  async getQueueText() {
    return (await this.queueBody.textContent()) ?? '';
  }

  // Get queue tbody innerHTML (for assertions about escaping)
  async getQueueInnerHTML() {
    return (await this.queueBody.innerHTML()) ?? '';
  }

  // Get array of rows from the current queue table (index,item,priority)
  async getQueueRows() {
    const rows = await this.page.$$eval('#queueBody tr', (trs) =>
      trs.map((tr) =>
        Array.from(tr.querySelectorAll('td')).map((td) => td.innerText.trim())
      )
    );
    return rows;
  }

  // Assert that the item input currently has focus
  async itemInputHasFocus() {
    return await this.page.evaluate(() => document.activeElement === document.getElementById('itemInput'));
  }
}

// Global test suite for the Priority Queue app
test.describe('Priority Queue Demo (20d2afb1-cd33-11f0-bdf9-b3d97e91273d)', () => {
  let pqPage;
  // Capture console messages and page errors for each test run
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Collect console messages
    page.on('console', (msg) => {
      // store message text and type for diagnostics
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Collect uncaught page errors
    page.on('pageerror', (err) => {
      // store the Error object for assertions later
      pageErrors.push(err);
    });

    // Auto-dismiss dialogs (alerts) so tests proceed if an alert appears
    page.on('dialog', async (dialog) => {
      try {
        await dialog.dismiss();
      } catch (e) {
        // ignore
      }
    });

    pqPage = new PriorityQueuePage(page);
    await pqPage.goto();
  });

  test.afterEach(async () => {
    // After each test, assert that there were no unexpected runtime errors (ReferenceError, SyntaxError, TypeError, etc.)
    // Collect human-readable messages for failure diagnostics if any exist.
    if (pageErrors.length > 0) {
      const msgs = pageErrors.map((e) => e.stack || e.message || String(e)).join('\n---\n');
      // Fail the test explicitly with details about the page errors.
      throw new Error(`Unexpected page errors were recorded:\n${msgs}`);
    }
  });

  test('Initial page load shows default UI state (empty queue, buttons disabled, output empty)', async () => {
    // Verify initial text and visuals
    await expect(pqPage.page.locator('h1')).toHaveText('Priority Queue Demo');

    // Enqueue button should be disabled on load
    expect(await pqPage.isEnqueueDisabled()).toBe(true);

    // Dequeue is disabled because queue is empty
    expect(await pqPage.isDequeueDisabled()).toBe(true);

    // Queue body should show "Queue is empty"
    const queueText = await pqPage.getQueueText();
    expect(queueText).toContain('Queue is empty');

    // Output area should be empty initially
    const output = await pqPage.getOutputText();
    expect(output.trim()).toBe('');
  });

  test('Enqueue button enabling/disabling responds to valid and invalid inputs', async () => {
    // Only item entered should keep enqueue disabled
    await pqPage.itemInput.fill('task-a');
    expect(await pqPage.isEnqueueDisabled()).toBe(true);

    // Only priority entered should keep enqueue disabled when item empty
    await pqPage.itemInput.fill('');
    await pqPage.priorityInput.fill('3');
    expect(await pqPage.isEnqueueDisabled()).toBe(true);

    // Non-numeric priority disables enqueue (e.g., "abc")
    await pqPage.itemInput.fill('task-a');
    await pqPage.priorityInput.fill('abc');
    // isNaN('abc') -> true so disabled
    expect(await pqPage.isEnqueueDisabled()).toBe(true);

    // Valid numeric priority enables button
    await pqPage.priorityInput.fill('4');
    expect(await pqPage.isEnqueueDisabled()).toBe(false);

    // Clearing one of the fields disables again
    await pqPage.itemInput.fill('');
    expect(await pqPage.isEnqueueDisabled()).toBe(true);
  });

  test('Enqueueing items updates queue display, output area and maintains focus on input', async () => {
    // Enqueue first item
    await pqPage.fillInputs('alpha', '5');
    await pqPage.clickEnqueue();

    // Output area should reflect enqueue
    expect(await pqPage.getOutputText()).toBe('Enqueued: "alpha" with priority 5');

    // Queue should now have one row with alpha and priority 5
    const rows1 = await pqPage.getQueueRows();
    expect(rows1.length).toBe(1);
    expect(rows1[0]).toEqual(['1', 'alpha', '5']);

    // Inputs should be cleared by the UI after enqueue
    const itemValAfter = await pqPage.itemInput.inputValue();
    const prioValAfter = await pqPage.priorityInput.inputValue();
    expect(itemValAfter).toBe('');
    expect(prioValAfter).toBe('');

    // Item input should be focused after enqueue
    expect(await pqPage.itemInputHasFocus()).toBe(true);

    // Enqueue a higher priority item (lower numeric value)
    await pqPage.fillInputs('beta', '2');
    await pqPage.clickEnqueue();

    // Output and queue should update showing 'beta' first (priority 2) then 'alpha'
    expect(await pqPage.getOutputText()).toBe('Enqueued: "beta" with priority 2');

    const rows2 = await pqPage.getQueueRows();
    expect(rows2.length).toBe(2);
    // First row should be beta priority 2
    expect(rows2[0]).toEqual(['1', 'beta', '2']);
    // Second row should be alpha priority 5
    expect(rows2[1]).toEqual(['2', 'alpha', '5']);

    // Dequeue button should be enabled now
    expect(await pqPage.isDequeueDisabled()).toBe(false);
  });

  test('Dequeue removes the highest priority item and updates DOM and output accordingly', async () => {
    // Prepare queue with two items
    await pqPage.fillInputs('one', '10');
    await pqPage.clickEnqueue();

    await pqPage.fillInputs('urgent', '0');
    await pqPage.clickEnqueue();

    // Confirm ordering: 'urgent' should be first
    let rowsBefore = await pqPage.getQueueRows();
    expect(rowsBefore[0][1]).toBe('urgent');
    expect(rowsBefore[0][2]).toBe('0');

    // Click dequeue
    await pqPage.clickDequeue();

    // Output should reflect the dequeued item
    expect(await pqPage.getOutputText()).toBe('Dequeued: "urgent" with priority 0');

    // Now queue should only contain 'one'
    const rowsAfter = await pqPage.getQueueRows();
    expect(rowsAfter.length).toBe(1);
    expect(rowsAfter[0]).toEqual(['1', 'one', '10']);
  });

  test('HTML escaping prevents HTML injection into the queue display', async () => {
    // Enqueue an item containing HTML characters
    const malicious = '<b>bold</b>';
    await pqPage.fillInputs(malicious, '7');
    await pqPage.clickEnqueue();

    // The cell innerHTML should contain escaped HTML entities, not raw tags
    const innerHTML = await pqPage.getQueueInnerHTML();
    // Expect to find escaped tags in the markup generated by escapeHTML
    expect(innerHTML).toContain('&lt;b&gt;bold&lt;/b&gt;');

    // When reading textContent, it should display the literal characters <b>bold</b>
    const queueText1 = await pqPage.getQueueText();
    expect(queueText).toContain('<b>bold</b>');
  });

  test('Edge cases: negative priority values are accepted and correctly ordered (lower number = higher priority)', async () => {
    // Enqueue with a negative priority which should be considered "high priority" (lower numeric value)
    await pqPage.fillInputs('neg-item', '-1');
    await pqPage.clickEnqueue();

    await pqPage.fillInputs('zero-item', '0');
    await pqPage.clickEnqueue();

    // Since -1 < 0, neg-item should appear before zero-item
    const rows1 = await pqPage.getQueueRows();
    expect(rows.length).toBe(2);
    expect(rows[0]).toEqual(['1', 'neg-item', '-1']);
    expect(rows[1]).toEqual(['2', 'zero-item', '0']);
  });

  test('Invalid interactions: enqueue stays disabled with missing fields or non-numeric priority (no alert should block)', async () => {
    // Ensure enqueue is disabled with empty priority
    await pqPage.fillInputs('some-item', '');
    expect(await pqPage.isEnqueueDisabled()).toBe(true);

    // Ensure enqueue is disabled with non-numeric priority
    await pqPage.fillInputs('some-item', 'not-a-number');
    expect(await pqPage.isEnqueueDisabled()).toBe(true);

    // Because alerts are dismissed in beforeEach, attempting to click a disabled button should throw from Playwright.
    // We explicitly assert that the button is disabled, not that clicking would show an alert (cannot click disabled buttons).
  });

  test('No unexpected console errors or runtime exceptions occurred during normal interactions', async ({ page }) => {
    // Perform a few regular interactions
    await pqPage.fillInputs('a', '1');
    await pqPage.clickEnqueue();

    await pqPage.fillInputs('b', '2');
    await pqPage.clickEnqueue();

    await pqPage.clickDequeue();

    // Verify that we did not capture any page errors of types like ReferenceError/TypeError
    // This assertion is also covered in afterEach, but we provide an explicit, descriptive check here.
    expect(pageErrors.length).toBe(0);

    // Also ensure no console error-level messages are present (filter by type 'error')
    const errorConsoleMessages = consoleMessages.filter((m) => m.type === 'error' || m.type === 'warning');
    expect(errorConsoleMessages.length).toBe(0);
  });
});