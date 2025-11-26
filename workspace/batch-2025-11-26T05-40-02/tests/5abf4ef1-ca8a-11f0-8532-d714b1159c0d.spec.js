import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-40-02/html/5abf4ef1-ca8a-11f0-8532-d714b1159c0d.html';

test.describe('Divide and Conquer Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application before each test
        await page.goto(BASE_URL);
    });

    test('Initial state is Idle', async ({ page }) => {
        // Validate that the initial state is Idle
        const header = await page.locator('h1').innerText();
        expect(header).toBe('Divide and Conquer');
    });

    test('Divide button functionality', async ({ page }) => {
        // Test the Divide functionality
        await page.fill('#input', '10'); // Input a number
        await page.click('#divide-btn'); // Click Divide button

        // Validate the result
        const resultText = await page.locator('#result').innerText();
        expect(resultText).toBe('You entered: 10 / 2 = 5');
    });

    test('Conquer button functionality', async ({ page }) => {
        // Test the Conquer functionality
        await page.fill('#input2', '20'); // Input a number
        await page.click('#conquer-btn'); // Click Conquer button

        // Validate the result
        const resultText = await page.locator('#result2').innerText();
        expect(resultText).toBe('You entered: 20 / 2 = 10');
    });

    test('Divide button with edge case (zero)', async ({ page }) => {
        // Test Divide functionality with edge case of zero
        await page.fill('#input', '0'); // Input zero
        await page.click('#divide-btn'); // Click Divide button

        // Validate the result
        const resultText = await page.locator('#result').innerText();
        expect(resultText).toBe('You entered: 0 / 2 = 0');
    });

    test('Conquer button with edge case (negative number)', async ({ page }) => {
        // Test Conquer functionality with edge case of negative number
        await page.fill('#input2', '-10'); // Input a negative number
        await page.click('#conquer-btn'); // Click Conquer button

        // Validate the result
        const resultText = await page.locator('#result2').innerText();
        expect(resultText).toBe('You entered: -10 / 2 = -5');
    });

    test('Divide button with empty input', async ({ page }) => {
        // Test Divide functionality with empty input
        await page.fill('#input', ''); // Leave input empty
        await page.click('#divide-btn'); // Click Divide button

        // Validate that no result is shown
        const resultText = await page.locator('#result').innerText();
        expect(resultText).toBe('');
    });

    test('Conquer button with empty input', async ({ page }) => {
        // Test Conquer functionality with empty input
        await page.fill('#input2', ''); // Leave input empty
        await page.click('#conquer-btn'); // Click Conquer button

        // Validate that no result is shown
        const resultText = await page.locator('#result2').innerText();
        expect(resultText).toBe('');
    });
});