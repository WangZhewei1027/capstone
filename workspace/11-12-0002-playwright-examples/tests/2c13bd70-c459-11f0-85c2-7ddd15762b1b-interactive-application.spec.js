import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-12-0002-playwright-examples/html/2c13bd70-c459-11f0-85c2-7ddd15762b1b.html';

test.describe('Bubble Sort Visualization Application', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application before each test
        await page.goto(BASE_URL);
    });

    test('Initial state is idle with an array generated', async ({ page }) => {
        // Verify that the initial array is generated and rendered
        const bars = await page.locator('#array-container .bar');
        expect(await bars.count()).toBeGreaterThan(0);
    });

    test('Generate New Array button generates a new array', async ({ page }) => {
        // Click the generate button and check if a new array is rendered
        const initialBars = await page.locator('#array-container .bar');
        const initialCount = await initialBars.count();

        await page.click('#generate');

        const newBars = await page.locator('#array-container .bar');
        const newCount = await newBars.count();

        expect(newCount).toBeGreaterThan(initialCount);
    });

    test('Start Sorting transitions to sorting state', async ({ page }) => {
        // Start sorting and verify that the sorting process begins
        await page.click('#start');

        // Wait for the sorting to complete
        await page.waitForTimeout(3000); // Adjust timeout based on sorting duration

        const bars = await page.locator('#array-container .bar');
        const sortedArray = await bars.evaluateAll(bars => bars.map(bar => parseInt(bar.style.height) / 2));
        const isSorted = sortedArray.every((val, i, arr) => !i || (val >= arr[i - 1]));

        expect(isSorted).toBe(true);
    });

    test('Sorting can be restarted after completion', async ({ page }) => {
        // Start sorting, wait for it to complete, and then generate a new array
        await page.click('#start');
        await page.waitForTimeout(3000); // Wait for sorting to complete

        await page.click('#generate');
        const barsAfterGenerate = await page.locator('#array-container .bar');
        expect(await barsAfterGenerate.count()).toBeGreaterThan(0);

        // Start sorting again
        await page.click('#start');
        await page.waitForTimeout(3000); // Wait for sorting to complete

        const sortedArray = await barsAfterGenerate.evaluateAll(bars => bars.map(bar => parseInt(bar.style.height) / 2));
        const isSorted = sortedArray.every((val, i, arr) => !i || (val >= arr[i - 1]));

        expect(isSorted).toBe(true);
    });

    test('Inputting custom numbers generates the correct array', async ({ page }) => {
        // Input a custom array and generate it
        await page.fill('#array-input', '5,3,8,6,2');
        await page.click('#generate');

        const bars = await page.locator('#array-container .bar');
        const heights = await bars.evaluateAll(bars => bars.map(bar => parseInt(bar.style.height) / 2));

        expect(heights).toEqual([5, 3, 8, 6, 2]);
    });

    test('Sorting with custom input sorts correctly', async ({ page }) => {
        // Input a custom array, generate it, and start sorting
        await page.fill('#array-input', '5,3,8,6,2');
        await page.click('#generate');
        await page.click('#start');

        await page.waitForTimeout(3000); // Wait for sorting to complete

        const bars = await page.locator('#array-container .bar');
        const sortedArray = await bars.evaluateAll(bars => bars.map(bar => parseInt(bar.style.height) / 2));
        const isSorted = sortedArray.every((val, i, arr) => !i || (val >= arr[i - 1]));

        expect(isSorted).toBe(true);
    });

    test('Edge case: empty input generates a default array', async ({ page }) => {
        // Clear input and generate a new array
        await page.fill('#array-input', '');
        await page.click('#generate');

        const bars = await page.locator('#array-container .bar');
        expect(await bars.count()).toBe(10); // Default array should have 10 elements
    });
});