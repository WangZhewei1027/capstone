import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/10-28-0003/html/e27c1360-b3ff-11f0-b68e-b3da5f0f2d2c.html';

test.describe('Bubble Sort Visualizer FSM Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should render the initial state with an empty array', async ({ page }) => {
        const arrayContainer = await page.locator('#arrayContainer');
        await expect(arrayContainer).toHaveText('');
    });

    test('should generate an array when GENERATE_ARRAY is triggered', async ({ page }) => {
        await page.click('button:has-text("Generate Array")');
        const bars = await page.locator('.bar');
        await expect(bars).toHaveCount(20); // Check if 20 bars are generated
    });

    test('should transition to array_generated state after generating an array', async ({ page }) => {
        await page.click('button:has-text("Generate Array")');
        const bars = await page.locator('.bar');
        await expect(bars).toHaveCount(20);
    });

    test('should start sorting when START_SORT is triggered', async ({ page }) => {
        await page.click('button:has-text("Generate Array")');
        await page.click('button:has-text("Sort")');
        const isSorting = await page.evaluate(() => window.isSorting);
        await expect(isSorting).toBe(true); // Check if sorting is in progress
    });

    test('should transition to sorting state after starting sort', async ({ page }) => {
        await page.click('button:has-text("Generate Array")');
        await page.click('button:has-text("Sort")');
        const arrayContainer = await page.locator('#arrayContainer');
        await expect(arrayContainer).toHaveCount(20); // Ensure the array is still present
    });

    test('should step through the sort process when NEXT_STEP is triggered', async ({ page }) => {
        await page.click('button:has-text("Generate Array")');
        await page.click('button:has-text("Sort")');
        await page.click('button:has-text("Next Step")');
        const bars = await page.locator('.bar');
        await expect(bars).toHaveCount(20); // Check if bars are still present
    });

    test('should complete sorting and return to array_generated state', async ({ page }) => {
        await page.click('button:has-text("Generate Array")');
        await page.click('button:has-text("Sort")');
        await page.click('button:has-text("Next Step")');
        await page.click('button:has-text("Next Step")'); // Repeat to ensure sorting is complete
        await page.click('button:has-text("Next Step")');
        const isSorting = await page.evaluate(() => window.isSorting);
        await expect(isSorting).toBe(false); // Check if sorting is complete
    });

    test('should reset to idle state when RESET is triggered', async ({ page }) => {
        await page.click('button:has-text("Generate Array")');
        await page.click('button:has-text("Reset")');
        const arrayContainer = await page.locator('#arrayContainer');
        await expect(arrayContainer).toHaveText(''); // Ensure array is cleared
    });

    test('should handle edge case of sorting an already sorted array', async ({ page }) => {
        await page.evaluate(() => {
            window.array = [1, 2, 3, 4, 5]; // Set a sorted array
            window.renderArray(); // Render it
        });
        await page.click('button:has-text("Sort")');
        await page.click('button:has-text("Next Step")');
        const bars = await page.locator('.bar');
        await expect(bars).toHaveCount(5); // Ensure bars are still present
    });

    test('should handle case when no array is generated and user tries to sort', async ({ page }) => {
        await page.click('button:has-text("Sort")');
        const isSorting = await page.evaluate(() => window.isSorting);
        await expect(isSorting).toBe(false); // Ensure sorting does not start
    });
});