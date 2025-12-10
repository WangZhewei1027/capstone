import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-3/html/b8b7e712-d1d3-11f0-9bcf-07cd16c51572.html';

test.describe('Recursion Demo Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application page before each test
        await page.goto(BASE_URL);
    });

    test('should load the page and display initial content', async ({ page }) => {
        // Verify the title and initial content
        await expect(page).toHaveTitle('Recursion Demo');
        await expect(page.locator('h1')).toHaveText('Recursion Demonstration');
        await expect(page.locator('p')).toHaveText('Enter a number to see the factorial calculated using recursion:');
    });

    test('should calculate factorial for a valid input', async ({ page }) => {
        // Input a valid number and check the result
        await page.fill('#numberInput', '5');
        await page.click('button');
        await expect(page.locator('#result')).toHaveText('The factorial of 5 is 120.');
    });

    test('should handle zero input correctly', async ({ page }) => {
        // Input zero and check the result
        await page.fill('#numberInput', '0');
        await page.click('button');
        await expect(page.locator('#result')).toHaveText('The factorial of 0 is 1.');
    });

    test('should handle one input correctly', async ({ page }) => {
        // Input one and check the result
        await page.fill('#numberInput', '1');
        await page.click('button');
        await expect(page.locator('#result')).toHaveText('The factorial of 1 is 1.');
    });

    test('should show error message for negative input', async ({ page }) => {
        // Input a negative number and check the error message
        await page.fill('#numberInput', '-5');
        await page.click('button');
        await expect(page.locator('#result')).toHaveText('Please enter a non-negative integer.');
    });

    test('should show error message for non-integer input', async ({ page }) => {
        // Input a non-integer value and check the error message
        await page.fill('#numberInput', 'abc');
        await page.click('button');
        await expect(page.locator('#result')).toHaveText('Please enter a non-negative integer.');
    });

    test('should show error message for empty input', async ({ page }) => {
        // Leave the input empty and check the error message
        await page.fill('#numberInput', '');
        await page.click('button');
        await expect(page.locator('#result')).toHaveText('Please enter a non-negative integer.');
    });

    test('should calculate factorial for a large number', async ({ page }) => {
        // Input a large number and check the result
        await page.fill('#numberInput', '10');
        await page.click('button');
        await expect(page.locator('#result')).toHaveText('The factorial of 10 is 3628800.');
    });
});