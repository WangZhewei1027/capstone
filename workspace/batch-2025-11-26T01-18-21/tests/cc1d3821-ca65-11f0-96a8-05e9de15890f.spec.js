import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-18-21/html/cc1d3821-ca65-11f0-96a8-05e9de15890f.html';

test.describe('Red-Black Tree Visualizer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test.describe('Insertion Tests', () => {
    test('should insert a value instantly', async ({ page }) => {
      await page.fill('#insertVal', '42');
      await page.click('#btnInsert');
      await expect(page.locator('#lastAction')).toHaveText('Inserted 42');
      await expect(page.locator('#svg .node')).toHaveCount(1);
    });

    test('should insert a value with animation', async ({ page }) => {
      await page.fill('#insertVal', '43');
      await page.click('#btnInsertStep');
      await expect(page.locator('#lastAction')).toHaveText('Inserted 43');
      await expect(page.locator('#svg .node')).toHaveCount(2);
    });

    test('should insert a random value', async ({ page }) => {
      await page.click('#btnRandom');
      const value = await page.inputValue('#insertVal');
      await expect(page.locator('#lastAction')).toContainText(`Inserted ${value}`);
      await expect(page.locator('#svg .node')).toHaveCount(1);
    });

    test('should bulk insert values', async ({ page }) => {
      await page.click('#btnBulk');
      await expect(page.locator('#lastAction')).toContainText('Inserted');
      await expect(page.locator('#svg .node')).toHaveCount(10);
    });
  });

  test.describe('Deletion Tests', () => {
    test('should delete a value with animation', async ({ page }) => {
      await page.fill('#insertVal', '50');
      await page.click('#btnInsertStep');
      await page.fill('#deleteVal', '50');
      await page.click('#btnDelete');
      await expect(page.locator('#lastAction')).toHaveText('Deleted 50');
      await expect(page.locator('#svg .node')).toHaveCount(0);
    });

    test('should not delete a non-existent value', async ({ page }) => {
      await page.fill('#deleteVal', '100');
      await page.click('#btnDelete');
      await expect(page.locator('#lastAction')).toHaveText('Value 100 not found');
    });
  });

  test.describe('Clearing Tests', () => {
    test('should clear the tree', async ({ page }) => {
      await page.fill('#insertVal', '60');
      await page.click('#btnInsertStep');
      await page.click('#btnClear');
      await expect(page.locator('#lastAction')).toHaveText('Cleared tree');
      await expect(page.locator('#svg .node')).toHaveCount(0);
    });
  });

  test.describe('Example Sequence Tests', () => {
    test('should load example sequence', async ({ page }) => {
      await page.click('#btnExample');
      await expect(page.locator('#lastAction')).toContainText('Inserted');
      await expect(page.locator('#svg .node')).toHaveCount(9);
    });
  });

  test.describe('Speed Adjustment Tests', () => {
    test('should adjust animation speed', async ({ page }) => {
      await page.fill('#speed', '300');
      await page.click('#speed');
      await expect(page.locator('#speedVal')).toHaveText('300');
    });
  });

  test.describe('Blocked Operations Tests', () => {
    test('should block insert while running', async ({ page }) => {
      await page.fill('#insertVal', '70');
      await page.click('#btnInsertStep');
      await page.click('#btnInsert');
      await expect(page.locator('#lastAction')).toHaveText('Operation ignored: animation in progress');
    });
  });

  test.describe('Edge Cases and Error Scenarios', () => {
    test('should not insert a non-finite value', async ({ page }) => {
      await page.fill('#insertVal', 'abc');
      await page.click('#btnInsert');
      await expect(page.locator('#lastAction')).toHaveText('Value abc already present');
    });

    test('should not delete while running', async ({ page }) => {
      await page.fill('#insertVal', '80');
      await page.click('#btnInsertStep');
      await page.fill('#deleteVal', '80');
      await page.click('#btnDelete');
      await expect(page.locator('#lastAction')).toHaveText('Operation ignored: animation in progress');
    });
  });
});