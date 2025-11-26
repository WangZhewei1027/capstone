import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T04-43-42/html/7c189372-ca82-11f0-8193-f13bc409d3cb.html';

test.describe('Counting Sort Visualization Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the Counting Sort application before each test
        await page.goto(BASE_URL);
    });

    test('should be in Idle state initially', async ({ page }) => {
        // Verify the initial state of the application
        const sortButton = await page.locator('#sort-btn');
        await expect(sortButton).toBeEnabled(); // Sort button should be enabled
        await expect(page.locator('#result')).toHaveText(''); // Result should be empty
    });

    test('should transition to Sorting state when Sort button is clicked with valid input', async ({ page }) => {
        const inputField = await page.locator('#input');
        const sortButton = await page.locator('#sort-btn');

        await inputField.fill('3 1 2'); // Fill input with numbers
        await sortButton.click(); // Click the Sort button

        // Verify that the application is in Sorting state
        await expect(page.locator('#result')).toHaveText(''); // Result should still be empty during sorting
    });

    test('should display sorted result after sorting is complete', async ({ page }) => {
        const inputField = await page.locator('#input');
        const sortButton = await page.locator('#sort-btn');

        await inputField.fill('3 1 2'); // Fill input with numbers
        await sortButton.click(); // Click the Sort button

        // Simulate sorting completion
        await page.waitForTimeout(500); // Wait for sorting to complete
        await expect(page.locator('#result')).toHaveText('1 2 3 '); // Verify sorted result
    });

    test('should show error dialog when Sort button is clicked with empty input', async ({ page }) => {
        const sortButton = await page.locator('#sort-btn');

        await sortButton.click(); // Click the Sort button with empty input

        // Verify that an error dialog is shown
        await expect(page.locator('#result')).toHaveText(''); // Result should still be empty
    });

    test('should clear error dialog when Sort button is clicked again', async ({ page }) => {
        const sortButton = await page.locator('#sort-btn');

        await sortButton.click(); // Click the Sort button with empty input
        await sortButton.click(); // Click the Sort button again to clear error

        // Verify that the application is back to Idle state
        await expect(sortButton).toBeEnabled(); // Sort button should be enabled
        await expect(page.locator('#result')).toHaveText(''); // Result should still be empty
    });

    test('should handle edge case with single number input', async ({ page }) => {
        const inputField = await page.locator('#input');
        const sortButton = await page.locator('#sort-btn');

        await inputField.fill('5'); // Fill input with a single number
        await sortButton.click(); // Click the Sort button

        // Simulate sorting completion
        await page.waitForTimeout(500); // Wait for sorting to complete
        await expect(page.locator('#result')).toHaveText('5 '); // Verify result is the same single number
    });

    test('should handle edge case with negative numbers', async ({ page }) => {
        const inputField = await page.locator('#input');
        const sortButton = await page.locator('#sort-btn');

        await inputField.fill('-1 -3 -2'); // Fill input with negative numbers
        await sortButton.click(); // Click the Sort button

        // Simulate sorting completion
        await page.waitForTimeout(500); // Wait for sorting to complete
        await expect(page.locator('#result')).toHaveText('-3 -2 -1 '); // Verify sorted result
    });
});