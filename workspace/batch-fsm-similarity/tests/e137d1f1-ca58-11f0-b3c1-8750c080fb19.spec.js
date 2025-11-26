import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-25T23-45-53/html/e137d1f1-ca58-11f0-b3c1-8750c080fb19.html';

test.describe('Linear Search Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should display error message for invalid input', async ({ page }) => {
        // Simulate user clicking the search button without valid input
        await page.click('#searchButton');
        
        // Verify that the error message is displayed
        const resultDisplay = await page.locator('#resultDisplay');
        await expect(resultDisplay).toHaveText('Please enter a valid number list and target number.');
    });

    test('should display result when number is found', async ({ page }) => {
        // Input valid array and search for a number that exists
        await page.fill('#arrayInput', '4, 2, 7, 1, 3');
        await page.fill('#searchInput', '7');
        await page.click('#searchButton');
        
        // Verify that the result is displayed correctly
        const resultDisplay = await page.locator('#resultDisplay');
        await expect(resultDisplay).toHaveText('Number 7 found at index 2.');
    });

    test('should display not found message when number is not in array', async ({ page }) => {
        // Input valid array and search for a number that does not exist
        await page.fill('#arrayInput', '4, 2, 7, 1, 3');
        await page.fill('#searchInput', '5');
        await page.click('#searchButton');
        
        // Verify that the not found message is displayed
        const resultDisplay = await page.locator('#resultDisplay');
        await expect(resultDisplay).toHaveText('Number 5 not found.');
    });

    test('should handle empty array input gracefully', async ({ page }) => {
        // Input an empty array and a valid search number
        await page.fill('#arrayInput', '');
        await page.fill('#searchInput', '3');
        await page.click('#searchButton');
        
        // Verify that the error message is displayed
        const resultDisplay = await page.locator('#resultDisplay');
        await expect(resultDisplay).toHaveText('Please enter a valid number list and target number.');
    });

    test('should reset input fields after error', async ({ page }) => {
        // Input invalid data to trigger error
        await page.fill('#arrayInput', '');
        await page.fill('#searchInput', '3');
        await page.click('#searchButton');
        
        // Verify error message is displayed
        let resultDisplay = await page.locator('#resultDisplay');
        await expect(resultDisplay).toHaveText('Please enter a valid number list and target number.');

        // Simulate user correcting the input
        await page.fill('#arrayInput', '1, 2, 3');
        await page.fill('#searchInput', '2');
        await page.click('#searchButton');
        
        // Verify that the result is displayed correctly
        resultDisplay = await page.locator('#resultDisplay');
        await expect(resultDisplay).toHaveText('Number 2 found at index 1.');
    });
});