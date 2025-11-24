import { test, expect } from '@playwright/test';

test.describe('Queue Demonstration Application', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://127.0.0.1:5500/workspace/batch-2025-11-23T16-49-19/html/661a4660-c88c-11f0-bf03-e79702b3342d.html');
  });

  test('Initial state should be empty', async ({ page }) => {
    const queueDisplay = await page.locator('#queue-display');
    await expect(queueDisplay).toHaveText('(Queue is empty)');
  });

  test.describe('Enqueue Operations', () => {
    test('Enqueue an item using button click', async ({ page }) => {
      await page.fill('#enqueue-input', 'Item 1');
      await page.click('#enqueue-btn');
      
      const queueDisplay = await page.locator('#queue-display .queue-item');
      await expect(queueDisplay).toHaveText('Item 1');
    });

    test('Enqueue an item using Enter key', async ({ page }) => {
      await page.fill('#enqueue-input', 'Item 2');
      await page.press('#enqueue-input', 'Enter');
      
      const queueDisplay = await page.locator('#queue-display .queue-item');
      await expect(queueDisplay).toHaveText('Item 2');
    });

    test('Enqueue multiple items', async ({ page }) => {
      await page.fill('#enqueue-input', 'Item 3');
      await page.click('#enqueue-btn');
      await page.fill('#enqueue-input', 'Item 4');
      await page.click('#enqueue-btn');
      
      const queueItems = await page.locator('#queue-display .queue-item');
      await expect(queueItems).toHaveCount(2);
      await expect(queueItems.nth(0)).toHaveText('Item 3');
      await expect(queueItems.nth(1)).toHaveText('Item 4');
    });
  });

  test.describe('Dequeue Operations', () => {
    test('Dequeue an item', async ({ page }) => {
      await page.fill('#enqueue-input', 'Item 5');
      await page.click('#enqueue-btn');
      await page.click('#dequeue-btn');
      
      const queueDisplay = await page.locator('#queue-display');
      await expect(queueDisplay).toHaveText('(Queue is empty)');
    });

    test('Dequeue from empty queue', async ({ page }) => {
      await page.click('#dequeue-btn');
      const alertMessage = await page.on('dialog', dialog => dialog.message());
      await expect(alertMessage).toBe('Queue is empty. Cannot dequeue.');
    });
  });

  test.describe('Peek Operations', () => {
    test('Peek at the front item', async ({ page }) => {
      await page.fill('#enqueue-input', 'Item 6');
      await page.click('#enqueue-btn');
      await page.click('#peek-btn');
      
      const alertMessage = await page.on('dialog', dialog => dialog.message());
      await expect(alertMessage).toBe('Front of the queue: "Item 6"');
    });

    test('Peek from empty queue', async ({ page }) => {
      await page.click('#peek-btn');
      const alertMessage = await page.on('dialog', dialog => dialog.message());
      await expect(alertMessage).toBe('Queue is empty. Nothing to peek.');
    });
  });

  test.describe('Clear Operations', () => {
    test('Clear the queue', async ({ page }) => {
      await page.fill('#enqueue-input', 'Item 7');
      await page.click('#enqueue-btn');
      await page.click('#clear-btn');
      
      const queueDisplay = await page.locator('#queue-display');
      await expect(queueDisplay).toHaveText('(Queue is empty)');
    });

    test('Clear an already empty queue', async ({ page }) => {
      await page.click('#clear-btn');
      const alertMessage = await page.on('dialog', dialog => dialog.message());
      await expect(alertMessage).toBe('Queue is already empty.');
    });
  });

  test.describe('Log Verification', () => {
    test('Log should update on enqueue', async ({ page }) => {
      await page.fill('#enqueue-input', 'Item 8');
      await page.click('#enqueue-btn');
      
      const log = await page.locator('#log');
      await expect(log).toContainText('Enqueued "Item 8". Queue size is now 1.');
    });

    test('Log should update on dequeue', async ({ page }) => {
      await page.fill('#enqueue-input', 'Item 9');
      await page.click('#enqueue-btn');
      await page.click('#dequeue-btn');
      
      const log = await page.locator('#log');
      await expect(log).toContainText('Dequeued "Item 9". Queue size is now 0.');
    });

    test('Log should update on peek', async ({ page }) => {
      await page.fill('#enqueue-input', 'Item 10');
      await page.click('#enqueue-btn');
      await page.click('#peek-btn');
      
      const log = await page.locator('#log');
      await expect(log).toContainText('Peeked at front: "Item 10".');
    });

    test('Log should update on clear', async ({ page }) => {
      await page.fill('#enqueue-input', 'Item 11');
      await page.click('#enqueue-btn');
      await page.click('#clear-btn');
      
      const log = await page.locator('#log');
      await expect(log).toContainText('Queue cleared.');
    });
  });
});