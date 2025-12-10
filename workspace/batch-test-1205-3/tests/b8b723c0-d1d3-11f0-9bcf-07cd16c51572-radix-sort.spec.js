import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-3/html/b8b723c0-d1d3-11f0-9bcf-07cd16c51572.html';

test.describe('Radix Sort Visualization', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should load the page and display initial state', async ({ page }) => {
        // Verify the title of the page
        await expect(page).toHaveTitle('Radix Sort Visualization');
        
        // Check if the initial array bars are displayed
        const bars = await page.$$('#array .bar');
        expect(bars.length).toBe(8); // There should be 8 bars for the initial array
    });

    test('should visualize the sorting process when "Sort" button is clicked', async ({ page }) => {
        // Click the "Sort" button
        await page.click('button');

        // Wait for the sorting process to complete
        await page.waitForTimeout(10000); // Wait for the sorting visualization to finish

        // Check if the bars are sorted
        const bars = await page.$$('#array .bar');
        const heights = await Promise.all(bars.map(bar => bar.evaluate(el => parseInt(el.style.height))));
        
        // Verify the heights are sorted in ascending order
        const sortedHeights = [...heights].sort((a, b) => a - b);
        expect(heights).toEqual(sortedHeights);
    });

    test('should update the visualization after each sorting step', async ({ page }) => {
        // Click the "Sort" button
        await page.click('button');

        // Check the initial state of the bars
        const initialBars = await page.$$('#array .bar');
        const initialHeights = await Promise.all(initialBars.map(bar => bar.evaluate(el => parseInt(el.style.height))));
        
        // Wait for the first sorting step
        await page.waitForTimeout(1000);

        // Check the state of the bars after the first step
        const firstStepBars = await page.$$('#array .bar');
        const firstStepHeights = await Promise.all(firstStepBars.map(bar => bar.evaluate(el => parseInt(el.style.height))));
        
        // Ensure that the heights have changed (not necessarily sorted yet)
        expect(firstStepHeights).not.toEqual(initialHeights);
    });

    test('should handle edge case with empty array', async ({ page }) => {
        // Modify the array to be empty for testing
        await page.evaluate(() => {
            window.array = [];
            window.createBars(window.array);
        });

        // Click the "Sort" button
        await page.click('button');

        // Wait for the sorting process to complete
        await page.waitForTimeout(1000); // Short wait for the empty array case

        // Check if no bars are displayed
        const bars = await page.$$('#array .bar');
        expect(bars.length).toBe(0); // No bars should be present for an empty array
    });

    test('should handle edge case with single element', async ({ page }) => {
        // Modify the array to have a single element for testing
        await page.evaluate(() => {
            window.array = [42];
            window.createBars(window.array);
        });

        // Click the "Sort" button
        await page.click('button');

        // Wait for the sorting process to complete
        await page.waitForTimeout(1000); // Short wait for the single element case

        // Check if one bar is displayed with the correct height
        const bars = await page.$$('#array .bar');
        expect(bars.length).toBe(1); // One bar should be present
        const height = await bars[0].evaluate(el => parseInt(el.style.height));
        expect(height).toBe(42); // Height should match the single element
    });
});