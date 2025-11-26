import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-40-02/html/5abe3d81-ca8a-11f0-8532-d714b1159c0d.html';

test.describe('Merge Sort Application', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application before each test
        await page.goto(BASE_URL);
    });

    test('should display initial input field and sort button', async ({ page }) => {
        // Verify that the input field and sort button are rendered
        const inputField = await page.locator('#input');
        const sortButton = await page.locator('#sort-btn');

        await expect(inputField).toBeVisible();
        await expect(sortButton).toBeVisible();
    });

    test('should sort numbers correctly when valid input is provided', async ({ page }) => {
        // Test sorting functionality with valid input
        const inputField = await page.locator('#input');
        const sortButton = await page.locator('#sort-btn');
        const outputDiv = await page.locator('#output');

        await inputField.fill('34 7 23 32 5 62');
        await sortButton.click();

        // Verify that the output displays sorted numbers
        await expect(outputDiv).toHaveText('5 7 23 32 34 62');
    });

    test('should handle empty input gracefully', async ({ page }) => {
        // Test behavior when input is empty
        const inputField = await page.locator('#input');
        const sortButton = await page.locator('#sort-btn');
        const outputDiv = await page.locator('#output');

        await inputField.fill('');
        await sortButton.click();

        // Verify that the output is empty
        await expect(outputDiv).toHaveText('');
    });

    test('should handle single number input', async ({ page }) => {
        // Test sorting functionality with a single number
        const inputField = await page.locator('#input');
        const sortButton = await page.locator('#sort-btn');
        const outputDiv = await page.locator('#output');

        await inputField.fill('42');
        await sortButton.click();

        // Verify that the output displays the same number
        await expect(outputDiv).toHaveText('42');
    });

    test('should handle negative numbers', async ({ page }) => {
        // Test sorting functionality with negative numbers
        const inputField = await page.locator('#input');
        const sortButton = await page.locator('#sort-btn');
        const outputDiv = await page.locator('#output');

        await inputField.fill('3 -1 4 -2 0');
        await sortButton.click();

        // Verify that the output displays sorted numbers including negatives
        await expect(outputDiv).toHaveText('-2 -1 0 3 4');
    });

    test('should handle non-numeric input', async ({ page }) => {
        // Test behavior when non-numeric input is provided
        const inputField = await page.locator('#input');
        const sortButton = await page.locator('#sort-btn');
        const outputDiv = await page.locator('#output');

        await inputField.fill('a b c');
        await sortButton.click();

        // Verify that the output is empty or displays an error message
        await expect(outputDiv).toHaveText('');
    });

    test('should not crash with large input', async ({ page }) => {
        // Test sorting functionality with a large number of inputs
        const inputField = await page.locator('#input');
        const sortButton = await page.locator('#sort-btn');
        const outputDiv = await page.locator('#output');

        const largeInput = Array.from({ length: 1000 }, (_, i) => Math.floor(Math.random() * 1000)).join(' ');
        await inputField.fill(largeInput);
        await sortButton.click();

        // Verify that the output displays sorted numbers
        const sortedNumbers = largeInput.split(' ').map(Number).sort((a, b) => a - b).join(' ');
        await expect(outputDiv).toHaveText(sortedNumbers);
    });
});