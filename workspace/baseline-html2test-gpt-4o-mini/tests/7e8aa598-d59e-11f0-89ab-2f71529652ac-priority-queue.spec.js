import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/7e8aa598-d59e-11f0-89ab-2f71529652ac.html';

// Page object for interacting with the Priority Queue page
class PriorityQueuePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.itemInput = page.getByLabel('Item:');
    this.priorityInput = page.getByLabel('Priority:');
    this.addButton = page.getByRole('button', { name: 'Add to Queue' });
    this.removeButton = page.getByRole('button', { name: 'Remove from Queue' });
    this.queueItems = page.locator('#queueItems .queue-item');
    this.queueContainer = page.locator('#queueItems');
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  // Add an item via the UI
  async addItem(item, priority) {
    await this.itemInput.fill(item);
    await this.priorityInput.fill(String(priority));
    await this.addButton.click();
  }

  // Click remove/dequeue button
  async removeItem() {
    await this.removeButton.click();
  }

  // Return array of visible queue item texts
  async getQueueTexts() {
    const count = await this.queueItems.count();
    const texts = [];
    for (let i = 0; i < count; i++) {
      texts.push((await this.queueItems.nth(i).innerText()).trim());
    }
    return texts;
  }

  // Return true if queue is empty
  async isQueueEmpty() {
    return (await this.queueItems.count()) === 0;
  }
}

// Helper to listen to console and page error events for a page
function attachLogListeners(page) {
  const consoleMessages = [];
  const pageErrors = [];

  page.on('console', msg => {
    consoleMessages.push({ type: msg.type(), text: msg.text() });
  });

  page.on('pageerror', error => {
    // pageerror receives Error object
    pageErrors.push(error);
  });

  return { consoleMessages, pageErrors };
}

