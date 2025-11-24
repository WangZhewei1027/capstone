import { test, expect } from '@playwright/test';

const baseURL = 'http://127.0.0.1:5500/workspace/batch-2025-11-23T16-59-33/html/c8b45212-c88d-11f0-bba4-b3577ad7fe65.html';

test.describe('Queue Demonstration FSM Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(baseURL);
  });

  test('Initial state should be idle with empty queue', async ({ page }) => {
    const queueContainer = await page.locator('#queue-container');
    const dequeueBtn = await page.locator('#dequeue-btn');
    const message = await page.locator('#message');

    await expect(queueContainer).toHaveText('(Queue is empty)');
    await expect(dequeueBtn).toBeDisabled();
    await expect(message).toHaveText('');
  });

  test.describe('Enqueueing State', () => {
    test('should enqueue an item and transition back to idle', async ({ page }) => {
      const enqueueInput = await page.locator('#enqueue-input');
      const enqueueBtn = await page.locator('#enqueue-btn');
      const queueContainer = await page.locator('#queue-container');
      const message = await page.locator('#message');

      await enqueueInput.fill('TestItem');
      await enqueueBtn.click();

      await expect(queueContainer.locator('.queue-item')).toHaveText('TestItem');
      await expect(message).toHaveText('Enqueued: "TestItem"');
      await expect(queueContainer).not.toHaveText('(Queue is empty)');
    });

    test('should show error message when enqueueing empty value', async ({ page }) => {
      const enqueueBtn = await page.locator('#enqueue-btn');
      const message = await page.locator('#message');

      await enqueueBtn.click();

      await expect(message).toHaveText('Please enter a value to enqueue.');
    });
  });

  test.describe('Dequeueing State', () => {
    test('should dequeue an item and transition back to idle', async ({ page }) => {
      const enqueueInput = await page.locator('#enqueue-input');
      const enqueueBtn = await page.locator('#enqueue-btn');
      const dequeueBtn = await page.locator('#dequeue-btn');
      const queueContainer = await page.locator('#queue-container');
      const message = await page.locator('#message');

      await enqueueInput.fill('TestItem');
      await enqueueBtn.click();
      await dequeueBtn.click();

      await expect(queueContainer).toHaveText('(Queue is empty)');
      await expect(message).toHaveText('Dequeued: "TestItem"');
      await expect(dequeueBtn).toBeDisabled();
    });

    test('should show error message when dequeueing from empty queue', async ({ page }) => {
      const dequeueBtn = await page.locator('#dequeue-btn');
      const message = await page.locator('#message');

      await dequeueBtn.click();

      await expect(message).toHaveText('Queue is empty. Cannot dequeue.');
    });
  });

  test.describe('Edge Cases', () => {
    test('should handle multiple enqueue and dequeue operations', async ({ page }) => {
      const enqueueInput = await page.locator('#enqueue-input');
      const enqueueBtn = await page.locator('#enqueue-btn');
      const dequeueBtn = await page.locator('#dequeue-btn');
      const queueContainer = await page.locator('#queue-container');

      await enqueueInput.fill('Item1');
      await enqueueBtn.click();
      await enqueueInput.fill('Item2');
      await enqueueBtn.click();
      await enqueueInput.fill('Item3');
      await enqueueBtn.click();

      await expect(queueContainer.locator('.queue-item')).toHaveCount(3);

      await dequeueBtn.click();
      await expect(queueContainer.locator('.queue-item')).toHaveCount(2);
      await expect(queueContainer.locator('.queue-item').first()).toHaveText('Item2');

      await dequeueBtn.click();
      await expect(queueContainer.locator('.queue-item')).toHaveCount(1);
      await expect(queueContainer.locator('.queue-item').first()).toHaveText('Item3');

      await dequeueBtn.click();
      await expect(queueContainer).toHaveText('(Queue is empty)');
    });
  });
});