import { test, expect } from '@playwright/test';

const url = 'http://127.0.0.1:5500/workspace/batch-test-1205-2/html/24944700-d1d2-11f0-a359-f3a4ddd3c298.html';

test.describe('Quick Sort Visualization Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the Quick Sort Visualization page before each test
        await page.goto(url);
    });

    test('Initial state: Bars are created in Idle state', async ({ page }) => {
        // Verify that the initial bars are created correctly
        const bars = await page.$$('#arrayContainer .bar');
        expect(bars.length).toBe(10); // Check that 10 bars are created
    });

    test('User clicks "Sort Array" button to transition to Sorting state', async ({ page }) => {
        // Click the "Sort Array" button
        await page.click('button[onclick="startQuickSort()"]');

        // Verify that the sorting process has started
        const bars1 = await page.$$('#arrayContainer .bar');
        expect(bars.length).toBe(10); // Ensure bars still exist

        // Check for visual changes indicating sorting
        // Wait for a brief period to allow sorting to take place
        await page.waitForTimeout(1000); // Adjust timeout as necessary

        // Verify that the bars are sorted (the heights should be in ascending order)
        const heights = await Promise.all(bars.map(bar => bar.evaluate(el => el.style.height)));
        const values = heights.map(height => parseInt(height) / 3); // Convert back to original values
        expect(values).toEqual(values.slice().sort((a, b) => a - b)); // Check if sorted
    });

    test('Check for console errors during sorting', async ({ page }) => {
        // Listen for console messages
        const consoleMessages = [];
        page.on('console', msg => consoleMessages.push(msg.text()));

        // Click the "Sort Array" button
        await page.click('button[onclick="startQuickSort()"]');

        // Wait for sorting to complete
        await page.waitForTimeout(1000); // Adjust timeout as necessary

        // Check for any ReferenceError, SyntaxError, or TypeError in console messages
        const errorMessages = consoleMessages.filter(msg => 
            msg.includes('ReferenceError') || 
            msg.includes('SyntaxError') || 
            msg.includes('TypeError')
        );

        expect(errorMessages.length).toBe(0); // Ensure no errors occurred
    });

    test('Edge case: Sort an already sorted array', async ({ page }) => {
        // Modify the array to be already sorted
        await page.evaluate(() => {
            window.arr = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
            window.createBars(window.arr);
        });

        // Click the "Sort Array" button
        await page.click('button[onclick="startQuickSort()"]');

        // Wait for sorting to complete
        await page.waitForTimeout(1000); // Adjust timeout as necessary

        // Verify that the bars remain in sorted order
        const bars2 = await page.$$('#arrayContainer .bar');
        const heights1 = await Promise.all(bars.map(bar => bar.evaluate(el => el.style.height)));
        const values1 = heights.map(height => parseInt(height) / 3);
        expect(values).toEqual(values.slice().sort((a, b) => a - b)); // Check if sorted
    });

    test('Edge case: Sort an empty array', async ({ page }) => {
        // Modify the array to be empty
        await page.evaluate(() => {
            window.arr = [];
            window.createBars(window.arr);
        });

        // Click the "Sort Array" button
        await page.click('button[onclick="startQuickSort()"]');

        // Wait for sorting to complete
        await page.waitForTimeout(1000); // Adjust timeout as necessary

        // Verify that no bars are displayed
        const bars3 = await page.$$('#arrayContainer .bar');
        expect(bars.length).toBe(0); // Ensure no bars exist
    });
});