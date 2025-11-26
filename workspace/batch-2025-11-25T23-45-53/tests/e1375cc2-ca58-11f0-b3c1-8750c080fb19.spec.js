import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-25T23-45-53/html/e1375cc2-ca58-11f0-b3c1-8750c080fb19.html';

test.describe('Selection Sort Visualization', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should display initial array in Idle state', async ({ page }) => {
        const bars = await page.locator('.bar');
        expect(await bars.count()).toBeGreaterThan(0); // Check if bars are displayed
    });

    test('should transition to Sorting state on Start button click', async ({ page }) => {
        await page.click('button');
        await expect(page).toHaveURL(BASE_URL); // Ensure we are still on the same page
        const bars = await page.locator('.bar');
        await expect(bars.first()).toHaveCSS('background-color', 'rgb(255, 0, 0)'); // Check if the first bar is highlighted
    });

    test('should highlight bars during sorting', async ({ page }) => {
        await page.click('button');
        await page.waitForTimeout(1000); // Wait for some sorting to happen
        const highlightedBars = await page.locator('.bar[style*="background-color: red"]');
        expect(await highlightedBars.count()).toBeGreaterThan(0); // Check if at least one bar is highlighted
    });

    test('should swap bars correctly', async ({ page }) => {
        await page.click('button');
        await page.waitForTimeout(1000); // Wait for some sorting to happen
        const bars = await page.locator('.bar');
        const initialHeights = await bars.evaluateAll(bars => bars.map(bar => bar.offsetHeight));
        
        await page.waitForTimeout(2000); // Wait for sorting to complete
        const finalHeights = await bars.evaluateAll(bars => bars.map(bar => bar.offsetHeight));
        
        expect(initialHeights).not.toEqual(finalHeights); // Check if the heights have changed, indicating a swap
    });

    test('should return to Idle state after sorting is complete', async ({ page }) => {
        await page.click('button');
        await page.waitForTimeout(5000); // Wait for sorting to complete
        const bars = await page.locator('.bar');
        await expect(bars.first()).toHaveCSS('background-color', 'rgb(173, 216, 230)'); // Check if bars are back to original color
    });

    test('should handle edge case of already sorted array', async ({ page }) => {
        await page.evaluate(() => {
            window.array = [1, 2, 3, 4, 5]; // Set a sorted array
            window.displayArray(window.array);
        });
        await page.click('button');
        await page.waitForTimeout(2000); // Wait for sorting to complete
        const bars = await page.locator('.bar');
        const heights = await bars.evaluateAll(bars => bars.map(bar => bar.offsetHeight));
        expect(heights).toEqual([3, 6, 9, 12, 15]); // Check if the heights remain the same
    });

    test('should not crash on empty array', async ({ page }) => {
        await page.evaluate(() => {
            window.array = []; // Set an empty array
            window.displayArray(window.array);
        });
        await page.click('button');
        await page.waitForTimeout(1000); // Wait for sorting to complete
        const bars = await page.locator('.bar');
        expect(await bars.count()).toBe(0); // Check if no bars are displayed
    });
});