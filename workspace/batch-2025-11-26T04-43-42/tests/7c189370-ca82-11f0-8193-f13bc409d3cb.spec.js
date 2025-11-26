import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T04-43-42/html/7c189370-ca82-11f0-8193-f13bc409d3cb.html';

test.describe('Quick Sort Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should display the initial idle state', async ({ page }) => {
        const output = await page.locator('#output').innerText();
        expect(output).toBe('');
    });

    test('should transition to InputtingNumbers state on form submission', async ({ page }) => {
        await page.fill('#numbers', '3,1,2');
        await page.click('button[type="submit"]');

        const output = await page.locator('#output').innerText();
        expect(output).toBe('Sorted numbers: 1, 2, 3');
    });

    test('should validate input and transition to Sorting state', async ({ page }) => {
        await page.fill('#numbers', '5,3,8,6,2');
        await page.click('button[type="submit"]');

        const output = await page.locator('#output').innerText();
        expect(output).toBe('Sorted numbers: 2, 3, 5, 6, 8');
    });

    test('should show error message for empty input', async ({ page }) => {
        await page.fill('#numbers', '');
        await page.click('button[type="submit"]');

        const output = await page.locator('#output').innerText();
        expect(output).toBe('Please enter numbers separated by commas.');
    });

    test('should handle input with non-numeric values', async ({ page }) => {
        await page.fill('#numbers', 'a,b,c');
        await page.click('button[type="submit"]');

        const output = await page.locator('#output').innerText();
        expect(output).toBe('Please enter numbers separated by commas.');
    });

    test('should clear error message and return to idle state', async ({ page }) => {
        await page.fill('#numbers', '');
        await page.click('button[type="submit"]');

        const output = await page.locator('#output').innerText();
        expect(output).toBe('Please enter numbers separated by commas.');

        await page.fill('#numbers', '4,2,3');
        await page.click('button[type="submit"]');

        const outputAfterCorrection = await page.locator('#output').innerText();
        expect(outputAfterCorrection).toBe('Sorted numbers: 2, 3, 4');
    });

    test('should sort numbers correctly when input is valid', async ({ page }) => {
        await page.fill('#numbers', '10,7,8,9,1,5');
        await page.click('button[type="submit"]');

        const output = await page.locator('#output').innerText();
        expect(output).toBe('Sorted numbers: 1, 5, 7, 8, 9, 10');
    });

    test('should handle large input correctly', async ({ page }) => {
        const largeInput = Array.from({ length: 1000 }, (_, i) => i).reverse().join(',');
        await page.fill('#numbers', largeInput);
        await page.click('button[type="submit"]');

        const output = await page.locator('#output').innerText();
        const expectedOutput = Array.from({ length: 1000 }, (_, i) => i).join(', ');
        expect(output).toBe('Sorted numbers: ' + expectedOutput);
    });
});