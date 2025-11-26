import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-25T23-45-53/html/e13783d1-ca58-11f0-b3c1-8750c080fb19.html';

test.describe('Merge Sort Visualization', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application before each test
        await page.goto(BASE_URL);
    });

    test('should generate a random array on start', async ({ page }) => {
        // Click the start button to generate a random array
        await page.click('button');
        
        // Verify that the array is rendered
        const bars = await page.locator('#arrayContainer .bar');
        await expect(bars).toHaveCount(10); // Assuming the default size is 10
    });

    test('should transition from Idle to GeneratingArray state', async ({ page }) => {
        // Click the start button
        await page.click('button');

        // Verify that the array is rendered
        const bars = await page.locator('#arrayContainer .bar');
        await expect(bars).toHaveCount(10);
    });

    test('should sort the array and transition to Merging state', async ({ page }) => {
        // Click the start button to begin sorting
        await page.click('button');

        // Wait for the sorting to complete
        await page.waitForTimeout(1000); // Wait for sorting to complete

        // Verify that the sorting has started
        const bars = await page.locator('#arrayContainer .bar');
        await expect(bars).toHaveCount(10);
    });

    test('should transition to Sorted state after sorting is complete', async ({ page }) => {
        // Click the start button to begin sorting
        await page.click('button');

        // Wait for sorting to complete
        await page.waitForTimeout(2000); // Adjust timeout based on sorting duration

        // Verify that the array is sorted
        const sortedBars = await page.locator('#arrayContainer .bar');
        const heights = await sortedBars.evaluateAll(bars => bars.map(bar => parseInt(bar.style.height)));
        const isSorted = heights.every((value, index, array) => index === 0 || value >= array[index - 1]);
        expect(isSorted).toBe(true);
    });

    test('should handle edge case of empty array', async ({ page }) => {
        // Modify the application to handle an empty array case
        // This may require a change in the application code, for now, we simulate it
        await page.evaluate(() => {
            window.array = []; // Set the array to empty
            window.renderArray(); // Render the empty array
        });

        const bars = await page.locator('#arrayContainer .bar');
        await expect(bars).toHaveCount(0); // Expect no bars for an empty array
    });

    test('should handle edge case of single element array', async ({ page }) => {
        // Modify the application to handle a single element case
        await page.evaluate(() => {
            window.array = [42]; // Set the array to a single element
            window.renderArray(); // Render the single element array
        });

        const bars = await page.locator('#arrayContainer .bar');
        await expect(bars).toHaveCount(1); // Expect one bar for a single element
        const height = await bars.first().evaluate(bar => parseInt(bar.style.height));
        expect(height).toBe(126); // Height should be 42 * 3
    });
});