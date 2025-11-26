import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-18-21/html/cc1dad50-ca65-11f0-96a8-05e9de15890f.html';

test.describe('Priority Queue - Binary Heap Visualization', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('should initialize the application and create a new priority queue', async ({ page }) => {
    // Verify initial state
    const metaText = await page.textContent('#meta');
    expect(metaText).toContain('size: 0');

    // Create a new priority queue
    await page.click('#enqueueBtn');
    const logEntries = await page.$$eval('#logArea div', entries => entries.map(entry => entry.textContent));
    expect(logEntries[0]).toContain('Created new Min-heap priority queue');
  });

  test('should enqueue an item', async ({ page }) => {
    await page.fill('#itemValue', 'task-A');
    await page.fill('#itemPriority', '5');
    await page.click('#enqueueBtn');

    // Verify the queue state after enqueue
    const arrayView = await page.$$('#arrayView .nodeBox');
    expect(arrayView.length).toBe(1);
    expect(await arrayView[0].textContent()).toContain('task-A');
    expect(await arrayView[0].textContent()).toContain('prio: 5');
  });

  test('should enqueue multiple random items', async ({ page }) => {
    await page.click('#enqueueRand');

    // Verify the queue state after enqueueing random items
    const arrayView = await page.$$('#arrayView .nodeBox');
    expect(arrayView.length).toBeGreaterThan(0);
  });

  test('should dequeue an item', async ({ page }) => {
    await page.fill('#itemValue', 'task-B');
    await page.fill('#itemPriority', '3');
    await page.click('#enqueueBtn');
    await page.click('#dequeueBtn');

    // Verify the queue state after dequeue
    const arrayView = await page.$$('#arrayView .nodeBox');
    expect(arrayView.length).toBe(0);
  });

  test('should peek the top item', async ({ page }) => {
    await page.fill('#itemValue', 'task-C');
    await page.fill('#itemPriority', '4');
    await page.click('#enqueueBtn');
    await page.click('#peekBtn');

    // Verify the log entry for peek
    const logEntries = await page.$$eval('#logArea div', entries => entries.map(entry => entry.textContent));
    expect(logEntries[0]).toContain('Peek -> id:1 "task-C" (prio 4)');
  });

  test('should dequeue all items', async ({ page }) => {
    await page.fill('#itemValue', 'task-D');
    await page.fill('#itemPriority', '2');
    await page.click('#enqueueBtn');
    await page.click('#dequeueAll');

    // Verify the queue state after dequeueing all
    const arrayView = await page.$$('#arrayView .nodeBox');
    expect(arrayView.length).toBe(0);
  });

  test('should clear the queue', async ({ page }) => {
    await page.fill('#itemValue', 'task-E');
    await page.fill('#itemPriority', '1');
    await page.click('#enqueueBtn');
    await page.click('#clearBtn');

    // Verify the queue state after clearing
    const arrayView = await page.$$('#arrayView .nodeBox');
    expect(arrayView.length).toBe(0);
  });

  test('should change the priority of an item', async ({ page }) => {
    await page.fill('#itemValue', 'task-F');
    await page.fill('#itemPriority', '6');
    await page.click('#enqueueBtn');
    await page.fill('#changeId', '1');
    await page.fill('#changePr', '10');
    await page.click('#changeBtn');

    // Verify the log entry for change priority
    const logEntries = await page.$$eval('#logArea div', entries => entries.map(entry => entry.textContent));
    expect(logEntries[0]).toContain('Changed priority of id:1 to 10');
  });

  test('should show an alert when changing priority with empty fields', async ({ page }) => {
    await page.click('#changeBtn');

    // Verify the alert is shown
    const alertText = await page.evaluate(() => window.alert);
    expect(alertText).toBe('Enter id to change');
  });

  test('should handle invalid change priority', async ({ page }) => {
    await page.fill('#changeId', '999');
    await page.fill('#changePr', '10');
    await page.click('#changeBtn');

    // Verify the log entry for invalid change priority
    const logEntries = await page.$$eval('#logArea div', entries => entries.map(entry => entry.textContent));
    expect(logEntries[0]).toContain('ID 999 not found');
  });

  test('should prefill change ID when clicking on a node', async ({ page }) => {
    await page.fill('#itemValue', 'task-G');
    await page.fill('#itemPriority', '2');
    await page.click('#enqueueBtn');
    await page.click('.nodeBox');

    // Verify the change ID input is filled
    const changeIdValue = await page.inputValue('#changeId');
    expect(changeIdValue).toBe('1'); // Assuming the first node has ID 1
  });

  test('should recreate the priority queue with new settings', async ({ page }) => {
    await page.fill('#itemValue', 'task-H');
    await page.fill('#itemPriority', '3');
    await page.click('#enqueueBtn');
    await page.selectOption('#queueType', 'max');
    await page.click('#enqueueBtn');

    // Verify the queue type has changed
    const metaText = await page.textContent('#meta');
    expect(metaText).toContain('type: MAX');
  });
});