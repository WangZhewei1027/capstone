import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-3/html/b8b83530-d1d3-11f0-9bcf-07cd16c51572.html';

test.describe('Two Pointers Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application page before each test
        await page.goto(BASE_URL);
    });

    test('should load the page with default state', async ({ page }) => {
        // Verify that the title and input fields are visible
        await expect(page.locator('h1')).toHaveText('Two Pointers Technique Demonstration');
        await expect(page.locator('#arrayInput')).toBeVisible();
        await expect(page.locator('#targetInput')).toBeVisible();
        await expect(page.locator('button')).toHaveText('Find Pairs');
        await expect(page.locator('#result')).toBeEmpty();
    });

    test('should find pairs that add up to the target sum', async ({ page }) => {
        // Input sorted numbers and target sum
        await page.fill('#arrayInput', '1,2,3,4,5');
        await page.fill('#targetInput', '5');
        
        // Click the button to find pairs
        await page.click('button');
        
        // Verify the result displayed
        await expect(page.locator('#result')).toHaveText('Pairs that add up to 5: (2, 3)');
    });

    test('should display no pairs found for non-existent pairs', async ({ page }) => {
        // Input sorted numbers and a target sum that does not exist
        await page.fill('#arrayInput', '1,2,3,4,5');
        await page.fill('#targetInput', '10');
        
        // Click the button to find pairs
        await page.click('button');
        
        // Verify the result displayed
        await expect(page.locator('#result')).toHaveText('No pairs found that add up to 10.');
    });

    test('should handle empty input gracefully', async ({ page }) => {
        // Leave inputs empty
        await page.fill('#arrayInput', '');
        await page.fill('#targetInput', '');
        
        // Click the button to find pairs
        await page.click('button');
        
        // Verify the result displayed
        await expect(page.locator('#result')).toHaveText('No pairs found that add up to NaN.');
    });

    test('should handle invalid number formats in input', async ({ page }) => {
        // Input invalid numbers
        await page.fill('#arrayInput', '1,2,three,four,5');
        await page.fill('#targetInput', '5');
        
        // Click the button to find pairs
        await page.click('button');
        
        // Verify the result displayed
        await expect(page.locator('#result')).toHaveText('Pairs that add up to 5: (2, 3)');
    });

    test('should handle large numbers correctly', async ({ page }) => {
        // Input large numbers
        await page.fill('#arrayInput', '1000000,2000000,3000000');
        await page.fill('#targetInput', '4000000');
        
        // Click the button to find pairs
        await page.click('button');
        
        // Verify the result displayed
        await expect(page.locator('#result')).toHaveText('Pairs that add up to 4000000: (1000000, 3000000)');
    });

    test('should not crash on invalid target input', async ({ page }) => {
        // Input valid numbers and an invalid target
        await page.fill('#arrayInput', '1,2,3,4,5');
        await page.fill('#targetInput', 'abc');
        
        // Click the button to find pairs
        await page.click('button');
        
        // Verify the result displayed
        await expect(page.locator('#result')).toHaveText('No pairs found that add up to NaN.');
    });
});