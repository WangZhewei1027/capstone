import { test, expect } from '@playwright/test';

test.describe('Deque (Double-Ended Queue) FSM Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://127.0.0.1:5500/workspace/batch-2025-11-23T16-59-33/html/c8b45213-c88d-11f0-bba4-b3577ad7fe65.html');
  });

  test('Initial state should be empty', async ({ page }) => {
    const dequeDisplay = await page.locator('#dequeDisplay');
    await expect(dequeDisplay).toHaveText('Deque is empty');
    await expect(page.locator('#popFrontBtn')).toBeDisabled();
    await expect(page.locator('#popBackBtn')).toBeDisabled();
  });

  test.describe('Add elements', () => {
    test('Add element to front', async ({ page }) => {
      await page.fill('#valueInput', 'Front1');
      await page.click('#pushFrontBtn');
      const dequeDisplay = await page.locator('#dequeDisplay');
      await expect(dequeDisplay.locator('.deque-element')).toHaveText('Front1');
    });

    test('Add element to back', async ({ page }) => {
      await page.fill('#valueInput', 'Back1');
      await page.click('#pushBackBtn');
      const dequeDisplay = await page.locator('#dequeDisplay');
      await expect(dequeDisplay.locator('.deque-element')).toHaveText('Back1');
    });

    test('Add multiple elements to front and back', async ({ page }) => {
      await page.fill('#valueInput', 'Front1');
      await page.click('#pushFrontBtn');
      await page.fill('#valueInput', 'Back1');
      await page.click('#pushBackBtn');
      await page.fill('#valueInput', 'Front2');
      await page.click('#pushFrontBtn');
      const dequeDisplay = await page.locator('#dequeDisplay');
      await expect(dequeDisplay.locator('.deque-element').nth(0)).toHaveText('Front2');
      await expect(dequeDisplay.locator('.deque-element').nth(1)).toHaveText('Front1');
      await expect(dequeDisplay.locator('.deque-element').nth(2)).toHaveText('Back1');
    });
  });

  test.describe('Remove elements', () => {
    test.beforeEach(async ({ page }) => {
      await page.fill('#valueInput', 'Front1');
      await page.click('#pushFrontBtn');
      await page.fill('#valueInput', 'Back1');
      await page.click('#pushBackBtn');
    });

    test('Remove element from front', async ({ page }) => {
      await page.click('#popFrontBtn');
      const alertMessage = await page.on('dialog', dialog => dialog.message());
      expect(alertMessage).toBe('Removed from front: "Front1"');
      const dequeDisplay = await page.locator('#dequeDisplay');
      await expect(dequeDisplay.locator('.deque-element')).toHaveText('Back1');
    });

    test('Remove element from back', async ({ page }) => {
      await page.click('#popBackBtn');
      const alertMessage = await page.on('dialog', dialog => dialog.message());
      expect(alertMessage).toBe('Removed from back: "Back1"');
      const dequeDisplay = await page.locator('#dequeDisplay');
      await expect(dequeDisplay.locator('.deque-element')).toHaveText('Front1');
    });

    test('Remove all elements and check empty state', async ({ page }) => {
      await page.click('#popFrontBtn');
      await page.click('#popBackBtn');
      const dequeDisplay = await page.locator('#dequeDisplay');
      await expect(dequeDisplay).toHaveText('Deque is empty');
      await expect(page.locator('#popFrontBtn')).toBeDisabled();
      await expect(page.locator('#popBackBtn')).toBeDisabled();
    });
  });

  test.describe('Clear deque', () => {
    test.beforeEach(async ({ page }) => {
      await page.fill('#valueInput', 'Front1');
      await page.click('#pushFrontBtn');
      await page.fill('#valueInput', 'Back1');
      await page.click('#pushBackBtn');
    });

    test('Clear all elements', async ({ page }) => {
      await page.click('#clearBtn');
      await page.on('dialog', dialog => dialog.accept());
      const dequeDisplay = await page.locator('#dequeDisplay');
      await expect(dequeDisplay).toHaveText('Deque is empty');
    });

    test('Clear button should not prompt if deque is already empty', async ({ page }) => {
      await page.click('#clearBtn');
      await page.on('dialog', dialog => dialog.accept());
      await page.click('#clearBtn');
      const dialogs = await page.locator('dialog');
      expect(dialogs).toHaveCount(0);
    });
  });

  test.describe('Edge cases and error scenarios', () => {
    test('Buttons should be disabled when input is empty', async ({ page }) => {
      await page.fill('#valueInput', '');
      await expect(page.locator('#pushFrontBtn')).toBeDisabled();
      await expect(page.locator('#pushBackBtn')).toBeDisabled();
    });

    test('Attempt to remove from empty deque should not change state', async ({ page }) => {
      await page.click('#popFrontBtn');
      const dequeDisplay = await page.locator('#dequeDisplay');
      await expect(dequeDisplay).toHaveText('Deque is empty');
    });
  });
});