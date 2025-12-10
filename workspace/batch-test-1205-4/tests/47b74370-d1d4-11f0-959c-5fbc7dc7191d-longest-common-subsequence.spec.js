import { test, expect } from '@playwright/test';

const url = 'http://127.0.0.1:5500/workspace/batch-test-1205-4/html/47b74370-d1d4-11f0-959c-5fbc7dc7191d.html';

test.describe('Longest Common Subsequence Application', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application page before each test
        await page.goto(url);
    });

    test('should load the page with default elements', async ({ page }) => {
        // Verify that the title is correct
        await expect(page).toHaveTitle('Longest Common Subsequence');
        
        // Check if input fields and button are visible
        await expect(page.locator('input#string1')).toBeVisible();
        await expect(page.locator('input#string2')).toBeVisible();
        await expect(page.locator('button#findLCS')).toBeVisible();
        await expect(page.locator('#result')).toBeVisible();
    });

    test('should display the correct LCS for two identical strings', async ({ page }) => {
        // Input identical strings
        await page.fill('input#string1', 'ABC');
        await page.fill('input#string2', 'ABC');
        
        // Click the button to find LCS
        await page.click('button#findLCS');
        
        // Verify the result
        await expect(page.locator('#result')).toHaveText('Longest Common Subsequence: ABC');
    });

    test('should display the correct LCS for two different strings', async ({ page }) => {
        // Input two different strings
        await page.fill('input#string1', 'AGGTAB');
        await page.fill('input#string2', 'GXTXAYB');
        
        // Click the button to find LCS
        await page.click('button#findLCS');
        
        // Verify the result
        await expect(page.locator('#result')).toHaveText('Longest Common Subsequence: GTAB');
    });

    test('should return an empty LCS for completely different strings', async ({ page }) => {
        // Input completely different strings
        await page.fill('input#string1', 'ABC');
        await page.fill('input#string2', 'XYZ');
        
        // Click the button to find LCS
        await page.click('button#findLCS');
        
        // Verify the result
        await expect(page.locator('#result')).toHaveText('Longest Common Subsequence: ');
    });

    test('should handle empty input strings', async ({ page }) => {
        // Input empty strings
        await page.fill('input#string1', '');
        await page.fill('input#string2', '');
        
        // Click the button to find LCS
        await page.click('button#findLCS');
        
        // Verify the result
        await expect(page.locator('#result')).toHaveText('Longest Common Subsequence: ');
    });

    test('should handle one empty string and one non-empty string', async ({ page }) => {
        // Input one empty string and one non-empty string
        await page.fill('input#string1', 'ABC');
        await page.fill('input#string2', '');
        
        // Click the button to find LCS
        await page.click('button#findLCS');
        
        // Verify the result
        await expect(page.locator('#result')).toHaveText('Longest Common Subsequence: ');
    });

    test('should handle special characters in strings', async ({ page }) => {
        // Input strings with special characters
        await page.fill('input#string1', 'A#B@C');
        await page.fill('input#string2', 'B@C$D');
        
        // Click the button to find LCS
        await page.click('button#findLCS');
        
        // Verify the result
        await expect(page.locator('#result')).toHaveText('Longest Common Subsequence: B@C');
    });

    test('should handle numeric characters in strings', async ({ page }) => {
        // Input strings with numeric characters
        await page.fill('input#string1', '12345');
        await page.fill('input#string2', '34567');
        
        // Click the button to find LCS
        await page.click('button#findLCS');
        
        // Verify the result
        await expect(page.locator('#result')).toHaveText('Longest Common Subsequence: 345');
    });
});