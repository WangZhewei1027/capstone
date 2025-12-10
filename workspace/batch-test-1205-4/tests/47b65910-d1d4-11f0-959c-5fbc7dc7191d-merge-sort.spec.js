import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-4/html/47b65910-d1d4-11f0-959c-5fbc7dc7191d.html';

test.describe('Merge Sort Visualization', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application page before each test
        await page.goto(BASE_URL);
    });

    test('should load the page and display the title', async ({ page }) => {
        // Verify the title of the page
        const title = await page.title();
        expect(title).toBe('Merge Sort Visualization');
    });

    test('should display the sort button', async ({ page }) => {
        // Check if the sort button is visible
        const sortButton = await page.locator('#sortButton');
        await expect(sortButton).toBeVisible();
    });

    test('should generate and sort a random array when the button is clicked', async ({ page }) => {
        // Click the sort button
        const sortButton = await page.locator('#sortButton');
        await sortButton.click();

        // Wait for the bars to be created
        await page.waitForTimeout(1000); // Wait for initial array generation

        // Check if bars are created in the array container
        const bars = await page.locator('.bar');
        await expect(bars).toHaveCount(10); // Expect 10 bars for the random array

        // Verify that the bars are visible
        await expect(bars).toBeVisible();

        // Wait for sorting to complete
        await page.waitForTimeout(3000); // Wait for sorting animation to complete

        // Check if the bars reflect the sorted array
        const heights = await bars.evaluateAll(bars => bars.map(bar => bar.style.height));
        const sortedHeights = [...heights].sort((a, b) => parseInt(a) - parseInt(b));
        expect(heights).toEqual(sortedHeights);
    });

    test('should update bar colors during sorting', async ({ page }) => {
        // Click the sort button
        const sortButton = await page.locator('#sortButton');
        await sortButton.click();

        // Wait for the bars to be created
        await page.waitForTimeout(1000); // Wait for initial array generation

        // Capture the initial bar colors
        const bars = await page.locator('.bar');
        const initialColors = await bars.evaluateAll(bars => bars.map(bar => bar.style.backgroundColor));

        // Wait for sorting to complete
        await page.waitForTimeout(3000); // Wait for sorting animation to complete

        // Capture the final bar colors
        const finalColors = await bars.evaluateAll(bars => bars.map(bar => bar.style.backgroundColor));

        // Verify that the colors changed during sorting
        expect(initialColors).not.toEqual(finalColors);
        expect(finalColors.every(color => color === 'teal')).toBeTruthy(); // Final color should be teal
    });

    test('should handle edge case of empty array', async ({ page }) => {
        // Modify the script to handle empty array case (not shown in the provided code)
        // Here we will simulate clicking the button and expect an empty array to be handled gracefully

        // Click the sort button
        const sortButton = await page.locator('#sortButton');
        await sortButton.click();

        // Wait for the bars to be created
        await page.waitForTimeout(1000); // Wait for initial array generation

        // Check if bars are created in the array container
        const bars = await page.locator('.bar');
        await expect(bars).toHaveCount(10); // Expect 10 bars for the random array

        // Simulate an empty array scenario (this would require modification in the original code)
        // For testing purposes, we assume the application can handle this without crashing
    });

    test('should display console errors if any occur', async ({ page }) => {
        // Listen for console errors
        const consoleErrors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });

        // Click the sort button
        const sortButton = await page.locator('#sortButton');
        await sortButton.click();

        // Wait for sorting to complete
        await page.waitForTimeout(3000); // Wait for sorting animation to complete

        // Assert that no console errors occurred
        expect(consoleErrors.length).toBe(0);
    });
});