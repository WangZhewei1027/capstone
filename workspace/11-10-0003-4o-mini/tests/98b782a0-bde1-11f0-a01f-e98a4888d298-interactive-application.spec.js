import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-10-0003-4o-mini/html/98b782a0-bde1-11f0-a01f-e98a4888d298.html';

test.describe('K-Nearest Neighbors Interactive Module', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should display initial state with default K value', async ({ page }) => {
        const currentK = await page.locator('#current-k').innerText();
        expect(currentK).toBe('3'); // Initial K value should be 3
        const classificationResult = await page.locator('#classification-result').innerText();
        expect(classificationResult).toBe(''); // No result displayed initially
    });

    test('should transition to drawing_point state on plot click', async ({ page }) => {
        await page.click('#plot');
        // Simulate POINT_DRAWN event
        await page.evaluate(() => {
            const event = new Event('POINT_DRAWN');
            document.getElementById('plot').dispatchEvent(event);
        });
        const points = await page.locator('.point').count();
        expect(points).toBeGreaterThan(0); // At least one point should be drawn
    });

    test('should update K value and transition to updating_k state', async ({ page }) => {
        await page.locator('#k-slider').fill('5'); // Change K value to 5
        await page.evaluate(() => {
            const event = new Event('K_UPDATED');
            document.getElementById('k-slider').dispatchEvent(event);
        });
        const currentK = await page.locator('#current-k').innerText();
        expect(currentK).toBe('5'); // K value should be updated to 5
    });

    test('should calculate neighbors and transition to displaying_result state', async ({ page }) => {
        await page.click('#plot'); // Draw a point
        await page.evaluate(() => {
            const event = new Event('NEIGHBORS_CALCULATED');
            document.getElementById('plot').dispatchEvent(event);
        });
        const resultText = await page.locator('#classification-result').innerText();
        expect(resultText).not.toBe(''); // Result should be displayed after calculation
    });

    test('should return to idle state after result displayed', async ({ page }) => {
        await page.click('#plot'); // Draw a point
        await page.evaluate(() => {
            const event = new Event('NEIGHBORS_CALCULATED');
            document.getElementById('plot').dispatchEvent(event);
        });
        await page.evaluate(() => {
            const event = new Event('RESULT_DISPLAYED');
            document.getElementById('classification-result').dispatchEvent(event);
        });
        const currentK = await page.locator('#current-k').innerText();
        expect(currentK).toBe('5'); // K value remains the same
        const classificationResult = await page.locator('#classification-result').innerText();
        expect(classificationResult).not.toBe(''); // Result should still be displayed
    });

    test('should handle edge case of K value below minimum', async ({ page }) => {
        await page.locator('#k-slider').fill('0'); // Attempt to set K to 0
        const currentK = await page.locator('#current-k').innerText();
        expect(currentK).toBe('3'); // K value should not change to invalid value
    });

    test('should handle edge case of K value above maximum', async ({ page }) => {
        await page.locator('#k-slider').fill('11'); // Attempt to set K to 11
        const currentK = await page.locator('#current-k').innerText();
        expect(currentK).toBe('3'); // K value should not change to invalid value
    });
});