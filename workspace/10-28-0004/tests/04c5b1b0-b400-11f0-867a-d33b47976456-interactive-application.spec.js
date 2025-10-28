import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/10-28-0004/html/04c5b1b0-b400-11f0-867a-d33b47976456.html';

test.describe('Bubble Sort Interactive Module', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application before each test
        await page.goto(BASE_URL);
    });

    test('should render the initial array on idle state', async ({ page }) => {
        // Validate that the initial array is rendered
        const bars = await page.$$('.bar');
        expect(bars.length).toBe(10); // Check if 10 bars are rendered
    });

    test('should disable start button when sorting starts', async ({ page }) => {
        // Click the start button to begin sorting
        await page.click('#startButton');
        
        // Validate that the start button is disabled
        const isDisabled = await page.$eval('#startButton', button => button.disabled);
        expect(isDisabled).toBe(true);
    });

    test('should change colors of bars during sorting', async ({ page }) => {
        // Click the start button to begin sorting
        await page.click('#startButton');

        // Wait for a short duration to allow sorting to start
        await page.waitForTimeout(100); // Adjust timeout as necessary

        // Check if any bars are red during sorting
        const bars = await page.$$('.bar');
        const colors = await Promise.all(bars.map(bar => bar.evaluate(el => el.style.backgroundColor)));
        expect(colors).toContain('red'); // At least one bar should be red
    });

    test('should re-enable start button after sorting is complete', async ({ page }) => {
        // Click the start button to begin sorting
        await page.click('#startButton');

        // Wait for sorting to complete
        await page.waitForTimeout(2000); // Adjust timeout based on sorting duration

        // Validate that the start button is enabled again
        const isDisabled = await page.$eval('#startButton', button => button.disabled);
        expect(isDisabled).toBe(false);
    });

    test('should maintain visual representation of sorted array', async ({ page }) => {
        // Click the start button to begin sorting
        await page.click('#startButton');

        // Wait for sorting to complete
        await page.waitForTimeout(2000); // Adjust timeout based on sorting duration

        // Validate that the bars are in sorted order
        const bars = await page.$$('.bar');
        const heights = await Promise.all(bars.map(bar => bar.evaluate(el => parseInt(el.style.height))));
        const sortedHeights = [...heights].sort((a, b) => a - b);
        expect(heights).toEqual(sortedHeights); // Check if the heights are sorted
    });

    test('should handle edge cases with minimum array size', async ({ page }) => {
        // Modify the array directly for testing edge case (not part of original implementation)
        await page.evaluate(() => {
            const array = [5]; // Set a single element array
            const arrayContainer = document.getElementById('array');
            arrayContainer.innerHTML = '';
            array.forEach(value => {
                const bar = document.createElement('div');
                bar.className = 'bar';
                bar.style.height = `${value * 2}px`;
                arrayContainer.appendChild(bar);
            });
        });

        // Click the start button to begin sorting
        await page.click('#startButton');

        // Wait for sorting to complete
        await page.waitForTimeout(1000); // Adjust timeout based on sorting duration

        // Validate that the start button is enabled again
        const isDisabled = await page.$eval('#startButton', button => button.disabled);
        expect(isDisabled).toBe(false);
    });

    test('should handle error scenarios gracefully', async ({ page }) => {
        // Simulate an error scenario (e.g., empty array)
        await page.evaluate(() => {
            const array = []; // Set an empty array
            const arrayContainer = document.getElementById('array');
            arrayContainer.innerHTML = '';
            array.forEach(value => {
                const bar = document.createElement('div');
                bar.className = 'bar';
                bar.style.height = `${value * 2}px`;
                arrayContainer.appendChild(bar);
            });
        });

        // Click the start button to begin sorting
        await page.click('#startButton');

        // Wait for a short duration to allow any error handling
        await page.waitForTimeout(1000); // Adjust timeout as necessary

        // Validate that the start button is enabled again
        const isDisabled = await page.$eval('#startButton', button => button.disabled);
        expect(isDisabled).toBe(false);
    });
});