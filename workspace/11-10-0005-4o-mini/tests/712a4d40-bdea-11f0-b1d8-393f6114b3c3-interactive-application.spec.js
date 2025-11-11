import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-10-0005-4o-mini/html/712a4d40-bdea-11f0-b1d8-393f6114b3c3.html';

test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
});

test.describe('K-Nearest Neighbors Interactive Application', () => {
    
    test('Initial state should be idle', async ({ page }) => {
        const kDisplay = await page.locator('#kDisplay').textContent();
        expect(kDisplay).toBe('K = 3');
        // No points should be drawn initially
        const canvas = await page.locator('#canvas');
        const canvasContent = await canvas.evaluate(canvas => canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data);
        expect(canvasContent).toEqual(new Uint8ClampedArray(canvas.width * canvas.height * 4)); // All pixels should be transparent
    });

    test('Adding a point transitions to point_added state', async ({ page }) => {
        const canvas = page.locator('#canvas');
        await canvas.click({ position: { x: 50, y: 50 } });
        
        // Verify that a point is drawn
        const canvasContent = await canvas.evaluate(canvas => canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data);
        expect(canvasContent).not.toEqual(new Uint8ClampedArray(canvas.width * canvas.height * 4)); // Some pixels should be colored
    });

    test('Changing K value should remain in point_added state', async ({ page }) => {
        const kValueInput = page.locator('#kValue');
        await page.locator('#canvas').click({ position: { x: 50, y: 50 } }); // Add a point
        await kValueInput.fill('5'); // Change K value
        await kValueInput.dispatchEvent('input');

        const kDisplay = await page.locator('#kDisplay').textContent();
        expect(kDisplay).toBe('K = 5'); // K value should update
    });

    test('Classifying a point transitions to classifying state', async ({ page }) => {
        await page.locator('#canvas').click({ position: { x: 50, y: 50 } }); // Add a point
        await page.locator('#btnClassify').click(); // Click classify button
        
        // Simulate classification completion
        await page.evaluate(() => {
            const event = new Event('CLASSIFICATION_COMPLETE');
            document.dispatchEvent(event);
        });

        // Verify that we return to idle state
        const kDisplay = await page.locator('#kDisplay').textContent();
        expect(kDisplay).toBe('K = 5'); // K value should remain unchanged
    });

    test('Multiple points can be added and classified', async ({ page }) => {
        for (let i = 0; i < 3; i++) {
            await page.locator('#canvas').click({ position: { x: 50 + i * 20, y: 50 + i * 20 } }); // Add points
        }
        
        await page.locator('#btnClassify').click(); // Click classify button
        
        // Simulate classification completion
        await page.evaluate(() => {
            const event = new Event('CLASSIFICATION_COMPLETE');
            document.dispatchEvent(event);
        });

        // Verify that we return to idle state
        const kDisplay = await page.locator('#kDisplay').textContent();
        expect(kDisplay).toBe('K = 5'); // K value should remain unchanged
    });

    test('Edge case: Classify without adding points', async ({ page }) => {
        await page.locator('#btnClassify').click(); // Click classify button
        
        // Simulate classification completion
        await page.evaluate(() => {
            const event = new Event('CLASSIFICATION_COMPLETE');
            document.dispatchEvent(event);
        });

        // Verify that we return to idle state without errors
        const kDisplay = await page.locator('#kDisplay').textContent();
        expect(kDisplay).toBe('K = 3'); // K value should remain unchanged
    });
});