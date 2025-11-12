import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-12-0001-fsm-examples/html/aebf79a0-bf48-11f0-9d56-0b246eb7b43c.html';

test.describe('Bubble Sort Interactive Module', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should be in idle state initially', async ({ page }) => {
        const bars = await page.$$('#array .bar');
        expect(bars.length).toBe(0); // No bars should be created initially
    });

    test('should create bars on entering idle state', async ({ page }) => {
        await page.click('#sortButton'); // Trigger the SORT_BUTTON_CLICKED event
        const bars = await page.$$('#array .bar');
        expect(bars.length).toBe(5); // 5 bars should be created
        const heights = await Promise.all(bars.map(bar => bar.evaluate(el => el.style.height)));
        expect(heights).toEqual(['100px', '60px', '160px', '80px', '120px']); // Heights based on initial array
    });

    test('should transition to sorting state on sort button click', async ({ page }) => {
        await page.click('#sortButton'); // Trigger the SORT_BUTTON_CLICKED event
        await page.waitForTimeout(1000); // Wait for sorting to start
        const activeBars = await page.$$('.bar.active');
        expect(activeBars.length).toBeGreaterThan(0); // At least one bar should be active
    });

    test('should transition to done state after sorting is complete', async ({ page }) => {
        await page.click('#sortButton'); // Trigger the SORT_BUTTON_CLICKED event
        await page.waitForTimeout(5000); // Wait for sorting to complete
        const bars = await page.$$('#array .bar');
        const doneBars = await page.$$('.bar.done');
        expect(doneBars.length).toBe(5); // All bars should have the done class
    });

    test('should return to idle state on sort button click after sorting is done', async ({ page }) => {
        await page.click('#sortButton'); // Trigger the SORT_BUTTON_CLICKED event
        await page.waitForTimeout(5000); // Wait for sorting to complete
        await page.click('#sortButton'); // Trigger the SORT_BUTTON_CLICKED event again
        const bars = await page.$$('#array .bar');
        const activeBars = await page.$$('.bar.active');
        expect(activeBars.length).toBe(0); // No bars should be active
        const heights = await Promise.all(bars.map(bar => bar.evaluate(el => el.style.height)));
        expect(heights).toEqual(['100px', '60px', '160px', '80px', '120px']); // Heights should remain the same
    });

    test('should handle edge case with empty array', async ({ page }) => {
        await page.evaluate(() => {
            window.array = []; // Set the array to empty
            window.createBars(); // Manually call createBars
        });
        const bars = await page.$$('#array .bar');
        expect(bars.length).toBe(0); // No bars should be created
    });

    test('should handle error scenarios gracefully', async ({ page }) => {
        await page.evaluate(() => {
            window.array = [1]; // Set the array to a single element
            window.createBars(); // Manually call createBars
        });
        await page.click('#sortButton'); // Trigger the SORT_BUTTON_CLICKED event
        await page.waitForTimeout(1000); // Wait for sorting to start
        const bars = await page.$$('#array .bar');
        expect(bars.length).toBe(1); // One bar should be created
        const doneBars = await page.$$('.bar.done');
        expect(doneBars.length).toBe(1); // The single bar should be marked as done
    });
});