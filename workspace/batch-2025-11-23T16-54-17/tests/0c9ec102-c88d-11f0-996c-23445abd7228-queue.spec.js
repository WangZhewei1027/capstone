import { test, expect } from '@playwright/test';

test.describe('Queue Demonstration Application', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://127.0.0.1:5500/workspace/batch-2025-11-23T16-54-17/html/0c9ec102-c88d-11f0-996c-23445abd7228.html');
  });

  test('Initial state should be empty', async ({ page }) => {
    const queueItems = await page.$$('#queueContainer .queue-item');
    expect(queueItems.length).toBe(0);

    const logText = await page.$eval('#log', el => el.textContent.trim());
    expect(logText).toBe('');

    const dequeueBtnDisabled = await page.$eval('#dequeueBtn', el => el.disabled);
    const peekBtnDisabled = await page.$eval('#peekBtn', el => el.disabled);
    const clearBtnDisabled = await page.$eval('#clearBtn', el => el.disabled);
    expect(dequeueBtnDisabled).toBe(true);
    expect(peekBtnDisabled).toBe(true);
    expect(clearBtnDisabled).toBe(true);
  });

  test.describe('Transitions from empty to non_empty state', () => {
    test('Enqueue a value', async ({ page }) => {
      await page.fill('#enqueueInput', 'testValue');
      await page.click('#enqueueBtn');

      const queueItems = await page.$$('#queueContainer .queue-item');
      expect(queueItems.length).toBe(1);
      expect(await queueItems[0].textContent()).toBe('testValue');

      const logText = await page.$eval('#log', el => el.textContent.includes('Enqueued: "testValue"'));
      expect(logText).toBe(true);

      const dequeueBtnDisabled = await page.$eval('#dequeueBtn', el => el.disabled);
      const peekBtnDisabled = await page.$eval('#peekBtn', el => el.disabled);
      const clearBtnDisabled = await page.$eval('#clearBtn', el => el.disabled);
      expect(dequeueBtnDisabled).toBe(false);
      expect(peekBtnDisabled).toBe(false);
      expect(clearBtnDisabled).toBe(false);
    });
  });

  test.describe('Transitions within non_empty state', () => {
    test.beforeEach(async ({ page }) => {
      await page.fill('#enqueueInput', 'testValue');
      await page.click('#enqueueBtn');
    });

    test('Peek the front value', async ({ page }) => {
      await page.click('#peekBtn');

      const logText = await page.$eval('#log', el => el.textContent.includes('Peek: front value is "testValue"'));
      expect(logText).toBe(true);
    });

    test('Dequeue the front value', async ({ page }) => {
      await page.click('#dequeueBtn');

      const queueItems = await page.$$('#queueContainer .queue-item');
      expect(queueItems.length).toBe(0);

      const logText = await page.$eval('#log', el => el.textContent.includes('Dequeued: "testValue"'));
      expect(logText).toBe(true);

      const dequeueBtnDisabled = await page.$eval('#dequeueBtn', el => el.disabled);
      const peekBtnDisabled = await page.$eval('#peekBtn', el => el.disabled);
      const clearBtnDisabled = await page.$eval('#clearBtn', el => el.disabled);
      expect(dequeueBtnDisabled).toBe(true);
      expect(peekBtnDisabled).toBe(true);
      expect(clearBtnDisabled).toBe(true);
    });

    test('Clear the queue', async ({ page }) => {
      await page.click('#clearBtn');

      const queueItems = await page.$$('#queueContainer .queue-item');
      expect(queueItems.length).toBe(0);

      const logText = await page.$eval('#log', el => el.textContent.includes('Cleared the queue'));
      expect(logText).toBe(true);

      const dequeueBtnDisabled = await page.$eval('#dequeueBtn', el => el.disabled);
      const peekBtnDisabled = await page.$eval('#peekBtn', el => el.disabled);
      const clearBtnDisabled = await page.$eval('#clearBtn', el => el.disabled);
      expect(dequeueBtnDisabled).toBe(true);
      expect(peekBtnDisabled).toBe(true);
      expect(clearBtnDisabled).toBe(true);
    });
  });

  test.describe('Edge cases and error scenarios', () => {
    test('Attempt to enqueue an empty value', async ({ page }) => {
      await page.fill('#enqueueInput', '');
      const enqueueBtnDisabled = await page.$eval('#enqueueBtn', el => el.disabled);
      expect(enqueueBtnDisabled).toBe(true);
    });

    test('Attempt to dequeue from an empty queue', async ({ page }) => {
      await page.click('#dequeueBtn');
      const logText = await page.$eval('#log', el => el.textContent.includes('Dequeued:'));
      expect(logText).toBe(false);
    });

    test('Attempt to peek from an empty queue', async ({ page }) => {
      await page.click('#peekBtn');
      const logText = await page.$eval('#log', el => el.textContent.includes('Peek:'));
      expect(logText).toBe(false);
    });
  });
});