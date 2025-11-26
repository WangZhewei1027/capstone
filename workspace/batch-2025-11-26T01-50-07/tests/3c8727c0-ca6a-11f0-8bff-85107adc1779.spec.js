import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-50-07/html/3c8727c0-ca6a-11f0-8bff-85107adc1779.html';

test.describe('Linked List Demonstration Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('should render initial empty list', async ({ page }) => {
    const listContainer = await page.locator('#listContainer');
    await expect(listContainer).toHaveText('(empty list)');
  });

  test('should add a node at the beginning', async ({ page }) => {
    await page.fill('#addValue', '10');
    await page.click('#addBeginningBtn');
    
    const listContainer = await page.locator('#listContainer');
    await expect(listContainer).toHaveText('10');
    await expect(page.locator('#message')).toHaveText('Added "10" at the beginning.');
  });

  test('should add a node at the end', async ({ page }) => {
    await page.fill('#addValue', '20');
    await page.click('#addEndBtn');

    const listContainer = await page.locator('#listContainer');
    await expect(listContainer).toHaveText('20');
    await expect(page.locator('#message')).toHaveText('Added "20" at the end.');
  });

  test('should remove a node', async ({ page }) => {
    await page.fill('#addValue', '30');
    await page.click('#addBeginningBtn');
    await page.fill('#removeValue', '30');
    await page.click('#removeBtn');

    const listContainer = await page.locator('#listContainer');
    await expect(listContainer).not.toHaveText('30');
    await expect(page.locator('#message')).toHaveText('Removed first occurrence of "30".');
  });

  test('should show error message when removing a non-existent node', async ({ page }) => {
    await page.fill('#removeValue', '40');
    await page.click('#removeBtn');

    await expect(page.locator('#message')).toHaveText('Value "40" not found in list.');
  });

  test('should search for a node', async ({ page }) => {
    await page.fill('#addValue', '50');
    await page.click('#addBeginningBtn');
    await page.fill('#searchValue', '50');
    await page.click('#searchBtn');

    const listContainer = await page.locator('#listContainer');
    await expect(listContainer).toHaveText('50');
    await expect(page.locator('#message')).toHaveText('Value "50" found at index 0.');
  });

  test('should show error message when searching for a non-existent node', async ({ page }) => {
    await page.fill('#searchValue', '60');
    await page.click('#searchBtn');

    await expect(page.locator('#message')).toHaveText('Value "60" not found in list.');
  });

  test('should clear the list', async ({ page }) => {
    await page.fill('#addValue', '70');
    await page.click('#addBeginningBtn');
    await page.click('#clearBtn');

    const listContainer = await page.locator('#listContainer');
    await expect(listContainer).toHaveText('(empty list)');
    await expect(page.locator('#message')).toHaveText('List cleared.');
  });

  test('should show confirmation before clearing the list', async ({ page }) => {
    await page.fill('#addValue', '80');
    await page.click('#addBeginningBtn');
    
    await page.locator('#clearBtn').click();
    await page.on('dialog', async dialog => {
      await dialog.accept(); // Automatically accept the dialog
    });

    const listContainer = await page.locator('#listContainer');
    await expect(listContainer).toHaveText('(empty list)');
  });

  test('should show error message when trying to add without value', async ({ page }) => {
    await page.click('#addBeginningBtn');
    await expect(page.locator('#message')).toHaveText('Please enter a value to add.');
  });

  test('should show error message when trying to remove without value', async ({ page }) => {
    await page.click('#removeBtn');
    await expect(page.locator('#message')).toHaveText('Please enter a value to remove.');
  });

  test('should show error message when trying to search without value', async ({ page }) => {
    await page.click('#searchBtn');
    await expect(page.locator('#message')).toHaveText('Please enter a value to search.');
  });
});