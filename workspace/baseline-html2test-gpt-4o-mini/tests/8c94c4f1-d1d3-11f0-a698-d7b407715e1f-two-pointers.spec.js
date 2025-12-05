import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/8c94c4f1-d1d3-11f0-a698-d7b407715e1f.html';

test.describe('Two Pointers Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application before each test
        await page.goto(BASE_URL);
    });

    test('should load the page with correct title and initial state', async ({ page }) => {
        // Verify the page title
        await expect(page).toHaveTitle('Two Pointers Example');
        
        // Check initial state of input fields and result div
        const arrayInput = page.locator('#arrayInput');
        const targetInput = page.locator('#targetInput');
        const resultDiv = page.locator('#result');

        await expect(arrayInput).toBeVisible();
        await expect(targetInput).toBeVisible();
        await expect(resultDiv).toHaveText('');
    });

    test('should find a pair that sums to the target value', async ({ page }) => {
        // Input a sorted array and a target sum
        await page.fill('#arrayInput', '1,2,3,4,5');
        await page.fill('#targetInput', '6');
        
        // Click the Find Pair button
        await page.click('button');

        // Verify the result
        const resultDiv = page.locator('#result');
        await expect(resultDiv).toHaveText('Pair found: (1, 5)');
    });

    test('should not find a pair when no valid pair exists', async ({ page }) => {
        // Input a sorted array and a target sum that has no valid pair
        await page.fill('#arrayInput', '1,2,3,4,5');
        await page.fill('#targetInput', '10');
        
        // Click the Find Pair button
        await page.click('button');

        // Verify the result
        const resultDiv = page.locator('#result');
        await expect(resultDiv).toHaveText('No pair found that meets the target sum.');
    });

    test('should handle empty array input', async ({ page }) => {
        // Input an empty array and a target sum
        await page.fill('#arrayInput', '');
        await page.fill('#targetInput', '5');
        
        // Click the Find Pair button
        await page.click('button');

        // Verify the result
        const resultDiv = page.locator('#result');
        await expect(resultDiv).toHaveText('No pair found that meets the target sum.');
    });

    test('should handle invalid number input', async ({ page }) => {
        // Input a sorted array and an invalid target sum
        await page.fill('#arrayInput', '1,2,3,4,5');
        await page.fill('#targetInput', 'abc');
        
        // Click the Find Pair button
        await page.click('button');

        // Verify the result
        const resultDiv = page.locator('#result');
        await expect(resultDiv).toHaveText('No pair found that meets the target sum.');
    });

    test('should handle single element array input', async ({ page }) => {
        // Input a single element and a target sum
        await page.fill('#arrayInput', '3');
        await page.fill('#targetInput', '3');
        
        // Click the Find Pair button
        await page.click('button');

        // Verify the result
        const resultDiv = page.locator('#result');
        await expect(resultDiv).toHaveText('No pair found that meets the target sum.');
    });
});