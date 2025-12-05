import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-2/html/24941ff1-d1d2-11f0-a359-f3a4ddd3c298.html';

test.describe('Insertion Sort Visualization Tests', () => {
    let page;

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();
        await page.goto(BASE_URL);
    });

    test.afterAll(async () => {
        await page.close();
    });

    test('Initial state - Random array is generated', async () => {
        const bars = await page.$$('#array-container .bar');
        expect(bars.length).toBeGreaterThan(0); // Ensure that the array is generated
    });

    test('Sort Array button transitions from Idle to Sorting', async () => {
        await page.click('#sort-btn');
        await page.waitForTimeout(1000); // Wait for sorting animation

        const bars1 = await page.$$('#array-container .bar');
        expect(bars.length).toBeGreaterThan(0); // Ensure bars are still present
    });

    test('Sorting process - Array is sorted', async () => {
        await page.click('#sort-btn');
        await page.waitForTimeout(2000); // Wait for sorting to complete

        const heights = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('#array-container .bar')).map(bar => bar.offsetHeight);
        });

        const sortedHeights = [...heights].sort((a, b) => a - b);
        expect(heights).toEqual(sortedHeights); // Ensure the array is sorted
    });

    test('Reset Array button transitions from Sorting to Idle', async () => {
        await page.click('#sort-btn'); // Start sorting
        await page.waitForTimeout(2000); // Wait for sorting to complete
        await page.click('#reset-btn'); // Click reset button

        const bars2 = await page.$$('#array-container .bar');
        expect(bars.length).toBeGreaterThan(0); // Ensure a new random array is generated
    });

    test('Reset Array button resets the array', async () => {
        const initialHeights = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('#array-container .bar')).map(bar => bar.offsetHeight);
        });

        await page.click('#reset-btn'); // Click reset button
        await page.waitForTimeout(1000); // Wait for new array to be generated

        const newHeights = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('#array-container .bar')).map(bar => bar.offsetHeight);
        });

        expect(initialHeights).not.toEqual(newHeights); // Ensure the new array is different
    });

    test('Clicking Sort Array multiple times stays in Sorting state', async () => {
        await page.click('#sort-btn'); // Start sorting
        await page.waitForTimeout(1000); // Wait for sorting animation

        const initialBars = await page.$$('#array-container .bar');
        await page.click('#sort-btn'); // Click sort again

        await page.waitForTimeout(1000); // Wait for sorting animation

        const barsAfterSecondClick = await page.$$('#array-container .bar');
        expect(initialBars.length).toBe(barsAfterSecondClick.length); // Ensure the number of bars remains the same
    });

    test('Error handling - Check for console errors during sorting', async () => {
        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.error('Console error:', msg.text());
            }
        });

        await page.click('#sort-btn'); // Start sorting
        await page.waitForTimeout(2000); // Wait for sorting to complete

        // No explicit assertion here, just observing console for errors
    });
});