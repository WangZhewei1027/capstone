import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/default/html/9eb1e890-b3fe-11f0-91f7-216a4f05ad0f.html';

test.describe('Bubble Sort Visualization', () => {
    let page;

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();
        await page.goto(BASE_URL);
    });

    test.afterAll(async () => {
        await page.close();
    });

    test('Initial state is idle', async () => {
        const bars = await page.$$('#array-container .bar');
        expect(bars.length).toBe(0); // No bars should be present initially
    });

    test('Generate Array transitions to array_generated state', async () => {
        await page.click('#generate');
        const bars = await page.$$('#array-container .bar');
        expect(bars.length).toBeGreaterThan(0); // Bars should be generated
    });

    test('Start Sorting transitions to sorting state', async () => {
        await page.click('#generate'); // Ensure we have an array
        await page.click('#start');
        const bars = await page.$$('#array-container .bar');
        expect(bars.length).toBeGreaterThan(0); // Ensure sorting is initiated
        // Check if the first bar has the highlight class
        const firstBar = await bars[0].evaluate(bar => bar.classList.contains('highlight'));
        expect(firstBar).toBe(true); // The first bar should be highlighted
    });

    test('Stop Sorting transitions back to array_generated state', async () => {
        await page.click('#stop');
        const bars = await page.$$('#array-container .bar');
        const firstBar = await bars[0].evaluate(bar => bar.classList.contains('highlight'));
        expect(firstBar).toBe(false); // The highlight class should be removed
    });

    test('Generate Array again maintains array_generated state', async () => {
        await page.click('#generate');
        const bars = await page.$$('#array-container .bar');
        expect(bars.length).toBeGreaterThan(0); // Bars should be generated again
        await page.click('#start');
        const firstBar = await bars[0].evaluate(bar => bar.classList.contains('highlight'));
        expect(firstBar).toBe(true); // The first bar should be highlighted again
    });

    test('Multiple Generate Array clicks do not break the application', async () => {
        await page.click('#generate');
        await page.click('#generate'); // Click again
        const bars = await page.$$('#array-container .bar');
        expect(bars.length).toBeGreaterThan(0); // Ensure bars are still generated
    });

    test('Sorting can be stopped and started multiple times', async () => {
        await page.click('#generate');
        await page.click('#start');
        await page.click('#stop');
        await page.click('#start');
        const bars = await page.$$('#array-container .bar');
        const firstBar = await bars[0].evaluate(bar => bar.classList.contains('highlight'));
        expect(firstBar).toBe(true); // The first bar should be highlighted again after restart
    });

    test('Sorting visual feedback is correct', async () => {
        await page.click('#generate');
        await page.click('#start');
        await page.waitForTimeout(1000); // Wait for a moment to allow sorting to happen
        const bars = await page.$$('#array-container .bar');
        const highlightedBars = await Promise.all(bars.map(bar => bar.evaluate(bar => bar.classList.contains('highlight'))));
        expect(highlightedBars.some(isHighlighted => isHighlighted)).toBe(true); // At least one bar should be highlighted
    });
});