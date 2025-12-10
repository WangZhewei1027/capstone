import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-2/html/2493f8e2-d1d2-11f0-a359-f3a4ddd3c298.html';

test.describe('Bubble Sort Visualization', () => {
    let page;

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();
        await page.goto(BASE_URL);
    });

    test.afterAll(async () => {
        await page.close();
    });

    test('Initial state: Random array should be generated on load', async () => {
        const bars = await page.$$('#array-container .bar');
        expect(bars.length).toBeGreaterThan(0); // Ensure that bars are rendered
    });

    test('Clicking "Generate Random Array" should generate a new array', async () => {
        const initialBars = await page.$$('#array-container .bar');
        await page.click('button[onclick="generateRandomArray()"]');
        const newBars = await page.$$('#array-container .bar');
        expect(newBars.length).toBeGreaterThan(0); // Ensure that new bars are rendered
        expect(newBars.length).not.toEqual(initialBars.length); // Ensure that the array size has changed
    });

    test('Clicking "Start Bubble Sort" should start the sorting process', async () => {
        await page.click('button[onclick="startBubbleSort()"]');
        // Wait for a short duration to allow sorting to start
        await page.waitForTimeout(500);
        const bars1 = await page.$$('#array-container .bar');
        expect(bars.length).toBeGreaterThan(0); // Ensure that bars are still rendered
        // Check if the sorting visualization has started (by checking color changes)
        const firstBarColor = await bars[0].evaluate(bar => bar.style.backgroundColor);
        expect(firstBarColor).toBe('red'); // Expect at least one bar to be marked red
    });

    test('Sorting should complete and render the final sorted array', async () => {
        await page.click('button[onclick="startBubbleSort()"]');
        // Wait for the sorting to complete
        await page.waitForTimeout(3000); // Adjust timeout as necessary for sorting to complete
        const bars2 = await page.$$('#array-container .bar');
        const heights = await Promise.all(bars.map(bar => bar.evaluate(b => b.style.height)));
        const values = heights.map(height => parseInt(height) / 2); // Convert height back to value
        const sortedValues = [...values].sort((a, b) => a - b);
        expect(values).toEqual(sortedValues); // Ensure the array is sorted
    });

    test('Clicking "Start Bubble Sort" multiple times should not break the application', async () => {
        await page.click('button[onclick="startBubbleSort()"]');
        await page.waitForTimeout(500);
        await page.click('button[onclick="startBubbleSort()"]'); // Click again while sorting
        await page.waitForTimeout(500);
        const bars3 = await page.$$('#array-container .bar');
        expect(bars.length).toBeGreaterThan(0); // Ensure that bars are still rendered
    });

    test('Error handling: Check for console errors during sorting', async () => {
        const consoleErrors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });

        await page.click('button[onclick="startBubbleSort()"]');
        await page.waitForTimeout(3000); // Allow time for sorting to potentially produce errors
        expect(consoleErrors.length).toBe(0); // Ensure no console errors occurred
    });
});