import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-deepseek-chat/html/6e09e033-d5a0-11f0-8040-510e90b1f3a7.html';

test.describe('Priority Queue Visualization - Interactive E2E', () => {
  // Helper to attach listeners to collect console messages and page errors
  async function attachDiagnostics(page) {
    const consoleMessages = [];
    const pageErrors = [];

    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    return { consoleMessages, pageErrors };
  }

  // Test initial page load and default state
  test('Initial load: shows empty queue, count 0, and initialization log', async ({ page }) => {
    // Purpose: Verify page loads without runtime errors, initial UI state, and initial log entry
    const { consoleMessages, pageErrors } = await attachDiagnostics(page);

    await page.goto(APP_URL);

    // Verify empty message is visible
    const emptyMessage = page.locator('.queue .empty-message');
    await expect(emptyMessage).toBeVisible();
    await expect(emptyMessage).toHaveText('Queue is empty. Add some elements to get started.');

    // Verify count and highest are initialized
    await expect(page.locator('#count')).toHaveText('0');
    await expect(page.locator('#highest')).toHaveText('None');

    // Verify operation log contains initialization message
    const log = page.locator('#log');
    await expect(log).toContainText('Priority queue initialized. Ready for operations.');

    // Wait briefly to allow any synchronous console/page errors to surface
    await page.waitForTimeout(200);

    // Assert no uncaught page errors occurred
    expect(pageErrors.map(String)).toEqual([]);

    // Assert there are no console messages of type 'error'
    const errorConsoleMessages = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleMessages.length).toBe(0);
  });

  // Test that the sample data added via setTimeouts appear in the correct order
  test('Sample data should be added automatically and ordered by priority', async ({ page }) => {
    // Purpose: Confirm that the three sample tasks (Task A, Task B, Task C) are added
    // and that the ordering is High (Task A), Medium (Task C), Low (Task B)
    const { consoleMessages, pageErrors } = await attachDiagnostics(page);

    await page.goto(APP_URL);

    // Wait for the last sample item (Task C) to appear. Timeouts in page are at 500ms, 1000ms, 1500ms
    await page.waitForSelector('text=Task C', { timeout: 4000 });

    // Collect visible item values in order
    const itemValues = page.locator('.queue .queue-item .item-value');
    const count = await itemValues.count();
    const values = [];
    for (let i = 0; i < count; i++) {
      values.push((await itemValues.nth(i).innerText()).trim());
    }

    // Expected order: Task A (High), Task C (Medium), Task B (Low)
    expect(values).toEqual(['Task A', 'Task C', 'Task B']);

    // Verify count and highest element displayed
    await expect(page.locator('#count')).toHaveText(String(values.length));
    await expect(page.locator('#highest')).toHaveText('Task A (High)');

    // Verify logs contain entries for the added tasks
    const logText = await page.locator('#log').innerText();
    expect(logText).toMatch(/Added "Task A" with High priority/);
    expect(logText).toMatch(/Added "Task B" with Low priority/);
    expect(logText).toMatch(/Added "Task C" with Medium priority/);

    // Ensure no page errors or console error messages were produced
    expect(pageErrors.map(String)).toEqual([]);
    const errorConsoleMessages = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleMessages.length).toBe(0);
  });

  // Test enqueue interactions, including empty value alert and Enter key to submit
  test('Enqueue interactions: alert on empty value, enqueue via click and Enter key, DOM updates', async ({ page }) => {
    // Purpose: Validate user can enqueue items via UI, that empty input triggers alert,
    // and that pressing Enter also enqueues.
    const { consoleMessages, pageErrors } = await attachDiagnostics(page);
    await page.goto(APP_URL);

    // If sample data are added by timeouts, the page may not be empty. Clear that by dequeuing everything first
    // We'll attempt to remove items until queue is empty to ensure consistent starting point for this test.
    await page.waitForTimeout(1600).catch(() => {}); // let sample items possibly appear, then we will clear them
    const dequeueButton = page.locator('#dequeue');
    // Click dequeue repeatedly up to 10 times to drain queue
    for (let i = 0; i < 10; i++) {
      await dequeueButton.click();
      // small pause to let DOM update
      await page.waitForTimeout(50);
      // If empty message now visible, break
      if (await page.locator('.queue .empty-message').isVisible()) break;
    }

    // Now confirm empty
    await expect(page.locator('.queue .empty-message')).toBeVisible();
    await expect(page.locator('#count')).toHaveText('0');

    // Test alert when enqueue pressed with empty value
    const [dialog] = await Promise.all([
      page.waitForEvent('dialog'),
      page.locator('#enqueue').click(), // triggers alert because input is empty
    ]);
    expect(dialog.type()).toBe('alert');
    expect(dialog.message()).toBe('Please enter a value');
    await dialog.accept();

    // Enqueue via click with specific priority selected
    const valueInput = page.locator('#value');
    const prioritySelect = page.locator('#priority');
    await valueInput.fill('ManualItem');
    await prioritySelect.selectOption('3'); // High priority
    await page.locator('#enqueue').click();

    // Verify the new item appears at top
    await page.waitForSelector('.queue .queue-item .item-value:text("ManualItem")');
    await expect(page.locator('#count')).toHaveText('1');
    await expect(page.locator('#highest')).toHaveText('ManualItem (High)');
    await expect(page.locator('#log')).toContainText('Added "ManualItem" with High priority');

    // Test pressing Enter to enqueue another item
    await valueInput.fill('EnterItem');
    // Press Enter (the input has keypress listener to click enqueue)
    await valueInput.press('Enter');

    // The Enter handler calls enqueueButton.click which should add the item
    await page.waitForSelector('.queue .queue-item .item-value:text("EnterItem")');
    await expect(page.locator('#count')).toHaveText('2');

    // Verify order: ManualItem (High) should be first, EnterItem may be Medium by default (select stays at High from previous),
    // but the input does not change select unless we set it. If both are High, FIFO expects ManualItem before EnterItem.
    const firstValue = await page.locator('.queue .queue-item .item-value').first().innerText();
    expect(firstValue).toBe('ManualItem');

    // Verify no runtime errors in page
    expect(pageErrors.map(String)).toEqual([]);
    const errorConsoleMessages = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleMessages.length).toBe(0);
  });

  // Test dequeue operation removes highest priority, updates logs, and handles empty-dequeue gracefully
  test('Dequeue operation: removes highest priority, updates DOM/log, and logs when empty', async ({ page }) => {
    // Purpose: Ensure dequeue removes items in priority order, logs removals, and logs when trying to dequeue empty queue
    const { consoleMessages, pageErrors } = await attachDiagnostics(page);
    await page.goto(APP_URL);

    // Wait for sample items to be added so we have a predictable set to work with
    await page.waitForSelector('text=Task A', { timeout: 3000 });

    // Verify starting first element
    const firstItemLocator = page.locator('.queue .queue-item').first();
    const firstValueBefore = await firstItemLocator.locator('.item-value').innerText();
    expect(firstValueBefore).toContain('Task A'); // initial highest should be Task A

    // Click Dequeue and verify the first item is removed
    await page.locator('#dequeue').click();

    // Wait for DOM to update and for log to reflect removal
    await page.waitForTimeout(100);
    const logTextAfterRemove = await page.locator('#log').innerText();
    expect(logTextAfterRemove).toMatch(/Removed "Task A" with High priority/);

    // Now highest should update to the next item (Task C)
    await expect(page.locator('#highest')).toHaveText('Task C (Medium)');

    // Dequeue remaining items to empty the queue
    await page.locator('#dequeue').click(); // remove Task C
    await page.waitForTimeout(50);
    await page.locator('#dequeue').click(); // remove Task B
    await page.waitForTimeout(50);

    // Confirm queue is empty now
    await expect(page.locator('.queue .empty-message')).toBeVisible();
    await expect(page.locator('#count')).toHaveText('0');
    await expect(page.locator('#highest')).toHaveText('None');

    // Attempt to dequeue from empty queue: should not throw, but should add info log
    await page.locator('#dequeue').click();
    await page.waitForTimeout(50);
    await expect(page.locator('#log')).toContainText('Queue is empty. Cannot dequeue.');

    // Ensure no uncaught page errors or console errors occurred during operations
    expect(pageErrors.map(String)).toEqual([]);
    const errorConsoleMessages = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleMessages.length).toBe(0);
  });

  // Test FIFO behavior for equal priorities
  test('FIFO behavior for equal priorities: preserve insertion order for same priority', async ({ page }) => {
    // Purpose: Confirm two items with same priority are served in FIFO order.
    const { consoleMessages, pageErrors } = await attachDiagnostics(page);
    await page.goto(APP_URL);

    // Drain any existing items to start fresh
    await page.waitForTimeout(1600).catch(() => {});
    for (let i = 0; i < 10; i++) {
      await page.locator('#dequeue').click();
      await page.waitForTimeout(30);
      if (await page.locator('.queue .empty-message').isVisible()) break;
    }

    // Enqueue two items with the same priority (Medium = value "2")
    await page.locator('#priority').selectOption('2'); // Medium
    await page.locator('#value').fill('FIFO-First');
    await page.locator('#enqueue').click();
    await page.locator('#value').fill('FIFO-Second');
    await page.locator('#enqueue').click();

    // Ensure both items appear
    await page.waitForSelector('.queue .queue-item .item-value:text("FIFO-First")');
    await page.waitForSelector('.queue .queue-item .item-value:text("FIFO-Second")');

    // Check ordering: FIFO-First should appear before FIFO-Second
    const values = await page.$$eval('.queue .queue-item .item-value', nodes => nodes.map(n => n.textContent.trim()));
    // They both have same priority; queue.sort sorts by priority only and preserves insertion order for equals,
    // so FIFO-First should come before FIFO-Second
    const idxFirst = values.indexOf('FIFO-First');
    const idxSecond = values.indexOf('FIFO-Second');
    expect(idxFirst).toBeLessThan(idxSecond);

    // Clean up: dequeue both
    await page.locator('#dequeue').click();
    await page.locator('#dequeue').click();

    // Ensure no runtime errors occurred
    expect(pageErrors.map(String)).toEqual([]);
    const errorConsoleMessages = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleMessages.length).toBe(0);
  });
});