import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-2/html/24953160-d1d2-11f0-a359-f3a4ddd3c298.html';

test.describe('Divide and Conquer Example Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application page before each test
        await page.goto(BASE_URL);
    });

    test('Initial state should be Idle', async ({ page }) => {
        // Validate the initial state of the application
        const resultText = await page.locator('#result').innerText();
        expect(resultText).toBe('');
    });

    test('User can input numbers and find the maximum', async ({ page }) => {
        // User inputs numbers and clicks the Find Maximum button
        await page.fill('#arrayInput', '3,1,4,1,5,9,2,6,5,3,5');
        await page.click('button[onclick="findMaximum()"]');

        // Validate that the result is displayed correctly
        const resultText1 = await page.locator('#result').innerText();
        expect(resultText).toContain('The maximum number is: 9');
    });

    test('Handles empty input gracefully', async ({ page }) => {
        // User clicks the Find Maximum button without input
        await page.fill('#arrayInput', '');
        await page.click('button[onclick="findMaximum()"]');

        // Validate that the result is still empty
        const resultText2 = await page.locator('#result').innerText();
        expect(resultText).toBe('');
    });

    test('Handles single number input', async ({ page }) => {
        // User inputs a single number
        await page.fill('#arrayInput', '42');
        await page.click('button[onclick="findMaximum()"]');

        // Validate that the result is displayed correctly
        const resultText3 = await page.locator('#result').innerText();
        expect(resultText).toContain('The maximum number is: 42');
    });

    test('Handles negative numbers', async ({ page }) => {
        // User inputs negative numbers
        await page.fill('#arrayInput', '-1,-2,-3,-4');
        await page.click('button[onclick="findMaximum()"]');

        // Validate that the result is displayed correctly
        const resultText4 = await page.locator('#result').innerText();
        expect(resultText).toContain('The maximum number is: -1');
    });

    test('Handles non-numeric input', async ({ page }) => {
        // User inputs non-numeric values
        await page.fill('#arrayInput', 'a,b,c');
        await page.click('button[onclick="findMaximum()"]');

        // Validate that the result is still empty
        const resultText5 = await page.locator('#result').innerText();
        expect(resultText).toBe('');
    });

    test('Should not crash on invalid input', async ({ page }) => {
        // User inputs invalid data
        await page.fill('#arrayInput', '1,2,three,4');
        await page.click('button[onclick="findMaximum()"]');

        // Validate that the result is still empty
        const resultText6 = await page.locator('#result').innerText();
        expect(resultText).toBe('');
    });

    test('Should display result after valid input', async ({ page }) => {
        // User inputs valid numbers again after invalid input
        await page.fill('#arrayInput', '10,20,30,40');
        await page.click('button[onclick="findMaximum()"]');

        // Validate that the result is displayed correctly
        const resultText7 = await page.locator('#result').innerText();
        expect(resultText).toContain('The maximum number is: 40');
    });
});