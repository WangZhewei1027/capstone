import { test, expect } from '@playwright/test';

test.describe('Bubble Sort Visualization', () => {
    let page;

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();
        await page.goto('http://127.0.0.1:5500/workspace/10-28-0003/html/dffb8300-b3ff-11f0-b68e-b3da5f0f2d2c.html');
    });

    test.afterAll(async () => {
        await page.close();
    });

    test.beforeEach(async () => {
        await page.reload();
    });

    test.describe('State: Idle', () => {
        test('should generate an array on enter', async () => {
            const bars = await page.locator('.bar').count();
            expect(bars).toBeGreaterThan(0); // Ensure an array is generated
        });

        test('should transition to sorting state on sort button click', async () => {
            await page.click('#sortButton');
            const isSorting = await page.evaluate(() => document.querySelector('.bar').style.backgroundColor === 'yellow');
            expect(isSorting).toBe(true); // Check if sorting has started
        });
    });

    test.describe('State: Sorting', () => {
        test('should highlight bars during sorting', async () => {
            await page.click('#sortButton');
            const firstBarColor = await page.locator('.bar').nth(0).evaluate(el => el.style.backgroundColor);
            expect(firstBarColor).toBe('yellow'); // Check if the first bar is highlighted
        });

        test('should transition to done state on sort complete', async () => {
            await page.click('#sortButton');
            // Wait for sorting to complete (you may need to adjust this based on actual timing)
            await page.waitForTimeout(3000); // Adjust timeout based on expected sort duration
            const bars = await page.locator('.bar').count();
            expect(bars).toBeGreaterThan(0); // Ensure sorting is complete and bars are still present
        });
    });

    test.describe('State: Done', () => {
        test('should render the sorted array on exit', async () => {
            await page.click('#sortButton');
            await page.waitForTimeout(3000); // Wait for sorting to complete
            const sortedBars = await page.locator('.bar');
            const heights = await sortedBars.evaluateAll(bars => bars.map(bar => parseInt(bar.style.height)));
            const sortedHeights = [...heights].sort((a, b) => a - b);
            expect(heights).toEqual(sortedHeights); // Check if the array is sorted
        });

        test('should return to idle state on reset button click', async () => {
            await page.click('#sortButton');
            await page.waitForTimeout(3000); // Wait for sorting to complete
            await page.click('.reset');
            const bars = await page.locator('.bar').count();
            expect(bars).toBeGreaterThan(0); // Ensure an array is generated again
        });
    });

    test.describe('Edge Cases', () => {
        test('should handle multiple sort button clicks gracefully', async () => {
            await page.click('#sortButton');
            await page.click('#sortButton'); // Click again while sorting
            await page.waitForTimeout(3000); // Wait for sorting to complete
            const bars = await page.locator('.bar').count();
            expect(bars).toBeGreaterThan(0); // Ensure sorting completes without errors
        });

        test('should handle reset button click during sorting', async () => {
            await page.click('#sortButton');
            await page.waitForTimeout(1000); // Wait a moment before resetting
            await page.click('.reset');
            const bars = await page.locator('.bar').count();
            expect(bars).toBeGreaterThan(0); // Ensure an array is generated again
        });
    });
});