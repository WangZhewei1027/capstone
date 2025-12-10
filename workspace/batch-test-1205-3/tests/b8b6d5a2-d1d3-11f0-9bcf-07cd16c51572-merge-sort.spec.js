import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-3/html/b8b6d5a2-d1d3-11f0-9bcf-07cd16c51572.html';

test.describe('Merge Sort Visualization Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the Merge Sort Visualization page before each test
        await page.goto(BASE_URL);
    });

    test('should load the page and display initial elements', async ({ page }) => {
        // Verify the page title
        await expect(page).toHaveTitle('Merge Sort Visualization');

        // Check if the array div is present
        const arrayDiv = await page.locator('#array');
        await expect(arrayDiv).toBeVisible();

        // Check if the start button is present and visible
        const startButton = await page.locator('button');
        await expect(startButton).toBeVisible();
        await expect(startButton).toHaveText('Start Merge Sort');

        // Verify that the initial array is generated and drawn
        const bars = await page.locator('.bar');
        await expect(bars).toHaveCount(20); // Default size is 20
    });

    test('should start merge sort and visualize sorting process', async ({ page }) => {
        // Click the start button to begin the merge sort
        const startButton = await page.locator('button');
        await startButton.click();

        // Wait for the sorting process to complete
        await page.waitForTimeout(5000); // Wait for a reasonable time to observe sorting

        // Verify that the array is sorted
        const bars = await page.locator('.bar');
        const heights = await bars.evaluateAll(bars => bars.map(bar => parseInt(bar.style.height)));
        const sortedHeights = [...heights].sort((a, b) => a - b);
        expect(heights).toEqual(sortedHeights);
    });

    test('should handle multiple clicks on the start button', async ({ page }) => {
        // Click the start button multiple times
        const startButton = await page.locator('button');
        await startButton.click();
        await page.waitForTimeout(2000); // Wait for a short time to observe some sorting
        await startButton.click(); // Click again

        // Wait for the sorting process to complete
        await page.waitForTimeout(5000); // Wait for a reasonable time to observe sorting

        // Verify that the array is sorted
        const bars = await page.locator('.bar');
        const heights = await bars.evaluateAll(bars => bars.map(bar => parseInt(bar.style.height)));
        const sortedHeights = [...heights].sort((a, b) => a - b);
        expect(heights).toEqual(sortedHeights);
    });

    test('should visualize the array correctly during sorting', async ({ page }) => {
        // Click the start button to begin the merge sort
        const startButton = await page.locator('button');
        await startButton.click();

        // Wait for a short time to allow some sorting to occur
        await page.waitForTimeout(2000);

        // Check if the bars are being updated (i.e., the height of at least one bar has changed)
        const initialBars = await page.locator('.bar');
        const initialHeights = await initialBars.evaluateAll(bars => bars.map(bar => parseInt(bar.style.height)));

        // Wait for more sorting to occur
        await page.waitForTimeout(2000);

        const updatedBars = await page.locator('.bar');
        const updatedHeights = await updatedBars.evaluateAll(bars => bars.map(bar => parseInt(bar.style.height)));

        // Ensure that the heights have changed
        expect(updatedHeights).not.toEqual(initialHeights);
    });

    test('should handle errors gracefully', async ({ page }) => {
        // Intentionally cause an error by modifying the array to an invalid state
        await page.evaluate(() => {
            window.array = null; // Set array to null to simulate an error
        });

        // Click the start button and expect an error to be thrown
        const startButton = await page.locator('button');
        await startButton.click();

        // Wait for a short time to allow the error to occur
        await page.waitForTimeout(1000);

        // Check the console for errors
        const consoleMessages = [];
        page.on('console', msg => consoleMessages.push(msg.text()));
        await page.waitForTimeout(2000); // Wait to capture console messages

        // Assert that a ReferenceError or TypeError occurred
        const errorOccurred = consoleMessages.some(msg => msg.includes('ReferenceError') || msg.includes('TypeError'));
        expect(errorOccurred).toBe(true);
    });
});