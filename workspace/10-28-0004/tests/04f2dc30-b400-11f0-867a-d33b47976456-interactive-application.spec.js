import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/10-28-0004/html/04f2dc30-b400-11f0-867a-d33b47976456.html';

test.describe('Bubble Sort Interactive Application', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('Initial state is idle', async ({ page }) => {
        const counterText = await page.locator('#counter').innerText();
        expect(counterText).toBe('0');
        const bars = await page.locator('.bar').count();
        expect(bars).toBe(0); // No bars should be present initially
    });

    test('Generate new array transitions to array_generated state', async ({ page }) => {
        await page.click('#generateButton');
        const bars = await page.locator('.bar').count();
        expect(bars).toBeGreaterThan(0); // Bars should be generated
    });

    test('Start sorting transitions to sorting state', async ({ page }) => {
        await page.click('#generateButton');
        await page.click('#startButton');
        const sortingText = await page.locator('.objective').innerText();
        expect(sortingText).toContain('Watch how the bubble sort algorithm sorts an array step-by-step!');
    });

    test('Reset transitions to array_reset state', async ({ page }) => {
        await page.click('#generateButton');
        await page.click('#startButton');
        await page.click('#resetButton');
        const counterText = await page.locator('#counter').innerText();
        expect(counterText).toBe('0'); // Counter should reset
        const bars = await page.locator('.bar').count();
        expect(bars).toBeGreaterThan(0); // Bars should still be present after reset
    });

    test('Sorting completes and transitions to done state', async ({ page }) => {
        await page.click('#generateButton');
        await page.click('#startButton');
        // Wait for sorting to complete (you may need to adjust the timeout based on your implementation)
        await page.waitForTimeout(5000); // Adjust this timeout as necessary
        const counterText = await page.locator('#counter').innerText();
        expect(parseInt(counterText)).toBeGreaterThan(0); // There should be some iterations
    });

    test('Generate new array from done state transitions to array_generated state', async ({ page }) => {
        await page.click('#generateButton');
        await page.click('#startButton');
        await page.waitForTimeout(5000); // Wait for sorting to complete
        await page.click('#generateButton');
        const bars = await page.locator('.bar').count();
        expect(bars).toBeGreaterThan(0); // New bars should be generated
    });

    test('Reset from done state transitions to array_reset state', async ({ page }) => {
        await page.click('#generateButton');
        await page.click('#startButton');
        await page.waitForTimeout(5000); // Wait for sorting to complete
        await page.click('#resetButton');
        const counterText = await page.locator('#counter').innerText();
        expect(counterText).toBe('0'); // Counter should reset
        const bars = await page.locator('.bar').count();
        expect(bars).toBeGreaterThan(0); // Bars should still be present after reset
    });

    test('Edge case: Start sorting without generating an array', async ({ page }) => {
        await page.click('#startButton');
        const bars = await page.locator('.bar').count();
        expect(bars).toBe(0); // No bars should be present
    });

    test('Edge case: Reset without generating an array', async ({ page }) => {
        await page.click('#resetButton');
        const counterText = await page.locator('#counter').innerText();
        expect(counterText).toBe('0'); // Counter should remain 0
    });
});