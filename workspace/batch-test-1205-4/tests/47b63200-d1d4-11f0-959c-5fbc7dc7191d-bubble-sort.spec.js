import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-4/html/47b63200-d1d4-11f0-959c-5fbc7dc7191d.html';

test.describe('Bubble Sort Visualization Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the Bubble Sort Visualization page before each test
        await page.goto(BASE_URL);
    });

    test('should load the page and display the initial state', async ({ page }) => {
        // Verify the title of the page
        await expect(page).toHaveTitle('Bubble Sort Visualization');

        // Check if the array container is visible and contains bars
        const arrayContainer = page.locator('#arrayContainer');
        await expect(arrayContainer).toBeVisible();
        const bars = await arrayContainer.locator('.bar').count();
        expect(bars).toBeGreaterThan(0); // Ensure there are bars rendered
    });

    test('should sort the array when the sort button is clicked', async ({ page }) => {
        // Click the sort button
        const sortButton = page.locator('#sortButton');
        await sortButton.click();

        // Wait for the sorting animation to complete
        await page.waitForTimeout(5000); // Adjust timeout based on expected sort duration

        // Verify that the bars are sorted by checking their heights
        const bars = await page.locator('.bar');
        const heights = await bars.evaluateAll(bars => bars.map(bar => parseInt(bar.style.height)));
        
        // Check if the heights are in ascending order
        const sortedHeights = [...heights].sort((a, b) => a - b);
        expect(heights).toEqual(sortedHeights);
    });

    test('should change bar colors during sorting', async ({ page }) => {
        // Click the sort button
        const sortButton = page.locator('#sortButton');
        await sortButton.click();

        // Wait for a short duration to allow color changes to occur
        await page.waitForTimeout(1000);

        // Check if at least one bar is red during sorting
        const bars = page.locator('.bar');
        const redBars = await bars.evaluateAll(bars => bars.filter(bar => bar.style.backgroundColor === 'red').length);
        expect(redBars).toBeGreaterThan(0); // At least one bar should be red
    });

    test('should reset colors after sorting', async ({ page }) => {
        // Click the sort button
        const sortButton = page.locator('#sortButton');
        await sortButton.click();

        // Wait for the sorting to complete
        await page.waitForTimeout(5000);

        // Check if all bars are teal after sorting
        const bars = page.locator('.bar');
        const tealBars = await bars.evaluateAll(bars => bars.filter(bar => bar.style.backgroundColor === 'teal').length);
        expect(tealBars).toBe(await bars.count()); // All bars should be teal
    });

    test('should handle edge cases with minimal array', async ({ page }) => {
        // Modify the array to have only one element for edge case testing
        await page.evaluate(() => {
            window.array = [42]; // Set the array to a single element
            window.renderArray(); // Re-render the array
        });

        // Click the sort button
        const sortButton = page.locator('#sortButton');
        await sortButton.click();

        // Wait for a short duration
        await page.waitForTimeout(1000);

        // Verify that the single element remains unchanged
        const bars = await page.locator('.bar');
        const heights = await bars.evaluateAll(bars => bars.map(bar => parseInt(bar.style.height)));
        expect(heights).toEqual([126]); // 42 * 3 = 126
    });

    test('should handle empty array gracefully', async ({ page }) => {
        // Modify the array to be empty for edge case testing
        await page.evaluate(() => {
            window.array = []; // Set the array to empty
            window.renderArray(); // Re-render the array
        });

        // Click the sort button
        const sortButton = page.locator('#sortButton');
        await sortButton.click();

        // Wait for a short duration
        await page.waitForTimeout(1000);

        // Verify that no bars are rendered
        const arrayContainer = page.locator('#arrayContainer');
        const barsCount = await arrayContainer.locator('.bar').count();
        expect(barsCount).toBe(0); // No bars should be present
    });
});