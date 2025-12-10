import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-3/html/b8b68782-d1d3-11f0-9bcf-07cd16c51572.html';

test.describe('Union-Find (Disjoint Set) Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application page before each test
        await page.goto(BASE_URL);
    });

    test('should load the page and display initial state', async ({ page }) => {
        // Verify the initial state of the application
        const setsDisplay = await page.locator('#setsDisplay');
        await expect(setsDisplay).toHaveText('Sets: ');
    });

    test('should perform union operation and update display', async ({ page }) => {
        // Test union operation between two elements
        await page.fill('#elementA', '1');
        await page.fill('#elementB', '2');
        await page.click('#unionBtn');

        // Verify that the display updates correctly
        const setsDisplay = await page.locator('#setsDisplay');
        await expect(setsDisplay).toHaveText('Sets: { 1, 2 }');
    });

    test('should perform multiple union operations and update display', async ({ page }) => {
        // Perform multiple union operations
        await page.fill('#elementA', '1');
        await page.fill('#elementB', '2');
        await page.click('#unionBtn');

        await page.fill('#elementA', '2');
        await page.fill('#elementB', '3');
        await page.click('#unionBtn');

        // Verify that the display updates correctly
        const setsDisplay = await page.locator('#setsDisplay');
        await expect(setsDisplay).toHaveText('Sets: { 1, 2, 3 }');
    });

    test('should find the root of an element', async ({ page }) => {
        // Perform union first
        await page.fill('#elementA', '1');
        await page.fill('#elementB', '2');
        await page.click('#unionBtn');

        // Now find the root of element A
        await page.fill('#elementA', '1');
        await page.click('#findBtn');

        // Verify the alert message
        page.on('dialog', async dialog => {
            expect(dialog.message()).toBe('Root of 1 is 1');
            await dialog.dismiss();
        });
    });

    test('should handle invalid input gracefully', async ({ page }) => {
        // Test union operation with invalid inputs
        await page.fill('#elementA', '10'); // Out of bounds
        await page.fill('#elementB', '20'); // Out of bounds
        await page.click('#unionBtn');

        // Verify that the display does not change
        const setsDisplay = await page.locator('#setsDisplay');
        await expect(setsDisplay).toHaveText('Sets: ');
    });

    test('should alert for finding root of an invalid element', async ({ page }) => {
        // Attempt to find root of an invalid element
        await page.fill('#elementA', '10'); // Out of bounds
        await page.click('#findBtn');

        // Verify the alert message
        page.on('dialog', async dialog => {
            expect(dialog.message()).toBe('Root of 10 is 10');
            await dialog.dismiss();
        });
    });
});