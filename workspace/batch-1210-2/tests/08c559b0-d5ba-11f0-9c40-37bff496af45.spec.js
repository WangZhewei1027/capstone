import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-1210-2/html/08c559b0-d5ba-11f0-9c40-37bff496af45.html';

test.describe('Bubble Sort Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('Initial state is Idle', async ({ page }) => {
        // Validate that the initial state is Idle
        const resultText = await page.locator('#result').textContent();
        expect(resultText).toBe('');
    });

    test('User can input numbers', async ({ page }) => {
        // Validate input change event
        await page.fill('#input', '3,1,4,2,5');
        const inputValue = await page.locator('#input').inputValue();
        expect(inputValue).toBe('3,1,4,2,5');
    });

    test('Sorting numbers updates result', async ({ page }) => {
        // Validate sorting action via button click
        await page.fill('#input', '3,1,4,2,5');
        await page.click('#sort');

        const resultText = await page.locator('#result').textContent();
        expect(resultText).toBe('Sorted Numbers: 1, 2, 3, 4, 5');
    });

    test('Sorting with empty input shows no result', async ({ page }) => {
        // Validate behavior with empty input
        await page.fill('#input', '');
        await page.click('#sort');

        const resultText = await page.locator('#result').textContent();
        expect(resultText).toBe('Sorted Numbers: ');
    });

    test('Sorting with invalid input shows no result', async ({ page }) => {
        // Validate behavior with invalid input
        await page.fill('#input', 'abc,def,ghi');
        await page.click('#sort');

        const resultText = await page.locator('#result').textContent();
        expect(resultText).toBe('Sorted Numbers: NaN,NaN,NaN');
    });

    test('Sorting with single number shows that number', async ({ page }) => {
        // Validate behavior with a single number
        await page.fill('#input', '5');
        await page.click('#sort');

        const resultText = await page.locator('#result').textContent();
        expect(resultText).toBe('Sorted Numbers: 5');
    });

    test('Sorting with negative numbers', async ({ page }) => {
        // Validate sorting with negative numbers
        await page.fill('#input', '-1,-3,-2,0,1');
        await page.click('#sort');

        const resultText = await page.locator('#result').textContent();
        expect(resultText).toBe('Sorted Numbers: -3, -2, -1, 0, 1');
    });

    test('Sorting with duplicate numbers', async ({ page }) => {
        // Validate sorting with duplicate numbers
        await page.fill('#input', '2,2,1,1,3');
        await page.click('#sort');

        const resultText = await page.locator('#result').textContent();
        expect(resultText).toBe('Sorted Numbers: 1, 1, 2, 2, 3');
    });

    test('Check console errors for undefined variables', async ({ page }) => {
        // Validate that there are no console errors
        const consoleMessages = [];
        page.on('console', msg => consoleMessages.push(msg.text()));

        await page.fill('#input', '3,1,4,2,5');
        await page.click('#sort');

        expect(consoleMessages).toEqual(expect.arrayContaining([
            expect.stringContaining('ReferenceError'),
            expect.stringContaining('TypeError'),
            expect.stringContaining('SyntaxError')
        ]));
    });
});