import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-35-35/html/bba61741-ca89-11f0-800e-fdebe921fc5f.html';

test.describe('Linear Search Application', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the Linear Search application
        await page.goto(BASE_URL);
    });

    test('should display the initial idle state', async ({ page }) => {
        // Verify the initial state of the application
        const input = await page.locator('#search-input');
        const button = await page.locator('button[onclick="searchLinear()"]');
        const result = await page.locator('#result');

        await expect(input).toBeVisible();
        await expect(input).toHaveAttribute('placeholder', 'Enter a number to search');
        await expect(button).toHaveText('Search');
        await expect(result).toHaveText('');
    });

    test('should show error message when no input is provided', async ({ page }) => {
        // Click the search button without entering a number
        await page.click('button[onclick="searchLinear()"]');

        // Verify the transition to No Input state
        const result = await page.locator('#result');
        await expect(result).toHaveText('Please enter a number to search.');
    });

    test('should show not found message when input is not in the array', async ({ page }) => {
        // Enter a number that is not in the array and click search
        await page.fill('#search-input', '150');
        await page.click('button[onclick="searchLinear()"]');

        // Verify the transition to Not Found state
        const result = await page.locator('#result');
        await expect(result).toHaveText('Number not found in the array.');
    });

    test('should show found message when input is in the array', async ({ page }) => {
        // Enter a number that is in the array and click search
        await page.fill('#search-input', '50');
        await page.click('button[onclick="searchLinear()"]');

        // Verify the transition to Found state
        const result = await page.locator('#result');
        await expect(result).toHaveText('Number 50 found at index 49.');
    });

    test('should handle edge case for input as zero', async ({ page }) => {
        // Enter zero and click search
        await page.fill('#search-input', '0');
        await page.click('button[onclick="searchLinear()"]');

        // Verify the transition to Not Found state
        const result = await page.locator('#result');
        await expect(result).toHaveText('Number not found in the array.');
    });

    test('should handle edge case for negative input', async ({ page }) => {
        // Enter a negative number and click search
        await page.fill('#search-input', '-10');
        await page.click('button[onclick="searchLinear()"]');

        // Verify the transition to Not Found state
        const result = await page.locator('#result');
        await expect(result).toHaveText('Number not found in the array.');
    });

    test('should handle edge case for input as a string', async ({ page }) => {
        // Enter a string instead of a number and click search
        await page.fill('#search-input', 'hello');
        await page.click('button[onclick="searchLinear()"]');

        // Verify the transition to Not Found state
        const result = await page.locator('#result');
        await expect(result).toHaveText('Number not found in the array.');
    });
});