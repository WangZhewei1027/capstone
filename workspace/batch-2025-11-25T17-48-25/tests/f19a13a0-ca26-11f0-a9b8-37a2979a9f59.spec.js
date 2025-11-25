import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-25T17-48-25/html/f19a13a0-ca26-11f0-a9b8-37a2979a9f59.html';

test.describe('Bubble Sort Visualization', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the Bubble Sort Visualization application
        await page.goto(BASE_URL);
    });

    test('Initial state should display the unsorted array', async ({ page }) => {
        // Verify that the initial array is displayed correctly
        const bars = await page.locator('#arrayContainer .bar');
        expect(await bars.count()).toBe(5); // Expecting 5 bars for the initial array
    });

    test('Clicking Start Bubble Sort transitions to Sorting state', async ({ page }) => {
        // Click the Start Bubble Sort button
        await page.click('button');

        // Verify that sorting animation starts (bars should change)
        const bars = await page.locator('#arrayContainer .bar');
        await expect(bars.first()).toHaveClass(/current/); // At least one bar should have 'current' class
    });

    test('Sorting should complete and transition to Sorted state', async ({ page }) => {
        // Click the Start Bubble Sort button
        await page.click('button');

        // Wait for sorting to complete
        await page.waitForTimeout(3000); // Wait for the sorting animation to finish

        // Verify that all bars are sorted
        const sortedBars = await page.locator('#arrayContainer .bar.sorted');
        expect(await sortedBars.count()).toBe(5); // All bars should have the 'sorted' class
    });

    test('Visual feedback during sorting', async ({ page }) => {
        // Click the Start Bubble Sort button
        await page.click('button');

        // Wait for a short duration to allow some sorting to occur
        await page.waitForTimeout(1500);

        // Check that at least one bar is currently being compared
        const currentBars = await page.locator('#arrayContainer .bar.current');
        expect(await currentBars.count()).toBeGreaterThan(0); // At least one bar should have 'current' class
    });

    test('Edge case: clicking Start Bubble Sort multiple times', async ({ page }) => {
        // Click the Start Bubble Sort button multiple times
        await page.click('button');
        await page.click('button');

        // Wait for sorting to complete
        await page.waitForTimeout(3000);

        // Verify that sorting completes correctly
        const sortedBars = await page.locator('#arrayContainer .bar.sorted');
        expect(await sortedBars.count()).toBe(5); // All bars should still be sorted
    });

    test('Check if the array resets on each start', async ({ page }) => {
        // Click the Start Bubble Sort button
        await page.click('button');

        // Wait for sorting to complete
        await page.waitForTimeout(3000);

        // Store the heights of the bars after sorting
        const sortedHeights = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('#arrayContainer .bar')).map(bar => bar.style.height);
        });

        // Click the Start Bubble Sort button again
        await page.click('button');

        // Wait for sorting to complete again
        await page.waitForTimeout(3000);

        // Store the heights of the bars after the second sorting
        const newHeights = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('#arrayContainer .bar')).map(bar => bar.style.height);
        });

        // Verify that the heights are the same (array resets)
        expect(sortedHeights).toEqual(newHeights);
    });
});