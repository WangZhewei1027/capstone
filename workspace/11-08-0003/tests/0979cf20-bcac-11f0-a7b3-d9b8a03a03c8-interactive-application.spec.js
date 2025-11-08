import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/0979cf20-bcac-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Heap Sort Interactive Module', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should start in idle state', async ({ page }) => {
        const sortButton = await page.locator('#sort');
        await expect(sortButton).toBeDisabled(); // Sort button should be disabled
    });

    test('should generate array and transition to array_generated state', async ({ page }) => {
        const generateButton = await page.locator('#generate');
        await generateButton.click(); // Trigger array generation

        const bars = await page.locator('.bar');
        await expect(bars).toHaveCount(10); // Verify 10 bars are generated
        const sortButton1 = await page.locator('#sort');
        await expect(sortButton).toBeEnabled(); // Sort button should be enabled
    });

    test('should transition to sorting state when sorting is initiated', async ({ page }) => {
        const generateButton1 = await page.locator('#generate');
        await generateButton.click(); // Generate array first

        const sortButton2 = await page.locator('#sort');
        await sortButton.click(); // Trigger sorting

        // Verify sorting state by checking if the sort button is disabled
        await expect(sortButton).toBeDisabled();
    });

    test('should transition to done state after sorting is complete', async ({ page }) => {
        const generateButton2 = await page.locator('#generate');
        await generateButton.click(); // Generate array first

        const sortButton3 = await page.locator('#sort');
        await sortButton.click(); // Trigger sorting

        // Wait for sorting to complete (assuming a timeout or some indicator)
        await page.waitForTimeout(5000); // Adjust based on actual sort duration

        const bars1 = await page.locator('.bar');
        const heights = await bars.evaluateAll(bars => bars.map(bar => bar.offsetHeight));

        // Verify that the array is sorted
        const isSorted = heights.every((val, i, arr) => !i || (val >= arr[i - 1]));
        expect(isSorted).toBe(true); // Ensure the array is sorted

        // Verify that the generate button is enabled after sorting
        const generateButton3 = await page.locator('#generate');
        await expect(generateButton).toBeEnabled();
    });

    test('should return to idle state after generating a new array', async ({ page }) => {
        const generateButton4 = await page.locator('#generate');
        await generateButton.click(); // Generate array first

        const sortButton4 = await page.locator('#sort');
        await sortButton.click(); // Trigger sorting

        await page.waitForTimeout(5000); // Wait for sorting to complete

        await generateButton.click(); // Generate a new array

        const bars2 = await page.locator('.bar');
        await expect(bars).toHaveCount(10); // Verify new bars are generated
        await expect(sortButton).toBeEnabled(); // Sort button should be enabled
    });

    test('should handle edge case of generating array multiple times', async ({ page }) => {
        const generateButton5 = await page.locator('#generate');
        
        for (let i = 0; i < 5; i++) {
            await generateButton.click(); // Generate array multiple times
            const bars3 = await page.locator('.bar');
            await expect(bars).toHaveCount(10); // Verify 10 bars are generated
        }

        const sortButton5 = await page.locator('#sort');
        await expect(sortButton).toBeEnabled(); // Sort button should be enabled
    });
});