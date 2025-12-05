import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/8c93b380-d1d3-11f0-a698-d7b407715e1f.html';

test.describe('Quick Sort Visualization Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the Quick Sort Visualization page before each test
        await page.goto(BASE_URL);
    });

    test('should display the initial array on page load', async ({ page }) => {
        // Verify that the initial array is displayed correctly
        const bars = await page.locator('.bar');
        expect(await bars.count()).toBe(6); // There should be 6 bars for the initial array
        const heights = await Promise.all(bars.evaluateAll(bar => parseInt(bar.style.height)));
        expect(heights).toEqual([100, 70, 80, 90, 10, 50]); // Heights based on the initial array values
    });

    test('should sort the array when the "Start Quick Sort" button is clicked', async ({ page }) => {
        // Click the "Start Quick Sort" button
        await page.click('button');

        // Wait for the sorting process to complete and verify the final state
        const bars = await page.locator('.bar');
        const heights = await Promise.all(bars.evaluateAll(bar => parseInt(bar.style.height)));
        expect(heights).toEqual([10, 50, 70, 80, 90, 100]); // Heights should reflect the sorted array
    });

    test('should update the DOM during sorting', async ({ page }) => {
        // Click the "Start Quick Sort" button
        await page.click('button');

        // Check that the DOM updates during the sorting process
        const initialBars = await page.locator('.bar');
        const initialHeights = await Promise.all(initialBars.evaluateAll(bar => parseInt(bar.style.height)));

        // Wait for a short duration to allow sorting animations to occur
        await page.waitForTimeout(500); // Adjust timeout as necessary for visual feedback

        const updatedBars = await page.locator('.bar');
        const updatedHeights = await Promise.all(updatedBars.evaluateAll(bar => parseInt(bar.style.height)));

        // Ensure that the updated heights are different from the initial heights
        expect(updatedHeights).not.toEqual(initialHeights);
    });

    test('should handle edge cases gracefully', async ({ page }) => {
        // Modify the initial array to an edge case (e.g., already sorted)
        await page.evaluate(() => {
            const array = [1, 2, 3, 4, 5, 6];
            displayArray(array);
        });

        // Click the "Start Quick Sort" button
        await page.click('button');

        // Verify that the sorted array remains unchanged
        const bars = await page.locator('.bar');
        const heights = await Promise.all(bars.evaluateAll(bar => parseInt(bar.style.height)));
        expect(heights).toEqual([10, 20, 30, 40, 50, 60]); // Heights should reflect the already sorted array
    });

    test('should log errors in the console', async ({ page }) => {
        // Listen for console messages
        const consoleMessages = [];
        page.on('console', msg => consoleMessages.push(msg.text()));

        // Intentionally cause an error (e.g., by modifying the quickSort function)
        await page.evaluate(() => {
            window.quickSort = () => { throw new Error('Test Error'); };
        });

        // Click the "Start Quick Sort" button
        await page.click('button');

        // Check that an error was logged to the console
        expect(consoleMessages).toContain('Test Error');
    });
});