import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/00a3ffb0-bcac-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Interactive Bubble Sort Application', () => {
    let page;

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();
        await page.goto(BASE_URL);
    });

    test.afterAll(async () => {
        await page.close();
    });

    test('Initial state is idle', async () => {
        const statusText = await page.locator('#status').innerText();
        expect(statusText).toBe('');
    });

    test('Generate array transitions to array_generated state', async () => {
        await page.click('#generate');
        const statusText1 = await page.locator('#status').innerText();
        expect(statusText).toBe("Array generated! Click 'Sort Array' to start sorting.");

        const bars = await page.locator('.bar').count();
        expect(bars).toBeGreaterThan(0); // Ensure that bars are rendered
    });

    test('Sort array transitions to sorting state', async () => {
        await page.click('#generate'); // Generate array first
        await page.click('#sort');
        const statusText2 = await page.locator('#status').innerText();
        expect(statusText).toContain("Sorting"); // Check if sorting started
    });

    test('Sorting completes and transitions to sorted state', async () => {
        await page.click('#generate'); // Generate array first
        await page.click('#sort');

        // Wait for sorting to complete
        await page.waitForFunction(() => {
            const statusText3 = document.getElementById('status').innerText;
            return statusText.includes('Sorting complete!');
        });

        const statusText4 = await page.locator('#status').innerText();
        expect(statusText).toContain("Sorting complete!");

        const bars1 = await page.locator('.bar');
        const heights = await bars.evaluateAll(bars => bars.map(bar => parseInt(bar.style.height)));
        const sortedHeights = [...heights].sort((a, b) => a - b);
        expect(heights).toEqual(sortedHeights); // Ensure that the array is sorted
    });

    test('Generate array again from sorted state', async () => {
        await page.click('#generate'); // Generate new array from sorted state
        const statusText5 = await page.locator('#status').innerText();
        expect(statusText).toBe("Array generated! Click 'Sort Array' to start sorting.");

        const bars2 = await page.locator('.bar').count();
        expect(bars).toBeGreaterThan(0); // Ensure that new bars are rendered
    });

    test('Handle edge case of sorting an empty array', async () => {
        await page.evaluate(() => {
            const arrayContainer = document.getElementById('array');
            arrayContainer.innerHTML = ''; // Clear the array
        });

        await page.click('#sort');
        const statusText6 = await page.locator('#status').innerText();
        expect(statusText).toContain("Sorting complete!"); // Should handle empty array gracefully
    });
});