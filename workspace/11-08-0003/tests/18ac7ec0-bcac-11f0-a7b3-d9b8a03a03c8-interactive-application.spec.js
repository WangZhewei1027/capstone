import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/18ac7ec0-bcac-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Longest Common Subsequence Application', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application before each test
        await page.goto(BASE_URL);
    });

    test('should start in idle state', async ({ page }) => {
        // Validate that the application starts in the idle state
        const resultText = await page.locator('#result').innerText();
        expect(resultText).toBe('');
    });

    test('should transition to processing state on submit', async ({ page }) => {
        // Input strings and submit
        await page.fill('#string1', 'ABCDGH');
        await page.fill('#string2', 'AEDFHR');
        await page.click('#findLCS');

        // Validate that the result is not empty during processing
        const resultText1 = await page.locator('#result').innerText();
        expect(resultText).not.toBe('');
    });

    test('should display result after processing', async ({ page }) => {
        // Input strings and submit
        await page.fill('#string1', 'ABCDGH');
        await page.fill('#string2', 'AEDFHR');
        await page.click('#findLCS');

        // Wait for the result to be displayed
        await page.waitForTimeout(100); // Adjust timeout as necessary
        const resultText2 = await page.locator('#result').innerText();
        expect(resultText).toContain('LCS'); // Assuming result contains 'LCS'
    });

    test('should reset to idle state after reset', async ({ page }) => {
        // Input strings and submit
        await page.fill('#string1', 'ABCDGH');
        await page.fill('#string2', 'AEDFHR');
        await page.click('#findLCS');

        // Wait for the result to be displayed
        await page.waitForTimeout(100); // Adjust timeout as necessary

        // Reset the application
        await page.fill('#string1', '');
        await page.fill('#string2', '');
        await page.click('#findLCS'); // Simulating reset by clicking again

        // Validate that the application is back in idle state
        const resultText3 = await page.locator('#result').innerText();
        expect(resultText).toBe('');
    });

    test('should handle empty input gracefully', async ({ page }) => {
        // Submit with empty strings
        await page.fill('#string1', '');
        await page.fill('#string2', '');
        await page.click('#findLCS');

        // Validate that the result is empty
        const resultText4 = await page.locator('#result').innerText();
        expect(resultText).toBe(''); // Assuming no result for empty input
    });

    test('should handle single character input', async ({ page }) => {
        // Submit with single character strings
        await page.fill('#string1', 'A');
        await page.fill('#string2', 'A');
        await page.click('#findLCS');

        // Validate that the result is correct
        const resultText5 = await page.locator('#result').innerText();
        expect(resultText).toContain('LCS: A'); // Assuming result format
    });

    test('should handle completely different strings', async ({ page }) => {
        // Submit with completely different strings
        await page.fill('#string1', 'ABC');
        await page.fill('#string2', 'XYZ');
        await page.click('#findLCS');

        // Validate that the result is empty
        const resultText6 = await page.locator('#result').innerText();
        expect(resultText).toBe(''); // Assuming no common subsequence
    });
});