import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-31-04/html/92fe7fc1-ca67-11f0-a3d6-179b5eb5e89b.html';

test.describe('Linear Search Visualization', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('Initial state is Idle', async ({ page }) => {
    const searchButton = await page.locator('#search-btn');
    await expect(searchButton).toBeEnabled();
    await expect(page.locator('#result')).toHaveText('');
    await expect(page.locator('#array-display')).toHaveText('');
  });

  test('Input validation fails with empty array', async ({ page }) => {
    await page.fill('#array-input', '');
    await page.fill('#search-input', '5');
    await page.click('#search-btn');

    await expect(page.locator('#result')).toHaveText('Please enter a valid array.');
    await expect(page.locator('#array-display')).toHaveText('');
  });

  test('Input validation fails with empty search input', async ({ page }) => {
    await page.fill('#array-input', '1,2,3');
    await page.fill('#search-input', '');
    await page.click('#search-btn');

    await expect(page.locator('#result')).toHaveText('Please enter a value to search.');
    await expect(page.locator('#array-display')).toHaveText('');
  });

  test('Successful search finds value in array', async ({ page }) => {
    await page.fill('#array-input', '3,1,4,6,5,2,7');
    await page.fill('#search-input', '4');
    await page.click('#search-btn');

    await expect(page.locator('#result')).toHaveText('Value "4" found at index 2.');
    await expect(page.locator('#array-display')).toContainText('3, 1, 4, 6, 5, 2, 7');
  });

  test('Unsuccessful search does not find value in array', async ({ page }) => {
    await page.fill('#array-input', '3,1,4,6,5,2,7');
    await page.fill('#search-input', '8');
    await page.click('#search-btn');

    await expect(page.locator('#result')).toHaveText('Value "8" not found in the array.');
    await expect(page.locator('#array-display')).toContainText('3, 1, 4, 6, 5, 2, 7');
  });

  test('Search button is disabled during search', async ({ page }) => {
    await page.fill('#array-input', '3,1,4,6,5,2,7');
    await page.fill('#search-input', '4');
    await page.click('#search-btn');

    const searchButton = await page.locator('#search-btn');
    await expect(searchButton).toBeDisabled();

    await page.waitForTimeout(3000); // Wait for the search to complete
    await expect(searchButton).toBeEnabled();
  });

  test('Reset state after search completes', async ({ page }) => {
    await page.fill('#array-input', '3,1,4,6,5,2,7');
    await page.fill('#search-input', '4');
    await page.click('#search-btn');

    await page.waitForTimeout(3000); // Wait for the search to complete
    await expect(page.locator('#result')).toHaveText('Value "4" found at index 2.');
    await expect(page.locator('#array-display')).toContainText('3, 1, 4, 6, 5, 2, 7');

    await page.fill('#array-input', '');
    await page.fill('#search-input', '');
    await expect(page.locator('#result')).toHaveText('');
    await expect(page.locator('#array-display')).toHaveText('');
  });
});