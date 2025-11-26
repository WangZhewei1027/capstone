import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-40-02/html/5abe8ba1-ca8a-11f0-8532-d714b1159c0d.html';

test.describe('Linear Search Application', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application page before each test
        await page.goto(BASE_URL);
    });

    test('should display idle state with input and button', async ({ page }) => {
        // Validate that the application is in the idle state
        const input = await page.locator('#num');
        const button = await page.locator('#search');
        const result = await page.locator('#result');

        await expect(input).toBeVisible();
        await expect(input).toHaveAttribute('placeholder', 'Enter number to search');
        await expect(button).toBeVisible();
        await expect(button).toHaveText('Search');
        await expect(result).toBeEmpty();
    });

    test('should transition to searching state and find a number', async ({ page }) => {
        // Input a number that exists in the array and click search
        await page.fill('#num', '5');
        await page.click('#search');

        // Validate that the result shows the number was found
        const result = await page.locator('#result');
        await expect(result).toHaveText('Number 5 found in the array. Index is 4');
    });

    test('should transition to searching state and not find a number', async ({ page }) => {
        // Input a number that does not exist in the array and click search
        await page.fill('#num', '15');
        await page.click('#search');

        // Validate that the result shows the number was not found
        const result = await page.locator('#result');
        await expect(result).toHaveText('Number 15 not found in the array');
    });

    test('should handle empty input gracefully', async ({ page }) => {
        // Click search without entering a number
        await page.click('#search');

        // Validate that the result does not show any valid output
        const result = await page.locator('#result');
        await expect(result).toBeEmpty();
    });

    test('should handle non-numeric input gracefully', async ({ page }) => {
        // Input a non-numeric value and click search
        await page.fill('#num', 'abc');
        await page.click('#search');

        // Validate that the result does not show any valid output
        const result = await page.locator('#result');
        await expect(result).toBeEmpty();
    });
});