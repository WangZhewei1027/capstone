import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-40-02/html/5abe1671-ca8a-11f0-8532-d714b1159c0d.html';

test.describe('Bubble Sort Application', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the Bubble Sort application
        await page.goto(BASE_URL);
    });

    test('Initial state should render correctly', async ({ page }) => {
        // Verify that the initial state (Idle) is rendered correctly
        const numElementsInput = await page.locator('#numElements');
        const sortButton = await page.locator('#sortButton');
        const resetButton = await page.locator('#resetButton');
        const resultDiv = await page.locator('#result');

        await expect(numElementsInput).toBeVisible();
        await expect(numElementsInput).toHaveValue('5');
        await expect(sortButton).toBeVisible();
        await expect(resetButton).toBeVisible();
        await expect(resultDiv).toHaveText('');
    });

    test('Sort button should sort the array and display sorted result', async ({ page }) => {
        // Test sorting functionality
        await page.fill('#numElements', JSON.stringify([5, 3, 8, 1, 2]));
        await page.click('#sortButton');

        // Verify that the result displays the sorted array
        const resultDiv = await page.locator('#result');
        await expect(resultDiv).toHaveText(/Sorted array: 1, 2, 3, 5, 8/);
    });

    test('Reset button should reset the array and display empty result', async ({ page }) => {
        // Test reset functionality
        await page.fill('#numElements', JSON.stringify([5, 3, 8, 1, 2]));
        await page.click('#sortButton');
        await page.click('#resetButton');

        // Verify that the result displays the reset array
        const resultDiv = await page.locator('#result');
        await expect(resultDiv).toHaveText('Array: ');
    });

    test('Sort button should handle invalid input gracefully', async ({ page }) => {
        // Test sorting with invalid input
        await page.fill('#numElements', 'invalid');
        await page.click('#sortButton');

        // Verify that the result does not change
        const resultDiv = await page.locator('#result');
        await expect(resultDiv).toHaveText('');
    });

    test('Reset button should work even when no sorting has occurred', async ({ page }) => {
        // Test reset functionality without prior sorting
        await page.click('#resetButton');

        // Verify that the result displays the reset array
        const resultDiv = await page.locator('#result');
        await expect(resultDiv).toHaveText('Array: ');
    });
});