import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/8c949de1-d1d3-11f0-a698-d7b407715e1f.html';

test.describe('Divide and Conquer: Merge Sort Application', () => {
    
    test.beforeEach(async ({ page }) => {
        // Navigate to the application page before each test
        await page.goto(BASE_URL);
    });

    test('should load the page and display the title', async ({ page }) => {
        // Verify the title of the page
        const title = await page.title();
        expect(title).toBe('Divide and Conquer Visualization');
        
        // Check if the main heading is visible
        const heading = await page.locator('h1');
        await expect(heading).toBeVisible();
        await expect(heading).toHaveText('Divide and Conquer: Merge Sort');
    });

    test('should sort a valid array of numbers', async ({ page }) => {
        // Input a valid array and click the sort button
        await page.fill('#arrayInput', '34, 7, 23, 32, 5, 62');
        await page.click('#sortButton');

        // Check the result displayed
        const result = await page.locator('#result');
        await expect(result).toBeVisible();
        await expect(result).toHaveText('Sorted Array: 5, 7, 23, 32, 34, 62');
    });

    test('should handle empty input gracefully', async ({ page }) => {
        // Click the sort button without any input
        await page.click('#sortButton');

        // Check for the error message
        const result = await page.locator('#result');
        await expect(result).toBeVisible();
        await expect(result).toHaveText('Please enter a valid array of numbers.');
    });

    test('should handle invalid input gracefully', async ({ page }) => {
        // Input invalid data and click the sort button
        await page.fill('#arrayInput', 'abc, 123, , 456');
        await page.click('#sortButton');

        // Check for the error message
        const result = await page.locator('#result');
        await expect(result).toBeVisible();
        await expect(result).toHaveText('Sorted Array: 123, 456');
    });

    test('should sort an array with negative numbers', async ({ page }) => {
        // Input an array with negative numbers
        await page.fill('#arrayInput', '-1, -3, 2, 0, 5');
        await page.click('#sortButton');

        // Check the result displayed
        const result = await page.locator('#result');
        await expect(result).toBeVisible();
        await expect(result).toHaveText('Sorted Array: -3, -1, 0, 2, 5');
    });

    test('should sort an array with duplicates', async ({ page }) => {
        // Input an array with duplicate numbers
        await page.fill('#arrayInput', '5, 3, 5, 2, 5');
        await page.click('#sortButton');

        // Check the result displayed
        const result = await page.locator('#result');
        await expect(result).toBeVisible();
        await expect(result).toHaveText('Sorted Array: 2, 3, 5, 5, 5');
    });

    test('should sort a single number', async ({ page }) => {
        // Input a single number
        await page.fill('#arrayInput', '42');
        await page.click('#sortButton');

        // Check the result displayed
        const result = await page.locator('#result');
        await expect(result).toBeVisible();
        await expect(result).toHaveText('Sorted Array: 42');
    });

    test('should sort an already sorted array', async ({ page }) => {
        // Input an already sorted array
        await page.fill('#arrayInput', '1, 2, 3, 4, 5');
        await page.click('#sortButton');

        // Check the result displayed
        const result = await page.locator('#result');
        await expect(result).toBeVisible();
        await expect(result).toHaveText('Sorted Array: 1, 2, 3, 4, 5');
    });

    test('should show error message for non-numeric input', async ({ page }) => {
        // Input non-numeric values
        await page.fill('#arrayInput', 'hello, world');
        await page.click('#sortButton');

        // Check for the error message
        const result = await page.locator('#result');
        await expect(result).toBeVisible();
        await expect(result).toHaveText('Please enter a valid array of numbers.');
    });
});