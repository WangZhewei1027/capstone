import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/10-28-0004/html/2d65eea0-b400-11f0-867a-d33b47976456.html';

test.describe('Interactive Bubble Sort Visualization', () => {
    let page;

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();
        await page.goto(BASE_URL);
    });

    test.afterAll(async () => {
        await page.close();
    });

    test('should start in the idle state and generate an array', async () => {
        // Verify the initial state is idle
        const sortButtonDisabled = await page.isDisabled('#sort');
        expect(sortButtonDisabled).toBe(true);

        // Click on the generate button
        await page.click('#generate');

        // Verify that the array has been generated
        const bars = await page.$$('.bar');
        expect(bars.length).toBeGreaterThan(0);
        
        // Verify that the sort button is enabled
        const sortButtonEnabled = await page.isEnabled('#sort');
        expect(sortButtonEnabled).toBe(true);
    });

    test('should transition to sorting state on start bubble sort', async () => {
        // Click on the sort button
        await page.click('#sort');

        // Verify that sorting is in progress
        const bars = await page.$$('.bar');
        for (let i = 0; i < bars.length; i++) {
            const barHeight = await bars[i].evaluate(bar => bar.style.height);
            expect(barHeight).toBeTruthy(); // Ensure bars are rendered
        }

        // Wait for sorting to complete
        await page.waitForTimeout(5000); // Adjust based on sorting duration

        // Verify that the sort button is disabled after sorting
        const sortButtonDisabled = await page.isDisabled('#sort');
        expect(sortButtonDisabled).toBe(true);
    });

    test('should transition to done state after sorting is complete', async () => {
        // Click on the generate button to reset
        await page.click('#generate');

        // Verify that a new array is generated
        const barsAfterRegenerate = await page.$$('.bar');
        expect(barsAfterRegenerate.length).toBeGreaterThan(0);

        // Click on the sort button again
        await page.click('#sort');

        // Wait for sorting to complete
        await page.waitForTimeout(5000); // Adjust based on sorting duration

        // Verify the sorting is complete
        const sortedBars = await page.$$('.bar');
        const heights = await Promise.all(sortedBars.map(bar => bar.evaluate(b => b.style.height)));
        const values = heights.map(height => parseInt(height) / 3); // Convert height back to value

        // Check if the values are sorted
        const isSorted = values.every((val, index, arr) => index === 0 || val >= arr[index - 1]);
        expect(isSorted).toBe(true);
    });

    test('should allow re-generating the array after sorting is done', async () => {
        // Click on the generate button
        await page.click('#generate');

        // Verify that a new array is generated
        const barsAfterRegenerate = await page.$$('.bar');
        expect(barsAfterRegenerate.length).toBeGreaterThan(0);

        // Verify that the sort button is enabled again
        const sortButtonEnabled = await page.isEnabled('#sort');
        expect(sortButtonEnabled).toBe(true);
    });

    test('should handle edge case of generating an empty array', async () => {
        // Simulate generating an empty array (if applicable)
        await page.evaluate(() => {
            const generateArray = (size = 0) => {
                // Override the original function to generate an empty array
                array = [];
                renderArray();
            };
            generateArray(0);
        });

        // Verify that no bars are rendered
        const bars = await page.$$('.bar');
        expect(bars.length).toBe(0);
    });
});