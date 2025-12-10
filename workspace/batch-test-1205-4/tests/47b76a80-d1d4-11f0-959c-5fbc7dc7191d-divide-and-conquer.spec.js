import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-4/html/47b76a80-d1d4-11f0-959c-5fbc7dc7191d.html';

test.describe('Divide and Conquer Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application page before each test
        await page.goto(BASE_URL);
    });

    test('should load the page with the correct title and input field', async ({ page }) => {
        // Verify the page title
        await expect(page).toHaveTitle('Divide and Conquer Example');
        
        // Check if the input field is present
        const inputField = await page.locator('#numberList');
        await expect(inputField).toBeVisible();
        
        // Check if the button is present
        const button = await page.locator('button');
        await expect(button).toBeVisible();
    });

    test('should display maximum number for valid input', async ({ page }) => {
        // Input a valid list of numbers
        await page.fill('#numberList', '3, 5, 1, 8, 2');
        
        // Click the find maximum button
        await page.click('button');
        
        // Verify the result displayed
        const result = await page.locator('#result');
        await expect(result).toHaveText('Maximum Number: 8');
    });

    test('should handle empty input gracefully', async ({ page }) => {
        // Click the find maximum button without entering any numbers
        await page.click('button');
        
        // Verify the error message displayed
        const result = await page.locator('#result');
        await expect(result).toHaveText('Please enter valid numbers.');
    });

    test('should handle input with non-numeric values', async ({ page }) => {
        // Input a list with non-numeric values
        await page.fill('#numberList', 'a, b, c');
        
        // Click the find maximum button
        await page.click('button');
        
        // Verify the error message displayed
        const result = await page.locator('#result');
        await expect(result).toHaveText('Please enter valid numbers.');
    });

    test('should correctly find maximum for negative numbers', async ({ page }) => {
        // Input a list of negative numbers
        await page.fill('#numberList', '-3, -5, -1, -8, -2');
        
        // Click the find maximum button
        await page.click('button');
        
        // Verify the result displayed
        const result = await page.locator('#result');
        await expect(result).toHaveText('Maximum Number: -1');
    });

    test('should correctly find maximum for mixed positive and negative numbers', async ({ page }) => {
        // Input a list of mixed numbers
        await page.fill('#numberList', '3, -5, 1, 8, -2');
        
        // Click the find maximum button
        await page.click('button');
        
        // Verify the result displayed
        const result = await page.locator('#result');
        await expect(result).toHaveText('Maximum Number: 8');
    });

    test('should handle large input values', async ({ page }) => {
        // Input a large list of numbers
        const largeInput = Array.from({ length: 1000 }, (_, i) => i).join(', ');
        await page.fill('#numberList', largeInput);
        
        // Click the find maximum button
        await page.click('button');
        
        // Verify the result displayed
        const result = await page.locator('#result');
        await expect(result).toHaveText('Maximum Number: 999');
    });
});