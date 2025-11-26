import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-25T23-45-53/html/e1375cc1-ca58-11f0-b3c1-8750c080fb19.html';

test.describe('Bubble Sort Visualization Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('Initial state is Idle', async ({ page }) => {
        // Verify that the initial state is Idle by checking the drawn array
        const bars = await page.locator('#arrayContainer .bar').count();
        expect(bars).toBe(0); // No bars should be drawn initially
    });

    test('Start Bubble Sort transitions to Sorting state', async ({ page }) => {
        // Click the start button to begin sorting
        await page.click('button');
        
        // Verify that the array is being drawn (indicating sorting has started)
        const bars = await page.locator('#arrayContainer .bar').count();
        expect(bars).toBeGreaterThan(0); // Bars should be drawn after starting
    });

    test('Sorting state transitions to Highlighting state', async ({ page }) => {
        await page.click('button'); // Start sorting
        
        // Wait for a brief moment to allow the sorting to progress
        await page.waitForTimeout(1000);
        
        // Verify that highlighting occurs during sorting
        const highlightedBars = await page.locator('#arrayContainer .highlight').count();
        expect(highlightedBars).toBeGreaterThan(0); // Some bars should be highlighted
    });

    test('Highlighting state remains during sorting', async ({ page }) => {
        await page.click('button'); // Start sorting
        
        // Wait for a moment to allow for multiple highlights
        await page.waitForTimeout(1000);
        
        const highlightedBarsBefore = await page.locator('#arrayContainer .highlight').count();
        await page.waitForTimeout(1000); // Wait again to allow for more highlights
        const highlightedBarsAfter = await page.locator('#arrayContainer .highlight').count();
        
        expect(highlightedBarsAfter).toBeGreaterThanOrEqual(highlightedBarsBefore); // Highlighting should continue
    });

    test('Sorting completes and transitions to Sorted state', async ({ page }) => {
        await page.click('button'); // Start sorting
        
        // Wait for the sorting to complete
        await page.waitForTimeout(5000); // Adjust this timeout based on expected sorting duration
        
        // Verify that the array is sorted
        const bars = await page.locator('#arrayContainer .bar');
        const heights = await bars.evaluateAll(bars => bars.map(bar => parseInt(bar.style.height)));
        const isSorted = heights.every((val, i, arr) => !i || (val >= arr[i - 1]));
        
        expect(isSorted).toBe(true); // The array should be sorted
    });

    test('Visual feedback during sorting', async ({ page }) => {
        await page.click('button'); // Start sorting
        
        // Check that the bars change height during sorting
        const initialHeights = await page.locator('#arrayContainer .bar').evaluateAll(bars => bars.map(bar => bar.style.height));
        
        await page.waitForTimeout(1000); // Wait for some sorting to occur
        
        const updatedHeights = await page.locator('#arrayContainer .bar').evaluateAll(bars => bars.map(bar => bar.style.height));
        
        expect(initialHeights).not.toEqual(updatedHeights); // Heights should change during sorting
    });

    test('Edge case: Empty array', async ({ page }) => {
        await page.evaluate(() => {
            // Modify the array to be empty
            window.array = [];
            window.drawArray(window.array, []);
        });
        
        await page.click('button'); // Start sorting
        
        // Verify that no bars are drawn
        const bars = await page.locator('#arrayContainer .bar').count();
        expect(bars).toBe(0); // No bars should be drawn for an empty array
    });
});