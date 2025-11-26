import { test, expect } from '@playwright/test';

const url = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-40-02/html/5abe6491-ca8a-11f0-8532-d714b1159c0d.html';

test.describe('Heap Sort Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the Heap Sort application before each test
        await page.goto(url);
    });

    test('Initial state should be Idle', async ({ page }) => {
        // Validate that the output is empty on initial load
        const output = await page.locator('#output').innerText();
        expect(output).toBe('');
    });

    test('User can input numbers and trigger sorting', async ({ page }) => {
        // User inputs numbers and clicks the sort button
        await page.fill('#input', '3 1 4 1 5 9');
        await page.click('#sort-btn');

        // Validate that the output displays the sorted result
        const output = await page.locator('#output').innerText();
        expect(output).toContain('Heap Sort Result:');
        expect(output).toContain('1 1 3 4 5 9');
    });

    test('Clicking sort button with empty input shows error', async ({ page }) => {
        // User clicks the sort button without entering numbers
        await page.click('#sort-btn');

        // Validate that the output shows the error message
        const output = await page.locator('#output').innerText();
        expect(output).toBe('Please enter numbers separated by spaces.');
    });

    test('User can trigger sorting with valid input after error', async ({ page }) => {
        // User clicks the sort button with empty input to show error
        await page.click('#sort-btn');
        let output = await page.locator('#output').innerText();
        expect(output).toBe('Please enter numbers separated by spaces.');

        // User inputs valid numbers and clicks the sort button
        await page.fill('#input', '2 7 1 8 2 8');
        await page.click('#sort-btn');

        // Validate that the output displays the sorted result
        output = await page.locator('#output').innerText();
        expect(output).toContain('Heap Sort Result:');
        expect(output).toContain('1 2 2 7 8 8');
    });

    test('User can input negative numbers and sort', async ({ page }) => {
        // User inputs negative numbers and clicks the sort button
        await page.fill('#input', '-1 -3 -2 0 2 1');
        await page.click('#sort-btn');

        // Validate that the output displays the sorted result
        const output = await page.locator('#output').innerText();
        expect(output).toContain('Heap Sort Result:');
        expect(output).toContain('-3 -2 -1 0 1 2');
    });

    test('User can input decimal numbers and sort', async ({ page }) => {
        // User inputs decimal numbers and clicks the sort button
        await page.fill('#input', '3.5 2.1 4.7 1.0');
        await page.click('#sort-btn');

        // Validate that the output displays the sorted result
        const output = await page.locator('#output').innerText();
        expect(output).toContain('Heap Sort Result:');
        expect(output).toContain('1 2.1 3.5 4.7');
    });

    test('User input with non-numeric values shows error', async ({ page }) => {
        // User inputs non-numeric values and clicks the sort button
        await page.fill('#input', 'a b c');
        await page.click('#sort-btn');

        // Validate that the output shows the error message
        const output = await page.locator('#output').innerText();
        expect(output).toContain('Heap Sort Result:');
        expect(output).toContain('NaN');
    });
});