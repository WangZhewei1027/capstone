import { test, expect } from '@playwright/test';

test.describe('Linked List Visualization and Demo Application', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://127.0.0.1:5500/workspace/batch-2025-11-23T16-59-33/html/c8b45210-c88d-11f0-bba4-b3577ad7fe65.html');
  });

  test('should start in idle state with empty list', async ({ page }) => {
    const listDisplay = await page.locator('#listDisplay');
    await expect(listDisplay).toHaveText('List is empty');
  });

  test.describe('Insert Operations', () => {
    test('should insert node at head', async ({ page }) => {
      await page.fill('#valueInput', '10');
      await page.click('#insertHeadBtn');
      const listDisplay = await page.locator('#listDisplay .node');
      await expect(listDisplay).toHaveText('10');
    });

    test('should insert node at tail', async ({ page }) => {
      await page.fill('#valueInput', '20');
      await page.click('#insertTailBtn');
      const listDisplay = await page.locator('#listDisplay .node');
      await expect(listDisplay).toHaveText('20');
    });

    test('should insert node at specific index', async ({ page }) => {
      await page.fill('#valueInput', '30');
      await page.fill('#indexInput', '0');
      await page.click('#insertAtIndexBtn');
      const listDisplay = await page.locator('#listDisplay .node');
      await expect(listDisplay).toHaveText('30');
    });

    test('should handle invalid index for insertion', async ({ page }) => {
      await page.fill('#valueInput', '40');
      await page.fill('#indexInput', '100');
      await page.click('#insertAtIndexBtn');
      const alertMessage = await page.on('dialog', dialog => dialog.message());
      await expect(alertMessage).toContain('Index out of bounds');
    });
  });

  test.describe('Remove Operations', () => {
    test('should remove node at specific index', async ({ page }) => {
      await page.fill('#removeIndexInput', '0');
      await page.click('#removeAtIndexBtn');
      const listDisplay = await page.locator('#listDisplay');
      await expect(listDisplay).toHaveText('List is empty');
    });

    test('should handle invalid index for removal', async ({ page }) => {
      await page.fill('#removeIndexInput', '100');
      await page.click('#removeAtIndexBtn');
      const alertMessage = await page.on('dialog', dialog => dialog.message());
      await expect(alertMessage).toContain('Index out of bounds');
    });
  });

  test.describe('Clear Operation', () => {
    test('should clear the list', async ({ page }) => {
      await page.click('#clearBtn');
      const listDisplay = await page.locator('#listDisplay');
      await expect(listDisplay).toHaveText('List is empty');
    });

    test('should confirm before clearing the list', async ({ page }) => {
      await page.on('dialog', dialog => dialog.accept());
      await page.click('#clearBtn');
      const listDisplay = await page.locator('#listDisplay');
      await expect(listDisplay).toHaveText('List is empty');
    });
  });

  test.describe('Edge Cases and Error Handling', () => {
    test('should alert when inserting with empty value', async ({ page }) => {
      await page.click('#insertHeadBtn');
      const alertMessage = await page.on('dialog', dialog => dialog.message());
      await expect(alertMessage).toContain('Value input cannot be empty.');
    });

    test('should alert when inserting at index with empty value', async ({ page }) => {
      await page.fill('#indexInput', '0');
      await page.click('#insertAtIndexBtn');
      const alertMessage = await page.on('dialog', dialog => dialog.message());
      await expect(alertMessage).toContain('Value input cannot be empty.');
    });

    test('should alert when removing with empty index', async ({ page }) => {
      await page.click('#removeAtIndexBtn');
      const alertMessage = await page.on('dialog', dialog => dialog.message());
      await expect(alertMessage).toContain('Index input cannot be empty.');
    });
  });
});