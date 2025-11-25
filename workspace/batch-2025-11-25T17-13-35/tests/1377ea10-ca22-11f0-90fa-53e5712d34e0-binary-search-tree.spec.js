import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-25T17-13-35/html/1377ea10-ca22-11f0-90fa-53e5712d34e0.html';

test.describe('Binary Search Tree Application', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test.describe('Idle State Tests', () => {
    test('should display the initial state correctly', async ({ page }) => {
      const title = await page.title();
      expect(title).toBe('Binary Search Tree');
      const bstNode = await page.locator('.BST .Node.root');
      await expect(bstNode).toBeVisible();
    });

    test('should transition to inserting state on INSERT_CLICKED', async ({ page }) => {
      await page.click('.insert-btn');
      // Assuming the animation starts on entering the inserting state
      await expect(page).toHaveSelector('.inserting-animation', { timeout: 5000 });
    });

    test('should transition to finding state on FIND_CLICKED', async ({ page }) => {
      await page.click('.find-btn');
      // Assuming the animation starts on entering the finding state
      await expect(page).toHaveSelector('.finding-animation', { timeout: 5000 });
    });
  });

  test.describe('Inserting State Tests', () => {
    test('should complete insertion and return to idle state', async ({ page }) => {
      await page.click('.insert-btn');
      // Simulate insertion completion
      await page.evaluate(() => {
        // Simulate the INSERT_COMPLETE event
        document.dispatchEvent(new Event('INSERT_COMPLETE'));
      });
      await expect(page).toHaveSelector('.idle-state', { timeout: 5000 });
    });

    test('should fail insertion and return to idle state', async ({ page }) => {
      await page.click('.insert-btn');
      // Simulate insertion failure
      await page.evaluate(() => {
        // Simulate the INSERT_FAILED event
        document.dispatchEvent(new Event('INSERT_FAILED'));
      });
      await expect(page).toHaveSelector('.idle-state', { timeout: 5000 });
    });
  });

  test.describe('Finding State Tests', () => {
    test('should find an element and return to idle state', async ({ page }) => {
      await page.click('.find-btn');
      // Simulate finding completion
      await page.evaluate(() => {
        // Simulate the FIND_COMPLETE event
        document.dispatchEvent(new Event('FIND_COMPLETE'));
      });
      await expect(page).toHaveSelector('.idle-state', { timeout: 5000 });
    });

    test('should not find an element and return to idle state', async ({ page }) => {
      await page.click('.find-btn');
      // Simulate finding not found
      await page.evaluate(() => {
        // Simulate the FIND_NOT_FOUND event
        document.dispatchEvent(new Event('FIND_NOT_FOUND'));
      });
      await expect(page).toHaveSelector('.idle-state', { timeout: 5000 });
    });
  });

  test.describe('Edge Cases and Error Scenarios', () => {
    test('should handle invalid insertions gracefully', async ({ page }) => {
      await page.click('.insert-btn');
      // Simulate an invalid insertion
      await page.evaluate(() => {
        // Simulate the INSERT_FAILED event
        document.dispatchEvent(new Event('INSERT_FAILED'));
      });
      await expect(page).toHaveSelector('.idle-state', { timeout: 5000 });
    });

    test('should handle finding non-existent elements gracefully', async ({ page }) => {
      await page.click('.find-btn');
      // Simulate a find operation that does not find the element
      await page.evaluate(() => {
        // Simulate the FIND_NOT_FOUND event
        document.dispatchEvent(new Event('FIND_NOT_FOUND'));
      });
      await expect(page).toHaveSelector('.idle-state', { timeout: 5000 });
    });
  });
});