import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T04-43-42/html/7c184552-ca82-11f0-8193-f13bc409d3cb.html';

test.describe('Selection Sort Visualization', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should be in Idle state initially', async ({ page }) => {
        const resultText = await page.locator('#result').innerText();
        expect(resultText).toBe('');
    });

    test('should transition to InputReceived state on valid input', async ({ page }) => {
        await page.fill('#number', '5');
        const resultText = await page.locator('#result').innerText();
        expect(resultText).toContain('5');
    });

    test('should allow multiple inputs and update the display', async ({ page }) => {
        await page.fill('#number', '3');
        await page.fill('#number', '7');
        const resultText = await page.locator('#result').innerText();
        expect(resultText).toContain('3, 5, 7');
    });

    test('should transition to Sorting state on Sort button click', async ({ page }) => {
        await page.fill('#number', '2');
        await page.click('#sort-btn');
        const resultText = await page.locator('#result').innerText();
        expect(resultText).toContain('2, 3, 5, 7');
    });

    test('should transition to Sorted state after sorting', async ({ page }) => {
        await page.fill('#number', '1');
        await page.click('#sort-btn');
        const resultText = await page.locator('#result').innerText();
        expect(resultText).toContain('1, 2, 3, 5, 7');
    });

    test('should handle invalid input gracefully', async ({ page }) => {
        await page.fill('#number', 'abc');
        const resultText = await page.locator('#result').innerText();
        expect(resultText).toBe('');
    });

    test('should not allow duplicate numbers', async ({ page }) => {
        await page.fill('#number', '5');
        await page.fill('#number', '5');
        const resultText = await page.locator('#result').innerText();
        expect(resultText).toContain('5');
    });

    test('should sort numbers correctly when multiple inputs are provided', async ({ page }) => {
        await page.fill('#number', '8');
        await page.fill('#number', '3');
        await page.fill('#number', '1');
        await page.click('#sort-btn');
        const resultText = await page.locator('#result').innerText();
        expect(resultText).toContain('1, 3, 5, 7, 8');
    });

    test('should reset the state after sorting', async ({ page }) => {
        await page.fill('#number', '4');
        await page.click('#sort-btn');
        await page.fill('#number', '6');
        const resultText = await page.locator('#result').innerText();
        expect(resultText).toContain('4, 6');
    });
});