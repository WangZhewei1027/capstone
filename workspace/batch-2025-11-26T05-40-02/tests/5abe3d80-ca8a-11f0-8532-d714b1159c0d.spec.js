import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-40-02/html/5abe3d80-ca8a-11f0-8532-d714b1159c0d.html';

test.describe('Insertion Sort Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the Insertion Sort application page before each test
        await page.goto(BASE_URL);
    });

    test('should display the correct title and header', async ({ page }) => {
        // Validate that the page title is correct
        const title = await page.title();
        expect(title).toBe('Insertion Sort');

        // Validate that the header is displayed correctly
        const header = await page.locator('h1');
        await expect(header).toHaveText('Insertion Sort');
    });

    test('should display the insertion sort table', async ({ page }) => {
        // Validate that the table is present in the DOM
        const table = await page.locator('table');
        await expect(table).toBeVisible();

        // Validate the table headers
        const headers = await table.locator('th');
        await expect(headers.nth(0)).toHaveText('Number');
        await expect(headers.nth(1)).toHaveText('Insertion Sort');
    });

    test('should have 10 rows in the insertion sort table', async ({ page }) => {
        // Validate that there are 10 rows in the table (excluding header)
        const rows = await page.locator('table tr');
        expect(await rows.count()).toBe(11); // 1 header + 10 data rows
    });

    test('should have empty cells for insertion sort column initially', async ({ page }) => {
        // Validate that the insertion sort cells are initially empty
        const cells = await page.locator('table tr td:nth-child(2)');
        for (let i = 0; i < 10; i++) {
            await expect(cells.nth(i)).toHaveText('');
        }
    });

    test('should log the original and sorted array in the console', async ({ page }) => {
        // Check console logs for original and sorted array
        const originalArrayLog = 'Original Array: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]';
        const sortedArrayLog = 'Sorted Array using Insertion Sort: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]';

        // Listen for console messages
        const consoleMessages = [];
        page.on('console', msg => consoleMessages.push(msg.text()));

        // Wait for a short time to allow console logs to be captured
        await page.waitForTimeout(1000);

        // Validate the console logs
        expect(consoleMessages).toContain(originalArrayLog);
        expect(consoleMessages).toContain(sortedArrayLog);
    });
});