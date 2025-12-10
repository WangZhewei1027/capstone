import { test, expect } from '@playwright/test';

const baseURL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/8c9476d2-d1d3-11f0-a698-d7b407715e1f.html';

test.describe('Longest Common Subsequence Calculator', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application page before each test
        await page.goto(baseURL);
    });

    test('should load the page with default state', async ({ page }) => {
        // Check if the title is correct
        await expect(page).toHaveTitle('Longest Common Subsequence');
        
        // Verify that input fields and button are visible
        await expect(page.locator('#string1')).toBeVisible();
        await expect(page.locator('#string2')).toBeVisible();
        await expect(page.locator('button')).toBeVisible();
        
        // Ensure the result div is empty initially
        await expect(page.locator('#result')).toHaveText('');
    });

    test('should calculate LCS for two simple strings', async ({ page }) => {
        // Input strings
        await page.fill('#string1', 'ABCBDAB');
        await page.fill('#string2', 'BDCAB');
        
        // Click the button to find LCS
        await page.click('button');
        
        // Verify the result
        await expect(page.locator('#result')).toHaveText('Longest Common Subsequence: BCAB');
    });

    test('should calculate LCS for strings with no common subsequence', async ({ page }) => {
        // Input strings
        await page.fill('#string1', 'ABC');
        await page.fill('#string2', 'XYZ');
        
        // Click the button to find LCS
        await page.click('button');
        
        // Verify the result
        await expect(page.locator('#result')).toHaveText('Longest Common Subsequence: ');
    });

    test('should handle empty input strings', async ({ page }) => {
        // Input empty strings
        await page.fill('#string1', '');
        await page.fill('#string2', '');
        
        // Click the button to find LCS
        await page.click('button');
        
        // Verify the result
        await expect(page.locator('#result')).toHaveText('Longest Common Subsequence: ');
    });

    test('should handle one empty string', async ({ page }) => {
        // Input one empty string
        await page.fill('#string1', 'ABC');
        await page.fill('#string2', '');
        
        // Click the button to find LCS
        await page.click('button');
        
        // Verify the result
        await expect(page.locator('#result')).toHaveText('Longest Common Subsequence: ');
    });

    test('should handle strings with special characters', async ({ page }) => {
        // Input strings with special characters
        await page.fill('#string1', 'A@B#C$');
        await page.fill('#string2', 'B#C$D');
        
        // Click the button to find LCS
        await page.click('button');
        
        // Verify the result
        await expect(page.locator('#result')).toHaveText('Longest Common Subsequence: BC');
    });

    test('should handle long strings', async ({ page }) => {
        // Input long strings
        await page.fill('#string1', 'A long string with some common subsequence');
        await page.fill('#string2', 'Another long string with some common subsequence');
        
        // Click the button to find LCS
        await page.click('button');
        
        // Verify the result (expected LCS may vary based on implementation)
        await expect(page.locator('#result')).toHaveText(/Longest Common Subsequence: .+/);
    });

    test('should log errors in console for invalid operations', async ({ page }) => {
        // Listen for console messages
        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.error(msg.text());
            }
        });

        // Input invalid data (not applicable for this specific case, but to demonstrate error handling)
        await page.fill('#string1', '12345');
        await page.fill('#string2', '67890');
        
        // Click the button to find LCS
        await page.click('button');
        
        // Verify that no error messages are displayed in the result
        await expect(page.locator('#result')).toHaveText('Longest Common Subsequence: ');
    });
});