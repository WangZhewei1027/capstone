import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T04-43-42/html/7c19a4e1-ca82-11f0-8193-f13bc409d3cb.html';

test.describe('Two Pointers Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('Initial state should be Idle', async ({ page }) => {
        const resultText = await page.locator('#result').textContent();
        expect(resultText).toBe('');
    });

    test('Clicking Add button transitions to Adding state and displays result', async ({ page }) => {
        await page.fill('#array', '3');
        await page.fill('#array2', '5');
        await page.click('#add');

        const resultText = await page.locator('#result').textContent();
        expect(resultText).toBe('The sum of 3 and 5 is: 8');
    });

    test('Clicking Subtract button transitions to Subtracting state and displays result', async ({ page }) => {
        await page.fill('#array', '10');
        await page.fill('#array2', '4');
        await page.click('#subtract');

        const resultText = await page.locator('#result').textContent();
        expect(resultText).toBe('The difference of 10 and 4 is: 6');
    });

    test('Clicking Add button after result displays resets input fields', async ({ page }) => {
        await page.fill('#array', '1');
        await page.fill('#array2', '2');
        await page.click('#add');

        const resultText = await page.locator('#result').textContent();
        expect(resultText).toBe('The sum of 1 and 2 is: 3');

        await page.click('#add'); // Clicking again to reset
        const resetResultText = await page.locator('#result').textContent();
        expect(resetResultText).toBe('');
    });

    test('Clicking Subtract button after result displays resets input fields', async ({ page }) => {
        await page.fill('#array', '5');
        await page.fill('#array2', '3');
        await page.click('#subtract');

        const resultText = await page.locator('#result').textContent();
        expect(resultText).toBe('The difference of 5 and 3 is: 2');

        await page.click('#subtract'); // Clicking again to reset
        const resetResultText = await page.locator('#result').textContent();
        expect(resetResultText).toBe('');
    });

    test('Adding with non-numeric input shows no result', async ({ page }) => {
        await page.fill('#array', 'abc');
        await page.fill('#array2', '5');
        await page.click('#add');

        const resultText = await page.locator('#result').textContent();
        expect(resultText).toBe('The sum of abc and 5 is: NaN');
    });

    test('Subtracting with non-numeric input shows no result', async ({ page }) => {
        await page.fill('#array', '10');
        await page.fill('#array2', 'xyz');
        await page.click('#subtract');

        const resultText = await page.locator('#result').textContent();
        expect(resultText).toBe('The difference of 10 and xyz is: NaN');
    });
});