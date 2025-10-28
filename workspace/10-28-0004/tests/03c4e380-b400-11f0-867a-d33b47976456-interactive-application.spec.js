import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/10-28-0004/html/03c4e380-b400-11f0-867a-d33b47976456.html';

test.describe('Bubble Sort Visualization', () => {
    let page;

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();
        await page.goto(BASE_URL);
    });

    test.afterAll(async () => {
        await page.close();
    });

    test('Initial state is idle and array is drawn', async () => {
        const bars = await page.$$('#array .bar');
        expect(bars.length).toBeGreaterThan(0); // Ensure the array is drawn
    });

    test('Shuffle button transitions to shuffling state', async () => {
        await page.click('#shuffle-btn');
        await page.waitForTimeout(500); // Wait for shuffle animation
        const bars = await page.$$('#array .bar');
        expect(bars.length).toBeGreaterThan(0); // Ensure the array is still drawn
    });

    test('Shuffling state exits and returns to idle', async () => {
        await page.click('#shuffle-btn');
        await page.waitForTimeout(500); // Wait for shuffle animation
        await page.click('#shuffle-btn'); // Click again to shuffle
        await page.waitForTimeout(500); // Wait for array to be drawn
        const bars = await page.$$('#array .bar');
        expect(bars.length).toBeGreaterThan(0); // Ensure the array is drawn again
    });

    test('Sort button transitions to sorting state', async () => {
        await page.click('#sort-btn');
        await page.waitForTimeout(500); // Wait for sort animation
        const bars = await page.$$('#array .bar');
        expect(bars.length).toBeGreaterThan(0); // Ensure the array is still drawn
    });

    test('Sorting state transitions to done state', async () => {
        await page.click('#sort-btn');
        await page.waitForTimeout(500); // Wait for sort animation
        await page.waitForSelector('.sorted', { timeout: 10000 }); // Wait for sorting to complete
        const sortedBars = await page.$$('.sorted');
        expect(sortedBars.length).toBeGreaterThan(0); // Ensure some bars are sorted
    });

    test('Done state can transition back to shuffling', async () => {
        await page.click('#sort-btn');
        await page.waitForTimeout(500); // Wait for sort animation
        await page.waitForSelector('.sorted', { timeout: 10000 }); // Wait for sorting to complete
        await page.click('#shuffle-btn'); // Transition back to shuffling
        await page.waitForTimeout(500); // Wait for shuffle animation
        const bars = await page.$$('#array .bar');
        expect(bars.length).toBeGreaterThan(0); // Ensure the array is drawn again
    });

    test('Done state can transition back to sorting', async () => {
        await page.click('#sort-btn');
        await page.waitForTimeout(500); // Wait for sort animation
        await page.waitForSelector('.sorted', { timeout: 10000 }); // Wait for sorting to complete
        await page.click('#sort-btn'); // Transition back to sorting
        await page.waitForTimeout(500); // Wait for sort animation
        const bars = await page.$$('#array .bar');
        expect(bars.length).toBeGreaterThan(0); // Ensure the array is still drawn
    });

    test('Edge case: Click sort button without shuffling', async () => {
        await page.click('#sort-btn');
        await page.waitForTimeout(500); // Wait for sort animation
        const bars = await page.$$('#array .bar');
        expect(bars.length).toBeGreaterThan(0); // Ensure the array is still drawn
    });
});