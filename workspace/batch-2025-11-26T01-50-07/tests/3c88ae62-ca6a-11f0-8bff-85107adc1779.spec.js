import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-50-07/html/3c88ae62-ca6a-11f0-8bff-85107adc1779.html';

test.describe('Priority Queue Demonstration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('should start in Idle state', async ({ page }) => {
    const outputArea = await page.locator('#outputArea');
    await expect(outputArea).toHaveText('Queue is empty.');
  });

  test('should enqueue an element successfully', async ({ page }) => {
    await page.fill('#elementInput', 'Task 1');
    await page.fill('#priorityInput', '1');
    await page.click('#enqueueBtn');

    const outputArea = await page.locator('#outputArea');
    await expect(outputArea).toHaveText('Enqueued element "Task 1" with priority 1.');
    
    const queueVisual = await page.locator('#queueVisual');
    await expect(queueVisual).toContainText('Task 1');
  });

  test('should show error when enqueuing with empty element', async ({ page }) => {
    await page.fill('#priorityInput', '1');
    await page.click('#enqueueBtn');

    const outputArea = await page.locator('#outputArea');
    await expect(outputArea).toHaveText('Error: Element cannot be empty.');
  });

  test('should show error when enqueuing with empty priority', async ({ page }) => {
    await page.fill('#elementInput', 'Task 2');
    await page.click('#enqueueBtn');

    const outputArea = await page.locator('#outputArea');
    await expect(outputArea).toHaveText('Error: Priority cannot be empty.');
  });

  test('should show error when enqueuing with non-integer priority', async ({ page }) => {
    await page.fill('#elementInput', 'Task 3');
    await page.fill('#priorityInput', 'high');
    await page.click('#enqueueBtn');

    const outputArea = await page.locator('#outputArea');
    await expect(outputArea).toHaveText('Error: Priority must be an integer.');
  });

  test('should dequeue an element successfully', async ({ page }) => {
    await page.fill('#elementInput', 'Task 4');
    await page.fill('#priorityInput', '2');
    await page.click('#enqueueBtn');

    await page.click('#dequeueBtn');
    
    const outputArea = await page.locator('#outputArea');
    await expect(outputArea).toHaveText('Dequeued element "Task 4" with priority 2.');
    
    const queueVisual = await page.locator('#queueVisual');
    await expect(queueVisual).not.toContainText('Task 4');
  });

  test('should show error when dequeuing from an empty queue', async ({ page }) => {
    await page.click('#dequeueBtn');

    const outputArea = await page.locator('#outputArea');
    await expect(outputArea).toHaveText('Queue is empty, nothing to dequeue.');
  });

  test('should peek the front element successfully', async ({ page }) => {
    await page.fill('#elementInput', 'Task 5');
    await page.fill('#priorityInput', '1');
    await page.click('#enqueueBtn');

    await page.click('#peekBtn');

    const outputArea = await page.locator('#outputArea');
    await expect(outputArea).toHaveText('Front element is "Task 5" with priority 1.');
  });

  test('should show error when peeking an empty queue', async ({ page }) => {
    await page.click('#peekBtn');

    const outputArea = await page.locator('#outputArea');
    await expect(outputArea).toHaveText('Queue is empty.');
  });

  test('should handle multiple enqueues and dequeues correctly', async ({ page }) => {
    await page.fill('#elementInput', 'Task 6');
    await page.fill('#priorityInput', '3');
    await page.click('#enqueueBtn');

    await page.fill('#elementInput', 'Task 7');
    await page.fill('#priorityInput', '1');
    await page.click('#enqueueBtn');

    await page.click('#dequeueBtn');

    const outputArea = await page.locator('#outputArea');
    await expect(outputArea).toHaveText('Dequeued element "Task 7" with priority 1.');

    const queueVisual = await page.locator('#queueVisual');
    await expect(queueVisual).toContainText('Task 6');
    await expect(queueVisual).not.toContainText('Task 7');
  });
});