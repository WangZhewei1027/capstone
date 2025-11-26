import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-25T23-45-53/html/e138bc51-ca58-11f0-b3c1-8750c080fb19.html';

test.describe('Sliding Window Demonstration', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('Initial state is Idle', async ({ page }) => {
        const output = await page.locator('#output').innerText();
        expect(output).toBe('');
    });

    test('Calculating state transitions to Result on valid input', async ({ page }) => {
        await page.fill('#windowSize', '3');
        await page.fill('#arrayInput', '1,2,3,4,5,6,7,8,9');
        await page.click('button');

        // Wait for the output to be updated
        await page.waitForTimeout(500); // Adjust timeout as necessary

        const output = await page.locator('#output').innerText();
        expect(output).toContain('Sliding Window Sums: 6, 9, 12, 15, 18, 21');
    });

    test('Error state on invalid input', async ({ page }) => {
        await page.fill('#windowSize', '10'); // Invalid window size
        await page.fill('#arrayInput', '1,2,3,4,5');
        await page.click('button');

        // Wait for the output to be updated
        await page.waitForTimeout(500); // Adjust timeout as necessary

        const output = await page.locator('#output').innerText();
        expect(output).toBe('Window size must be less than or equal to array length.');
    });

    test('Reset state after error handling', async ({ page }) => {
        await page.fill('#windowSize', '10'); // Invalid window size
        await page.fill('#arrayInput', '1,2,3,4,5');
        await page.click('button');

        // Wait for the output to be updated
        await page.waitForTimeout(500); // Adjust timeout as necessary

        const outputBeforeReset = await page.locator('#output').innerText();
        expect(outputBeforeReset).toBe('Window size must be less than or equal to array length.');

        // Reset the input fields
        await page.fill('#windowSize', '3');
        await page.fill('#arrayInput', '1,2,3,4,5,6,7,8,9');
        await page.click('button');

        // Wait for the output to be updated
        await page.waitForTimeout(500); // Adjust timeout as necessary

        const outputAfterReset = await page.locator('#output').innerText();
        expect(outputAfterReset).toContain('Sliding Window Sums: 6, 9, 12, 15, 18, 21');
    });

    test('Reset state after result handling', async ({ page }) => {
        await page.fill('#windowSize', '3');
        await page.fill('#arrayInput', '1,2,3,4,5,6,7,8,9');
        await page.click('button');

        // Wait for the output to be updated
        await page.waitForTimeout(500); // Adjust timeout as necessary

        const outputBeforeReset = await page.locator('#output').innerText();
        expect(outputBeforeReset).toContain('Sliding Window Sums: 6, 9, 12, 15, 18, 21');

        // Reset the output
        await page.fill('#windowSize', '2');
        await page.fill('#arrayInput', '1,2');
        await page.click('button');

        // Wait for the output to be updated
        await page.waitForTimeout(500); // Adjust timeout as necessary

        const outputAfterReset = await page.locator('#output').innerText();
        expect(outputAfterReset).toContain('Sliding Window Sums: 3');
    });
});