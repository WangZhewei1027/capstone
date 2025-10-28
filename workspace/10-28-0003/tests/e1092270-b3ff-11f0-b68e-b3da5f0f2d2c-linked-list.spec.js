import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/10-28-0003/html/e1092270-b3ff-11f0-b68e-b3da5f0f2d2c.html';

test.describe('Interactive Bubble Sort Application', () => {
    let page;

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();
        await page.goto(BASE_URL);
    });

    test.afterAll(async () => {
        await page.close();
    });

    test.describe('Initial State Tests', () => {
        test('should be in idle state initially', async () => {
            const arrayItems = await page.locator('#array-container .array-item').count();
            expect(arrayItems).toBe(0); // No items should be present initially
        });

        test('should generate a random array on entering idle state', async () => {
            await page.click('#start');
            await page.waitForTimeout(1000); // Wait for the array to be generated
            const arrayItems = await page.locator('#array-container .array-item').count();
            expect(arrayItems).toBeGreaterThan(0); // Random array should be generated
        });
    });

    test.describe('Sorting State Tests', () => {
        test('should transition to sorting state on START_SORTING', async () => {
            await page.click('#start');
            await page.waitForTimeout(1000); // Wait for sorting to start
            const arrayItems = await page.locator('#array-container .array-item').count();
            expect(arrayItems).toBeGreaterThan(0); // Array should still be present
        });

        test('should complete sorting and transition to done state', async () => {
            // Assuming the sorting process will take some time
            await page.waitForTimeout(5000); // Wait for sorting to complete
            const arrayItems = await page.locator('#array-container .array-item').count();
            expect(arrayItems).toBeGreaterThan(0); // Array should still be present
            // Check if the array is sorted
            const heights = await page.locator('#array-container .array-item').evaluateAll(items => items.map(item => parseInt(item.style.height)));
            const sortedHeights = [...heights].sort((a, b) => a - b);
            expect(heights).toEqual(sortedHeights); // Heights should be sorted
        });
    });

    test.describe('Done State Tests', () => {
        test('should render the sorted array on entering done state', async () => {
            const arrayItems = await page.locator('#array-container .array-item').count();
            expect(arrayItems).toBeGreaterThan(0); // Sorted array should be present
        });

        test('should reset to idle state on RESET_ARRAY', async () => {
            await page.click('#reset');
            await page.waitForTimeout(1000); // Wait for reset to complete
            const arrayItems = await page.locator('#array-container .array-item').count();
            expect(arrayItems).toBe(0); // No items should be present after reset
        });
    });

    test.describe('Edge Case Tests', () => {
        test('should handle multiple resets correctly', async () => {
            await page.click('#start');
            await page.waitForTimeout(1000);
            await page.click('#reset');
            await page.waitForTimeout(1000);
            await page.click('#start');
            await page.waitForTimeout(1000);
            const arrayItems = await page.locator('#array-container .array-item').count();
            expect(arrayItems).toBeGreaterThan(0); // Random array should be generated again
        });
    });
});