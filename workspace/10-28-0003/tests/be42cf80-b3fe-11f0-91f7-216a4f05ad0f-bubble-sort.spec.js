import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/default/html/be42cf80-b3fe-11f0-91f7-216a4f05ad0f.html';

test.describe('Bubble Sort Visualizer', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('Initial state is idle and bars are generated', async ({ page }) => {
        // Verify that the initial state is idle and bars are generated
        await page.waitForSelector('#bar-container');
        const bars = await page.$$('#bar-container .bar');
        expect(bars.length).toBeGreaterThan(0); // Bars should be generated on page load
    });

    test('Shuffle button click transitions to bars_generated state', async ({ page }) => {
        // Click the shuffle button and verify bars are generated
        await page.click('#shuffle-btn');
        const bars = await page.$$('#bar-container .bar');
        expect(bars.length).toBeGreaterThan(0); // Bars should be generated
    });

    test('Sort button click transitions to sorting state', async ({ page }) => {
        // Click the shuffle button first
        await page.click('#shuffle-btn');
        // Then click the sort button
        await page.click('#sort-btn');
        // Verify that sorting has started (we can check for class changes)
        const bars = await page.$$('#bar-container .bar');
        expect(await bars[0].evaluate(bar => bar.classList.contains('comparing'))).toBeTruthy();
    });

    test('Sorting completes and transitions to done state', async ({ page }) => {
        // Click the shuffle button and then sort
        await page.click('#shuffle-btn');
        await page.click('#sort-btn');
        // Wait for sorting to complete
        await page.waitForTimeout(5000); // Adjust based on sorting speed
        // Verify that the bars are sorted
        const bars = await page.$$('#bar-container .bar');
        const heights = await Promise.all(bars.map(bar => bar.evaluate(b => b.style.height)));
        const sortedHeights = [...heights].sort((a, b) => parseFloat(a) - parseFloat(b));
        expect(heights).toEqual(sortedHeights); // Check if the heights are sorted
    });

    test('Shuffle button click after sorting resets to bars_generated state', async ({ page }) => {
        // Shuffle and sort first
        await page.click('#shuffle-btn');
        await page.click('#sort-btn');
        await page.waitForTimeout(5000); // Wait for sorting to complete
        // Click shuffle again
        await page.click('#shuffle-btn');
        const bars = await page.$$('#bar-container .bar');
        expect(bars.length).toBeGreaterThan(0); // Bars should be generated again
    });

    test('Visual feedback during sorting', async ({ page }) => {
        // Click shuffle and then sort
        await page.click('#shuffle-btn');
        await page.click('#sort-btn');
        // Check that at least one bar is in 'comparing' state
        await page.waitForTimeout(1000); // Wait a bit for sorting to start
        const comparingBars = await page.$$('.bar.comparing');
        expect(comparingBars.length).toBeGreaterThan(0); // At least one bar should be comparing
    });

    test('Edge case: Sort with minimum number of bars', async ({ page }) => {
        // Modify the number of bars to 1 for edge case
        await page.evaluate(() => {
            const numBars = 1; // Set to 1 for edge case
            const generateBars = () => {
                const barContainer = document.getElementById('bar-container');
                barContainer.innerHTML = '';
                const value = Math.floor(Math.random() * 300) + 10;
                const bar = document.createElement('div');
                bar.className = 'bar';
                bar.style.height = `${value}px`;
                barContainer.appendChild(bar);
            };
            generateBars();
        });
        await page.click('#sort-btn');
        // Verify that sorting completes immediately
        await page.waitForTimeout(1000); // Wait a bit
        const bars = await page.$$('#bar-container .bar');
        expect(bars.length).toBe(1); // Only one bar should remain
    });
});