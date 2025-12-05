import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-3/html/b8b7e710-d1d3-11f0-9bcf-07cd16c51572.html';

test.describe('Longest Common Subsequence Application', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application page before each test
        await page.goto(BASE_URL);
    });

    test('should load the page with default elements', async ({ page }) => {
        // Verify that the main elements are present on the page
        await expect(page.locator('h1')).toHaveText('Longest Common Subsequence (LCS)');
        await expect(page.locator('input#string1')).toBeVisible();
        await expect(page.locator('input#string2')).toBeVisible();
        await expect(page.locator('button')).toHaveText('Find LCS');
        await expect(page.locator('div.result')).toBeEmpty();
    });

    test('should display LCS for two identical strings', async ({ page }) => {
        // Input identical strings and check the result
        await page.fill('input#string1', 'ABC');
        await page.fill('input#string2', 'ABC');
        await page.click('button');
        await expect(page.locator('div.result')).toHaveText('Longest Common Subsequence: "ABC"');
    });

    test('should display LCS for two different strings', async ({ page }) => {
        // Input different strings and check the result
        await page.fill('input#string1', 'AGGTAB');
        await page.fill('input#string2', 'GXTXAYB');
        await page.click('button');
        await expect(page.locator('div.result')).toHaveText('Longest Common Subsequence: "GTAB"');
    });

    test('should handle empty input for first string', async ({ page }) => {
        // Input an empty first string and check the result
        await page.fill('input#string1', '');
        await page.fill('input#string2', 'ABC');
        await page.click('button');
        await expect(page.locator('div.result')).toHaveText('Longest Common Subsequence: ""');
    });

    test('should handle empty input for second string', async ({ page }) => {
        // Input an empty second string and check the result
        await page.fill('input#string1', 'ABC');
        await page.fill('input#string2', '');
        await page.click('button');
        await expect(page.locator('div.result')).toHaveText('Longest Common Subsequence: ""');
    });

    test('should handle both strings being empty', async ({ page }) => {
        // Input both strings as empty and check the result
        await page.fill('input#string1', '');
        await page.fill('input#string2', '');
        await page.click('button');
        await expect(page.locator('div.result')).toHaveText('Longest Common Subsequence: ""');
    });

    test('should handle strings with no common subsequence', async ({ page }) => {
        // Input strings with no common subsequence and check the result
        await page.fill('input#string1', 'ABC');
        await page.fill('input#string2', 'XYZ');
        await page.click('button');
        await expect(page.locator('div.result')).toHaveText('Longest Common Subsequence: ""');
    });

    test('should handle long strings', async ({ page }) => {
        // Input long strings and check the result
        await page.fill('input#string1', 'AGGTABAGGTAB');
        await page.fill('input#string2', 'GXTXAYBGXTXAYB');
        await page.click('button');
        await expect(page.locator('div.result')).toHaveText('Longest Common Subsequence: "GTAB"');
    });

    test('should log errors in the console', async ({ page }) => {
        // Listen for console errors
        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.error(`Error: ${msg.text()}`);
            }
        });

        // Trigger an error by providing invalid input (if applicable)
        await page.fill('input#string1', '123');
        await page.fill('input#string2', 'ABC');
        await page.click('button');

        // Here we expect some console error (if applicable)
        // This can be adjusted based on the actual error handling in the application
    });
});