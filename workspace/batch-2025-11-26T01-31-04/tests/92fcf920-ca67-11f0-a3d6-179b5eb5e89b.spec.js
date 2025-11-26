import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-31-04/html/92fcf920-ca67-11f0-a3d6-179b5eb5e89b.html';

test.describe('Queue Demonstration Application', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('should render initial state correctly', async ({ page }) => {
    // Verify that the queue is initially empty
    const queueDisplay = await page.locator('#queueDisplay');
    await expect(queueDisplay).toHaveText('(empty)');

    // Verify that buttons are disabled
    await expect(page.locator('#dequeueBtn')).toBeDisabled();
    await expect(page.locator('#peekBtn')).toBeDisabled();
    await expect(page.locator('#clearBtn')).toBeDisabled();
  });

  test('should enqueue an item and update the display', async ({ page }) => {
    const input = page.locator('#enqueueInput');
    const enqueueBtn = page.locator('#enqueueBtn');
    const message = page.locator('#message');

    // Enqueue an item
    await input.fill('Item 1');
    await enqueueBtn.click();

    // Verify the message and queue display
    await expect(message).toHaveText('Enqueued "Item 1" to the queue.');
    await expect(page.locator('#queueDisplay')).toContainText('Item 1');
    await expect(page.locator('#dequeueBtn')).toBeEnabled();
    await expect(page.locator('#peekBtn')).toBeEnabled();
    await expect(page.locator('#clearBtn')).toBeEnabled();
  });

  test('should not enqueue an empty item', async ({ page }) => {
    const input = page.locator('#enqueueInput');
    const enqueueBtn = page.locator('#enqueueBtn');
    const message = page.locator('#message');

    // Attempt to enqueue an empty item
    await input.fill('');
    await enqueueBtn.click();

    // Verify the error message
    await expect(message).toHaveText('Please enter a value to enqueue.');
    await expect(page.locator('#queueDisplay')).toHaveText('(empty)');
  });

  test('should dequeue an item and update the display', async ({ page }) => {
    const input = page.locator('#enqueueInput');
    const enqueueBtn = page.locator('#enqueueBtn');
    const dequeueBtn = page.locator('#dequeueBtn');
    const message = page.locator('#message');

    // Enqueue an item first
    await input.fill('Item 1');
    await enqueueBtn.click();

    // Dequeue the item
    await dequeueBtn.click();

    // Verify the message and queue display
    await expect(message).toHaveText('Dequeued "Item 1" from the queue.');
    await expect(page.locator('#queueDisplay')).toHaveText('(empty)');
    await expect(dequeueBtn).toBeDisabled();
    await expect(page.locator('#peekBtn')).toBeDisabled();
    await expect(page.locator('#clearBtn')).toBeDisabled();
  });

  test('should not dequeue from an empty queue', async ({ page }) => {
    const dequeueBtn = page.locator('#dequeueBtn');
    const message = page.locator('#message');

    // Attempt to dequeue from an empty queue
    await dequeueBtn.click();

    // Verify the error message
    await expect(message).toHaveText('Queue is empty, cannot dequeue.');
  });

  test('should peek at the front item', async ({ page }) => {
    const input = page.locator('#enqueueInput');
    const enqueueBtn = page.locator('#enqueueBtn');
    const peekBtn = page.locator('#peekBtn');
    const message = page.locator('#message');

    // Enqueue an item first
    await input.fill('Item 1');
    await enqueueBtn.click();

    // Peek at the front item
    await peekBtn.click();

    // Verify the message
    await expect(message).toHaveText('Front of the queue: "Item 1"');
  });

  test('should not peek at an empty queue', async ({ page }) => {
    const peekBtn = page.locator('#peekBtn');
    const message = page.locator('#message');

    // Attempt to peek at an empty queue
    await peekBtn.click();

    // Verify the error message
    await expect(message).toHaveText('Queue is empty, nothing at front.');
  });

  test('should clear the queue and update the display', async ({ page }) => {
    const input = page.locator('#enqueueInput');
    const enqueueBtn = page.locator('#enqueueBtn');
    const clearBtn = page.locator('#clearBtn');
    const message = page.locator('#message');

    // Enqueue an item first
    await input.fill('Item 1');
    await enqueueBtn.click();

    // Clear the queue
    await clearBtn.click();

    // Verify the message and queue display
    await expect(message).toHaveText('Queue cleared.');
    await expect(page.locator('#queueDisplay')).toHaveText('(empty)');
  });

  test('should handle multiple enqueue and dequeue operations', async ({ page }) => {
    const input = page.locator('#enqueueInput');
    const enqueueBtn = page.locator('#enqueueBtn');
    const dequeueBtn = page.locator('#dequeueBtn');
    const message = page.locator('#message');

    // Enqueue multiple items
    await input.fill('Item 1');
    await enqueueBtn.click();
    await input.fill('Item 2');
    await enqueueBtn.click();
    await input.fill('Item 3');
    await enqueueBtn.click();

    // Verify the queue display
    await expect(page.locator('#queueDisplay')).toContainText('Item 1');
    await expect(page.locator('#queueDisplay')).toContainText('Item 2');
    await expect(page.locator('#queueDisplay')).toContainText('Item 3');

    // Dequeue one item
    await dequeueBtn.click();
    await expect(message).toHaveText('Dequeued "Item 1" from the queue.');

    // Verify the updated queue display
    await expect(page.locator('#queueDisplay')).toContainText('Item 2');
    await expect(page.locator('#queueDisplay')).toContainText('Item 3');
  });
});