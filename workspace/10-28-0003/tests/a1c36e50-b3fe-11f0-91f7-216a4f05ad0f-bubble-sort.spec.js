import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/default/html/a1c36e50-b3fe-11f0-91f7-216a4f05ad0f.html';

test.describe('Bubble Sort Interactive Tutorial', () => {
    let page;

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();
        await page.goto(BASE_URL);
    });

    test.afterAll(async () => {
        await page.close();
    });

    test('should render initial array in idle state', async () => {
        const bars = await page.$$('.bar');
        expect(bars.length).toBeGreaterThan(0); // Ensure bars are rendered
    });

    test('should disable button and start sorting when Sort Array is clicked', async () => {
        const sortButton = await page.$('#sortButton');
        await sortButton.click();

        // Verify button is disabled
        const isDisabled = await sortButton.isDisabled();
        expect(isDisabled).toBe(true);

        // Verify the state is sorting (check for DOM updates)
        const firstBarHeightBefore = await page.evaluate(() => {
            const bars = document.querySelectorAll('.bar');
            return bars[0].style.height;
        });

        // Wait for sorting to complete (this will depend on the sort duration)
        await page.waitForTimeout(3000); // Adjust based on expected sort duration

        const firstBarHeightAfter = await page.evaluate(() => {
            const bars = document.querySelectorAll('.bar');
            return bars[0].style.height;
        });

        // Ensure the first bar height has changed (indicating sorting occurred)
        expect(firstBarHeightBefore).not.toBe(firstBarHeightAfter);
    });

    test('should enable button after sorting is complete', async () => {
        const sortButton = await page.$('#sortButton');
        
        // Wait for sorting to complete
        await page.waitForTimeout(3000); // Adjust based on expected sort duration

        // Verify button is enabled
        const isDisabled = await sortButton.isDisabled();
        expect(isDisabled).toBe(false);
    });

    test('should allow re-sorting after completion', async () => {
        const sortButton = await page.$('#sortButton');
        await sortButton.click();

        // Verify button is disabled during sorting
        const isDisabled = await sortButton.isDisabled();
        expect(isDisabled).toBe(true);

        // Wait for sorting to complete
        await page.waitForTimeout(3000); // Adjust based on expected sort duration

        // Verify button is enabled after sorting
        const isEnabled = await sortButton.isDisabled();
        expect(isEnabled).toBe(false);
    });

    test('should visually update bars during sorting', async () => {
        const sortButton = await page.$('#sortButton');
        await sortButton.click();

        // Capture initial heights of the first two bars
        const initialHeights = await page.evaluate(() => {
            const bars = document.querySelectorAll('.bar');
            return [bars[0].style.height, bars[1].style.height];
        });

        // Wait for a short duration to allow for at least one comparison
        await page.waitForTimeout(500);

        // Capture heights after some time
        const updatedHeights = await page.evaluate(() => {
            const bars = document.querySelectorAll('.bar');
            return [bars[0].style.height, bars[1].style.height];
        });

        // Ensure that heights have changed (indicating a swap)
        expect(initialHeights).not.toEqual(updatedHeights);
    });
});