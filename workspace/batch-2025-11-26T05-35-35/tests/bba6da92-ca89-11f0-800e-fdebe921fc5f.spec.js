import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-35-35/html/bba6da92-ca89-11f0-800e-fdebe921fc5f.html';

test.describe('Recursion Example Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application page before each test
        await page.goto(BASE_URL);
    });

    test('Initial state should display empty result', async ({ page }) => {
        // Validate that the initial state is Idle and result is empty
        const resultText = await page.textContent('#result');
        expect(resultText).toBe('');
    });

    test('Factorial calculation should display results', async ({ page }) => {
        // Validate that the results are displayed after initialization
        const expectedResults = [
            'Factorial of 1 is: 1',
            'Factorial of 2 is: 2',
            'Factorial of 3 is: 6',
            'Factorial of 4 is: 24',
            'Factorial of 5 is: 120'
        ];

        // Wait for the results to be displayed
        await page.waitForSelector('#result p');

        // Get all paragraphs under the result element
        const results = await page.$$eval('#result p', elements => elements.map(el => el.textContent));

        // Validate that the results match the expected output
        expect(results).toEqual(expectedResults);
    });

    test('Result should be cleared before new calculation', async ({ page }) => {
        // Validate that the result is cleared before new calculations
        await page.evaluate(() => {
            document.getElementById('result').innerHTML = '';
            recursiveFactorial(5); // Trigger the calculation again
        });

        const expectedResults = [
            'Factorial of 1 is: 1',
            'Factorial of 2 is: 2',
            'Factorial of 3 is: 6',
            'Factorial of 4 is: 24',
            'Factorial of 5 is: 120'
        ];

        // Wait for the results to be displayed
        await page.waitForSelector('#result p');

        // Get all paragraphs under the result element
        const results = await page.$$eval('#result p', elements => elements.map(el => el.textContent));

        // Validate that the results match the expected output
        expect(results).toEqual(expectedResults);
    });

    test('Check for edge case with zero', async ({ page }) => {
        // Validate that factorial of 0 is handled correctly
        await page.evaluate(() => {
            document.getElementById('result').innerHTML = '';
            recursiveFactorial(0); // Trigger the calculation for zero
        });

        // Wait for the results to be displayed
        await page.waitForSelector('#result p');

        const results = await page.$$eval('#result p', elements => elements.map(el => el.textContent));

        // Validate that the result for factorial of 0 is correct
        expect(results).toEqual(['Factorial of 1 is: 1']);
    });

    test('Check for edge case with negative input', async ({ page }) => {
        // Validate that negative input is handled correctly (if applicable)
        await page.evaluate(() => {
            document.getElementById('result').innerHTML = '';
            // Assuming the function can handle negative input gracefully
            recursiveFactorial(-5); // Trigger the calculation for negative
        });

        // Wait for the results to be displayed
        await page.waitForSelector('#result p');

        const results = await page.$$eval('#result p', elements => elements.map(el => el.textContent));

        // Validate that no results are displayed for negative input
        expect(results).toEqual([]);
    });
});