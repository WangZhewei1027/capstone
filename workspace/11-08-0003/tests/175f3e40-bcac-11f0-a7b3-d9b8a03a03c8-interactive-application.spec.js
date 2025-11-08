import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/175f3e40-bcac-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Longest Common Subsequence Application', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should start in idle state', async ({ page }) => {
        const output = await page.locator('#output').innerText();
        expect(output).toBe('');
    });

    test('should compute LCS and transition to computing state', async ({ page }) => {
        await page.fill('#seq1', 'ABCDGH');
        await page.fill('#seq2', 'AEDFH');
        await page.click('.button');

        // Verify output is displayed
        const output1 = await page.locator('#output1').innerText();
        expect(output).not.toBe('');

        // Assuming the output should contain the LCS
        expect(output).toContain('ADH');
    });

    test('should visualize LCS and transition to visualizing state', async ({ page }) => {
        await page.fill('#seq1', 'ABCDGH');
        await page.fill('#seq2', 'AEDFH');
        await page.click('.button');

        // Wait for the visualization to complete
        await page.waitForSelector('.lcs-visual');

        const visualElements = await page.locator('.lcs-item').count();
        expect(visualElements).toBeGreaterThan(0);
    });

    test('should show results and transition to done state', async ({ page }) => {
        await page.fill('#seq1', 'ABCDGH');
        await page.fill('#seq2', 'AEDFH');
        await page.click('.button');

        // Wait for the visualization to complete
        await page.waitForSelector('.lcs-visual');

        // Check if results are shown
        const output2 = await page.locator('#output2').innerText();
        expect(output).toContain('ADH');

        // Simulate reset action
        await page.click('.button'); // Assuming the button resets the input
        const resetOutput = await page.locator('#output').innerText();
        expect(resetOutput).toBe('');
    });

    test('should handle empty input gracefully', async ({ page }) => {
        await page.fill('#seq1', '');
        await page.fill('#seq2', '');
        await page.click('.button');

        const output3 = await page.locator('#output3').innerText();
        expect(output).toBe(''); // Expect no output for empty sequences
    });

    test('should handle invalid input gracefully', async ({ page }) => {
        await page.fill('#seq1', '12345');
        await page.fill('#seq2', '67890');
        await page.click('.button');

        const output4 = await page.locator('#output4').innerText();
        expect(output).toBe(''); // Expect no output for invalid sequences
    });

    test('should reset to idle state after reset', async ({ page }) => {
        await page.fill('#seq1', 'ABCDGH');
        await page.fill('#seq2', 'AEDFH');
        await page.click('.button');

        // Wait for the visualization to complete
        await page.waitForSelector('.lcs-visual');

        // Simulate reset action
        await page.click('.button'); // Assuming the button resets the input
        const resetOutput1 = await page.locator('#output').innerText();
        expect(resetOutput).toBe('');
    });
});