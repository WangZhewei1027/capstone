import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/10-28-0004/html/0672ec80-b400-11f0-867a-d33b47976456.html';

test.describe('Interactive Bubble Sort Application', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should start in idle state and generate a random array', async ({ page }) => {
        // Verify initial state by checking if the array container is empty
        const arrayContainer = await page.locator('#array-container');
        await expect(arrayContainer).toHaveCount(0);

        // Click the Generate Random Array button
        await page.click('#generateArray');

        // Verify that an array is generated and rendered
        await expect(arrayContainer).toHaveCount(10); // Assuming default size is 10
    });

    test('should transition to array_generated state and render array', async ({ page }) => {
        // Generate a random array
        await page.click('#generateArray');

        // Verify that the array is rendered
        const bars = await page.locator('.bar');
        await expect(bars).toHaveCount(10); // Check if 10 bars are rendered
        await expect(bars.first()).toHaveCSS('background-color', 'rgb(0, 128, 128)'); // Check initial color
    });

    test('should transition to sorting state when Start Sorting is clicked', async ({ page }) => {
        // Generate a random array
        await page.click('#generateArray');

        // Click the Start Sorting button
        await page.click('#startSort');

        // Verify that sorting has started by checking the color change of the bars
        const firstBar = page.locator('.bar').nth(0);
        await expect(firstBar).toHaveCSS('background-color', 'rgb(255, 165, 0)'); // Check if color changes to orange
    });

    test('should complete sorting and transition to done state', async ({ page }) => {
        // Generate a random array and start sorting
        await page.click('#generateArray');
        await page.click('#startSort');

        // Wait for sorting to complete (assuming a timeout based on sorting logic)
        await new Promise(resolve => setTimeout(resolve, 6000)); // Adjust based on expected sort duration

        // Verify that sorting is complete by checking the final state of the bars
        const bars = await page.locator('.bar');
        await expect(bars).toHaveCount(10); // Ensure bars are still present
        await expect(bars).toHaveCSS('background-color', 'rgb(0, 128, 128)'); // Check if bars are back to original color
    });

    test('should allow generating a new array after sorting is done', async ({ page }) => {
        // Generate a random array and start sorting
        await page.click('#generateArray');
        await page.click('#startSort');

        // Wait for sorting to complete
        await new Promise(resolve => setTimeout(resolve, 6000)); // Adjust based on expected sort duration

        // Click the Generate Random Array button again
        await page.click('#generateArray');

        // Verify that a new array is generated
        const bars = await page.locator('.bar');
        await expect(bars).toHaveCount(10); // Ensure new bars are rendered
    });

    test('should handle edge cases gracefully', async ({ page }) => {
        // Test generating an array with size 0
        await page.evaluate(() => {
            window.generateRandomArray(0);
        });

        const arrayContainer = await page.locator('#array-container');
        await expect(arrayContainer).toHaveCount(0); // Ensure no bars are rendered

        // Test starting sort with an empty array
        await page.click('#startSort');
        const bars = await page.locator('.bar');
        await expect(bars).toHaveCount(0); // Ensure no sorting occurs
    });
});