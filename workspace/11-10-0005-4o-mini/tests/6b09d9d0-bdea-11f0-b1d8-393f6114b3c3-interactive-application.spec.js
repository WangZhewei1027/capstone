import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-10-0005-4o-mini/html/6b09d9d0-bdea-11f0-b1d8-393f6114b3c3.html';

test.describe('Bubble Sort Visualization Application', () => {
    let page;

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();
        await page.goto(BASE_URL);
    });

    test.afterAll(async () => {
        await page.close();
    });

    test('should generate a new random array on button click', async () => {
        // Click the "New Array" button
        await page.click('#newArray');

        // Verify that the array is rendered
        const bars = await page.$$('.bar');
        expect(bars.length).toBeGreaterThan(0);
    });

    test('should transition from idle to array_generated state', async () => {
        // Click the "New Array" button
        await page.click('#newArray');

        // Verify that the array is rendered
        const bars = await page.$$('.bar');
        expect(bars.length).toBeGreaterThan(0);
    });

    test('should sort the array and transition to idle state', async () => {
        // Generate a new array
        await page.click('#newArray');

        // Click the "Sort" button
        await page.click('#sort');

        // Wait for sorting to complete
        const bars = await page.$$('.bar');
        await page.waitForTimeout(2000); // Wait for sorting animation to finish

        // Verify that the array is sorted
        const heights = await Promise.all(bars.map(bar => bar.evaluate(el => el.style.height)));
        const values = heights.map(height => parseInt(height) / 3);
        const sortedValues = [...values].sort((a, b) => a - b);
        expect(values).toEqual(sortedValues);
    });

    test('should handle sorting with different speeds', async () => {
        // Generate a new array
        await page.click('#newArray');

        // Set animation speed to minimum
        await page.fill('#speed', '50');

        // Click the "Sort" button
        await page.click('#sort');

        // Wait for sorting to complete
        await page.waitForTimeout(2000); // Wait for sorting animation to finish

        // Verify that the array is sorted
        const bars = await page.$$('.bar');
        const heights = await Promise.all(bars.map(bar => bar.evaluate(el => el.style.height)));
        const values = heights.map(height => parseInt(height) / 3);
        const sortedValues = [...values].sort((a, b) => a - b);
        expect(values).toEqual(sortedValues);
    });

    test('should not sort if no array is generated', async () => {
        // Click the "Sort" button without generating an array
        await page.click('#sort');

        // Verify that no bars are present
        const bars = await page.$$('.bar');
        expect(bars.length).toBe(0);
    });

    test('should handle multiple new arrays and sorts', async () => {
        // Generate a new array
        await page.click('#newArray');

        // Click the "Sort" button
        await page.click('#sort');
        await page.waitForTimeout(2000); // Wait for sorting animation to finish

        // Generate another new array
        await page.click('#newArray');

        // Click the "Sort" button again
        await page.click('#sort');
        await page.waitForTimeout(2000); // Wait for sorting animation to finish

        // Verify that the second array is sorted
        const bars = await page.$$('.bar');
        const heights = await Promise.all(bars.map(bar => bar.evaluate(el => el.style.height)));
        const values = heights.map(height => parseInt(height) / 3);
        const sortedValues = [...values].sort((a, b) => a - b);
        expect(values).toEqual(sortedValues);
    });
});