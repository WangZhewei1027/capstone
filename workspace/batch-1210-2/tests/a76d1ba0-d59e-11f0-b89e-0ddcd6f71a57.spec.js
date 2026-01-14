import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-1210-2/html/a76d1ba0-d59e-11f0-b89e-0ddcd6f71a57.html';

test.describe('Bubble Sort Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the Bubble Sort application
        await page.goto(BASE_URL);
    });

    test('Initial state should be Idle', async ({ page }) => {
        // Verify that the initial state is Idle
        const resultText = await page.textContent('#result');
        expect(resultText).toBe('');
    });

    test('User can input number of elements', async ({ page }) => {
        // Input a number of elements
        await page.fill('#n', '5');
        const inputValue = await page.inputValue('#n');
        expect(inputValue).toBe('5');
    });

    test('Clicking sort button transitions to Sorting state', async ({ page }) => {
        // Input a number and click the sort button
        await page.fill('#n', '5');
        await page.click('#sort-btn');

        // Check if the result area is still empty during sorting
        const resultText = await page.textContent('#result');
        expect(resultText).toBe('');
    });

    test('Clicking sort button transitions to Sorted state', async ({ page }) => {
        // Input a number and click the sort button
        await page.fill('#n', '5');
        await page.click('#sort-btn');

        // Wait for the result to be displayed
        await page.waitForTimeout(1000); // Wait for sorting to complete (arbitrary timeout)
        const resultText = await page.textContent('#result');
        expect(resultText).toMatch(/Sorted array: \d+, \d+, \d+, \d+, \d+/);
    });

    test('Edge case: User inputs zero elements', async ({ page }) => {
        // Input zero elements
        await page.fill('#n', '0');
        await page.click('#sort-btn');

        // Check if the result area indicates an empty array
        const resultText = await page.textContent('#result');
        expect(resultText).toBe('Sorted array: ');
    });

    test('Edge case: User inputs negative number', async ({ page }) => {
        // Input a negative number
        await page.fill('#n', '-5');
        await page.click('#sort-btn');

        // Check if the result area indicates an empty array
        const resultText = await page.textContent('#result');
        expect(resultText).toBe('Sorted array: ');
    });

    test('Error handling: User inputs non-numeric value', async ({ page }) => {
        // Input a non-numeric value
        await page.fill('#n', 'abc');
        await page.click('#sort-btn');

        // Check if the result area is still empty
        const resultText = await page.textContent('#result');
        expect(resultText).toBe('');
    });

    test.afterEach(async ({ page }) => {
        // Check for any console errors after each test
        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.error(msg.text());
            }
        });
    });
});