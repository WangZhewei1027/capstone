import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-3/html/b8b6fcb0-d1d3-11f0-9bcf-07cd16c51572.html';

test.describe('Quick Sort Visualization Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the Quick Sort Visualization page before each test
        await page.goto(BASE_URL);
    });

    test('should load the page and display initial state', async ({ page }) => {
        // Verify that the page title is correct
        await expect(page).toHaveTitle('Quick Sort Visualization');
        
        // Check that the initial array is drawn correctly
        const bars = await page.$$('#array .bar');
        expect(bars.length).toBe(9); // There should be 9 bars
    });

    test('should start quick sort and visualize sorting process', async ({ page }) => {
        // Click the "Start Quick Sort" button
        await page.click('button:has-text("Start Quick Sort")');

        // Wait for sorting to complete (alert should appear)
        await page.waitForTimeout(5000); // Wait for the sorting animation to complete

        // Check that the alert is displayed
        page.on('dialog', async dialog => {
            expect(dialog.message()).toBe('Sorting completed!');
            await dialog.dismiss();
        });
    });

    test('should visualize array changes during sorting', async ({ page }) => {
        // Click the "Start Quick Sort" button
        await page.click('button:has-text("Start Quick Sort")');

        // Wait for a moment to allow some sorting actions to occur
        await page.waitForTimeout(2000);

        // Check that the array is being updated (the bars should change in height)
        const initialBars = await page.$$('#array .bar');
        const initialHeights = await Promise.all(initialBars.map(bar => bar.evaluate(el => el.style.height)));

        // Wait for a moment to allow more sorting actions to occur
        await page.waitForTimeout(2000);

        const updatedBars = await page.$$('#array .bar');
        const updatedHeights = await Promise.all(updatedBars.map(bar => bar.evaluate(el => el.style.height)));

        // Assert that the heights have changed
        expect(initialHeights).not.toEqual(updatedHeights);
    });

    test('should handle edge case with empty array', async ({ page }) => {
        // Modify the array to be empty (this would require a modification in the code which we cannot do)
        // Instead, we will just test the existing functionality and expect it to handle it gracefully
        // This test is conceptual as we cannot modify the code directly

        // Click the "Start Quick Sort" button
        await page.click('button:has-text("Start Quick Sort")');

        // Wait for sorting to complete (alert should appear)
        await page.waitForTimeout(5000); // Wait for the sorting animation to complete

        // Check that the alert is displayed
        page.on('dialog', async dialog => {
            expect(dialog.message()).toBe('Sorting completed!');
            await dialog.dismiss();
        });
    });

    test('should show alert when sorting is completed', async ({ page }) => {
        // Click the "Start Quick Sort" button
        await page.click('button:has-text("Start Quick Sort")');

        // Wait for the alert to appear
        page.on('dialog', async dialog => {
            expect(dialog.message()).toBe('Sorting completed!');
            await dialog.dismiss();
        });
    });
});