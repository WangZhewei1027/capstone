import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-2/html/24953161-d1d2-11f0-a359-f3a4ddd3c298.html';

test.describe('Sliding Window Algorithm Demo', () => {
    test.beforeEach(async ({ page }) => {
        // Load the application page before each test
        await page.goto(BASE_URL);
    });

    test('should display initial input fields and button', async ({ page }) => {
        // Validate that the input fields and button are rendered correctly
        const arrayInput = await page.locator('#arrayInput');
        const windowSizeInput = await page.locator('#windowSize');
        const calculateButton = await page.locator('button[onclick="calculateSlidingWindow()"]');
        
        await expect(arrayInput).toBeVisible();
        await expect(windowSizeInput).toBeVisible();
        await expect(calculateButton).toBeVisible();
    });

    test('should calculate sliding window sums for valid input', async ({ page }) => {
        // Input valid array and window size, then click calculate
        await page.fill('#arrayInput', '1,2,3,4,5,6');
        await page.fill('#windowSize', '3');
        await page.click('button[onclick="calculateSlidingWindow()"]');

        // Validate the result displayed
        const resultDiv = await page.locator('#result');
        await expect(resultDiv).toHaveText('Sliding Window Sums: 6, 9, 12, 15');
    });

    test('should show error for invalid input (empty array)', async ({ page }) => {
        // Input empty array and a valid window size, then click calculate
        await page.fill('#arrayInput', '');
        await page.fill('#windowSize', '2');
        await page.click('button[onclick="calculateSlidingWindow()"]');

        // Validate the error message
        const resultDiv1 = await page.locator('#result');
        await expect(resultDiv).toHaveText('Please enter valid input and window size.');
    });

    test('should show error for invalid window size (less than 1)', async ({ page }) => {
        // Input valid array and invalid window size, then click calculate
        await page.fill('#arrayInput', '1,2,3,4,5,6');
        await page.fill('#windowSize', '0');
        await page.click('button[onclick="calculateSlidingWindow()"]');

        // Validate the error message
        const resultDiv2 = await page.locator('#result');
        await expect(resultDiv).toHaveText('Please enter valid input and window size.');
    });

    test('should show error for window size greater than array length', async ({ page }) => {
        // Input valid array and a window size greater than array length, then click calculate
        await page.fill('#arrayInput', '1,2,3');
        await page.fill('#windowSize', '5');
        await page.click('button[onclick="calculateSlidingWindow()"]');

        // Validate the error message
        const resultDiv3 = await page.locator('#result');
        await expect(resultDiv).toHaveText('Window size must be less than or equal to the array length.');
    });

    test('should handle non-numeric window size', async ({ page }) => {
        // Input valid array and non-numeric window size, then click calculate
        await page.fill('#arrayInput', '1,2,3,4,5,6');
        await page.fill('#windowSize', 'abc');
        await page.click('button[onclick="calculateSlidingWindow()"]');

        // Validate the error message
        const resultDiv4 = await page.locator('#result');
        await expect(resultDiv).toHaveText('Please enter valid input and window size.');
    });

    test.afterEach(async ({ page }) => {
        // Optionally, you can add any cleanup code here if needed
    });
});