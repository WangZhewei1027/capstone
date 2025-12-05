import { test, expect } from '@playwright/test';

const baseURL = 'http://127.0.0.1:5500/workspace/batch-test-1205-3/html/b8b6d5a1-d1d3-11f0-9bcf-07cd16c51572.html';

test.describe('Insertion Sort Visualization', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the Insertion Sort Visualization page before each test
        await page.goto(baseURL);
    });

    test('should load the page and display the initial array', async ({ page }) => {
        // Verify the initial state of the array is displayed correctly
        const bars = await page.locator('.bar');
        expect(await bars.count()).toBe(5); // There should be 5 bars
        expect(await bars.nth(0).innerText()).toBe('5'); // First element should be 5
        expect(await bars.nth(1).innerText()).toBe('3'); // Second element should be 3
        expect(await bars.nth(2).innerText()).toBe('8'); // Third element should be 8
        expect(await bars.nth(3).innerText()).toBe('4'); // Fourth element should be 4
        expect(await bars.nth(4).innerText()).toBe('2'); // Fifth element should be 2
    });

    test('should start insertion sort on button click', async ({ page }) => {
        // Click the start button and verify the sorting process
        await page.click('button');

        // Wait for a moment to allow the sort to progress
        await page.waitForTimeout(3000); // Wait for 3 seconds to observe some sorting steps

        // Verify the final state of the array is sorted
        const bars = await page.locator('.bar');
        const sortedValues = await Promise.all(bars.evaluateAll(b => b.map(bar => parseInt(bar.innerText))));
        expect(sortedValues).toEqual([2, 3, 4, 5, 8]); // Check if the array is sorted
    });

    test('should visually update the array during sorting', async ({ page }) => {
        // Start the insertion sort and observe visual updates
        await page.click('button');

        // Wait for a moment to allow the sort to progress
        await page.waitForTimeout(3000); // Wait for 3 seconds to observe some sorting steps

        // Check if the array has been visually updated
        const bars = await page.locator('.bar');
        const heights = await bars.evaluateAll(b => b.map(bar => parseInt(bar.style.height)));
        expect(heights).not.toEqual([100, 60, 160, 80, 40]); // Ensure the heights have changed
    });

    test('should handle edge cases gracefully', async ({ page }) => {
        // Test the behavior when the array is empty
        await page.evaluate(() => {
            // Modify the array to be empty for testing
            window.array.length = 0;
            window.drawArray(window.array);
        });

        const bars = await page.locator('.bar');
        expect(await bars.count()).toBe(0); // There should be no bars

        // Click the start button and check if it handles the empty array
        await page.click('button');
        await page.waitForTimeout(1000); // Wait for a moment

        // Verify that no errors are thrown and the array remains empty
        expect(await bars.count()).toBe(0); // Still no bars
    });
});