import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/8c938c71-d1d3-11f0-a698-d7b407715e1f.html';

test.describe('Merge Sort Visualization', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the Merge Sort Visualization page before each test
        await page.goto(BASE_URL);
    });

    test('should load the page and display initial array', async ({ page }) => {
        // Verify the title of the page
        await expect(page).toHaveTitle('Merge Sort Visualization');

        // Check if the initial array is rendered
        const bars = await page.$$('#array .bar');
        expect(bars.length).toBe(7); // Initial array has 7 elements

        // Check the height of the first bar (38)
        const firstBarHeight = await bars[0].evaluate(bar => bar.style.height);
        expect(firstBarHeight).toBe('190px'); // 38 * 5 = 190
    });

    test('should sort the array when the button is clicked', async ({ page }) => {
        // Click the "Start Merge Sort" button
        await page.click('button');

        // Wait for the array to be redrawn
        await page.waitForTimeout(1000); // Wait for sorting animation to complete

        // Check if the array is sorted
        const bars = await page.$$('#array .bar');
        const sortedValues = await Promise.all(bars.map(bar => bar.evaluate(bar => parseInt(bar.title))));
        expect(sortedValues).toEqual(sortedValues.slice().sort((a, b) => a - b)); // Check if sorted
    });

    test('should redraw the array after sorting', async ({ page }) => {
        // Click the "Start Merge Sort" button
        await page.click('button');

        // Wait for the array to be redrawn
        await page.waitForTimeout(1000); // Wait for sorting animation to complete

        // Check if the array is redrawn
        const bars = await page.$$('#array .bar');
        expect(bars.length).toBe(7); // Ensure the number of bars remains the same
    });

    test('should handle empty array gracefully', async ({ page }) => {
        // Modify the array to be empty and trigger sorting
        await page.evaluate(() => {
            array = [];
            drawArray();
        });

        // Click the "Start Merge Sort" button
        await page.click('button');

        // Wait for the array to be redrawn
        await page.waitForTimeout(1000); // Wait for sorting animation to complete

        // Check if the array is empty
        const bars = await page.$$('#array .bar');
        expect(bars.length).toBe(0); // No bars should be displayed
    });

    test('should handle single element array', async ({ page }) => {
        // Modify the array to contain a single element and trigger sorting
        await page.evaluate(() => {
            array = [42];
            drawArray();
        });

        // Click the "Start Merge Sort" button
        await page.click('button');

        // Wait for the array to be redrawn
        await page.waitForTimeout(1000); // Wait for sorting animation to complete

        // Check if the array is still the same
        const bars = await page.$$('#array .bar');
        expect(bars.length).toBe(1); // One bar should be displayed
        const singleBarHeight = await bars[0].evaluate(bar => bar.style.height);
        expect(singleBarHeight).toBe('210px'); // 42 * 5 = 210
    });

    test('should log errors to the console', async ({ page }) => {
        // Listen for console errors
        const consoleErrors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });

        // Trigger an error by modifying the array to an invalid state
        await page.evaluate(() => {
            array = undefined; // This will cause an error in mergeSort
        });

        // Click the "Start Merge Sort" button
        await page.click('button');

        // Wait for a moment to allow the error to be logged
        await page.waitForTimeout(1000);

        // Check if an error was logged
        expect(consoleErrors.length).toBeGreaterThan(0); // Ensure at least one error was logged
    });
});