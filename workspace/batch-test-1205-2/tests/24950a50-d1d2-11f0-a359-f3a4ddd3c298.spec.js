import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-2/html/24950a50-d1d2-11f0-a359-f3a4ddd3c298.html';

test.describe('Longest Common Subsequence Demo', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the LCS demo page before each test
        await page.goto(BASE_URL);
    });

    test('should display the initial state correctly', async ({ page }) => {
        // Validate that the page renders correctly in the initial state
        const title = await page.locator('h1').innerText();
        expect(title).toBe('Longest Common Subsequence (LCS) Finder');

        const resultText = await page.locator('#result').innerText();
        expect(resultText).toBe('');
    });

    test('should find LCS for two non-empty strings', async ({ page }) => {
        // Input two strings and click the Find LCS button
        await page.fill('#string1', 'ABCBDAB');
        await page.fill('#string2', 'BDCAB');

        await page.click('button[onclick="findLCS()"]');

        // Validate that the result is displayed correctly
        const resultText1 = await page.locator('#result').innerText();
        expect(resultText).toContain('Longest Common Subsequence: BCA');
    });

    test('should handle empty string inputs', async ({ page }) => {
        // Input one empty string and one non-empty string
        await page.fill('#string1', '');
        await page.fill('#string2', 'BDCAB');

        await page.click('button[onclick="findLCS()"]');

        // Validate that the result indicates no common subsequence
        const resultText2 = await page.locator('#result').innerText();
        expect(resultText).toContain('Longest Common Subsequence: ');
    });

    test('should handle two empty string inputs', async ({ page }) => {
        // Input two empty strings
        await page.fill('#string1', '');
        await page.fill('#string2', '');

        await page.click('button[onclick="findLCS()"]');

        // Validate that the result indicates no common subsequence
        const resultText3 = await page.locator('#result').innerText();
        expect(resultText).toContain('Longest Common Subsequence: ');
    });

    test('should handle strings with no common subsequence', async ({ page }) => {
        // Input two strings with no common characters
        await page.fill('#string1', 'XYZ');
        await page.fill('#string2', 'ABC');

        await page.click('button[onclick="findLCS()"]');

        // Validate that the result indicates no common subsequence
        const resultText4 = await page.locator('#result').innerText();
        expect(resultText).toContain('Longest Common Subsequence: ');
    });

    test('should log errors in the console', async ({ page }) => {
        // Listen for console messages and check for errors
        const consoleMessages = [];
        page.on('console', msg => consoleMessages.push(msg.text()));

        // Intentionally cause an error by calling a non-existent function
        await page.evaluate(() => {
            try {
                nonExistentFunction();
            } catch (e) {
                console.error(e);
            }
        });

        // Validate that an error was logged to the console
        expect(consoleMessages.some(msg => msg.includes('ReferenceError'))).toBeTruthy();
    });
});