import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-10-0004-4o-mini/html/45929480-bde5-11f0-ad60-cb3bd313757f.html';

test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
});

test.describe('K-Nearest Neighbors Interactive Module', () => {
    test('should be in idle state initially', async ({ page }) => {
        const resultText = await page.textContent('#resultText');
        expect(resultText).toBe('N/A');
    });

    test('should add a point on canvas click', async ({ page }) => {
        const canvas = await page.locator('#canvas');
        await canvas.click({ position: { x: 50, y: 50 } });

        const resultText = await page.textContent('#resultText');
        expect(resultText).toBe('N/A'); // Still in idle state, no classification yet
    });

    test('should remain in point_added state after multiple canvas clicks', async ({ page }) => {
        const canvas = await page.locator('#canvas');
        await canvas.click({ position: { x: 50, y: 50 } });
        await canvas.click({ position: { x: 100, y: 100 } });

        const resultText = await page.textContent('#resultText');
        expect(resultText).toBe('N/A'); // Still in point_added state, no classification yet
    });

    test('should alert when classifying with fewer points than K', async ({ page }) => {
        const classifyButton = await page.locator('#classifyBtn');
        await page.click('#classifyBtn');

        const alertMessage = await page.waitForEvent('dialog');
        expect(alertMessage.message()).toBe('Please add at least K points.');
        await alertMessage.dismiss();
    });

    test('should classify points correctly when enough points are added', async ({ page }) => {
        const canvas = await page.locator('#canvas');
        await canvas.click({ position: { x: 50, y: 50 } });
        await canvas.click({ position: { x: 100, y: 100 } });
        await canvas.click({ position: { x: 150, y: 150 } }); // Adding 3 points

        const kValue = await page.locator('#kValue');
        await kValue.fill('3'); // Set K to 3
        await page.click('#classifyBtn');

        // Wait for classification to complete
        await page.waitForTimeout(1000); // Adjust timeout as necessary

        const resultText = await page.textContent('#resultText');
        expect(resultText).not.toBe('N/A'); // Should now show a classification result
    });

    test('should return to idle state after classification complete', async ({ page }) => {
        const canvas = await page.locator('#canvas');
        await canvas.click({ position: { x: 50, y: 50 } });
        await canvas.click({ position: { x: 100, y: 100 } });
        await canvas.click({ position: { x: 150, y: 150 } }); // Adding 3 points

        const kValue = await page.locator('#kValue');
        await kValue.fill('3'); // Set K to 3
        await page.click('#classifyBtn');

        // Wait for classification to complete
        await page.waitForTimeout(1000); // Adjust timeout as necessary

        const resultText = await page.textContent('#resultText');
        expect(resultText).not.toBe('N/A'); // Should show a classification result

        // Simulate the completion of classification
        await page.evaluate(() => {
            const event = new Event('CLASSIFICATION_COMPLETE');
            document.dispatchEvent(event);
        });

        const finalResultText = await page.textContent('#resultText');
        expect(finalResultText).toBe('N/A'); // Should return to idle state
    });
});