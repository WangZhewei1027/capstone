import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-40-02/html/5abe6490-ca8a-11f0-8532-d714b1159c0d.html';

test.describe('Quick Sort Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the Quick Sort application
        await page.goto(BASE_URL);
    });

    test('should display initial state with input and button', async ({ page }) => {
        // Verify that the input field and sort button are present
        const input = await page.locator('#input');
        const sortBtn = await page.locator('#sort-btn');
        
        await expect(input).toBeVisible();
        await expect(sortBtn).toBeVisible();
        await expect(input).toHaveAttribute('placeholder', 'Enter numbers separated by space');
    });

    test('should sort numbers on input change', async ({ page }) => {
        // Simulate user input and verify the sorted output
        const input = await page.locator('#input');
        await input.fill('3 1 2');

        // Wait for the output to update
        const output = await page.locator('#output');
        await expect(output).toHaveText('1, 2, 3');
    });

    test('should sort numbers on button click', async ({ page }) => {
        // Simulate user input and click the sort button
        const input = await page.locator('#input');
        const sortBtn = await page.locator('#sort-btn');
        
        await input.fill('5 3 4 1 2');
        await sortBtn.click();

        // Verify the output after clicking the sort button
        const output = await page.locator('#output');
        await expect(output).toHaveText('1, 2, 3, 4, 5');
    });

    test('should handle empty input gracefully', async ({ page }) => {
        // Simulate clicking the sort button with empty input
        const sortBtn = await page.locator('#sort-btn');
        await sortBtn.click();

        // Verify that the output remains empty
        const output = await page.locator('#output');
        await expect(output).toHaveText('');
    });

    test('should handle invalid input gracefully', async ({ page }) => {
        // Simulate user input with invalid numbers
        const input = await page.locator('#input');
        await input.fill('a b c');

        // Click the sort button
        const sortBtn = await page.locator('#sort-btn');
        await sortBtn.click();

        // Verify that the output remains empty
        const output = await page.locator('#output');
        await expect(output).toHaveText('');
    });

    test('should sort numbers with duplicates', async ({ page }) => {
        // Test sorting with duplicate numbers
        const input = await page.locator('#input');
        await input.fill('3 1 2 2 3');

        // Wait for the output to update
        const output = await page.locator('#output');
        await expect(output).toHaveText('1, 2, 2, 3, 3');
    });
});