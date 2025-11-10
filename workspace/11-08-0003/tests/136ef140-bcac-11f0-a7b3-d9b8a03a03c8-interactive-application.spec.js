import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/136ef140-bcac-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Fibonacci Sequence Interactive Application', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should be in idle state initially', async ({ page }) => {
        const resultText = await page.textContent('#result');
        expect(resultText).toBe('');
        const sequenceDisplay = await page.innerHTML('#sequenceDisplay');
        expect(sequenceDisplay).toBe('');
    });

    test('should validate input and display error for invalid input', async ({ page }) => {
        await page.fill('#numberInput', '25'); // Invalid input
        await page.click('#generateButton');

        const resultText1 = await page.textContent('#result');
        expect(resultText).toBe('Please enter a number between 1 and 20.');
        const sequenceDisplay1 = await page.innerHTML('#sequenceDisplay1');
        expect(sequenceDisplay).toBe('');
    });

    test('should generate Fibonacci sequence for valid input', async ({ page }) => {
        await page.fill('#numberInput', '5'); // Valid input
        await page.click('#generateButton');

        const resultText2 = await page.textContent('#result');
        expect(resultText).toBe('');
        const sequenceDisplay2 = await page.innerHTML('#sequenceDisplay2');
        expect(sequenceDisplay).toContain('0'); // Check if sequence starts with 0
        expect(sequenceDisplay).toContain('1'); // Check if sequence contains 1
        expect(sequenceDisplay).toContain('3'); // Check if sequence contains 3
        expect(sequenceDisplay).toContain('5'); // Check if sequence contains 5
    });

    test('should reset the display after generating result', async ({ page }) => {
        await page.fill('#numberInput', '5'); // Valid input
        await page.click('#generateButton');

        await page.fill('#numberInput', '10'); // New valid input
        await page.click('#generateButton');

        const resultText3 = await page.textContent('#result');
        expect(resultText).toBe('');
        const sequenceDisplay3 = await page.innerHTML('#sequenceDisplay3');
        expect(sequenceDisplay).toContain('0'); // Check if new sequence starts with 0
        expect(sequenceDisplay).toContain('1'); // Check if new sequence contains 1
        expect(sequenceDisplay).toContain('34'); // Check if new sequence contains 34
    });

    test('should handle edge case for minimum input', async ({ page }) => {
        await page.fill('#numberInput', '1'); // Minimum valid input
        await page.click('#generateButton');

        const resultText4 = await page.textContent('#result');
        expect(resultText).toBe('');
        const sequenceDisplay4 = await page.innerHTML('#sequenceDisplay4');
        expect(sequenceDisplay).toContain('0'); // Check if sequence contains 0
    });

    test('should handle edge case for maximum input', async ({ page }) => {
        await page.fill('#numberInput', '20'); // Maximum valid input
        await page.click('#generateButton');

        const resultText5 = await page.textContent('#result');
        expect(resultText).toBe('');
        const sequenceDisplay5 = await page.innerHTML('#sequenceDisplay5');
        expect(sequenceDisplay).toContain('4181'); // Check if sequence contains 4181
    });
});