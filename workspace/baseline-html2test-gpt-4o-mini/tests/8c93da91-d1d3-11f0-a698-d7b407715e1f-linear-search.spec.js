import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/8c93da91-d1d3-11f0-a698-d7b407715e1f.html';

test.describe('Linear Search Demo', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the Linear Search Demo page before each test
        await page.goto(BASE_URL);
    });

    test('should load the page with initial state', async ({ page }) => {
        // Verify that the page loads correctly with the expected title
        await expect(page).toHaveTitle('Linear Search Demo');
        
        // Check that the result div is not visible initially
        const resultDiv = await page.locator('#result');
        await expect(resultDiv).toBeHidden();
    });

    test('should display result when number is found', async ({ page }) => {
        // Input an array and a number to search
        await page.fill('#arrayInput', '12, 34, 7, 56, 23');
        await page.fill('#searchInput', '34');
        
        // Click the search button
        await page.click('#searchButton');
        
        // Check that the result is displayed correctly
        const resultDiv = await page.locator('#result');
        await expect(resultDiv).toBeVisible();
        await expect(resultDiv).toHaveText('Number 34 found at index 1.');
    });

    test('should display result when number is not found', async ({ page }) => {
        // Input an array and a number that is not in the array
        await page.fill('#arrayInput', '12, 34, 7, 56, 23');
        await page.fill('#searchInput', '100');
        
        // Click the search button
        await page.click('#searchButton');
        
        // Check that the result is displayed correctly
        const resultDiv = await page.locator('#result');
        await expect(resultDiv).toBeVisible();
        await expect(resultDiv).toHaveText('Number 100 not found in the array.');
    });

    test('should handle empty array input gracefully', async ({ page }) => {
        // Input an empty array and a number
        await page.fill('#arrayInput', '');
        await page.fill('#searchInput', '34');
        
        // Click the search button
        await page.click('#searchButton');
        
        // Check that the result is displayed correctly
        const resultDiv = await page.locator('#result');
        await expect(resultDiv).toBeVisible();
        await expect(resultDiv).toHaveText('Number 34 not found in the array.');
    });

    test('should handle invalid number input gracefully', async ({ page }) => {
        // Input an array and an invalid number
        await page.fill('#arrayInput', '12, 34, 7, 56, 23');
        await page.fill('#searchInput', 'abc');
        
        // Click the search button
        await page.click('#searchButton');
        
        // Check that the result is displayed correctly
        const resultDiv = await page.locator('#result');
        await expect(resultDiv).toBeVisible();
        await expect(resultDiv).toHaveText('Number NaN not found in the array.');
    });

    test('should handle whitespace in array input', async ({ page }) => {
        // Input an array with whitespace and a number
        await page.fill('#arrayInput', ' 12 , 34 ,  7 ,  56 , 23 ');
        await page.fill('#searchInput', '7');
        
        // Click the search button
        await page.click('#searchButton');
        
        // Check that the result is displayed correctly
        const resultDiv = await page.locator('#result');
        await expect(resultDiv).toBeVisible();
        await expect(resultDiv).toHaveText('Number 7 found at index 2.');
    });
});