import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/8c9476d1-d1d3-11f0-a698-d7b407715e1f.html';

test.describe('Knapsack Problem Solver', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the Knapsack Problem page before each test
        await page.goto(BASE_URL);
    });

    test('should load the page with default state', async ({ page }) => {
        // Verify that the page loads correctly
        await expect(page).toHaveTitle('Knapsack Problem');
        await expect(page.locator('h2')).toHaveText('Knapsack Problem Solver');
        await expect(page.locator('#result')).toHaveText('');
    });

    test('should display maximum value for valid input', async ({ page }) => {
        // Test with valid weights and values
        await page.fill('#weights', '2,3,4,5');
        await page.fill('#values', '3,4,5,6');
        await page.fill('#capacity', '5');
        await page.click('button');

        // Verify the result
        await expect(page.locator('#result')).toHaveText('Maximum value in Knapsack = 7');
    });

    test('should handle empty weights input', async ({ page }) => {
        // Test with empty weights
        await page.fill('#weights', '');
        await page.fill('#values', '4,5,6');
        await page.fill('#capacity', '5');
        await page.click('button');

        // Verify the result
        await expect(page.locator('#result')).toHaveText('Maximum value in Knapsack = 0');
    });

    test('should handle empty values input', async ({ page }) => {
        // Test with empty values
        await page.fill('#weights', '2,3,4');
        await page.fill('#values', '');
        await page.fill('#capacity', '5');
        await page.click('button');

        // Verify the result
        await expect(page.locator('#result')).toHaveText('Maximum value in Knapsack = 0');
    });

    test('should handle invalid capacity input', async ({ page }) => {
        // Test with invalid capacity (non-numeric)
        await page.fill('#weights', '2,3,4');
        await page.fill('#values', '3,4,5');
        await page.fill('#capacity', 'abc');
        await page.click('button');

        // Verify the result should not change
        await expect(page.locator('#result')).toHaveText('');
    });

    test('should handle negative weights', async ({ page }) => {
        // Test with negative weights
        await page.fill('#weights', '-2,3,4');
        await page.fill('#values', '3,4,5');
        await page.fill('#capacity', '5');
        await page.click('button');

        // Verify the result
        await expect(page.locator('#result')).toHaveText('Maximum value in Knapsack = 4');
    });

    test('should handle negative values', async ({ page }) => {
        // Test with negative values
        await page.fill('#weights', '2,3,4');
        await page.fill('#values', '-3,4,5');
        await page.fill('#capacity', '5');
        await page.click('button');

        // Verify the result
        await expect(page.locator('#result')).toHaveText('Maximum value in Knapsack = 5');
    });

    test('should handle large inputs', async ({ page }) => {
        // Test with large inputs
        await page.fill('#weights', '1,2,3,4,5,6,7,8,9,10');
        await page.fill('#values', '1,2,3,4,5,6,7,8,9,10');
        await page.fill('#capacity', '55');
        await page.click('button');

        // Verify the result
        await expect(page.locator('#result')).toHaveText('Maximum value in Knapsack = 55');
    });

    test('should not crash with unexpected input types', async ({ page }) => {
        // Test with unexpected input types
        await page.fill('#weights', 'two,three,four');
        await page.fill('#values', 'three,four,five');
        await page.fill('#capacity', 'five');
        await page.click('button');

        // Verify the result should not change
        await expect(page.locator('#result')).toHaveText('');
    });
});