import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-35-35/html/bba5f032-ca89-11f0-800e-fdebe921fc5f.html';

test.describe('Counting Sort Application', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the Counting Sort application page before each test
        await page.goto(BASE_URL);
    });

    test('should display the correct title and description', async ({ page }) => {
        // Validate that the title and description are rendered correctly
        const title = await page.locator('h1').innerText();
        const description = await page.locator('p').innerText();

        expect(title).toBe('Counting Sort');
        expect(description).toBe('Given an array of integers, count the occurrences of each integer using the Counting Sort algorithm.');
    });

    test('should execute countingSort function and log sorted output', async ({ page }) => {
        // Check if the countingSort function works correctly by inspecting the console output
        const consoleMessages = [];
        page.on('console', msg => consoleMessages.push(msg.text()));

        // Trigger the countingSort function by executing the script
        await page.evaluate(() => {
            let input = [4, 2, 2, 8, 3, 3, 1];
            countingSort(input);
        });

        // Validate that the console logged the expected sorted output
        expect(consoleMessages).toContain('Sorted array: 1,2,2,3,3,4,8');
    });

    test('should handle empty array input', async ({ page }) => {
        // Test the countingSort function with an empty array
        const consoleMessages = [];
        page.on('console', msg => consoleMessages.push(msg.text()));

        await page.evaluate(() => {
            let input = [];
            countingSort(input);
        });

        // Validate that the console logged the expected output for an empty array
        expect(consoleMessages).toContain('Sorted array: ');
    });

    test('should handle single element array input', async ({ page }) => {
        // Test the countingSort function with a single element array
        const consoleMessages = [];
        page.on('console', msg => consoleMessages.push(msg.text()));

        await page.evaluate(() => {
            let input = [5];
            countingSort(input);
        });

        // Validate that the console logged the expected output for a single element array
        expect(consoleMessages).toContain('Sorted array: 5');
    });

    test('should handle negative numbers', async ({ page }) => {
        // Test the countingSort function with negative numbers
        const consoleMessages = [];
        page.on('console', msg => consoleMessages.push(msg.text()));

        await page.evaluate(() => {
            let input = [-1, -3, -2, -4, -2];
            countingSort(input);
        });

        // Validate that the console logged the expected output for an array with negative numbers
        expect(consoleMessages).toContain('Sorted array: -4,-3,-2,-2,-1');
    });

    test('should handle large numbers', async ({ page }) => {
        // Test the countingSort function with large numbers
        const consoleMessages = [];
        page.on('console', msg => consoleMessages.push(msg.text()));

        await page.evaluate(() => {
            let input = [1000, 500, 10000, 2000, 3000];
            countingSort(input);
        });

        // Validate that the console logged the expected output for an array with large numbers
        expect(consoleMessages).toContain('Sorted array: 500,1000,2000,3000,10000');
    });
});