import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-4/html/47b63201-d1d4-11f0-959c-5fbc7dc7191d.html';

test.describe('Selection Sort Visualization', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the selection sort visualization page before each test
        await page.goto(BASE_URL);
    });

    test('should load the page and display initial elements', async ({ page }) => {
        // Verify the title of the page
        const title = await page.title();
        expect(title).toBe('Selection Sort Visualization');

        // Check if the sort button is visible
        const sortButton = await page.locator('#sortButton');
        await expect(sortButton).toBeVisible();

        // Check if the array container is visible
        const arrayContainer = await page.locator('#arrayContainer');
        await expect(arrayContainer).toBeVisible();

        // Check if there are bars displayed in the array container
        const bars = await arrayContainer.locator('.bar');
        await expect(bars).toHaveCount(10); // Initially, there should be 10 bars
    });

    test('should sort the array when sort button is clicked', async ({ page }) => {
        // Click the sort button
        const sortButton = await page.locator('#sortButton');
        await sortButton.click();

        // Wait for the sorting process to complete
        await page.waitForTimeout(4000); // Adjust based on sorting delay

        // Verify that the bars are sorted
        const bars = await page.locator('.bar');
        const heights = await bars.evaluateAll(bars => bars.map(bar => parseInt(bar.style.height)));

        // Check if the heights are sorted in ascending order
        const sortedHeights = [...heights].sort((a, b) => a - b);
        expect(heights).toEqual(sortedHeights);
    });

    test('should highlight bars during sorting', async ({ page }) => {
        // Click the sort button
        const sortButton = await page.locator('#sortButton');
        await sortButton.click();

        // Wait for the sorting process to start
        await page.waitForTimeout(500); // Allow some time for highlights to occur

        // Check if at least one bar is highlighted
        const highlightedBars = await page.locator('.highlight');
        await expect(highlightedBars).toHaveCountGreaterThan(0);
    });

    test('should reset highlights after sorting', async ({ page }) => {
        // Click the sort button
        const sortButton = await page.locator('#sortButton');
        await sortButton.click();

        // Wait for the sorting process to complete
        await page.waitForTimeout(4000); // Adjust based on sorting delay

        // Check that no bars are highlighted after sorting
        const highlightedBars = await page.locator('.highlight');
        await expect(highlightedBars).toHaveCount(0);
    });

    test('should handle empty array gracefully', async ({ page }) => {
        // Modify the array to be empty for testing
        await page.evaluate(() => {
            const arrayContainer = document.getElementById('arrayContainer');
            arrayContainer.innerHTML = ''; // Clear the array
        });

        // Click the sort button
        const sortButton = await page.locator('#sortButton');
        await sortButton.click();

        // Verify that no bars are displayed
        const bars = await page.locator('.bar');
        await expect(bars).toHaveCount(0);
    });

    test('should handle single element array', async ({ page }) => {
        // Modify the array to have a single element for testing
        await page.evaluate(() => {
            const arrayContainer = document.getElementById('arrayContainer');
            arrayContainer.innerHTML = ''; // Clear the array
            const bar = document.createElement('div');
            bar.style.height = '30px'; // Height for single element
            bar.classList.add('bar');
            arrayContainer.appendChild(bar);
        });

        // Click the sort button
        const sortButton = await page.locator('#sortButton');
        await sortButton.click();

        // Verify that one bar is displayed and it remains unchanged
        const bars = await page.locator('.bar');
        await expect(bars).toHaveCount(1);
        const height = await bars.first().evaluate(bar => bar.style.height);
        expect(height).toBe('30px');
    });
});