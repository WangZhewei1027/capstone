import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/8c936562-d1d3-11f0-a698-d7b407715e1f.html';

test.describe('Selection Sort Visualization', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application page before each test
        await page.goto(BASE_URL);
    });

    test('should load the page and display initial state', async ({ page }) => {
        // Verify the page title
        await expect(page).toHaveTitle('Selection Sort Visualization');
        
        // Check if the sort button is visible
        const sortButton = await page.locator('#sortButton');
        await expect(sortButton).toBeVisible();
        
        // Check if the array container is visible and has initial bars
        const arrayContainer = await page.locator('#arrayContainer');
        await expect(arrayContainer).toBeVisible();
        const bars = await arrayContainer.locator('.bar');
        await expect(bars).toHaveCount(5); // Initial array has 5 elements
    });

    test('should sort the array when sort button is clicked', async ({ page }) => {
        const sortButton = await page.locator('#sortButton');
        
        // Click the sort button
        await sortButton.click();
        
        // Wait for the sorting animation to complete
        await page.waitForTimeout(3000); // Adjust timeout based on animation duration
        
        // Check if the bars are sorted by verifying the heights
        const bars = await page.locator('.bar');
        const heights = await bars.evaluateAll(bars => bars.map(bar => parseInt(bar.style.height)));
        
        // Check if the heights are in ascending order
        const sortedHeights = [...heights].sort((a, b) => a - b);
        expect(heights).toEqual(sortedHeights);
    });

    test('should update the DOM correctly during sorting', async ({ page }) => {
        const sortButton = await page.locator('#sortButton');
        
        // Click the sort button
        await sortButton.click();

        // Check the initial state of the first bar
        const firstBar = await page.locator('.bar').nth(0);
        const initialHeight = await firstBar.evaluate(bar => bar.style.height);
        
        // Wait for the first sorting step
        await page.waitForTimeout(1000);
        
        // Check if the first bar's height has changed (indicating sorting progress)
        const updatedHeight = await firstBar.evaluate(bar => bar.style.height);
        expect(updatedHeight).not.toEqual(initialHeight);
    });

    test('should handle errors gracefully', async ({ page }) => {
        // Simulate an error by modifying the array to contain non-numeric values
        await page.evaluate(() => {
            window.array.push('invalid');
        });

        const sortButton = await page.locator('#sortButton');
        
        // Click the sort button
        await sortButton.click();

        // Wait for a while to allow any potential error to occur
        await page.waitForTimeout(3000);

        // Check for console errors
        const consoleErrors = await page.evaluate(() => {
            return window.console.error.calls; // Assuming console.error is being tracked
        });

        expect(consoleErrors.length).toBeGreaterThan(0); // Expect at least one error
    });
});