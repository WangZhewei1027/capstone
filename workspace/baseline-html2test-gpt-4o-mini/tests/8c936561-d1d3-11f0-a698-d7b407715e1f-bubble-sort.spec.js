import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/8c936561-d1d3-11f0-a698-d7b407715e1f.html';

test.describe('Bubble Sort Visualization Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the Bubble Sort Visualization page before each test
        await page.goto(BASE_URL);
    });

    test('should load the page and display initial array', async ({ page }) => {
        // Verify that the page title is correct
        await expect(page).toHaveTitle('Bubble Sort Visualization');

        // Check that the array is displayed with bars
        const bars = await page.locator('.bar');
        await expect(bars).toHaveCount(15); // Initial array should have 15 bars
    });

    test('should sort the array when the sort button is clicked', async ({ page }) => {
        // Click the sort button
        await page.click('#sortButton');

        // Wait for the sorting animation to complete
        await page.waitForTimeout(5000); // Wait for the sort to finish (adjust as necessary)

        // Verify that the array is sorted
        const heights = await page.$$eval('.bar', bars => bars.map(bar => parseInt(bar.style.height)));
        const sortedHeights = [...heights].sort((a, b) => a - b);
        expect(heights).toEqual(sortedHeights);
    });

    test('should update the array display during sorting', async ({ page }) => {
        // Click the sort button
        await page.click('#sortButton');

        // Wait for a short duration to allow some sorting to occur
        await page.waitForTimeout(1000);

        // Check that the first two bars are in the correct order
        const firstBarHeight = await page.locator('.bar').nth(0).evaluate(bar => parseInt(bar.style.height));
        const secondBarHeight = await page.locator('.bar').nth(1).evaluate(bar => parseInt(bar.style.height));
        expect(firstBarHeight).toBeLessThanOrEqual(secondBarHeight);
    });

    test('should handle multiple clicks on the sort button', async ({ page }) => {
        // Click the sort button multiple times
        await page.click('#sortButton');
        await page.waitForTimeout(1000); // Wait for some sorting to occur
        await page.click('#sortButton'); // Click again

        // Verify that the array is still sorted after the second click
        await page.waitForTimeout(5000); // Wait for the sort to finish
        const heights = await page.$$eval('.bar', bars => bars.map(bar => parseInt(bar.style.height)));
        const sortedHeights = [...heights].sort((a, b) => a - b);
        expect(heights).toEqual(sortedHeights);
    });

    test('should not throw errors during sorting', async ({ page }) => {
        // Listen for console errors
        const consoleErrors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });

        // Click the sort button
        await page.click('#sortButton');

        // Wait for the sorting to complete
        await page.waitForTimeout(5000);

        // Assert that no errors were logged to the console
        expect(consoleErrors).toHaveLength(0);
    });
});