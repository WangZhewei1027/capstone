import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-4/html/47b65911-d1d4-11f0-959c-5fbc7dc7191d.html';

test.describe('Quick Sort Visualization Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should load the page and display initial array', async ({ page }) => {
        // Verify the title of the page
        const title = await page.title();
        expect(title).toBe('Quick Sort Visualization');

        // Check if the array container is present
        const arrayContainer = await page.locator('#array-container');
        await expect(arrayContainer).toBeVisible();

        // Check if the initial array is generated
        const bars = await arrayContainer.locator('.array-bar');
        expect(await bars.count()).toBeGreaterThan(0);
    });

    test('should generate a new random array when the button is clicked', async ({ page }) => {
        const arrayContainer = await page.locator('#array-container');
        const initialBarsCount = await arrayContainer.locator('.array-bar').count();

        // Click the "Generate New Array" button
        await page.click('button:has-text("Generate New Array")');

        // Wait for a new array to be drawn
        await page.waitForTimeout(500); // Allow some time for the array to be generated

        const newBarsCount = await arrayContainer.locator('.array-bar').count();
        expect(newBarsCount).toBeGreaterThan(0);
        expect(newBarsCount).not.toBe(initialBarsCount); // Ensure the array has changed
    });

    test('should sort the array when the Sort button is clicked', async ({ page }) => {
        // Click the "Sort Array" button
        await page.click('button:has-text("Sort Array")');

        // Wait for the sorting to complete
        await page.waitForTimeout(2000); // Allow time for sorting to visualize

        // Check if the array is sorted
        const arrayContainer = await page.locator('#array-container');
        const bars = await arrayContainer.locator('.array-bar');

        const heights = [];
        for (let i = 0; i < await bars.count(); i++) {
            heights.push(await bars.nth(i).evaluate(bar => parseInt(bar.style.height)));
        }

        const sortedHeights = [...heights].sort((a, b) => a - b);
        expect(heights).toEqual(sortedHeights); // Check if the array is sorted
    });

    test('should visually update the array during sorting', async ({ page }) => {
        // Click the "Sort Array" button
        await page.click('button:has-text("Sort Array")');

        // Wait for a short duration to observe visual updates
        await page.waitForTimeout(500);

        const arrayContainer = await page.locator('#array-container');
        const bars = await arrayContainer.locator('.array-bar');

        // Check if the bars are being updated (at least one bar should change)
        const initialHeights = [];
        for (let i = 0; i < await bars.count(); i++) {
            initialHeights.push(await bars.nth(i).evaluate(bar => parseInt(bar.style.height)));
        }

        await page.waitForTimeout(1500); // Allow more time for sorting to visualize

        const updatedHeights = [];
        for (let i = 0; i < await bars.count(); i++) {
            updatedHeights.push(await bars.nth(i).evaluate(bar => parseInt(bar.style.height)));
        }

        expect(initialHeights).not.toEqual(updatedHeights); // Ensure the heights have changed
    });

    test('should handle edge cases gracefully', async ({ page }) => {
        // Test with an empty array
        await page.evaluate(() => {
            window.array = [];
            window.drawArray();
        });

        // Click the "Sort Array" button
        await page.click('button:has-text("Sort Array")');

        // Check that no bars are displayed
        const arrayContainer = await page.locator('#array-container');
        const bars = await arrayContainer.locator('.array-bar');
        expect(await bars.count()).toBe(0);
    });
});