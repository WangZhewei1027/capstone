import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-4/html/47b65912-d1d4-11f0-959c-5fbc7dc7191d.html';

test.describe('Heap Sort Visualization', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should load the page and display the title', async ({ page }) => {
        const title = await page.title();
        expect(title).toBe('Heap Sort Visualization');
    });

    test('should have two buttons for generating and sorting the array', async ({ page }) => {
        const generateButton = await page.locator('button:has-text("Generate Random Array")');
        const sortButton = await page.locator('button:has-text("Sort Array")');
        
        await expect(generateButton).toBeVisible();
        await expect(sortButton).toBeVisible();
    });

    test('should generate a random array and render it', async ({ page }) => {
        const generateButton = await page.locator('button:has-text("Generate Random Array")');
        await generateButton.click();

        const bars = await page.locator('.bar');
        expect(await bars.count()).toBeGreaterThan(0); // Check if bars are rendered
    });

    test('should sort the array when the sort button is clicked', async ({ page }) => {
        const generateButton = await page.locator('button:has-text("Generate Random Array")');
        await generateButton.click();

        const sortButton = await page.locator('button:has-text("Sort Array")');
        await sortButton.click();

        // Wait for sorting to complete
        await page.waitForTimeout(2000); // Adjust timeout as necessary for sorting to finish

        const bars = await page.locator('.bar');
        const heights = await bars.evaluateAll(bars => bars.map(bar => parseFloat(bar.style.height)));
        const sortedHeights = [...heights].sort((a, b) => a - b);
        
        expect(heights).toEqual(sortedHeights); // Check if the array is sorted
    });

    test('should handle empty array case gracefully', async ({ page }) => {
        const sortButton = await page.locator('button:has-text("Sort Array")');
        await sortButton.click();

        // Check for console errors
        const consoleErrors = await page.evaluate(() => {
            return window.console.error.calls.map(call => call[0]);
        });
        expect(consoleErrors).toContain('Cannot sort an empty array'); // Assuming this error is logged
    });

    test('should maintain visual feedback during sorting', async ({ page }) => {
        const generateButton = await page.locator('button:has-text("Generate Random Array")');
        await generateButton.click();

        const sortButton = await page.locator('button:has-text("Sort Array")');
        await sortButton.click();

        // Wait for some time to observe visual changes
        await page.waitForTimeout(500); // Adjust as necessary

        const bars = await page.locator('.bar');
        const heightsBefore = await bars.evaluateAll(bars => bars.map(bar => parseFloat(bar.style.height)));

        // Check if heights are changing during sorting
        await page.waitForTimeout(1500); // Wait for sorting to progress

        const heightsAfter = await bars.evaluateAll(bars => bars.map(bar => parseFloat(bar.style.height)));
        expect(heightsBefore).not.toEqual(heightsAfter); // Ensure the heights have changed
    });
});