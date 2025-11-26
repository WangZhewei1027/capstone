import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-35-35/html/bba5c921-ca89-11f0-800e-fdebe921fc5f.html';

test.describe('Merge Sort Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the Merge Sort application
        await page.goto(BASE_URL);
    });

    test('Initial state is Idle', async ({ page }) => {
        // Verify that the input and button are present in the Idle state
        const input = await page.locator('#n');
        const button = await page.locator('button[onclick="sort()"]');
        await expect(input).toBeVisible();
        await expect(button).toBeVisible();
    });

    test('User can input number of elements', async ({ page }) => {
        // User inputs a number of elements
        const input = await page.locator('#n');
        await input.fill('5');
        await expect(input).toHaveValue('5');
    });

    test('Sorting action triggers correctly', async ({ page }) => {
        // User inputs a number and triggers sorting
        const input = await page.locator('#n');
        await input.fill('3');
        
        // Mock prompt responses
        await page.evaluate(() => {
            window.prompt = (msg) => {
                if (msg.includes('Enter element 1')) return '3';
                if (msg.includes('Enter element 2')) return '1';
                if (msg.includes('Enter element 3')) return '2';
                return null;
            };
        });

        // Click the sort button
        const button = await page.locator('button[onclick="sort()"]');
        await button.click();

        // Verify that the sorted elements are displayed
        const sortedTable = await page.locator('#sorted-table tbody tr');
        await expect(sortedTable).toHaveCount(3);
        await expect(sortedTable.nth(0)).toContainText('1');
        await expect(sortedTable.nth(1)).toContainText('2');
        await expect(sortedTable.nth(2)).toContainText('3');
    });

    test('Edge case: User inputs zero elements', async ({ page }) => {
        // User inputs zero elements
        const input = await page.locator('#n');
        await input.fill('0');

        // Click the sort button
        const button = await page.locator('button[onclick="sort()"]');
        await button.click();

        // Verify that no elements are displayed in the sorted table
        const sortedTable = await page.locator('#sorted-table tbody tr');
        await expect(sortedTable).toHaveCount(0);
    });

    test('Edge case: User inputs negative number', async ({ page }) => {
        // User inputs a negative number
        const input = await page.locator('#n');
        await input.fill('-3');

        // Click the sort button
        const button = await page.locator('button[onclick="sort()"]');
        await button.click();

        // Verify that no elements are displayed in the sorted table
        const sortedTable = await page.locator('#sorted-table tbody tr');
        await expect(sortedTable).toHaveCount(0);
    });

    test('Edge case: User inputs non-numeric value', async ({ page }) => {
        // User inputs a non-numeric value
        const input = await page.locator('#n');
        await input.fill('abc');

        // Click the sort button
        const button = await page.locator('button[onclick="sort()"]');
        await button.click();

        // Verify that no elements are displayed in the sorted table
        const sortedTable = await page.locator('#sorted-table tbody tr');
        await expect(sortedTable).toHaveCount(0);
    });

    test.afterEach(async ({ page }) => {
        // Optional: Add any cleanup actions if necessary
    });
});