import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-35-35/html/bba5a211-ca89-11f0-800e-fdebe921fc5f.html';

test.describe('Bubble Sort Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the Bubble Sort application before each test
        await page.goto(BASE_URL);
    });

    test('should display initial state with input and sort button', async ({ page }) => {
        // Validate that the input field and sort button are present on the page
        const inputField = await page.locator('#input');
        const sortButton = await page.locator('#sort');
        
        await expect(inputField).toBeVisible();
        await expect(sortButton).toBeVisible();
        await expect(inputField).toHaveValue('0');
    });

    test('should sort a list of numbers correctly', async ({ page }) => {
        // Test sorting functionality with a valid input
        await page.fill('#input', '5 3 8 1 2');
        await page.click('#sort');

        // Validate the output after sorting
        const outputDiv = await page.locator('#output');
        await expect(outputDiv).toContainText('1 2 3 5 8');
    });

    test('should handle empty input gracefully', async ({ page }) => {
        // Test sorting with empty input
        await page.fill('#input', '');
        await page.click('#sort');

        // Validate that output remains empty
        const outputDiv = await page.locator('#output');
        await expect(outputDiv).toHaveText('');
    });

    test('should handle single number input', async ({ page }) => {
        // Test sorting with a single number input
        await page.fill('#input', '42');
        await page.click('#sort');

        // Validate that output is the same as input
        const outputDiv = await page.locator('#output');
        await expect(outputDiv).toContainText('42');
    });

    test('should sort negative numbers correctly', async ({ page }) => {
        // Test sorting with negative numbers
        await page.fill('#input', '-1 -3 -2 0 2');
        await page.click('#sort');

        // Validate the output after sorting
        const outputDiv = await page.locator('#output');
        await expect(outputDiv).toContainText('-3 -2 -1 0 2');
    });

    test('should sort numbers with duplicates correctly', async ({ page }) => {
        // Test sorting with duplicate numbers
        await page.fill('#input', '3 3 2 1 2');
        await page.click('#sort');

        // Validate the output after sorting
        const outputDiv = await page.locator('#output');
        await expect(outputDiv).toContainText('1 2 2 3 3');
    });

    test('should show no output for invalid input', async ({ page }) => {
        // Test sorting with invalid input (non-numeric)
        await page.fill('#input', 'abc');
        await page.click('#sort');

        // Validate that output remains empty
        const outputDiv = await page.locator('#output');
        await expect(outputDiv).toHaveText('');
    });
});