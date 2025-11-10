import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/184e0b10-bcac-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Longest Common Subsequence Application', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application before each test
        await page.goto(BASE_URL);
    });

    test('should start in idle state', async ({ page }) => {
        // Verify that the application is in the idle state
        const resultDiv = await page.locator('#result');
        await expect(resultDiv).toHaveText('');
    });

    test('should calculate LCS and transition to result_displayed state', async ({ page }) => {
        // Input strings and calculate LCS
        await page.fill('#stringA', 'ABCBDAB');
        await page.fill('#stringB', 'BDCAB');
        await page.click('button:has-text("Calculate LCS")');

        // Wait for the result to be displayed
        const resultDiv1 = await page.locator('#result');
        await expect(resultDiv).toBeVisible();
        await expect(resultDiv).toContainText('BCAB'); // Expected LCS for the given strings
    });

    test('should reset to idle state', async ({ page }) => {
        // Input strings and calculate LCS
        await page.fill('#stringA', 'ABCBDAB');
        await page.fill('#stringB', 'BDCAB');
        await page.click('button:has-text("Calculate LCS")');

        // Wait for the result to be displayed
        const resultDiv2 = await page.locator('#result');
        await expect(resultDiv).toBeVisible();

        // Reset the application
        await page.click('button:has-text("Reset")');

        // Verify that the application is back to idle state
        await expect(resultDiv).toHaveText('');
    });

    test('should handle empty input strings', async ({ page }) => {
        // Calculate LCS with empty strings
        await page.fill('#stringA', '');
        await page.fill('#stringB', '');
        await page.click('button:has-text("Calculate LCS")');

        // Verify that the result is empty
        const resultDiv3 = await page.locator('#result');
        await expect(resultDiv).toBeVisible();
        await expect(resultDiv).toHaveText(''); // Expected LCS for empty strings
    });

    test('should handle single character input', async ({ page }) => {
        // Calculate LCS with single character strings
        await page.fill('#stringA', 'A');
        await page.fill('#stringB', 'A');
        await page.click('button:has-text("Calculate LCS")');

        // Verify that the result is 'A'
        const resultDiv4 = await page.locator('#result');
        await expect(resultDiv).toBeVisible();
        await expect(resultDiv).toHaveText('A'); // Expected LCS for single character match
    });

    test('should handle completely different strings', async ({ page }) => {
        // Calculate LCS with completely different strings
        await page.fill('#stringA', 'ABC');
        await page.fill('#stringB', 'XYZ');
        await page.click('button:has-text("Calculate LCS")');

        // Verify that the result is empty
        const resultDiv5 = await page.locator('#result');
        await expect(resultDiv).toBeVisible();
        await expect(resultDiv).toHaveText(''); // Expected LCS for completely different strings
    });
});