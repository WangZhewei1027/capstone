import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-40-02/html/5abf27e1-ca8a-11f0-8532-d714b1159c0d.html';

test.describe('Longest Common Subsequence Application', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application page before each test
        await page.goto(BASE_URL);
    });

    test('should display the initial state correctly', async ({ page }) => {
        // Validate that the application is in the Idle state
        const title = await page.locator('h1').innerText();
        expect(title).toBe('Longest Common Subsequence');

        // Check that the result div is empty initially
        const resultText = await page.locator('#result').innerText();
        expect(resultText).toBe('');
    });

    test('should calculate LCS for two non-empty sequences', async ({ page }) => {
        // Input two sequences
        await page.fill('#seq1', 'AGGTAB');
        await page.fill('#seq2', 'GXTXAYB');

        // Click the Calculate LCS button
        await page.click('#calculate-btn');

        // Validate that the application transitions to the Calculated state
        const resultText = await page.locator('#result').innerText();
        expect(resultText).toContain('Longest Common Subsequence: GTAB');
    });

    test('should handle empty input sequences', async ({ page }) => {
        // Input empty sequences
        await page.fill('#seq1', '');
        await page.fill('#seq2', '');

        // Click the Calculate LCS button
        await page.click('#calculate-btn');

        // Validate that the application transitions to the Calculated state
        const resultText = await page.locator('#result').innerText();
        expect(resultText).toContain('Longest Common Subsequence: ');
    });

    test('should calculate LCS for sequences with no common characters', async ({ page }) => {
        // Input sequences with no common characters
        await page.fill('#seq1', 'ABC');
        await page.fill('#seq2', 'DEF');

        // Click the Calculate LCS button
        await page.click('#calculate-btn');

        // Validate that the application transitions to the Calculated state
        const resultText = await page.locator('#result').innerText();
        expect(resultText).toContain('Longest Common Subsequence: ');
    });

    test('should calculate LCS for sequences with all characters in common', async ({ page }) => {
        // Input sequences that are identical
        await page.fill('#seq1', 'ABCDE');
        await page.fill('#seq2', 'ABCDE');

        // Click the Calculate LCS button
        await page.click('#calculate-btn');

        // Validate that the application transitions to the Calculated state
        const resultText = await page.locator('#result').innerText();
        expect(resultText).toContain('Longest Common Subsequence: ABCDE');
    });

    test('should not crash with large input sequences', async ({ page }) => {
        // Input large sequences
        const longSeq1 = 'A'.repeat(1000);
        const longSeq2 = 'A'.repeat(1000);

        await page.fill('#seq1', longSeq1);
        await page.fill('#seq2', longSeq2);

        // Click the Calculate LCS button
        await page.click('#calculate-btn');

        // Validate that the application transitions to the Calculated state
        const resultText = await page.locator('#result').innerText();
        expect(resultText).toContain('Longest Common Subsequence: ' + 'A'.repeat(1000));
    });
});