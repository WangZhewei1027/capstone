import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-40-02/html/5abe1672-ca8a-11f0-8532-d714b1159c0d.html';

test.describe('Selection Sort Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application page before each test
        await page.goto(BASE_URL);
    });

    test('should display the correct title', async ({ page }) => {
        // Validate that the page displays the correct title
        const title = await page.locator('h1').innerText();
        expect(title).toBe('Selection Sort');
    });

    test('should display the initial table with elements', async ({ page }) => {
        // Validate that the table is displayed with the correct number of rows
        const rows = await page.locator('table tr').count();
        expect(rows).toBe(12); // 1 header + 11 data rows
    });

    test('should log the original array in the console', async ({ page }) => {
        // Capture console messages and validate the original array
        const consoleMessages = [];
        page.on('console', msg => consoleMessages.push(msg.text()));

        await page.evaluate(() => {
            // Trigger the selection sort function
            selectionSort([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
        });

        expect(consoleMessages).toContain('Original array:');
        expect(consoleMessages).toContain('[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20]');
    });

    test('should log the sorted array in the console', async ({ page }) => {
        // Capture console messages and validate the sorted array
        const consoleMessages = [];
        page.on('console', msg => consoleMessages.push(msg.text()));

        await page.evaluate(() => {
            // Trigger the selection sort function
            selectionSort([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
        });

        expect(consoleMessages).toContain('Sorted array:');
        expect(consoleMessages).toContain('[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20]');
    });

    test('should not have any interactive elements', async ({ page }) => {
        // Validate that there are no buttons or inputs present
        const buttons = await page.locator('button').count();
        const inputs = await page.locator('input').count();
        expect(buttons).toBe(0);
        expect(inputs).toBe(0);
    });
});