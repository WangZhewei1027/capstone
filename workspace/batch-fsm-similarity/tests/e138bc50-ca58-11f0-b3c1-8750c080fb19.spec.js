import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-25T23-45-53/html/e138bc50-ca58-11f0-b3c1-8750c080fb19.html';

test.describe('Divide and Conquer - Merge Sort Application', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should be in Idle state initially', async ({ page }) => {
        const inputField = await page.locator('#arrayInput');
        const resultDiv = await page.locator('#result');

        // Verify that the input field is enabled and result is empty
        await expect(inputField).toBeEnabled();
        await expect(resultDiv).toHaveText('');
    });

    test('should process sorting when valid input is provided', async ({ page }) => {
        const inputField = await page.locator('#arrayInput');
        const sortButton = await page.locator('button');
        
        // Input valid numbers
        await inputField.fill('3, 1, 2');
        
        // Click the sort button
        await sortButton.click();
        
        // Verify that the result displays the sorted array
        const resultDiv = await page.locator('#result');
        await expect(resultDiv).toHaveText('Sorted Array: 1, 2, 3');
    });

    test('should handle empty input gracefully', async ({ page }) => {
        const inputField = await page.locator('#arrayInput');
        const sortButton = await page.locator('button');
        
        // Input empty string
        await inputField.fill('');
        
        // Click the sort button
        await sortButton.click();
        
        // Verify that the result is empty
        const resultDiv = await page.locator('#result');
        await expect(resultDiv).toHaveText('Sorted Array: ');
    });

    test('should handle invalid input gracefully', async ({ page }) => {
        const inputField = await page.locator('#arrayInput');
        const sortButton = await page.locator('button');
        
        // Input invalid numbers
        await inputField.fill('a, b, c');
        
        // Click the sort button
        await sortButton.click();
        
        // Verify that the result is empty
        const resultDiv = await page.locator('#result');
        await expect(resultDiv).toHaveText('Sorted Array: ');
    });

    test('should reset state when sort button is clicked after sorting', async ({ page }) => {
        const inputField = await page.locator('#arrayInput');
        const sortButton = await page.locator('button');
        
        // Input valid numbers
        await inputField.fill('4, 5, 6');
        
        // Click the sort button
        await sortButton.click();
        
        // Verify that the result displays the sorted array
        const resultDiv = await page.locator('#result');
        await expect(resultDiv).toHaveText('Sorted Array: 4, 5, 6');
        
        // Click the sort button again to reset
        await sortButton.click();
        
        // Verify that the input field is cleared and result is empty
        await expect(inputField).toHaveValue('');
        await expect(resultDiv).toHaveText('');
    });
});