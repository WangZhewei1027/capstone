import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-3/html/b8b6d5a0-d1d3-11f0-9bcf-07cd16c51572.html';

test.describe('Selection Sort Visualization', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should load the page and generate an initial array', async ({ page }) => {
        // Check if the title is correct
        const title = await page.title();
        expect(title).toBe('Selection Sort Visualization');

        // Check if the array container is visible and has bars
        const arrayContainer = await page.locator('#array-container');
        await expect(arrayContainer).toBeVisible();
        const bars = await arrayContainer.locator('.bar');
        await expect(bars).toHaveCount(10); // Initial array should have 10 bars
    });

    test('should generate a new array when the "Generate New Array" button is clicked', async ({ page }) => {
        const arrayContainer = await page.locator('#array-container');
        const initialBars = await arrayContainer.locator('.bar');

        // Click the "Generate New Array" button
        await page.click('button:has-text("Generate New Array")');

        // Check if new bars are generated
        const newBars = await arrayContainer.locator('.bar');
        await expect(newBars).toHaveCount(10); // Should still have 10 bars
        expect(await initialBars.evaluateAll(bars => bars.map(bar => bar.style.height))).not.toEqual(await newBars.evaluateAll(bars => bars.map(bar => bar.style.height))); // Heights should be different
    });

    test('should start sorting when the "Start Sorting" button is clicked', async ({ page }) => {
        // Click the "Start Sorting" button
        await page.click('button:has-text("Start Sorting")');

        // Wait for the sorting to complete
        await page.waitForTimeout(6000); // Wait for a bit longer than the sort duration

        // Check if the array is sorted
        const arrayContainer = await page.locator('#array-container');
        const bars = await arrayContainer.locator('.bar');
        const heights = await bars.evaluateAll(bars => bars.map(bar => parseInt(bar.style.height)));

        // Check if the heights are sorted
        const sortedHeights = [...heights].sort((a, b) => a - b);
        expect(heights).toEqual(sortedHeights);
    });

    test('should handle sorting of already sorted array', async ({ page }) => {
        // Generate a sorted array
        await page.evaluate(() => {
            window.array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
            window.drawArray();
        });

        // Click the "Start Sorting" button
        await page.click('button:has-text("Start Sorting")');

        // Wait for the sorting to complete
        await page.waitForTimeout(6000);

        // Check if the array is still sorted
        const arrayContainer = await page.locator('#array-container');
        const bars = await arrayContainer.locator('.bar');
        const heights = await bars.evaluateAll(bars => bars.map(bar => parseInt(bar.style.height)));

        const sortedHeights = [...heights].sort((a, b) => a - b);
        expect(heights).toEqual(sortedHeights);
    });

    test('should handle empty array gracefully', async ({ page }) => {
        // Set the array to empty
        await page.evaluate(() => {
            window.array = [];
            window.drawArray();
        });

        // Click the "Start Sorting" button
        await page.click('button:has-text("Start Sorting")');

        // Check if the array container is empty
        const arrayContainer = await page.locator('#array-container');
        const bars = await arrayContainer.locator('.bar');
        await expect(bars).toHaveCount(0); // Should have no bars
    });
});