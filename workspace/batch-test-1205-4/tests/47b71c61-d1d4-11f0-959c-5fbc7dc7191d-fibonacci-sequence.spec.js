import { test, expect } from '@playwright/test';

const url = 'http://127.0.0.1:5500/workspace/batch-test-1205-4/html/47b71c61-d1d4-11f0-959c-5fbc7dc7191d.html';

test.describe('Fibonacci Sequence Generator', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the Fibonacci Sequence Generator page before each test
        await page.goto(url);
    });

    test('should load the page with default state', async ({ page }) => {
        // Check if the page loads with the correct title
        await expect(page).toHaveTitle('Fibonacci Sequence Generator');
        
        // Verify the default input value
        const inputValue = await page.locator('#count').inputValue();
        expect(inputValue).toBe('10');
        
        // Ensure the result area is empty initially
        const resultText = await page.locator('#result').textContent();
        expect(resultText).toBe('');
    });

    test('should generate Fibonacci sequence for default input', async ({ page }) => {
        // Click the generate button
        await page.click('#generateBtn');
        
        // Verify the result displays the correct Fibonacci sequence
        const resultText = await page.locator('#result').textContent();
        expect(resultText).toBe('Fibonacci Sequence: 0, 1, 1, 2, 3, 5, 8, 13, 21, 34');
    });

    test('should generate Fibonacci sequence for custom input', async ({ page }) => {
        // Change the input value to 5
        await page.fill('#count', '5');
        
        // Click the generate button
        await page.click('#generateBtn');
        
        // Verify the result displays the correct Fibonacci sequence
        const resultText = await page.locator('#result').textContent();
        expect(resultText).toBe('Fibonacci Sequence: 0, 1, 1, 2, 3');
    });

    test('should show error message for non-positive input', async ({ page }) => {
        // Change the input value to -1
        await page.fill('#count', '-1');
        
        // Click the generate button
        await page.click('#generateBtn');
        
        // Verify the result displays an error message
        const resultText = await page.locator('#result').textContent();
        expect(resultText).toBe('Please enter a positive number.');
    });

    test('should show error message for zero input', async ({ page }) => {
        // Change the input value to 0
        await page.fill('#count', '0');
        
        // Click the generate button
        await page.click('#generateBtn');
        
        // Verify the result displays an error message
        const resultText = await page.locator('#result').textContent();
        expect(resultText).toBe('Please enter a positive number.');
    });

    test('should not generate Fibonacci sequence for empty input', async ({ page }) => {
        // Clear the input value
        await page.fill('#count', '');
        
        // Click the generate button
        await page.click('#generateBtn');
        
        // Verify the result area remains empty
        const resultText = await page.locator('#result').textContent();
        expect(resultText).toBe('');
    });
});