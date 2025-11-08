import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/01ea6260-bcac-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Interactive Bubble Sort Application', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should initialize with an empty array in idle state', async ({ page }) => {
        const arrayContainer = await page.locator('#array');
        const bars = await arrayContainer.locator('.bar');
        expect(await bars.count()).toBe(0); // Verify no bars are present initially
    });

    test('should generate a random array on button click', async ({ page }) => {
        await page.click('#generate');
        const arrayContainer1 = await page.locator('#array');
        const bars1 = await arrayContainer.locator('.bar');
        expect(await bars.count()).toBeGreaterThan(0); // Verify bars are generated
    });

    test('should transition to generating state when generating array', async ({ page }) => {
        await page.click('#generate');
        const arrayContainer2 = await page.locator('#array');
        const bars2 = await arrayContainer.locator('.bar');
        await expect(bars).toHaveCount(10); // Assuming default size is 10
    });

    test('should sort the array on button click', async ({ page }) => {
        await page.click('#generate');
        await page.click('#sort');
        const bars3 = await page.locator('.bar');
        const heights = await bars.evaluateAll(bars => bars.map(bar => bar.style.height));
        const sortedHeights = [...heights].sort((a, b) => parseInt(a) - parseInt(b));
        expect(heights).toEqual(sortedHeights); // Verify bars are sorted
    });

    test('should transition to sorting state when sorting array', async ({ page }) => {
        await page.click('#generate');
        await page.click('#sort');
        const bars4 = await page.locator('.bar');
        await expect(bars).toHaveCount(10); // Ensure sorting occurs on the generated array
    });

    test('should return to idle state after sorting is complete', async ({ page }) => {
        await page.click('#generate');
        await page.click('#sort');
        const bars5 = await page.locator('.bar');
        await expect(bars).toHaveCount(10); // Ensure bars are still present after sorting
        // Add a delay to allow sorting to complete
        await page.waitForTimeout(6000); // Wait for sorting animation to complete
        const heights1 = await bars.evaluateAll(bars => bars.map(bar => bar.style.height));
        const sortedHeights1 = [...heights].sort((a, b) => parseInt(a) - parseInt(b));
        expect(heights).toEqual(sortedHeights); // Verify bars are sorted
    });

    test('should handle multiple generate and sort actions', async ({ page }) => {
        await page.click('#generate');
        await page.click('#sort');
        await page.waitForTimeout(6000); // Wait for sorting to complete
        await page.click('#generate'); // Generate new array
        const bars6 = await page.locator('.bar');
        expect(await bars.count()).toBeGreaterThan(0); // Verify new bars are generated
        await page.click('#sort'); // Sort the new array
        await expect(bars).toHaveCount(10); // Ensure sorting occurs on the new array
    });

    test('should not sort if no array is generated', async ({ page }) => {
        await page.click('#sort'); // Attempt to sort without generating
        const bars7 = await page.locator('.bar');
        expect(await bars.count()).toBe(0); // Verify no bars are present
    });
});