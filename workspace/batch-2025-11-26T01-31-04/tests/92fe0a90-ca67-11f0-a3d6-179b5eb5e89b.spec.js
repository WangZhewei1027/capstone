import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-31-04/html/92fe0a90-ca67-11f0-a3d6-179b5eb5e89b.html';

test.describe('Priority Queue Demo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('Initial state should be Idle', async ({ page }) => {
    const queueDisplay = await page.locator('#queueDisplay');
    await expect(queueDisplay).toHaveText('(empty)');
  });

  test('Enqueue an item', async ({ page }) => {
    await page.fill('#itemInput', 'Task 1');
    await page.fill('#priorityInput', '5');
    await page.click('#enqueueBtn');

    const output = await page.locator('#output');
    await expect(output).toContainText('Enqueued: "Task 1" with priority 5');

    const queueDisplay = await page.locator('#queueDisplay');
    await expect(queueDisplay).toContainText('Task 1');
    await expect(queueDisplay).toContainText('Priority: 5');
  });

  test('Enqueue with empty item input', async ({ page }) => {
    await page.fill('#priorityInput', '5');
    await page.click('#enqueueBtn');

    const alertText = await page.waitForEvent('dialog');
    await expect(alertText.message()).toBe('Please enter an item value.');
    await alertText.dismiss();
  });

  test('Enqueue with invalid priority', async ({ page }) => {
    await page.fill('#itemInput', 'Task 2');
    await page.fill('#priorityInput', 'invalid');
    await page.click('#enqueueBtn');

    const alertText = await page.waitForEvent('dialog');
    await expect(alertText.message()).toBe('Please enter a valid numeric priority.');
    await alertText.dismiss();
  });

  test('Dequeue an item', async ({ page }) => {
    await page.fill('#itemInput', 'Task 1');
    await page.fill('#priorityInput', '5');
    await page.click('#enqueueBtn');

    await page.click('#dequeueBtn');

    const output = await page.locator('#output');
    await expect(output).toContainText('Dequeued: "Task 1" with priority 5');

    const queueDisplay = await page.locator('#queueDisplay');
    await expect(queueDisplay).toHaveText('(empty)');
  });

  test('Dequeue when queue is empty', async ({ page }) => {
    await page.click('#dequeueBtn');

    const output = await page.locator('#output');
    await expect(output).not.toContainText('Dequeued');
  });

  test('Peek at the front item', async ({ page }) => {
    await page.fill('#itemInput', 'Task 1');
    await page.fill('#priorityInput', '5');
    await page.click('#enqueueBtn');

    await page.click('#peekBtn');

    const output = await page.locator('#output');
    await expect(output).toContainText('Peek: "Task 1" with priority 5');
  });

  test('Peek when queue is empty', async ({ page }) => {
    await page.click('#peekBtn');

    const output = await page.locator('#output');
    await expect(output).not.toContainText('Peek');
  });

  test('Clear the queue', async ({ page }) => {
    await page.fill('#itemInput', 'Task 1');
    await page.fill('#priorityInput', '5');
    await page.click('#enqueueBtn');

    await page.click('#clearBtn');

    const alertText = await page.waitForEvent('dialog');
    await expect(alertText.message()).toBe('Clear entire queue?');
    await alertText.accept();

    const output = await page.locator('#output');
    await expect(output).toContainText('Queue cleared.');

    const queueDisplay = await page.locator('#queueDisplay');
    await expect(queueDisplay).toHaveText('(empty)');
  });

  test('Check buttons state after clearing queue', async ({ page }) => {
    await page.fill('#itemInput', 'Task 1');
    await page.fill('#priorityInput', '5');
    await page.click('#enqueueBtn');

    await page.click('#clearBtn');
    await page.click('#clearBtn'); // Click again to ensure no errors

    const dequeueBtn = await page.locator('#dequeueBtn');
    const peekBtn = await page.locator('#peekBtn');
    const clearBtn = await page.locator('#clearBtn');

    await expect(dequeueBtn).toBeDisabled();
    await expect(peekBtn).toBeDisabled();
    await expect(clearBtn).toBeDisabled();
  });
});