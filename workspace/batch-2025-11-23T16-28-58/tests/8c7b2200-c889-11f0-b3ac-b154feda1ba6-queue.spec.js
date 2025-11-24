import { test, expect } from '@playwright/test';

test.describe('Queue Interactive Visualization Tests', () => {
  const url = 'http://127.0.0.1:5500/workspace/batch-2025-11-23T16-28-58/html/8c7b2200-c889-11f0-b3ac-b154feda1ba6.html';

  test.beforeEach(async ({ page }) => {
    await page.goto(url);
  });

  test('Initial state should be idle with empty queue', async ({ page }) => {
    const queueItems = await page.$$('#queue-container .queue-item');
    expect(queueItems.length).toBe(0);
  });

  test.describe('Enqueue Operation', () => {
    test('should transition from idle to itemAdded state', async ({ page }) => {
      await page.fill('#enqueue-input', '1');
      await page.click('button[onclick="enqueue()"]');
      const queueItems = await page.$$('#queue-container .queue-item');
      expect(queueItems.length).toBe(1);
      expect(await queueItems[0].innerText()).toBe('1');
      expect(await queueItems[0].getAttribute('class')).toContain('highlight');
    });

    test('should add multiple items to the queue', async ({ page }) => {
      await page.fill('#enqueue-input', '1');
      await page.click('button[onclick="enqueue()"]');
      await page.fill('#enqueue-input', '2');
      await page.click('button[onclick="enqueue()"]');
      const queueItems = await page.$$('#queue-container .queue-item');
      expect(queueItems.length).toBe(2);
      expect(await queueItems[0].innerText()).toBe('1');
      expect(await queueItems[1].innerText()).toBe('2');
    });

    test('should not add empty item to the queue', async ({ page }) => {
      await page.click('button[onclick="enqueue()"]');
      const queueItems = await page.$$('#queue-container .queue-item');
      expect(queueItems.length).toBe(0);
    });
  });

  test.describe('Dequeue Operation', () => {
    test('should transition from itemAdded to itemRemoved state', async ({ page }) => {
      await page.fill('#enqueue-input', '1');
      await page.click('button[onclick="enqueue()"]');
      await page.click('button[onclick="dequeue()"]');
      const queueItems = await page.$$('#queue-container .queue-item');
      expect(queueItems.length).toBe(0);
    });

    test('should remove the highlighted item from the queue', async ({ page }) => {
      await page.fill('#enqueue-input', '1');
      await page.click('button[onclick="enqueue()"]');
      await page.fill('#enqueue-input', '2');
      await page.click('button[onclick="enqueue()"]');
      await page.click('button[onclick="dequeue()"]');
      const queueItems = await page.$$('#queue-container .queue-item');
      expect(queueItems.length).toBe(1);
      expect(await queueItems[0].innerText()).toBe('2');
      expect(await queueItems[0].getAttribute('class')).toContain('highlight');
    });

    test('should not dequeue from an empty queue', async ({ page }) => {
      await page.click('button[onclick="dequeue()"]');
      const queueItems = await page.$$('#queue-container .queue-item');
      expect(queueItems.length).toBe(0);
    });
  });

  test.describe('Clear Queue Operation', () => {
    test('should transition to cleared state and empty the queue', async ({ page }) => {
      await page.fill('#enqueue-input', '1');
      await page.click('button[onclick="enqueue()"]');
      await page.fill('#enqueue-input', '2');
      await page.click('button[onclick="enqueue()"]');
      await page.click('button[onclick="clearQueue()"]');
      const queueItems = await page.$$('#queue-container .queue-item');
      expect(queueItems.length).toBe(0);
    });

    test('should remain in cleared state when clearing an already empty queue', async ({ page }) => {
      await page.click('button[onclick="clearQueue()"]');
      const queueItems = await page.$$('#queue-container .queue-item');
      expect(queueItems.length).toBe(0);
    });
  });

  test.describe('State Transitions', () => {
    test('should transition correctly between states', async ({ page }) => {
      await page.fill('#enqueue-input', '1');
      await page.click('button[onclick="enqueue()"]');
      await page.click('button[onclick="dequeue()"]');
      await page.click('button[onclick="enqueue()"]');
      await page.click('button[onclick="clearQueue()"]');
      const queueItems = await page.$$('#queue-container .queue-item');
      expect(queueItems.length).toBe(0);
    });
  });
});