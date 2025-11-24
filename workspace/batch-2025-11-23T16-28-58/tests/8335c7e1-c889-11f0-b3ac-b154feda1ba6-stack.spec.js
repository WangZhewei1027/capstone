import { test, expect } from '@playwright/test';

test.describe('Stack Visualization Application', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://127.0.0.1:5500/workspace/batch-2025-11-23T16-28-58/html/8335c7e1-c889-11f0-b3ac-b154feda1ba6.html');
  });

  test('should start in empty state', async ({ page }) => {
    const stackItems = await page.$$('.stackItem');
    expect(stackItems.length).toBe(0);
  });

  test.describe('Adding items', () => {
    test('should transition from empty to adding and then to not_empty', async ({ page }) => {
      await page.click('button[onclick="pushItem()"]');
      const stackItems = await page.$$('.stackItem');
      expect(stackItems.length).toBe(1);
      expect(await stackItems[0].textContent()).toBe('元素 1');
    });

    test('should transition from not_empty to adding and then to full', async ({ page }) => {
      for (let i = 0; i < 6; i++) {
        await page.click('button[onclick="pushItem()"]');
      }
      const stackItems = await page.$$('.stackItem');
      expect(stackItems.length).toBe(6);
      await page.click('button[onclick="pushItem()"]');
      const alertMessage = await page.evaluate(() => window.alert.mock.calls[0][0]);
      expect(alertMessage).toBe('Stack 已满！');
    });
  });

  test.describe('Removing items', () => {
    test('should transition from not_empty to removing and then to empty', async ({ page }) => {
      await page.click('button[onclick="pushItem()"]');
      await page.click('button[onclick="popItem()"]');
      const stackItems = await page.$$('.stackItem');
      expect(stackItems.length).toBe(0);
    });

    test('should transition from full to removing and then to not_empty', async ({ page }) => {
      for (let i = 0; i < 6; i++) {
        await page.click('button[onclick="pushItem()"]');
      }
      await page.click('button[onclick="popItem()"]');
      const stackItems = await page.$$('.stackItem');
      expect(stackItems.length).toBe(5);
    });

    test('should alert when trying to pop from empty stack', async ({ page }) => {
      await page.click('button[onclick="popItem()"]');
      const alertMessage = await page.evaluate(() => window.alert.mock.calls[0][0]);
      expect(alertMessage).toBe('Stack 为空！');
    });
  });

  test.describe('Edge cases', () => {
    test('should handle multiple push and pop operations correctly', async ({ page }) => {
      for (let i = 0; i < 3; i++) {
        await page.click('button[onclick="pushItem()"]');
      }
      for (let i = 0; i < 2; i++) {
        await page.click('button[onclick="popItem()"]');
      }
      const stackItems = await page.$$('.stackItem');
      expect(stackItems.length).toBe(1);
      expect(await stackItems[0].textContent()).toBe('元素 3');
    });
  });
});