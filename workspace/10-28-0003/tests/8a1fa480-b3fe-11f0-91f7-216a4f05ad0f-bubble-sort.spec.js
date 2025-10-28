import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/default/html/8a1fa480-b3fe-11f0-91f7-216a4f05ad0f.html';

test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
});

test.describe('Bubble Sort Visualization', () => {
    test('should initialize the array in idle state', async ({ page }) => {
        // Verify that the array is rendered with bars
        const bars = await page.$$('#array .bar');
        expect(bars.length).toBeGreaterThan(0);
    });

    test('should transition to sorting state when sort button is clicked', async ({ page }) => {
        // Click the Sort button
        await page.click('#sortBtn');

        // Verify that sorting has started (check for steps)
        const bars = await page.$$('#array .bar');
        expect(bars.length).toBeGreaterThan(0);
    });

    test('should transition to highlighting state after each step', async ({ page }) => {
        // Start sorting
        await page.click('#sortBtn');

        // Wait for the first step
        await page.click('#nextStepBtn');

        // Verify that highlighting occurs (check if bars are red)
        const bars = await page.$$('#array .bar');
        const firstBarColor = await bars[0].evaluate(el => el.style.backgroundColor);
        expect(firstBarColor).toBe('red');
    });

    test('should remain in highlighting state when next step is clicked', async ({ page }) => {
        // Start sorting
        await page.click('#sortBtn');

        // Move to highlighting state
        await page.click('#nextStepBtn');

        // Click next step again
        await page.click('#nextStepBtn');

        // Verify that we are still in highlighting state
        const bars = await page.$$('#array .bar');
        const secondBarColor = await bars[1].evaluate(el => el.style.backgroundColor);
        expect(secondBarColor).toBe('red');
    });

    test('should transition to done state when sorting is completed', async ({ page }) => {
        // Start sorting
        await page.click('#sortBtn');

        // Click next step until sorting is done
        const steps = await page.$$('#array .bar');
        for (let i = 0; i < steps.length - 1; i++) {
            await page.click('#nextStepBtn');
        }

        // Verify that sorting is completed (check final state)
        const finalBars = await page.$$('#array .bar');
        expect(finalBars.length).toBeGreaterThan(0);
        // Check if the bars are sorted
        const heights = await Promise.all(finalBars.map(bar => bar.evaluate(el => parseInt(el.style.height))));
        const sortedHeights = [...heights].sort((a, b) => a - b);
        expect(heights).toEqual(sortedHeights);
    });

    test('should reset to idle state when reset button is clicked', async ({ page }) => {
        // Start sorting
        await page.click('#sortBtn');

        // Click next step
        await page.click('#nextStepBtn');

        // Click reset button
        await page.click('#resetBtn');

        // Verify that we are back in idle state
        const bars = await page.$$('#array .bar');
        expect(bars.length).toBeGreaterThan(0);
        const resetBarColor = await bars[0].evaluate(el => el.style.backgroundColor);
        expect(resetBarColor).toBe(''); // Should not be red
    });

    test('should handle edge case of clicking next step without sorting', async ({ page }) => {
        // Click next step without sorting
        await page.click('#nextStepBtn');

        // Verify that no highlighting occurs
        const bars = await page.$$('#array .bar');
        const barColors = await Promise.all(bars.map(bar => bar.evaluate(el => el.style.backgroundColor)));
        expect(barColors).not.toContain('red'); // No bars should be red
    });
});