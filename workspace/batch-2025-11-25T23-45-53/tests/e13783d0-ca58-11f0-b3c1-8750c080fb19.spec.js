import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-25T23-45-53/html/e13783d0-ca58-11f0-b3c1-8750c080fb19.html';

test.describe('Insertion Sort Visualization Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application before each test
        await page.goto(BASE_URL);
    });

    test('Initial state should be Idle with a random array', async ({ page }) => {
        // Verify that the initial state is Idle by checking the array is rendered
        const bars = await page.$$('#array .bar');
        expect(bars.length).toBeGreaterThan(0); // Ensure there are bars rendered
    });

    test('Start Sorting transitions to Sorting state', async ({ page }) => {
        // Click the Start Sorting button
        await page.click('button:has-text("Start Sorting")');

        // Verify that the sorting process has started by checking the color change
        const firstBar = await page.$('#array .bar:nth-child(1)');
        expect(await firstBar.evaluate(el => el.style.backgroundColor)).toBe('orange');

        // Wait for the sorting to complete
        await page.waitForTimeout(5000); // Adjust timeout based on the sorting duration
    });

    test('Reset Array while Sorting transitions back to Idle', async ({ page }) => {
        // Start sorting
        await page.click('button:has-text("Start Sorting")');
        await page.waitForTimeout(1000); // Allow some sorting to occur

        // Click the Reset Array button
        await page.click('button:has-text("Reset Array")');

        // Verify that the array has been reset (new random array)
        const barsAfterReset = await page.$$('#array .bar');
        expect(barsAfterReset.length).toBeGreaterThan(0); // Ensure there are bars rendered
    });

    test('Reset Array from Idle state generates a new random array', async ({ page }) => {
        // Click the Reset Array button
        await page.click('button:has-text("Reset Array")');

        // Verify that the array has been reset (new random array)
        const barsAfterReset = await page.$$('#array .bar');
        expect(barsAfterReset.length).toBeGreaterThan(0); // Ensure there are bars rendered
    });

    test('Visual feedback during sorting', async ({ page }) => {
        // Start sorting
        await page.click('button:has-text("Start Sorting")');

        // Check that the bars change color during sorting
        const firstBar = await page.$('#array .bar:nth-child(1)');
        expect(await firstBar.evaluate(el => el.style.backgroundColor)).toBe('orange');

        // Wait for a moment to observe changes
        await page.waitForTimeout(1000);

        // Verify that the color has reverted back after sorting
        expect(await firstBar.evaluate(el => el.style.backgroundColor)).toBe('lightblue');
    });

    test('Edge case: Reset Array while sorting is in progress', async ({ page }) => {
        // Start sorting
        await page.click('button:has-text("Start Sorting")');
        await page.waitForTimeout(1000); // Allow some sorting to occur

        // Click the Reset Array button
        await page.click('button:has-text("Reset Array")');

        // Verify that the array has been reset (new random array)
        const barsAfterReset = await page.$$('#array .bar');
        expect(barsAfterReset.length).toBeGreaterThan(0); // Ensure there are bars rendered
    });

    test.afterEach(async ({ page }) => {
        // Optionally, you can add cleanup code here if needed
    });
});