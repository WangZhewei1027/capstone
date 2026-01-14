import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-1210-2/html/6c59c8c0-d5ac-11f0-8f31-81a40949a8d4.html';

test.describe('Bubble Sort Interactive Application', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the Bubble Sort application page
        await page.goto(BASE_URL);
    });

    test('should display the title on idle state', async ({ page }) => {
        // Validate that the title is displayed correctly in the idle state
        const title = await page.locator('h1').innerText();
        expect(title).toBe('Bubble Sort Algorithm');
    });

    test('should allow user to input numbers and display sorted output', async ({ page }) => {
        // Input numbers into the input field
        await page.fill('#input', '5 3 8 4 2');

        // Validate that the sorted output is displayed in the table
        const sortedRows = await page.locator('#sorted tr').count();
        expect(sortedRows).toBe(1); // Expect one row for the sorted output

        const sortedCells = await page.locator('#sorted tr td').allTextContents();
        expect(sortedCells).toEqual(['2', '3', '4', '5', '8']); // Validate sorted output
    });

    test('should handle empty input gracefully', async ({ page }) => {
        // Input empty string into the input field
        await page.fill('#input', '');

        // Validate that the sorted output is empty
        const sortedRows = await page.locator('#sorted tr').count();
        expect(sortedRows).toBe(0); // Expect no rows for empty input
    });

    test('should handle non-numeric input gracefully', async ({ page }) => {
        // Input non-numeric characters into the input field
        await page.fill('#input', 'a b c');

        // Validate that the sorted output is empty
        const sortedRows = await page.locator('#sorted tr').count();
        expect(sortedRows).toBe(0); // Expect no rows for non-numeric input
    });

    test('should handle single number input', async ({ page }) => {
        // Input a single number into the input field
        await page.fill('#input', '7');

        // Validate that the sorted output is displayed correctly
        const sortedRows = await page.locator('#sorted tr').count();
        expect(sortedRows).toBe(1); // Expect one row for the sorted output

        const sortedCells = await page.locator('#sorted tr td').allTextContents();
        expect(sortedCells).toEqual(['7']); // Validate sorted output
    });

    test('should handle duplicate numbers correctly', async ({ page }) => {
        // Input duplicate numbers into the input field
        await page.fill('#input', '3 3 2 2 1');

        // Validate that the sorted output is displayed correctly
        const sortedRows = await page.locator('#sorted tr').count();
        expect(sortedRows).toBe(1); // Expect one row for the sorted output

        const sortedCells = await page.locator('#sorted tr td').allTextContents();
        expect(sortedCells).toEqual(['1', '2', '2', '3', '3']); // Validate sorted output
    });

    test('should not crash on invalid input', async ({ page }) => {
        // Input invalid characters into the input field
        await page.fill('#input', '5 3 ! @ #');

        // Validate that the sorted output is empty
        const sortedRows = await page.locator('#sorted tr').count();
        expect(sortedRows).toBe(0); // Expect no rows for invalid input
    });

    test.afterEach(async ({ page }) => {
        // Check for console errors after each test
        const consoleErrors = await page.evaluate(() => {
            return window.console.error.calls || [];
        });
        expect(consoleErrors.length).toBe(0); // Expect no console errors
    });
});