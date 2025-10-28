import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/10-28-0004/html/2036d730-b400-11f0-867a-d33b47976456.html';

test.describe('Bubble Sort Visualizer', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should initialize to idle state and create bars', async ({ page }) => {
        // Verify that the initial state is idle by checking if bars are created
        const bars = await page.locator('.bar');
        expect(await bars.count()).toBeGreaterThan(0); // Ensure bars are created
    });

    test('should transition to sorting state on sort button click', async ({ page }) => {
        // Click the sort button and check for sorting state
        await page.click('#sortButton');
        const bars = await page.locator('.bar');
        expect(await bars.evaluateAll(bars => bars.map(bar => bar.style.backgroundColor))).toContain('#e74c3c'); // Check if any bars are highlighted
    });

    test('should complete sorting and transition to done state', async ({ page }) => {
        // Click the sort button and wait for sorting to complete
        await page.click('#sortButton');
        await page.waitForTimeout(5000); // Wait for sorting to complete (adjust based on animation duration)
        
        const bars = await page.locator('.bar');
        const sortedColors = await bars.evaluateAll(bars => bars.map(bar => bar.className));
        expect(sortedColors).toContain('sorted'); // Check if bars have the sorted class
    });

    test('should return to idle state on sort button click after sorting', async ({ page }) => {
        // Click the sort button to sort and then click again to return to idle
        await page.click('#sortButton');
        await page.waitForTimeout(5000); // Wait for sorting to complete
        await page.click('#sortButton'); // Click again to reset

        const bars = await page.locator('.bar');
        const sortedColors = await bars.evaluateAll(bars => bars.map(bar => bar.className));
        expect(sortedColors).not.toContain('sorted'); // Ensure bars are not sorted after reset
    });

    test('should handle edge case with an empty array', async ({ page }) => {
        // Simulate an empty array scenario
        await page.evaluate(() => {
            const arrayContainer = document.getElementById('arrayContainer');
            arrayContainer.innerHTML = ''; // Clear the bars
        });

        // Click the sort button and check that no bars are created
        await page.click('#sortButton');
        const bars = await page.locator('.bar');
        expect(await bars.count()).toBe(0); // Ensure no bars are present
    });

    test('should handle edge case with a single element', async ({ page }) => {
        // Simulate a single element scenario
        await page.evaluate(() => {
            const arrayContainer = document.getElementById('arrayContainer');
            arrayContainer.innerHTML = ''; // Clear the bars
            const bar = document.createElement('div');
            bar.className = 'bar';
            bar.style.height = '50px'; // Single bar height
            arrayContainer.appendChild(bar);
        });

        // Click the sort button and check that the single bar remains unchanged
        await page.click('#sortButton');
        const bars = await page.locator('.bar');
        expect(await bars.count()).toBe(1); // Ensure one bar is present
        expect(await bars.evaluate(bar => bar.style.backgroundColor)).toBe('rgb(52, 152, 219)'); // Ensure color remains unchanged
    });
});