import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/default/html/9d150170-b3fe-11f0-91f7-216a4f05ad0f.html';

test.describe('Bubble Sort Visualization', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should start in idle state', async ({ page }) => {
        const inputValue = await page.locator('#arrayInput').inputValue();
        const arrayContainer = await page.locator('#arrayContainer').innerHTML();
        const swapCount = await page.locator('#swapCount').innerText();

        // Validate that the input field is empty, the array container is empty, and swap count is not displayed
        expect(inputValue).toBe('');
        expect(arrayContainer).toBe('');
        expect(swapCount).toBe('');
    });

    test('should transition to sorting state on START_SORT event', async ({ page }) => {
        await page.fill('#arrayInput', '5, 3, 8, 4, 2');
        await page.click('#startSort');

        // Validate that the array is displayed
        const arrayBars = await page.locator('.bar').count();
        expect(arrayBars).toBe(5); // Expecting 5 bars for the input array

        // Validate that sorting is in progress (the bars should be present)
        const isSortingInProgress = await page.locator('#swapCount').innerText();
        expect(isSortingInProgress).toBe('');
    });

    test('should perform swaps during sorting', async ({ page }) => {
        await page.fill('#arrayInput', '5, 3, 8, 4, 2');
        await page.click('#startSort');

        // Wait for some time to allow sorting to progress
        await page.waitForTimeout(1000);

        // Check if the swap count is updated (indicating swaps occurred)
        const swapCount = await page.locator('#swapCount').innerText();
        expect(swapCount).not.toBe('');
    });

    test('should transition to done state on SORT_COMPLETE event', async ({ page }) => {
        await page.fill('#arrayInput', '5, 3, 8, 4, 2');
        await page.click('#startSort');

        // Wait for sorting to complete
        await page.waitForTimeout(3000); // Adjust time as needed for sorting to complete

        // Validate that the sorted array is highlighted
        const arrayBars = await page.locator('.bar');
        const sortedArray = await arrayBars.evaluateAll(bars => bars.map(bar => bar.style.height));
        expect(sortedArray).toEqual(['20px', '30px', '40px', '50px', '60px']); // Heights of sorted array bars
    });

    test('should reset to idle state on RESET event', async ({ page }) => {
        await page.fill('#arrayInput', '5, 3, 8, 4, 2');
        await page.click('#startSort');
        await page.waitForTimeout(3000); // Wait for sorting to complete
        await page.click('#reset');

        // Validate that the input field is empty, the array container is empty, and swap count is not displayed
        const inputValue = await page.locator('#arrayInput').inputValue();
        const arrayContainer = await page.locator('#arrayContainer').innerHTML();
        const swapCount = await page.locator('#swapCount').innerText();

        expect(inputValue).toBe('');
        expect(arrayContainer).toBe('');
        expect(swapCount).toBe('');
    });

    test('should handle empty input gracefully', async ({ page }) => {
        await page.click('#startSort');

        // Validate that no bars are displayed and swap count remains empty
        const arrayBars = await page.locator('.bar').count();
        expect(arrayBars).toBe(0);
        const swapCount = await page.locator('#swapCount').innerText();
        expect(swapCount).toBe('');
    });

    test('should handle invalid input gracefully', async ({ page }) => {
        await page.fill('#arrayInput', 'invalid,input');
        await page.click('#startSort');

        // Validate that no bars are displayed and swap count remains empty
        const arrayBars = await page.locator('.bar').count();
        expect(arrayBars).toBe(0);
        const swapCount = await page.locator('#swapCount').innerText();
        expect(swapCount).toBe('');
    });
});