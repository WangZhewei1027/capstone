import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-4/html/47b68020-d1d4-11f0-959c-5fbc7dc7191d.html';

test.describe('Counting Sort Visualization', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the Counting Sort Visualization page before each test
        await page.goto(BASE_URL);
    });

    test('should load the page and display initial elements', async ({ page }) => {
        // Verify that the title is correct
        await expect(page).toHaveTitle('Counting Sort Visualization');
        
        // Check if input field and button are visible
        const inputField = page.locator('#arrayInput');
        const sortButton = page.locator('#sortButton');
        
        await expect(inputField).toBeVisible();
        await expect(sortButton).toBeVisible();
    });

    test('should sort an array of numbers correctly', async ({ page }) => {
        // Input a valid array and click the sort button
        await page.fill('#arrayInput', '5, 3, 8, 6, 2');
        await page.click('#sortButton');

        // Verify the result is displayed correctly
        const resultDiv = page.locator('#result');
        await expect(resultDiv).toHaveText('Sorted Array: 2, 3, 5, 6, 8');

        // Check if the bars are created in the barContainer
        const barContainer = page.locator('#barContainer');
        await expect(barContainer).toHaveCount(5); // 5 numbers in the sorted array
    });

    test('should handle empty input gracefully', async ({ page }) => {
        // Click the sort button without input
        await page.click('#sortButton');

        // Verify that the result is empty
        const resultDiv = page.locator('#result');
        await expect(resultDiv).toHaveText('Sorted Array: ');
        
        // Check that no bars are displayed
        const barContainer = page.locator('#barContainer');
        await expect(barContainer).toHaveCount(0);
    });

    test('should ignore non-numeric input', async ({ page }) => {
        // Input a mix of numbers and non-numeric values
        await page.fill('#arrayInput', '5, a, 3, b, 2');
        await page.click('#sortButton');

        // Verify the result is sorted correctly
        const resultDiv = page.locator('#result');
        await expect(resultDiv).toHaveText('Sorted Array: 2, 3, 5');

        // Check if the bars are created in the barContainer
        const barContainer = page.locator('#barContainer');
        await expect(barContainer).toHaveCount(3); // Only 3 valid numbers
    });

    test('should handle negative numbers correctly', async ({ page }) => {
        // Input an array with negative numbers
        await page.fill('#arrayInput', '-1, -3, -2, 0, 2');
        await page.click('#sortButton');

        // Verify the result is sorted correctly
        const resultDiv = page.locator('#result');
        await expect(resultDiv).toHaveText('Sorted Array: -3, -2, -1, 0, 2');

        // Check if the bars are created in the barContainer
        const barContainer = page.locator('#barContainer');
        await expect(barContainer).toHaveCount(5); // 5 numbers in the sorted array
    });

    test('should display console errors for invalid input', async ({ page }) => {
        // Listen for console messages
        const consoleMessages = [];
        page.on('console', msg => consoleMessages.push(msg.text()));

        // Input an invalid array
        await page.fill('#arrayInput', '5, , 3, 2');
        await page.click('#sortButton');

        // Check for console errors
        await expect(consoleMessages).toContain('ReferenceError: Invalid input');
    });
});