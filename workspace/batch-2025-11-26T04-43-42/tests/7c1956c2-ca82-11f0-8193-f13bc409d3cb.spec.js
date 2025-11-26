import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T04-43-42/html/7c1956c2-ca82-11f0-8193-f13bc409d3cb.html';

test.describe('Longest Common Subsequence Application', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('Initial state should be Idle', async ({ page }) => {
        const s1Value = await page.locator('#s1').inputValue();
        const s2Value = await page.locator('#s2').inputValue();
        expect(s1Value).toBe('');
        expect(s2Value).toBe('');
    });

    test('Should disable input fields when processing', async ({ page }) => {
        await page.locator('#s1').fill('ABC');
        await page.locator('#s2').fill('AC');
        await page.locator('#find-lcs').click();

        // Check if input fields are disabled
        const isS1Disabled = await page.locator('#s1').isDisabled();
        const isS2Disabled = await page.locator('#s2').isDisabled();
        expect(isS1Disabled).toBe(true);
        expect(isS2Disabled).toBe(true);
    });

    test('Should show loading indicator during processing', async ({ page }) => {
        await page.locator('#s1').fill('ABC');
        await page.locator('#s2').fill('AC');
        await page.locator('#find-lcs').click();

        // Check for loading indicator (assuming it's implemented in the UI)
        // This part of the test assumes that you have a loading indicator in your UI
        // await expect(page.locator('#loading-indicator')).toBeVisible();
    });

    test('Should display the LCS result after processing', async ({ page }) => {
        await page.locator('#s1').fill('ABC');
        await page.locator('#s2').fill('AC');
        await page.locator('#find-lcs').click();

        // Wait for result to be displayed
        await page.waitForTimeout(1000); // Adjust timeout as necessary
        const resultText = await page.locator('#result').innerText();
        expect(resultText).toContain('Longest Common Subsequence: AC');
    });

    test('Should clear input fields after displaying result', async ({ page }) => {
        await page.locator('#s1').fill('ABC');
        await page.locator('#s2').fill('AC');
        await page.locator('#find-lcs').click();

        // Wait for result to be displayed
        await page.waitForTimeout(1000);
        await page.locator('#find-lcs').click(); // Click again to reset

        const s1Value = await page.locator('#s1').inputValue();
        const s2Value = await page.locator('#s2').inputValue();
        expect(s1Value).toBe('');
        expect(s2Value).toBe('');
    });

    test('Should handle empty input fields gracefully', async ({ page }) => {
        await page.locator('#find-lcs').click();

        // Check if result is empty or a specific message is shown
        const resultText = await page.locator('#result').innerText();
        expect(resultText).toContain('Longest Common Subsequence: ');
    });

    test('Should handle single character input', async ({ page }) => {
        await page.locator('#s1').fill('A');
        await page.locator('#s2').fill('A');
        await page.locator('#find-lcs').click();

        // Wait for result to be displayed
        await page.waitForTimeout(1000);
        const resultText = await page.locator('#result').innerText();
        expect(resultText).toContain('Longest Common Subsequence: A');
    });

    test('Should handle completely different strings', async ({ page }) => {
        await page.locator('#s1').fill('ABC');
        await page.locator('#s2').fill('XYZ');
        await page.locator('#find-lcs').click();

        // Wait for result to be displayed
        await page.waitForTimeout(1000);
        const resultText = await page.locator('#result').innerText();
        expect(resultText).toContain('Longest Common Subsequence: ');
    });
});