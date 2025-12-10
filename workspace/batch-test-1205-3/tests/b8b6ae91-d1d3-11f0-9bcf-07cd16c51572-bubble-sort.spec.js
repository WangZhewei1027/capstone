import { test, expect } from '@playwright/test';

const url = 'http://127.0.0.1:5500/workspace/batch-test-1205-3/html/b8b6ae91-d1d3-11f0-9bcf-07cd16c51572.html';

test.describe('Bubble Sort Visualization', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the Bubble Sort Visualization page before each test
        await page.goto(url);
    });

    test('should load the page and display initial state', async ({ page }) => {
        // Verify that the page title is correct
        await expect(page).toHaveTitle('Bubble Sort Visualization');
        
        // Check that the array container is visible and contains bars
        const arrayContainer = await page.locator('#array');
        await expect(arrayContainer).toBeVisible();
        const bars = await arrayContainer.locator('.bar');
        await expect(bars).toHaveCount(10); // Default size is 10
    });

    test('should generate a new array when reset button is clicked', async ({ page }) => {
        // Click the reset button
        await page.click('button:has-text("Reset")');

        // Verify that the array is regenerated
        const barsBefore = await page.locator('.bar').count();
        await page.click('button:has-text("Reset")');
        const barsAfter = await page.locator('.bar').count();
        expect(barsAfter).toBeGreaterThan(barsBefore); // Ensure new bars are generated
    });

    test('should sort the array when sort button is clicked', async ({ page }) => {
        // Click the sort button
        await page.click('button:has-text("Sort")');

        // Wait for the sorting animation to complete
        await page.waitForTimeout(2000); // Wait for a reasonable time for sorting to complete

        // Verify that the bars are sorted
        const heights = await page.locator('.bar').evaluateAll(bars => bars.map(bar => parseInt(bar.style.height)));
        const sortedHeights = [...heights].sort((a, b) => a - b);
        expect(heights).toEqual(sortedHeights);
    });

    test('should highlight bars during sorting', async ({ page }) => {
        // Click the sort button
        await page.click('button:has-text("Sort")');

        // Wait for a moment to allow some sorting steps to occur
        await page.waitForTimeout(500);

        // Check if at least one bar is highlighted
        const highlightedBars = await page.locator('.bar[style*="background-color: red"]').count();
        expect(highlightedBars).toBeGreaterThan(0);
    });

    test('should handle empty array gracefully', async ({ page }) => {
        // Modify the array to be empty
        await page.evaluate(() => {
            window.array = [];
            window.displayArray();
        });

        // Click the sort button
        await page.click('button:has-text("Sort")');

        // Verify that no bars are displayed
        const bars = await page.locator('.bar').count();
        expect(bars).toBe(0);
    });

    test('should maintain visual feedback during sorting', async ({ page }) => {
        // Click the sort button
        await page.click('button:has-text("Sort")');

        // Wait for a moment to allow some sorting steps to occur
        await page.waitForTimeout(500);

        // Check if the bars are still visible during sorting
        const bars = await page.locator('.bar');
        await expect(bars).toBeVisible();
    });
});