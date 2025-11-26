import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-40-02/html/5abe8ba0-ca8a-11f0-8532-d714b1159c0d.html';

test.describe('Radix Sort Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('Initial state should render correctly', async ({ page }) => {
        // Verify the initial state of the application
        const numDigitsInput = await page.locator('#numDigits');
        const sortButton = await page.locator('#sortButton');
        const resetButton = await page.locator('#resetButton');
        const resultDiv = await page.locator('#result');

        await expect(numDigitsInput).toBeVisible();
        await expect(numDigitsInput).toHaveValue('5');
        await expect(sortButton).toBeVisible();
        await expect(resetButton).toBeVisible();
        await expect(resultDiv).toHaveText('');
    });

    test('Sort button click should transition to Sorted state', async ({ page }) => {
        // Set the number of digits and click sort
        await page.fill('#numDigits', '5');
        await page.click('#sortButton');

        // Verify the result after sorting
        const resultDiv = await page.locator('#result');
        await expect(resultDiv).toHaveText(/Sorted array:/);
    });

    test('Reset button click should transition to Reset state', async ({ page }) => {
        // Click the reset button
        await page.click('#resetButton');

        // Verify the result after resetting
        const resultDiv = await page.locator('#result');
        await expect(resultDiv).toHaveText('Original array: 0, 0, 0, 0, 0');
    });

    test('Reset button click should reset the state correctly', async ({ page }) => {
        // Click sort first
        await page.fill('#numDigits', '5');
        await page.click('#sortButton');

        // Now reset
        await page.click('#resetButton');

        // Verify the result after resetting
        const resultDiv = await page.locator('#result');
        await expect(resultDiv).toHaveText('Original array: 0, 0, 0, 0, 0');
    });

    test('Edge case: Sort with 0 digits', async ({ page }) => {
        // Set the number of digits to 0 and click sort
        await page.fill('#numDigits', '0');
        await page.click('#sortButton');

        // Verify the result
        const resultDiv = await page.locator('#result');
        await expect(resultDiv).toHaveText('Sorted array: ');
    });

    test('Edge case: Negative digits input', async ({ page }) => {
        // Set the number of digits to a negative value
        await page.fill('#numDigits', '-3');
        await page.click('#sortButton');

        // Verify the result
        const resultDiv = await page.locator('#result');
        await expect(resultDiv).toHaveText('Sorted array: ');
    });

    test('Edge case: Non-numeric input', async ({ page }) => {
        // Set the number of digits to a non-numeric value
        await page.fill('#numDigits', 'abc');
        await page.click('#sortButton');

        // Verify the result
        const resultDiv = await page.locator('#result');
        await expect(resultDiv).toHaveText('Sorted array: ');
    });
});