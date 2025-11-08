import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/04de9c20-bcac-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Interactive Quick Sort Visualization', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('Initial state should be idle', async ({ page }) => {
        const infoText = await page.locator('#info').innerText();
        expect(infoText).toBe("Click 'Start Quick Sort' to visualize the sorting process.");
    });

    test('Clicking "Start Quick Sort" transitions to sorting state', async ({ page }) => {
        await page.click('#sort-button');
        const infoText1 = await page.locator('#info').innerText();
        expect(infoText).toBe("Sorting Complete!");
        const sortButtonDisabled = await page.locator('#sort-button').isDisabled();
        const resetButtonDisabled = await page.locator('#reset-button').isDisabled();
        expect(sortButtonDisabled).toBe(false);
        expect(resetButtonDisabled).toBe(false);
    });

    test('Clicking "Reset Array" resets the array and returns to idle state', async ({ page }) => {
        await page.click('#sort-button'); // Start sorting
        await page.waitForTimeout(1000); // Wait for sorting to complete
        await page.click('#reset-button'); // Reset the array
        const infoText2 = await page.locator('#info').innerText();
        expect(infoText).toBe("Click 'Start Quick Sort' to visualize the sorting process.");
        
        const bars = await page.locator('.bar').count();
        expect(bars).toBeGreaterThan(0); // Ensure new array is drawn
    });

    test('Resetting during sorting should not be allowed', async ({ page }) => {
        await page.click('#sort-button'); // Start sorting
        const resetButtonDisabled1 = await page.locator('#reset-button').isDisabled();
        expect(resetButtonDisabled).toBe(true); // Reset button should be disabled during sorting
    });

    test('Sorting completes and allows reset', async ({ page }) => {
        await page.click('#sort-button'); // Start sorting
        await page.waitForTimeout(1000); // Wait for sorting to complete
        const resetButtonDisabled2 = await page.locator('#reset-button').isDisabled();
        expect(resetButtonDisabled).toBe(false); // Reset button should be enabled after sorting
    });

    test('Visual feedback during sorting', async ({ page }) => {
        await page.click('#sort-button'); // Start sorting
        const barsBefore = await page.locator('.bar').count();
        await page.waitForTimeout(1000); // Wait for sorting to progress
        const barsAfter = await page.locator('.bar').count();
        expect(barsBefore).toBe(barsAfter); // Ensure the number of bars remains the same
    });

    test('State transitions are handled correctly', async ({ page }) => {
        await page.click('#sort-button'); // Start sorting
        await page.waitForTimeout(1000); // Wait for sorting to complete
        const infoText3 = await page.locator('#info').innerText();
        expect(infoText).toBe("Sorting Complete!");
        
        await page.click('#reset-button'); // Reset the array
        const resetInfoText = await page.locator('#info').innerText();
        expect(resetInfoText).toBe("Click 'Start Quick Sort' to visualize the sorting process.");
    });
});