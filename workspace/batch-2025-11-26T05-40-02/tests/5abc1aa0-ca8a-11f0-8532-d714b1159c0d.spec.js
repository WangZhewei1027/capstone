import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-40-02/html/5abc1aa0-ca8a-11f0-8532-d714b1159c0d.html';

test.describe('Array Demo Application', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application before each test
        await page.goto(BASE_URL);
    });

    test('Initial State: Array should be empty', async ({ page }) => {
        // Validate that the initial output is empty
        const outputText = await page.locator('#output').innerText();
        expect(outputText).toBe('Array: ');
    });

    test('Add number to array', async ({ page }) => {
        // Add a number to the array and check the output
        await page.fill('#num', '5');
        await page.click('#add-btn');

        const outputText = await page.locator('#output').innerText();
        expect(outputText).toContain('Array: 5');
    });

    test('Add multiple numbers to array', async ({ page }) => {
        // Add multiple numbers and check the output
        await page.fill('#num', '10');
        await page.click('#add-btn');
        await page.fill('#num', '20');
        await page.click('#add-btn');

        const outputText = await page.locator('#output').innerText();
        expect(outputText).toContain('Array: 10, 20');
    });

    test('Print the array', async ({ page }) => {
        // Print the array and validate the output
        await page.fill('#num', '15');
        await page.click('#add-btn');
        await page.click('#print-btn');

        const outputText = await page.locator('#output').innerText();
        expect(outputText).toContain('Array: 15');
    });

    test('Sort the array', async ({ page }) => {
        // Sort the array and validate the output
        await page.fill('#num', '30');
        await page.click('#add-btn');
        await page.fill('#num', '10');
        await page.click('#add-btn');
        await page.click('#sort-btn');

        const outputText = await page.locator('#output').innerText();
        expect(outputText).toContain('Array: 10, 30');
    });

    test('Reverse the array', async ({ page }) => {
        // Reverse the array and validate the output
        await page.fill('#num', '25');
        await page.click('#add-btn');
        await page.fill('#num', '5');
        await page.click('#add-btn');
        await page.click('#reverse-btn');

        const outputText = await page.locator('#output').innerText();
        expect(outputText).toContain('Array: 5, 25');
    });

    test('Clear the array', async ({ page }) => {
        // Clear the array and validate the output
        await page.fill('#num', '100');
        await page.click('#add-btn');
        await page.click('#clear-btn');

        const outputText = await page.locator('#output').innerText();
        expect(outputText).toContain('Array: ');
    });

    test('Edge case: Add non-numeric value', async ({ page }) => {
        // Attempt to add a non-numeric value and validate behavior
        await page.fill('#num', 'abc');
        await page.click('#add-btn');

        const outputText = await page.locator('#output').innerText();
        expect(outputText).toContain('Array: ');
    });

    test('Edge case: Sort an empty array', async ({ page }) => {
        // Attempt to sort an empty array and validate behavior
        await page.click('#sort-btn');

        const outputText = await page.locator('#output').innerText();
        expect(outputText).toContain('Array: ');
    });

    test('Edge case: Reverse an empty array', async ({ page }) => {
        // Attempt to reverse an empty array and validate behavior
        await page.click('#reverse-btn');

        const outputText = await page.locator('#output').innerText();
        expect(outputText).toContain('Array: ');
    });
});