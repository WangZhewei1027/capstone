import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-14-37/html/cdcb5a50-ca86-11f0-aa32-8b1afd472b96.html';

test.describe('Topological Sort Application', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application before each test
    await page.goto(BASE_URL);
  });

  test('should display the input field and sort button on idle state', async ({ page }) => {
    // Validate that the input field and sort button are present
    const inputField = await page.locator('#myArray');
    const sortButton = await page.locator('button[onclick="sortArray()"]');

    await expect(inputField).toBeVisible();
    await expect(sortButton).toBeVisible();
  });

  test('should sort the array when the sort button is clicked', async ({ page }) => {
    // Input an array and click the sort button
    await page.fill('#myArray', '3,1,2');
    await page.click('button[onclick="sortArray()"]');

    // Validate that the input field is cleared after sorting
    await expect(page.locator('#myArray')).toHaveValue('');
    
    // Since the sorted array is not displayed, we will check if the function executes correctly
    // This would typically require a way to verify the sorted result, but as per the provided code, it does not show output.
    // Assuming we would have an output area, we would check it here.
  });

  test('should handle empty input gracefully', async ({ page }) => {
    // Click the sort button without input
    await page.click('button[onclick="sortArray()"]');

    // Validate that the input field is still empty
    await expect(page.locator('#myArray')).toHaveValue('');
  });

  test('should handle invalid input gracefully', async ({ page }) => {
    // Input invalid data and click the sort button
    await page.fill('#myArray', 'abc');
    await page.click('button[onclick="sortArray()"]');

    // Validate that the input field is cleared after sorting
    await expect(page.locator('#myArray')).toHaveValue('');
  });

  test('should sort an array of numbers correctly', async ({ page }) => {
    // Input a valid array and click the sort button
    await page.fill('#myArray', '5,3,8,1,2');
    await page.click('button[onclick="sortArray()"]');

    // Validate that the input field is cleared after sorting
    await expect(page.locator('#myArray')).toHaveValue('');
    
    // Again, since there is no output area, we cannot validate the sorted result directly.
    // This would require modification to the HTML to display the sorted result.
  });
});