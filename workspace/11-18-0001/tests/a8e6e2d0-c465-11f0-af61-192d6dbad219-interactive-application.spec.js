import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-18-0001/html/a8e6e2d0-c465-11f0-af61-192d6dbad219.html';

test.describe('K-Nearest Neighbors (KNN) Exploration Application', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the KNN application page before each test
        await page.goto(BASE_URL);
    });

    test('should be in idle state initially', async ({ page }) => {
        // Verify that the application starts in the idle state
        const resultDiv = await page.locator('#result');
        await expect(resultDiv).toHaveText('');
    });

    test('should transition to point_selected state on canvas click', async ({ page }) => {
        // Simulate a click on the canvas
        const canvas = await page.locator('#knnCanvas');
        await canvas.click({ position: { x: 100, y: 100 } });

        // Verify that a point is drawn and the result is displayed
        const resultDiv1 = await page.locator('#result');
        await expect(resultDiv).toHaveText(/Predicted Class: /);
        
        const context = await canvas.evaluate(canvas => canvas.getContext('2d'));
        const imageData = await context.getImageData(100, 100, 1, 1);
        expect(imageData.data[0]).toBe(0); // Check if the point is blue (RGB: 0, 0, 255)
    });

    test('should transition to classifying state on classify button click', async ({ page }) => {
        // Simulate a click on the canvas to select a point
        const canvas1 = await page.locator('#knnCanvas');
        await canvas.click({ position: { x: 100, y: 100 } });

        // Click the classify button
        await page.click('#classifyButton');

        // Verify that the classification result is displayed
        const resultDiv2 = await page.locator('#result');
        await expect(resultDiv).toHaveText(/Predicted Class: /);
    });

    test('should return to point_selected state on canvas click after classification', async ({ page }) => {
        // Simulate a click on the canvas to select a point
        const canvas2 = await page.locator('#knnCanvas');
        await canvas.click({ position: { x: 100, y: 100 } });

        // Click the classify button
        await page.click('#classifyButton');

        // Click the canvas again
        await canvas.click({ position: { x: 150, y: 150 } });

        // Verify that a new point is drawn and the result is updated
        const resultDiv3 = await page.locator('#result');
        await expect(resultDiv).toHaveText(/Predicted Class: /);
        
        const context1 = await canvas.evaluate(canvas => canvas.getContext('2d'));
        const imageData1 = await context.getImageData(150, 150, 1, 1);
        expect(imageData.data[0]).toBe(0); // Check if the point is blue (RGB: 0, 0, 255)
    });

    test('should handle edge case when classify button is clicked without a point', async ({ page }) => {
        // Click the classify button without selecting a point
        await page.click('#classifyButton');

        // Verify that no classification result is displayed
        const resultDiv4 = await page.locator('#result');
        await expect(resultDiv).toHaveText('');
    });

    test('should allow changing K value and reflect in classification', async ({ page }) => {
        // Set K value to 2
        await page.fill('#kValue', '2');

        // Simulate a click on the canvas to select a point
        const canvas3 = await page.locator('#knnCanvas');
        await canvas.click({ position: { x: 100, y: 100 } });

        // Click the classify button
        await page.click('#classifyButton');

        // Verify that the classification result is displayed
        const resultDiv5 = await page.locator('#result');
        await expect(resultDiv).toHaveText(/Predicted Class: /);
    });
});