test.describe('Priority Queue Demo - UI and behavior', () => {
  // Test initial page load and default state
  test('Initial load shows empty queue and visible controls', async ({ page }) => {
    // Attach listeners to observe console and page errors for this test
    const { consoleMessages, pageErrors } = attachLogListeners(page);

    const pq = new PriorityQueuePage(page);
    await pq.goto();

    // Verify inputs and buttons are visible and enabled
    await expect(pq.itemInput).toBeVisible();
    await expect(pq.priorityInput).toBeVisible();
    await expect(pq.addButton).toBeVisible();
    await expect(pq.removeButton).toBeVisible();

    // On initial load, no queue items should be present
    expect(await pq.isQueueEmpty()).toBe(true);

    // Ensure the queue container heading is present
    await expect(page.locator('#queue h2')).toHaveText('Current Queue:');

    // Assert there are no uncaught page errors or console errors on load
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Test adding items and verifying ordering by priority
  test('Adding items enqueues them in proper priority order (lower number = higher priority)', async ({ page }) => {
    const { consoleMessages, pageErrors } = attachLogListeners(page);

    const pq1 = new PriorityQueuePage(page);
    await pq.goto();

    // Add three items with different priorities
    await pq.addItem('Task A', 3);
    await pq.addItem('Task B', 1);
    await pq.addItem('Task C', 2);

    // Verify inputs were cleared after each add (as per implementation)
    await expect(pq.itemInput).toHaveValue('');
    await expect(pq.priorityInput).toHaveValue('');

    // Verify the queue order: Task B (1), Task C (2), Task A (3)
    const texts1 = await pq.getQueueTexts();
    expect(texts.length).toBe(3);
    expect(texts[0]).toContain('Task B');
    expect(texts[0]).toContain('Priority: 1');
    expect(texts[1]).toContain('Task C');
    expect(texts[1]).toContain('Priority: 2');
    expect(texts[2]).toContain('Task A');
    expect(texts[2]).toContain('Priority: 3');

    // Verify each queue item has the expected class and is visible
    const item0 = page.locator('#queueItems .queue-item').nth(0);
    await expect(item0).toBeVisible();
    await expect(item0).toHaveClass(/queue-item/);

    // Assert there are no uncaught page errors or console errors during this flow
    const consoleErrors1 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Test dequeuing behavior and that alerts occur when removing from empty queue
  test('Dequeue removes the highest priority item and alerts when queue is empty', async ({ page }) => {
    const { consoleMessages, pageErrors } = attachLogListeners(page);

    const pq2 = new PriorityQueuePage(page);
    await pq.goto();

    // Add two items
    await pq.addItem('One', 2);
    await pq.addItem('Two', 1);

    // Verify order before removal: Two(1), One(2)
    let texts2 = await pq.getQueueTexts();
    expect(texts[0]).toContain('Two');
    expect(texts[1]).toContain('One');

    // Remove once - should remove 'Two'
    await pq.removeItem();
    texts = await pq.getQueueTexts();
    expect(texts.length).toBe(1);
    expect(texts[0]).toContain('One');

    // Remove again - should remove 'One' leaving the queue empty
    await pq.removeItem();
    expect(await pq.isQueueEmpty()).toBe(true);

    // Attempting to remove from empty queue should trigger an alert dialog with message "Queue is empty."
    const [dialog] = await Promise.all([
      page.waitForEvent('dialog'),
      pq.removeButton.click()
    ]);
    expect(dialog.message()).toBe('Queue is empty.');
    await dialog.dismiss();

    // Assert there are no uncaught page errors or console errors during this flow
    const consoleErrors2 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Edge cases and error handling: invalid inputs produce alert
  test('Adding invalid input (empty or non-numeric priority) triggers alert', async ({ page }) => {
    const { consoleMessages, pageErrors } = attachLogListeners(page);

    const pq3 = new PriorityQueuePage(page);
    await pq.goto();

    // Case 1: empty inputs -> alert
    const [dialog1] = await Promise.all([
      page.waitForEvent('dialog'),
      pq.addButton.click()
    ]);
    expect(dialog1.message()).toBe('Please enter valid item and priority.');
    await dialog1.dismiss();

    // Case 2: valid item, non-numeric priority -> alert
    await pq.itemInput.fill('Bad Priority');
    await pq.priorityInput.fill('abc');
    const [dialog2] = await Promise.all([
      page.waitForEvent('dialog'),
      pq.addButton.click()
    ]);
    expect(dialog2.message()).toBe('Please enter valid item and priority.');
    await dialog2.dismiss();

    // Case 3: missing item, numeric priority -> alert
    await pq.itemInput.fill('');
    await pq.priorityInput.fill('1');
    const [dialog3] = await Promise.all([
      page.waitForEvent('dialog'),
      pq.addButton.click()
    ]);
    expect(dialog3.message()).toBe('Please enter valid item and priority.');
    await dialog3.dismiss();

    // Ensure the queue is still empty after invalid attempts
    expect(await pq.isQueueEmpty()).toBe(true);

    // Assert there are no uncaught page errors or console errors during these edge cases
    const consoleErrors3 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Accessibility and DOM linkage checks
  test('Form controls are associated with labels and are keyboard accessible', async ({ page }) => {
    const { consoleMessages, pageErrors } = attachLogListeners(page);

    const pq4 = new PriorityQueuePage(page);
    await pq.goto();

    // Labels should be associated with inputs (getByLabel succeeded above if they are)
    await expect(pq.itemInput).toBeVisible();
    await expect(pq.priorityInput).toBeVisible();

    // Simulate keyboard entry and Enter key on priority input followed by clicking add (no form submit)
    await pq.itemInput.fill('Keyboard Task');
    await pq.priorityInput.fill('5');

    // Press Enter in priority input (no form submit, but should not throw)
    await pq.priorityInput.press('Enter');

    // Click Add
    await pq.addButton.click();

    // Verify item was added
    const texts3 = await pq.getQueueTexts();
    expect(texts.some(t => t.includes('Keyboard Task'))).toBeTruthy();

    // Assert there are no uncaught page errors or console errors during this accessibility test
    const consoleErrors4 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });
});

test.describe('Console and page error observation', () => {
  // This group intentionally observes console and pageerror events for the page
  test('No unexpected console errors or uncaught exceptions on full interaction flow', async ({ page }) => {
    // Collect errors and console messages across a series of interactions
    const { consoleMessages, pageErrors } = attachLogListeners(page);

    const pq5 = new PriorityQueuePage(page);
    await pq.goto();

    // Perform a representative series of interactions
    await pq.addItem('Alpha', 10);
    await pq.addItem('Beta', 2);
    await pq.removeItem();
    await pq.addItem('Gamma', 5);
    await pq.removeItem();
    await pq.removeItem();

    // final remove should alert that queue is empty
    const [dialog] = await Promise.all([
      page.waitForEvent('dialog'),
      pq.removeButton.click()
    ]);
    expect(dialog.message()).toBe('Queue is empty.');
    await dialog.dismiss();

    // Now assert that there were no console.error messages and no page errors recorded
    const consoleErrorMessages = consoleMessages.filter(m => m.type === 'error');
    // If the application had runtime ReferenceError/SyntaxError/TypeError they would appear here as pageErrors
    expect(consoleErrorMessages.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });
});