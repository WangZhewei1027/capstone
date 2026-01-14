import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-1210-2/html/73379260-d5a4-11f0-8a0e-b12c1263c558.html';

test.describe('Bubble Sort Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the Bubble Sort application page before each test
        await page.goto(BASE_URL);
    });

    test('Initial State - Idle', async ({ page }) => {
        // Validate the initial state of the application
        const resultText = await page.textContent('#result');
        expect(resultText).toBe('Enter the number of elements to sort:');
    });

    test('Sort Button Click - Transition to Sorted State', async ({ page }) => {
        // Simulate clicking the Sort button and validate the transition to the Sorted state
        await page.fill('#numElements', '5');
        await page.click('#sortButton');

        const resultText = await page.textContent('#result');
        expect(resultText).toMatch(/Sorted array: 1, 2, 3, 4, 5/);
    });

    test('Reset Button Click - Transition to Reset State', async ({ page }) => {
        // Simulate clicking the Reset button and validate the transition to the Reset state
        await page.click('#resetButton');

        const resultText = await page.textContent('#result');
        expect(resultText).toBe('Enter the number of elements to sort:');
    });

    test('Reset Button Click Again - Return to Idle State', async ({ page }) => {
        // Simulate clicking the Reset button again and validate return to Idle state
        await page.click('#resetButton');
        const resultText = await page.textContent('#result');
        expect(resultText).toBe('Enter the number of elements to sort:');
    });

    test('Sort with Different Number of Elements', async ({ page }) => {
        // Test sorting with a different number of elements
        await page.fill('#numElements', '3');
        await page.click('#sortButton');

        const resultText = await page.textContent('#result');
        expect(resultText).toMatch(/Sorted array: 1, 2, 3/);
    });

    test('Sort with Zero Elements - Edge Case', async ({ page }) => {
        // Test sorting with zero elements
        await page.fill('#numElements', '0');
        await page.click('#sortButton');

        const resultText = await page.textContent('#result');
        expect(resultText).toMatch(/Sorted array: /);
    });

    test('Sort with Negative Number - Error Scenario', async ({ page }) => {
        // Test sorting with a negative number of elements
        await page.fill('#numElements', '-5');
        await page.click('#sortButton');

        const resultText = await page.textContent('#result');
        expect(resultText).toMatch(/Sorted array: /);
    });

    test('Sort Button Click without Input - Error Scenario', async ({ page }) => {
        // Test clicking the Sort button without entering a number
        await page.fill('#numElements', '');
        await page.click('#sortButton');

        const resultText = await page.textContent('#result');
        expect(resultText).toMatch(/Sorted array: /);
    });
});