import { test, expect } from '@playwright/test';

const url = 'http://127.0.0.1:5500/workspace/batch-test-1205-3/html/b8b74ad0-d1d3-11f0-9bcf-07cd16c51572.html';

test.describe('Binary Search Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application page before each test
        await page.goto(url);
    });

    test('should load the page with default state', async ({ page }) => {
        // Verify that the page loads with the correct title
        await expect(page).toHaveTitle('Binary Search Demo');

        // Check that the input fields are empty initially
        const arrayInput = await page.locator('#arrayInput');
        const targetInput = await page.locator('#targetInput');
        await expect(arrayInput).toHaveValue('');
        await expect(targetInput).toHaveValue('');

        // Check that the result div is empty
        const resultDiv = await page.locator('#result');
        await expect(resultDiv).toHaveText('');
    });

    test('should display result when target is found', async ({ page }) => {
        // Input a sorted array and a target number
        await page.fill('#arrayInput', '1,2,3,4,5');
        await page.fill('#targetInput', '3');

        // Click the search button
        await page.click('button');

        // Verify the result message
        const resultDiv = await page.locator('#result');
        await expect(resultDiv).toHaveText('Target 3 found at index 2 in the array.');
    });

    test('should display result when target is not found', async ({ page }) => {
        // Input a sorted array and a target number not in the array
        await page.fill('#arrayInput', '1,2,3,4,5');
        await page.fill('#targetInput', '6');

        // Click the search button
        await page.click('button');

        // Verify the result message
        const resultDiv = await page.locator('#result');
        await expect(resultDiv).toHaveText('Target 6 not found in the array.');
    });

    test('should handle empty array input', async ({ page }) => {
        // Input an empty array and a target number
        await page.fill('#arrayInput', '');
        await page.fill('#targetInput', '1');

        // Click the search button
        await page.click('button');

        // Verify the result message
        const resultDiv = await page.locator('#result');
        await expect(resultDiv).toHaveText('Target 1 not found in the array.');
    });

    test('should handle invalid number input for target', async ({ page }) => {
        // Input a valid sorted array
        await page.fill('#arrayInput', '1,2,3,4,5');
        // Input an invalid target
        await page.fill('#targetInput', 'abc');

        // Click the search button
        await page.click('button');

        // Verify the result message
        const resultDiv = await page.locator('#result');
        await expect(resultDiv).toHaveText('Target NaN not found in the array.');
    });

    test('should handle whitespace in array input', async ({ page }) => {
        // Input a sorted array with whitespace
        await page.fill('#arrayInput', ' 1 , 2 , 3 , 4 , 5 ');
        await page.fill('#targetInput', '4');

        // Click the search button
        await page.click('button');

        // Verify the result message
        const resultDiv = await page.locator('#result');
        await expect(resultDiv).toHaveText('Target 4 found at index 3 in the array.');
    });
});