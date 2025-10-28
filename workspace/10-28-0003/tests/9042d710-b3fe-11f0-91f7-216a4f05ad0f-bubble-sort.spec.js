import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/default/html/9042d710-b3fe-11f0-91f7-216a4f05ad0f.html';

test.describe('Bubble Sort Visualizer', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should be in idle state initially', async ({ page }) => {
        const arrayContainer = await page.locator('#arrayContainer');
        const bars = await arrayContainer.locator('.bar').count();
        expect(bars).toBe(0); // No bars should be drawn initially
    });

    test('should generate an array and transition to array_generated state', async ({ page }) => {
        await page.fill('#arraySize', '10');
        await page.click('button:has-text("Generate Array")');

        const arrayContainer = await page.locator('#arrayContainer');
        const bars = await arrayContainer.locator('.bar').count();
        expect(bars).toBe(10); // 10 bars should be drawn
    });

    test('should start sorting and transition to sorting state', async ({ page }) => {
        await page.fill('#arraySize', '10');
        await page.click('button:has-text("Generate Array")');
        await page.click('button:has-text("Start Sorting")');

        const sortingState = await page.evaluate(() => window.sorting);
        expect(sortingState).toBe(true); // Sorting should be in progress
    });

    test('should pause sorting and transition to paused state', async ({ page }) => {
        await page.fill('#arraySize', '10');
        await page.click('button:has-text("Generate Array")');
        await page.click('button:has-text("Start Sorting")');
        await page.click('button:has-text("Pause")');

        const sortingState = await page.evaluate(() => window.sorting);
        expect(sortingState).toBe(false); // Sorting should be paused
    });

    test('should resume sorting after pause', async ({ page }) => {
        await page.fill('#arraySize', '10');
        await page.click('button:has-text("Generate Array")');
        await page.click('button:has-text("Start Sorting")');
        await page.click('button:has-text("Pause")');
        await page.click('button:has-text("Start Sorting")');

        const sortingState = await page.evaluate(() => window.sorting);
        expect(sortingState).toBe(true); // Sorting should resume
    });

    test('should complete sorting and transition to done state', async ({ page }) => {
        await page.fill('#arraySize', '5');
        await page.click('button:has-text("Generate Array")');
        await page.click('button:has-text("Start Sorting")');

        // Wait for sorting to complete
        await page.waitForTimeout(3000); // Adjust timeout as needed based on sorting speed

        const sortingState = await page.evaluate(() => window.sorting);
        expect(sortingState).toBe(false); // Sorting should be completed
        const arrayContainer = await page.locator('#arrayContainer');
        const bars = await arrayContainer.locator('.bar').count();
        expect(bars).toBe(5); // Bars should still be present
    });

    test('should handle edge case of minimum array size', async ({ page }) => {
        await page.fill('#arraySize', '2');
        await page.click('button:has-text("Generate Array")');
        await page.click('button:has-text("Start Sorting")');

        // Wait for sorting to complete
        await page.waitForTimeout(1000); // Adjust timeout as needed

        const sortingState = await page.evaluate(() => window.sorting);
        expect(sortingState).toBe(false); // Sorting should be completed
    });

    test('should not start sorting without generating an array', async ({ page }) => {
        await page.click('button:has-text("Start Sorting")');

        const sortingState = await page.evaluate(() => window.sorting);
        expect(sortingState).toBe(false); // Sorting should not start
    });

    test('should not pause sorting if not started', async ({ page }) => {
        await page.click('button:has-text("Pause")');

        const sortingState = await page.evaluate(() => window.sorting);
        expect(sortingState).toBe(false); // Sorting should still not be in progress
    });
});