import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-4/html/47b68021-d1d4-11f0-959c-5fbc7dc7191d.html';

test.describe('Radix Sort Visualization Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application page before each test
        await page.goto(BASE_URL);
    });

    test('should load the page and display initial array', async ({ page }) => {
        // Verify the title of the page
        await expect(page).toHaveTitle('Radix Sort Visualization');

        // Check that the initial array is displayed
        const bars = await page.$$('.bar');
        expect(bars.length).toBe(8; // Initial array has 8 elements

        // Verify the heights of the bars correspond to the initial array values
        const expectedHeights = [340, 90, 150, 180, 1604, 48, 4, 132]; // Heights based on initial values multiplied by 2
        for (let i = 0; i < bars.length; i++) {
            const height = await bars[i].evaluate(bar => bar.style.height);
            expect(parseInt(height)).toBe(expectedHeights[i]);
        }
    });

    test('should sort the array when the sort button is clicked', async ({ page }) => {
        // Click the sort button
        await page.click('#sortButton');

        // Wait for the sorting animation to complete
        await page.waitForTimeout(5000); // Wait for the entire sorting process

        // Check that all bars are marked as sorted
        const sortedBars = await page.$$('.bar.sorted');
        expect(sortedBars.length).toBe(8); // All bars should be sorted

        // Verify that the bars are in sorted order
        const sortedValues = [2, 24, 45, 66, 75, 90, 170, 802];
        const bars = await page.$$('.bar');
        for (let i = 0; i < bars.length; i++) {
            const text = await bars[i].innerText();
            expect(parseInt(text)).toBe(sortedValues[i]);
        }
    });

    test('should display visual changes during sorting', async ({ page }) => {
        // Click the sort button
        await page.click('#sortButton');

        // Check the height of the first bar after the first sorting step
        await page.waitForTimeout(500); // Wait for the first step
        const firstBarHeightAfterFirstStep = await page.$eval('.bar', bar => bar.style.height);
        expect(parseInt(firstBarHeightAfterFirstStep)).toBeLessThan(340); // First bar should have changed height

        // Wait for the sorting to complete
        await page.waitForTimeout(5000); // Wait for the entire sorting process
    });

    test('should handle errors gracefully', async ({ page }) => {
        // Intentionally cause an error by modifying the array (not applicable in this case as the array is hardcoded)
        // Instead, we will check for console errors
        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.error('Console error:', msg.text());
            }
        });

        // Click the sort button
        await page.click('#sortButton');

        // Wait for the sorting to complete
        await page.waitForTimeout(5000);

        // Check for any console errors during the sorting process
        const consoleErrors = await page.evaluate(() => {
            return window.console.error.calls; // This is a hypothetical way to capture console errors
        });
        expect(consoleErrors.length).toBe(0); // Ensure no errors occurred
    });
});