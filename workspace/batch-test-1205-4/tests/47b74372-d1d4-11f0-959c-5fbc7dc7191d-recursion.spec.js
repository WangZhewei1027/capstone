import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-4/html/47b74372-d1d4-11f0-959c-5fbc7dc7191d.html';

test.describe('Recursion Demo Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application page before each test
        await page.goto(BASE_URL);
    });

    test('should load the page and display initial content', async ({ page }) => {
        // Verify the page title
        await expect(page).toHaveTitle('Recursion Demo');
        
        // Check if the main heading is visible
        const heading = await page.locator('h1');
        await expect(heading).toBeVisible();
        
        // Ensure the input field and button are present
        const inputField = await page.locator('#number');
        const calculateButton = await page.locator('button');
        
        await expect(inputField).toBeVisible();
        await expect(calculateButton).toBeVisible();
    });

    test('should calculate factorial for a valid input', async ({ page }) => {
        // Input a valid number and click the button
        await page.fill('#number', '5');
        await page.click('button');

        // Verify the result displayed
        const resultDiv = await page.locator('#result');
        await expect(resultDiv).toHaveText('Factorial of 5 is 120.');
    });

    test('should handle zero input correctly', async ({ page }) => {
        // Input zero and click the button
        await page.fill('#number', '0');
        await page.click('button');

        // Verify the result displayed
        const resultDiv = await page.locator('#result');
        await expect(resultDiv).toHaveText('Factorial of 0 is 1.');
    });

    test('should show error message for negative input', async ({ page }) => {
        // Input a negative number and click the button
        await page.fill('#number', '-1');
        await page.click('button');

        // Verify the error message displayed
        const resultDiv = await page.locator('#result');
        await expect(resultDiv).toHaveText('Please enter a valid non-negative integer.');
    });

    test('should show error message for non-integer input', async ({ page }) => {
        // Input a non-integer value and click the button
        await page.fill('#number', 'abc');
        await page.click('button');

        // Verify the error message displayed
        const resultDiv = await page.locator('#result');
        await expect(resultDiv).toHaveText('Please enter a valid non-negative integer.');
    });

    test('should clear result when input is changed', async ({ page }) => {
        // Input a valid number and click the button
        await page.fill('#number', '3');
        await page.click('button');
        
        // Verify the result displayed
        const resultDiv = await page.locator('#result');
        await expect(resultDiv).toHaveText('Factorial of 3 is 6.');

        // Change the input to a new value
        await page.fill('#number', '4');
        
        // Verify the result is cleared before clicking again
        await expect(resultDiv).toHaveText('Factorial of 3 is 6.'); // Should still show previous result

        // Click the button again
        await page.click('button');

        // Verify the new result displayed
        await expect(resultDiv).toHaveText('Factorial of 4 is 24.');
    });
});