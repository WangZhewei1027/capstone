import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/044a9980-bcac-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Counting Sort Interactive Module', () => {
    let page;

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();
        await page.goto(BASE_URL);
    });

    test.afterAll(async () => {
        await page.close();
    });

    test('should start in idle state and clear visualization', async () => {
        const visualization = await page.locator('#visualization');
        const bars = await visualization.locator('.bar').count();
        expect(bars).toBe(0); // Ensure no bars are present in idle state
    });

    test('should visualize input on START_SORTING event', async () => {
        await page.fill('#numbers', '3, 6, 4, 1, 2');
        await page.click('button:has-text("Sort")');

        const visualization1 = await page.locator('#visualization1');
        const bars1 = await visualization.locator('.bar').count();
        expect(bars).toBe(5); // Ensure 5 bars are created for the input
    });

    test('should transition to sorting state and perform counting sort', async () => {
        const heights = await page.locator('#visualization .bar').evaluateAll(bars => bars.map(bar => parseInt(bar.style.height)));
        const sortedHeights = heights.map(h => h / 10).sort((a, b) => a - b); // Convert height back to original numbers

        await page.waitForTimeout(2000); // Wait for sorting to complete

        const sortedBars = await page.locator('#visualization .bar').count();
        expect(sortedBars).toBe(5); // Ensure sorting is complete and bars are still present

        const finalHeights = await page.locator('#visualization .bar').evaluateAll(bars => bars.map(bar => parseInt(bar.style.height)));
        expect(finalHeights).toEqual(sortedHeights.map(num => num * 10)); // Check if heights match sorted values
    });

    test('should visualize output on SORTING_COMPLETE event', async () => {
        await page.waitForTimeout(2000); // Wait for output visualization

        const visualization2 = await page.locator('#visualization2');
        const bars2 = await visualization.locator('.bar').count();
        expect(bars).toBe(5); // Ensure bars are still present after sorting
    });

    test('should return to idle state on OUTPUT_VISUALIZED event', async () => {
        await page.click('button:has-text("Reset")');

        const visualization3 = await page.locator('#visualization3');
        const bars3 = await visualization.locator('.bar').count();
        expect(bars).toBe(0); // Ensure no bars are present after reset
    });

    test('should handle empty input gracefully', async () => {
        await page.fill('#numbers', '');
        await page.click('button:has-text("Sort")');

        const visualization4 = await page.locator('#visualization4');
        const bars4 = await visualization.locator('.bar').count();
        expect(bars).toBe(0); // Ensure no bars are created for empty input
    });

    test('should handle invalid input gracefully', async () => {
        await page.fill('#numbers', 'abc, 123');
        await page.click('button:has-text("Sort")');

        const visualization5 = await page.locator('#visualization5');
        const bars5 = await visualization.locator('.bar').count();
        expect(bars).toBe(0); // Ensure no bars are created for invalid input
    });
});