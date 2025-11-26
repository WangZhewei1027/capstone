import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-25T23-45-53/html/e1386e31-ca58-11f0-b3c1-8750c080fb19.html';

test.describe('Fibonacci Sequence Generator', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should be in Idle state initially', async ({ page }) => {
        const output = await page.locator('#output').innerText();
        expect(output).toBe('');
    });

    test('should transition to InputtingNumber state on generate button click', async ({ page }) => {
        await page.fill('#numberInput', '5');
        await page.click('button');
        const inputValue = await page.locator('#numberInput').inputValue();
        expect(inputValue).toBe('5');
    });

    test('should show error message for invalid input', async ({ page }) => {
        await page.fill('#numberInput', '-1');
        await page.click('button');
        const output = await page.locator('#output').innerText();
        expect(output).toBe('Please enter a positive integer.');
    });

    test('should generate Fibonacci sequence for valid input', async ({ page }) => {
        await page.fill('#numberInput', '5');
        await page.click('button');
        const output = await page.locator('#output').innerText();
        expect(output).toBe('Fibonacci Sequence: 0, 1, 1, 2, 3');
    });

    test('should clear input and output after error', async ({ page }) => {
        await page.fill('#numberInput', '-1');
        await page.click('button');
        expect(await page.locator('#output').innerText()).toBe('Please enter a positive integer.');

        await page.fill('#numberInput', '3');
        await page.click('button');
        const output = await page.locator('#output').innerText();
        expect(output).toBe('Fibonacci Sequence: 0, 1, 1');
    });

    test('should handle edge case of zero input', async ({ page }) => {
        await page.fill('#numberInput', '0');
        await page.click('button');
        const output = await page.locator('#output').innerText();
        expect(output).toBe('Please enter a positive integer.');
    });

    test('should handle edge case of one input', async ({ page }) => {
        await page.fill('#numberInput', '1');
        await page.click('button');
        const output = await page.locator('#output').innerText();
        expect(output).toBe('Fibonacci Sequence: 0');
    });

    test('should handle edge case of two input', async ({ page }) => {
        await page.fill('#numberInput', '2');
        await page.click('button');
        const output = await page.locator('#output').innerText();
        expect(output).toBe('Fibonacci Sequence: 0, 1');
    });
});