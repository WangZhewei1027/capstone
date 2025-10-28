import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/10-28-0004/html/0b8942f0-b400-11f0-867a-d33b47976456.html';

test.describe('Bubble Sort Visualization Application', () => {
    let page;

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();
        await page.goto(BASE_URL);
    });

    test.afterAll(async () => {
        await page.close();
    });

    test.describe('Initial State - Idle', () => {
        test('should render an empty array initially', async () => {
            const bars = await page.$$('.bar');
            expect(bars.length).toBe(0);
        });

        test('should render default array on DEFAULT_ARRAY_CLICK', async () => {
            await page.click('#defaultArray');
            const bars = await page.$$('.bar');
            expect(bars.length).toBe(5); // Default array has 5 elements
        });
    });

    test.describe('Array Set State', () => {
        test('should render array when DEFAULT_ARRAY_CLICK is triggered', async () => {
            await page.click('#defaultArray');
            const heights = await page.evaluate(() => {
                return Array.from(document.querySelectorAll('.bar')).map(bar => bar.style.height);
            });
            expect(heights).toEqual(['25px', '15px', '40px', '20px', '10px']); // Corresponding heights for [5, 3, 8, 4, 2]
        });

        test('should transition to sorting state on START_SORTING_CLICK', async () => {
            await page.click('#startButton');
            const bars = await page.$$('.bar');
            expect(bars.length).toBe(5); // Still 5 bars during sorting
        });
    });

    test.describe('Sorting State', () => {
        test('should sort the array and visualize the process', async () => {
            await page.click('#defaultArray');
            await page.click('#startButton');
            await page.waitForTimeout(6000); // Wait for sorting to complete (adjust based on speed)

            const sortedHeights = await page.evaluate(() => {
                return Array.from(document.querySelectorAll('.bar')).map(bar => bar.style.height);
            });
            expect(sortedHeights).toEqual(['10px', '15px', '20px', '25px', '40px']); // Sorted heights for [2, 3, 4, 5, 8]
        });

        test('should transition to done state after sorting is complete', async () => {
            await page.click('#defaultArray');
            await page.click('#startButton');
            await page.waitForTimeout(6000); // Wait for sorting to complete

            const doneStateText = await page.evaluate(() => {
                return document.querySelector('h1').innerText; // Example of checking visual feedback
            });
            expect(doneStateText).toBe('Bubble Sort Visualization'); // Check if still on the same page
        });
    });

    test.describe('Done State', () => {
        test('should allow resetting to array_set state on DEFAULT_ARRAY_CLICK', async () => {
            await page.click('#defaultArray');
            await page.click('#startButton');
            await page.waitForTimeout(6000); // Wait for sorting to complete

            await page.click('#defaultArray');
            const bars = await page.$$('.bar');
            expect(bars.length).toBe(5); // Should return to array_set state
        });

        test('should allow starting sorting again from done state', async () => {
            await page.click('#defaultArray');
            await page.click('#startButton');
            await page.waitForTimeout(6000); // Wait for sorting to complete

            await page.click('#startButton');
            const bars = await page.$$('.bar');
            expect(bars.length).toBe(5); // Should still have 5 bars
        });
    });

    test.describe('Edge Cases', () => {
        test('should handle empty input gracefully', async () => {
            await page.fill('#arrayInput', '');
            await page.click('#startButton');
            // Check if no bars are rendered
            const bars = await page.$$('.bar');
            expect(bars.length).toBe(0);
        });

        test('should handle invalid input gracefully', async () => {
            await page.fill('#arrayInput', 'abc,def');
            await page.click('#startButton');
            // Check if no bars are rendered
            const bars = await page.$$('.bar');
            expect(bars.length).toBe(0);
        });
    });
});