import { test, expect } from '@playwright/test';

test.describe('Deque Interactive Application', () => {
  const url = 'http://127.0.0.1:5500/workspace/batch-2025-11-23T16-28-58/html/8ca8c1b0-c889-11f0-b3ac-b154feda1ba6.html';

  test.beforeEach(async ({ page }) => {
    await page.goto(url);
  });

  test('should add element to the front of the deque', async ({ page }) => {
    // Trigger ADD_FRONT event
    page.once('dialog', async dialog => {
      expect(dialog.message()).toBe('输入新元素(前端):');
      await dialog.accept('FrontElement');
    });
    await page.click('button[onclick="addFront()"]');

    // Verify element is added to the front
    const elements = await page.$$('#dequeContainer .element');
    expect(elements).toHaveLength(1);
    expect(await elements[0].textContent()).toBe('FrontElement');
  });

  test('should remove element from the front of the deque', async ({ page }) => {
    // Add an element first
    page.once('dialog', async dialog => {
      await dialog.accept('FrontElement');
    });
    await page.click('button[onclick="addFront()"]');

    // Trigger REMOVE_FRONT event
    await page.click('button[onclick="removeFront()"]');

    // Verify element is removed
    const elements = await page.$$('#dequeContainer .element');
    expect(elements).toHaveLength(0);
  });

  test('should add element to the rear of the deque', async ({ page }) => {
    // Trigger ADD_REAR event
    page.once('dialog', async dialog => {
      expect(dialog.message()).toBe('输入新元素(后端):');
      await dialog.accept('RearElement');
    });
    await page.click('button[onclick="addRear()"]');

    // Verify element is added to the rear
    const elements = await page.$$('#dequeContainer .element');
    expect(elements).toHaveLength(1);
    expect(await elements[0].textContent()).toBe('RearElement');
  });

  test('should remove element from the rear of the deque', async ({ page }) => {
    // Add an element first
    page.once('dialog', async dialog => {
      await dialog.accept('RearElement');
    });
    await page.click('button[onclick="addRear()"]');

    // Trigger REMOVE_REAR event
    await page.click('button[onclick="removeRear()"]');

    // Verify element is removed
    const elements = await page.$$('#dequeContainer .element');
    expect(elements).toHaveLength(0);
  });

  test('should handle removing from an empty deque gracefully', async ({ page }) => {
    // Attempt to remove from the front of an empty deque
    page.once('dialog', async dialog => {
      expect(dialog.message()).toBe('双端队列为空，无法移除前端元素！');
      await dialog.accept();
    });
    await page.click('button[onclick="removeFront()"]');

    // Attempt to remove from the rear of an empty deque
    page.once('dialog', async dialog => {
      expect(dialog.message()).toBe('双端队列为空，无法移除后端元素！');
      await dialog.accept();
    });
    await page.click('button[onclick="removeRear()"]');
  });
});