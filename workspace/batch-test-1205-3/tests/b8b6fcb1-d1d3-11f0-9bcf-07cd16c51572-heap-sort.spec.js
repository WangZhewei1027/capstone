import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-3/html/b8b6fcb1-d1d3-11f0-9bcf-07cd16c51572.html';

test.describe('Heap Sort Visualization', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application page before each test
        await page.goto(BASE_URL);
    });

    test('should load the page and display initial elements', async ({ page }) => {
        // Verify the title of the page
        await expect(page).toHaveTitle('Heap Sort Visualization');
        
        // Check if the sort button is visible
        const sortButton = await page.locator('button');
        await expect(sortButton).toBeVisible();
        
        // Check if the array container is present
        const arrayContainer = await page.locator('#array');
        await expect(arrayContainer).toBeVisible();
    });

    test('should generate a random array and render it', async ({ page }) => {
        const sortButton = await page.locator('button');
        
        // Click the sort button to generate a random array
        await sortButton.click();
        
        // Verify that the array is rendered with bars
        const bars = await page.locator('.bar');
        await expect(bars).toHaveCount(20);
        
        // Check that the bars have heights corresponding to the values
        const heights = await bars.evaluateAll(bars => bars.map(bar => bar.style.height));
        heights.forEach(height => {
            expect(parseInt(height)).toBeGreaterThan(0);
        });
    });

    test('should sort the array when the button is clicked', async ({ page }) => {
        const sortButton = await page.locator('button');
        
        // Click the sort button to sort the array
        await sortButton.click();
        
        // Wait for the sorting to complete
        await page.waitForTimeout(5000); // Adjust timeout based on sorting duration
        
        // Verify that the array is sorted
        const bars = await page.locator('.bar');
        const values = await bars.evaluateAll(bars => bars.map(bar => parseInt(bar.innerText)));
        
        // Check if the array is sorted
        const isSorted = values.every((val, i) => i === 0 || val >= values[i - 1]);
        expect(isSorted).toBe(true;
    });

    test('should handle multiple clicks and sort correctly each time', async ({ page }) => {
        const sortButton = await page.locator('button');
        
        // Click the sort button multiple times
        for (let i = 0; i < 3; i++) {
            await sortButton.click();
            await page.waitForTimeout(5000); // Wait for sorting to complete
        }
        
        // Verify that the last sorted array is still sorted
        const bars = await page.locator('.bar');
        const values = await bars.evaluateAll(bars => bars.map(bar => parseInt(bar.innerText)));
        
        const isSorted = values.every((val, i) => i === 0 || val >= values[i - 1]);
        expect(isSorted).toBe(true);
    });

    test('should show visual feedback during sorting', async ({ page }) => {
        const sortButton = await page.locator('button');
        
        // Click the sort button to start sorting
        await sortButton.click();
        
        // Wait for a short time to allow some sorting to occur
        await page.waitForTimeout(2000);
        
        // Check if the array is still being updated visually
        const bars = await page.locator('.bar');
        const initialHeights = await bars.evaluateAll(bars => bars.map(bar => bar.style.height));
        
        // Wait for the sorting to complete
        await page.waitForTimeout(3000);
        
        // Get the heights after sorting
        const finalHeights = await bars.evaluateAll(bars => bars.map(bar => bar.style.height));
        
        // Ensure that the heights have changed
        expect(initialHeights).not.toEqual(finalHeights);
    });

    test('should handle errors gracefully', async ({ page }) => {
        // Simulate an error scenario by modifying the array size
        await page.evaluate(() => {
            window.arraySize = -1; // Invalid size
        });
        
        const sortButton = await page.locator('button');
        
        // Click the sort button and expect an error
        await expect(sortButton.click()).rejects.toThrow();
    });
});