import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-35-35/html/bba6da90-ca89-11f0-800e-fdebe921fc5f.html';

test.describe('Longest Common Subsequence Application', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application before each test
        await page.goto(BASE_URL);
    });

    test('should display initial state with input fields and button', async ({ page }) => {
        // Validate that the application is in the Idle state
        await expect(page.locator('h1')).toHaveText('Longest Common Subsequence');
        await expect(page.locator('#input1')).toBeVisible();
        await expect(page.locator('#input2')).toBeVisible();
        await expect(page.locator('button[onclick="findLCS()"]')).toHaveText('Find LCS');
        await expect(page.locator('#output')).toHaveText('');
    });

    test('should calculate LCS on input change', async ({ page }) => {
        // Input text into the first textarea and verify LCS calculation
        await page.fill('#input1', 'ABCBDAB');
        await page.fill('#input2', 'BDCAB');
        await expect(page.locator('#output')).toHaveText(/LCS: /); // Check that output is updated

        // Validate the correct LCS output
        await page.fill('#input1', 'AGGTAB');
        await page.fill('#input2', 'GXTXAYB');
        await expect(page.locator('#output')).toHaveText('LCS: GTAB'); // Expected LCS
    });

    test('should calculate LCS on button click', async ({ page }) => {
        // Input text into both textareas and click the Find LCS button
        await page.fill('#input1', 'ABCBDAB');
        await page.fill('#input2', 'BDCAB');
        await page.click('button[onclick="findLCS()"]');

        // Validate the output after button click
        await expect(page.locator('#output')).toHaveText('LCS: BDAB'); // Expected LCS
    });

    test('should handle empty input gracefully', async ({ page }) => {
        // Click the Find LCS button with empty inputs
        await page.fill('#input1', '');
        await page.fill('#input2', '');
        await page.click('button[onclick="findLCS()"]');

        // Validate the output for empty inputs
        await expect(page.locator('#output')).toHaveText('LCS: '); // Expected LCS should be empty
    });

    test('should handle single character inputs', async ({ page }) => {
        // Test with single character inputs
        await page.fill('#input1', 'A');
        await page.fill('#input2', 'B');
        await page.click('button[onclick="findLCS()"]');

        // Validate the output for single character inputs
        await expect(page.locator('#output')).toHaveText('LCS: '); // Expected LCS should be empty

        // Test with matching single characters
        await page.fill('#input1', 'A');
        await page.fill('#input2', 'A');
        await page.click('button[onclick="findLCS()"]');

        // Validate the output for matching single characters
        await expect(page.locator('#output')).toHaveText('LCS: A'); // Expected LCS should be 'A'
    });

    test('should display LCS correctly for longer strings', async ({ page }) => {
        // Test with longer strings
        await page.fill('#input1', 'AGGTAB');
        await page.fill('#input2', 'GXTXAYB');
        await page.click('button[onclick="findLCS()"]');

        // Validate the output for longer strings
        await expect(page.locator('#output')).toHaveText('LCS: GTAB'); // Expected LCS
    });
});