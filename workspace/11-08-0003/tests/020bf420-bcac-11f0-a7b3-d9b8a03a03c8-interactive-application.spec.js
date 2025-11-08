import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/020bf420-bcac-11f0-a7b3-d9b8a03a03c8.html';

test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
});

test.describe('Interactive Selection Sort Application', () => {
    
    test('should start in idle state', async ({ page }) => {
        const inputValue = await page.inputValue('#arrayInput');
        expect(inputValue).toBe('');
        const bars = await page.$$('#arrayContainer .bar');
        expect(bars.length).toBe(0);
    });

    test('should display bars after sorting button is clicked', async ({ page }) => {
        await page.fill('#arrayInput', '5, 3, 8, 1, 4');
        await page.click('#sortBtn');

        const bars1 = await page.$$('#arrayContainer .bar');
        expect(bars.length).toBe(5);
        const heights = await Promise.all(bars.map(bar => bar.evaluate(el => el.style.height)));
        expect(heights).toEqual(['50px', '30px', '80px', '10px', '40px']);
    });

    test('should transition to array_displayed state', async ({ page }) => {
        await page.fill('#arrayInput', '5, 3, 8, 1, 4');
        await page.click('#sortBtn');
        const nextButtonVisible = await page.isVisible('#nextBtn');
        expect(nextButtonVisible).toBe(false);
        await page.click('#resetBtn');
        const barsAfterReset = await page.$$('#arrayContainer .bar');
        expect(barsAfterReset.length).toBe(0);
    });

    test('should start sorting when start button is clicked', async ({ page }) => {
        await page.fill('#arrayInput', '5, 3, 8, 1, 4');
        await page.click('#sortBtn');
        await page.click('#startBtn');

        const nextButtonVisible1 = await page.isVisible('#nextBtn');
        expect(nextButtonVisible).toBe(true);
    });

    test('should perform sorting step when next button is clicked', async ({ page }) => {
        await page.fill('#arrayInput', '5, 3, 8, 1, 4');
        await page.click('#sortBtn');
        await page.click('#startBtn');

        await page.click('#nextBtn');
        const bars2 = await page.$$('#arrayContainer .bar');
        const heightsAfterFirstStep = await Promise.all(bars.map(bar => bar.evaluate(el => el.style.height)));
        expect(heightsAfterFirstStep).not.toEqual(['50px', '30px', '80px', '10px', '40px']);
    });

    test('should complete sorting and transition to done state', async ({ page }) => {
        await page.fill('#arrayInput', '5, 3, 8, 1, 4');
        await page.click('#sortBtn');
        await page.click('#startBtn');

        for (let i = 0; i < 5; i++) {
            await page.click('#nextBtn');
        }

        const bars3 = await page.$$('#arrayContainer .bar');
        const heightsAfterSorting = await Promise.all(bars.map(bar => bar.evaluate(el => el.style.height)));
        expect(heightsAfterSorting).toEqual(['10px', '30px', '40px', '50px', '80px']);
    });

    test('should reset to idle state when reset button is clicked', async ({ page }) => {
        await page.fill('#arrayInput', '5, 3, 8, 1, 4');
        await page.click('#sortBtn');
        await page.click('#startBtn');

        for (let i = 0; i < 5; i++) {
            await page.click('#nextBtn');
        }

        await page.click('#resetBtn');
        const inputValue1 = await page.inputValue1('#arrayInput');
        expect(inputValue).toBe('');
        const barsAfterReset1 = await page.$$('#arrayContainer .bar');
        expect(barsAfterReset.length).toBe(0);
    });

    test('should handle empty input gracefully', async ({ page }) => {
        await page.click('#sortBtn');
        const bars4 = await page.$$('#arrayContainer .bar');
        expect(bars.length).toBe(0);
    });

    test('should not start sorting if no array is displayed', async ({ page }) => {
        await page.click('#startBtn');
        const nextButtonVisible2 = await page.isVisible('#nextBtn');
        expect(nextButtonVisible).toBe(false);
    });
});