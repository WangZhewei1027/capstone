import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-25T23-45-53/html/e1386e33-ca58-11f0-b3c1-8750c080fb19.html';

test.describe('Longest Common Subsequence Finder', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application before each test
        await page.goto(BASE_URL);
    });

    test('should be in Idle state initially', async ({ page }) => {
        // Verify that input fields are enabled and result is empty
        const string1Input = page.locator('#string1');
        const string2Input = page.locator('#string2');
        const resultDiv = page.locator('#result');

        await expect(string1Input).toBeEnabled();
        await expect(string2Input).toBeEnabled();
        await expect(resultDiv).toHaveText('');
    });

    test('should calculate LCS when inputs are filled and button is clicked', async ({ page }) => {
        // Fill input fields and click the calculate button
        await page.fill('#string1', 'AGGTAB');
        await page.fill('#string2', 'GXTXAYB');
        await page.click('#calculateBtn');

        // Verify that the result is displayed correctly
        const resultDiv = page.locator('#result');
        await expect(resultDiv).toHaveText('Length of Longest Common Subsequence: 4');
    });

    test('should handle empty input fields', async ({ page }) => {
        // Click the calculate button without filling inputs
        await page.click('#calculateBtn');

        // Verify that the result is still empty
        const resultDiv = page.locator('#result');
        await expect(resultDiv).toHaveText('');
    });

    test('should reset state after displaying result', async ({ page }) => {
        // Fill input fields and click the calculate button
        await page.fill('#string1', 'ABC');
        await page.fill('#string2', 'AC');
        await page.click('#calculateBtn');

        // Verify that the result is displayed
        const resultDiv = page.locator('#result');
        await expect(resultDiv).toHaveText('Length of Longest Common Subsequence: 2');

        // Click the calculate button again to reset
        await page.click('#calculateBtn');

        // Verify that input fields are enabled and result is cleared
        const string1Input = page.locator('#string1');
        const string2Input = page.locator('#string2');
        await expect(string1Input).toBeEnabled();
        await expect(string2Input).toBeEnabled();
        await expect(resultDiv).toHaveText('');
    });

    test('should calculate LCS for identical strings', async ({ page }) => {
        // Fill input fields with identical strings
        await page.fill('#string1', 'TEST');
        await page.fill('#string2', 'TEST');
        await page.click('#calculateBtn');

        // Verify that the result is correct
        const resultDiv = page.locator('#result');
        await expect(resultDiv).toHaveText('Length of Longest Common Subsequence: 4');
    });

    test('should calculate LCS for completely different strings', async ({ page }) => {
        // Fill input fields with completely different strings
        await page.fill('#string1', 'ABC');
        await page.fill('#string2', 'XYZ');
        await page.click('#calculateBtn');

        // Verify that the result is correct
        const resultDiv = page.locator('#result');
        await expect(resultDiv).toHaveText('Length of Longest Common Subsequence: 0');
    });
});