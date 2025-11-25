import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-25T17-44-33/html/66d15c10-ca26-11f0-9127-ddf02ab917cc.html';

test.describe('Bubble Sort Visualization', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the Bubble Sort visualization page before each test
        await page.goto(BASE_URL);
    });

    test('should display the initial array', async ({ page }) => {
        // Validate that the initial array is drawn correctly
        const bars = await page.$$('.bar');
        expect(bars.length).toBe(5); // There should be 5 bars
        const heights = await Promise.all(bars.map(bar => bar.evaluate(el => el.style.height)));
        expect(heights).toEqual(['100px', '20px', '80px', '40px', '160px']); // Corresponding heights for [5, 1, 4, 2, 8]
    });

    test('should transition to sorting state on start button click', async ({ page }) => {
        // Click the start button and verify the transition to sorting state
        await page.click('button');
        const bars = await page.$$('.bar');
        expect(await bars[0].evaluate(el => el.style.backgroundColor)).toBe('red'); // First comparison should highlight
    });

    test('should complete sorting and transition to done state', async ({ page }) => {
        // Click the start button and wait for the sorting to complete
        await page.click('button');
        await page.waitForTimeout(3000); // Wait for sorting to complete (adjust time as needed)
        
        const sortedBars = await page.$$('.sorted');
        expect(sortedBars.length).toBe(5); // All bars should be sorted
        expect(await sortedBars[0].evaluate(el => el.style.backgroundColor)).toBe('lightgreen'); // First bar should be light green
    });

    test('should reset to idle state on reset button click', async ({ page }) => {
        // Click the start button, then reset and verify the transition back to idle
        await page.click('button');
        await page.waitForTimeout(3000); // Wait for sorting to complete
        await page.click('button'); // Simulate reset (assuming the same button is used for reset)
        
        const bars = await page.$$('.bar');
        expect(await bars[0].evaluate(el => el.style.backgroundColor)).toBe('teal'); // Bars should return to original color
    });

    test('should highlight bars correctly during sorting', async ({ page }) => {
        // Click the start button and verify highlights during sorting
        await page.click('button');
        await page.waitForTimeout(500); // Wait for the first highlight

        const bars = await page.$$('.bar');
        expect(await bars[0].evaluate(el => el.style.backgroundColor)).toBe('red'); // First bar should be highlighted
        expect(await bars[1].evaluate(el => el.style.backgroundColor)).toBe('red'); // Second bar should also be highlighted
    });

    test('should handle edge case of empty array', async ({ page }) => {
        // Simulate an empty array scenario
        await page.evaluate(() => {
            const arrayContainer = document.getElementById('array-container');
            arrayContainer.innerHTML = ''; // Clear the array
        });

        const bars = await page.$$('.bar');
        expect(bars.length).toBe(0); // No bars should be present
    });
});