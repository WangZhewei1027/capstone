import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/8c9476d0-d1d3-11f0-a698-d7b407715e1f.html';

test.describe('Fibonacci Sequence Generator', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the Fibonacci Sequence Generator page before each test
        await page.goto(BASE_URL);
    });

    test('should load the page with default state', async ({ page }) => {
        // Verify that the page loads correctly with the expected title
        await expect(page).toHaveTitle('Fibonacci Sequence Generator');
        
        // Check that the input field is empty by default
        const inputField = page.locator('#numInput');
        await expect(inputField).toHaveValue('');
        
        // Check that the result div is empty
        const resultDiv = page.locator('#result');
        await expect(resultDiv).toHaveText('');
    });

    test('should generate Fibonacci sequence for valid input', async ({ page }) => {
        // Input a valid number and generate Fibonacci sequence
        const inputField = page.locator('#numInput');
        await inputField.fill('10');
        
        const generateButton = page.locator('button');
        await generateButton.click();
        
        // Verify that the result is as expected
        const resultDiv = page.locator('#result');
        await expect(resultDiv).toHaveText('Fibonacci Sequence: 0, 1, 1, 2, 3, 5, 8');
    });

    test('should show error message for invalid input (negative number)', async ({ page }) => {
        // Input a negative number and generate Fibonacci sequence
        const inputField = page.locator('#numInput');
        await inputField.fill('-5');
        
        const generateButton = page.locator('button');
        await generateButton.click();
        
        // Verify that the error message is displayed
        const resultDiv = page.locator('#result');
        await expect(resultDiv).toHaveText('Please enter a valid positive integer.');
    });

    test('should show error message for invalid input (zero)', async ({ page }) => {
        // Input zero and generate Fibonacci sequence
        const inputField = page.locator('#numInput');
        await inputField.fill('0');
        
        const generateButton = page.locator('button');
        await generateButton.click();
        
        // Verify that the error message is displayed
        const resultDiv = page.locator('#result');
        await expect(resultDiv).toHaveText('Please enter a valid positive integer.');
    });

    test('should show error message for invalid input (non-numeric)', async ({ page }) => {
        // Input a non-numeric value and generate Fibonacci sequence
        const inputField = page.locator('#numInput');
        await inputField.fill('abc');
        
        const generateButton = page.locator('button');
        await generateButton.click();
        
        // Verify that the error message is displayed
        const resultDiv = page.locator('#result');
        await expect(resultDiv).toHaveText('Please enter a valid positive integer.');
    });

    test('should generate Fibonacci sequence for larger valid input', async ({ page }) => {
        // Input a larger valid number and generate Fibonacci sequence
        const inputField = page.locator('#numInput');
        await inputField.fill('100');
        
        const generateButton = page.locator('button');
        await generateButton.click();
        
        // Verify that the result is as expected
        const resultDiv = page.locator('#result');
        await expect(resultDiv).toHaveText('Fibonacci Sequence: 0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89');
    });
});