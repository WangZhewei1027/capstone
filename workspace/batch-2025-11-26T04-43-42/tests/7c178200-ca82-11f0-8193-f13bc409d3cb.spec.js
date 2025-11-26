import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T04-43-42/html/7c178200-ca82-11f0-8193-f13bc409d3cb.html';

test.describe('Set Management Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should start in Idle state', async ({ page }) => {
        const resultText = await page.textContent('#result');
        expect(resultText).toBe('');
    });

    test('should highlight input when number is entered', async ({ page }) => {
        await page.fill('#number', '5');
        const inputValue = await page.inputValue('#number');
        expect(inputValue).toBe('5');
        // Assuming highlightInput() adds a class or style to the input
        const inputStyle = await page.evaluate(() => getComputedStyle(document.getElementById('number')).border);
        expect(inputStyle).toContain('highlight'); // Replace with actual expected style
    });

    test('should add number to set and display success message', async ({ page }) => {
        await page.fill('#number', '10');
        await page.click('#set button[type="submit"]');
        const resultText = await page.textContent('#result');
        expect(resultText).toBe('Number added to set: 10');
    });

    test('should display error message when number is already in set', async ({ page }) => {
        await page.fill('#number', '15');
        await page.click('#set button[type="submit"]');
        await page.fill('#number', '15'); // Input the same number again
        await page.click('#set button[type="submit"]');
        const resultText = await page.textContent('#result');
        expect(resultText).toBe('Number already in set');
    });

    test('should reset input field after adding number', async ({ page }) => {
        await page.fill('#number', '20');
        await page.click('#set button[type="submit"]');
        const inputValueAfterAdd = await page.inputValue('#number');
        expect(inputValueAfterAdd).toBe('');
    });

    test('should reset input field after error message', async ({ page }) => {
        await page.fill('#number', '25');
        await page.click('#set button[type="submit"]');
        await page.fill('#number', '25'); // Input the same number again
        await page.click('#set button[type="submit"]');
        const inputValueAfterError = await page.inputValue('#number');
        expect(inputValueAfterError).toBe('');
    });

    test('should handle multiple unique inputs correctly', async ({ page }) => {
        const numbersToAdd = ['30', '35', '40'];
        for (const number of numbersToAdd) {
            await page.fill('#number', number);
            await page.click('#set button[type="submit"]');
            const resultText = await page.textContent('#result');
            expect(resultText).toBe(`Number added to set: ${number}`);
        }
    });

    test('should not allow adding non-numeric input', async ({ page }) => {
        await page.fill('#number', 'abc');
        await page.click('#set button[type="submit"]');
        const resultText = await page.textContent('#result');
        expect(resultText).toBe('Number already in set'); // Assuming the app handles this as an error
    });
});