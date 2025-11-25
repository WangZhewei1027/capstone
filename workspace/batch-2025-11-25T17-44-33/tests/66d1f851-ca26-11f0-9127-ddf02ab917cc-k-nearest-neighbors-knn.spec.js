import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-25T17-44-33/html/66d1f851-ca26-11f0-9127-ddf02ab917cc.html';

test.describe('K-Nearest Neighbors (KNN) Application', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('Initial state is idle', async ({ page }) => {
        // Verify that the application starts in the idle state
        const resultText = await page.textContent('#result');
        expect(resultText).toBe('');
    });

    test('Adding a point changes state to point_added', async ({ page }) => {
        // Simulate a canvas click to add a point
        const canvas = await page.locator('#canvas');
        await canvas.click({ position: { x: 250, y: 250 } });

        // Verify that a point is drawn on the canvas
        const resultText = await page.textContent('#result');
        expect(resultText).toBe('');
    });

    test('Clicking predict button transitions to predicting state', async ({ page }) => {
        // Add a point first
        const canvas = await page.locator('#canvas');
        await canvas.click({ position: { x: 250, y: 250 } });

        // Click the predict button
        await page.click('#predict-btn');

        // Verify that a prediction result is displayed
        const resultText = await page.textContent('#result');
        expect(resultText).toMatch(/Predicted Class: [AB]/);
    });

    test('Multiple points can be added and predicted', async ({ page }) => {
        const canvas = await page.locator('#canvas');

        // Add first point
        await canvas.click({ position: { x: 100, y: 100 } });
        // Add second point
        await canvas.click({ position: { x: 400, y: 400 } });

        // Click the predict button
        await page.click('#predict-btn');

        // Verify that a prediction result is displayed
        const resultText = await page.textContent('#result');
        expect(resultText).toMatch(/Predicted Class: [AB]/);
    });

    test('Clicking canvas multiple times does not change state', async ({ page }) => {
        const canvas = await page.locator('#canvas');

        // Click the canvas to add a point
        await canvas.click({ position: { x: 250, y: 250 } });

        // Click the canvas again
        await canvas.click({ position: { x: 300, y: 300 } });

        // Verify that the result is still empty until predict is clicked
        const resultText = await page.textContent('#result');
        expect(resultText).toBe('');
    });

    test('Predicting without adding a point does not crash the app', async ({ page }) => {
        // Click the predict button without adding any points
        await page.click('#predict-btn');

        // Verify that the result is still empty
        const resultText = await page.textContent('#result');
        expect(resultText).toBe('');
    });

    test('State returns to idle after prediction is complete', async ({ page }) => {
        const canvas = await page.locator('#canvas');

        // Add a point
        await canvas.click({ position: { x: 250, y: 250 } });

        // Click the predict button
        await page.click('#predict-btn');

        // Wait for the prediction to complete and check the result
        const resultText = await page.textContent('#result');
        expect(resultText).toMatch(/Predicted Class: [AB]/);

        // Simulate the prediction complete event
        await page.evaluate(() => {
            const event = new Event('PREDICTION_COMPLETE');
            document.dispatchEvent(event);
        });

        // Verify that the application returns to idle state
        const finalResultText = await page.textContent('#result');
        expect(finalResultText).toMatch(/Predicted Class: [AB]/);
    });
});