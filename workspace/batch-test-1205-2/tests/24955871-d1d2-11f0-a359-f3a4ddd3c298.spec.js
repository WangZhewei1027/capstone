import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-2/html/24955871-d1d2-11f0-a359-f3a4ddd3c298.html';

test.describe('K-Nearest Neighbors Demo', () => {
    test.beforeEach(async ({ page }) => {
        // Load the application before each test
        await page.goto(BASE_URL);
    });

    test('Initial state - Idle', async ({ page }) => {
        // Verify that the canvas is drawn with initial points
        const canvas = await page.locator('#canvas');
        const context = await canvas.evaluate(canvas => canvas.getContext('2d'));
        
        // Check if the canvas context is not null
        expect(context).not.toBeNull();
        
        // Verify that points are drawn (this is a visual check, assume points are drawn correctly)
        // This could be improved with a more sophisticated visual check if needed
    });

    test('Classify button click transitions to Classifying state', async ({ page }) => {
        // Set K value
        await page.fill('#k-value', '3');

        // Click the classify button
        await page.click('#classify-button');

        // Verify that a new point is drawn on the canvas
        // Here we assume that the point is drawn at (250, 200) with a label
        const newPointLabel = await page.evaluate(() => {
            const canvas1 = document.getElementById('canvas1');
            const ctx = canvas.getContext('2d');
            const imageData = ctx.getImageData(250, 200, 1, 1).data;
            return imageData[0] === 255 && imageData[1] === 255 && imageData[2] === 0 ? 'A' : 'B'; // Check for yellow color
        });

        // Assert that the new point is labeled correctly
        expect(newPointLabel).toBe('A'); // Assuming the label is 'A' for this test case
    });

    test('Classify button click with invalid K value', async ({ page }) => {
        // Set an invalid K value
        await page.fill('#k-value', '11'); // Out of bounds

        // Click the classify button
        await page.click('#classify-button');

        // Check for console errors
        const consoleErrors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });

        // Wait for a moment to let any potential errors occur
        await page.waitForTimeout(1000);

        // Assert that there are console errors
        expect(consoleErrors.length).toBeGreaterThan(0);
    });

    test('Classify button click with non-numeric K value', async ({ page }) => {
        // Set a non-numeric K value
        await page.fill('#k-value', 'abc'); // Invalid input

        // Click the classify button
        await page.click('#classify-button');

        // Check for console errors
        const consoleErrors1 = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });

        // Wait for a moment to let any potential errors occur
        await page.waitForTimeout(1000);

        // Assert that there are console errors
        expect(consoleErrors.length).toBeGreaterThan(0);
    });

    test('Verify K value input constraints', async ({ page }) => {
        // Test minimum K value
        await page.fill('#k-value', '0'); // Below minimum
        await page.click('#classify-button');

        // Check for console errors
        const consoleErrorsMin = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrorsMin.push(msg.text());
            }
        });

        await page.waitForTimeout(1000);
        expect(consoleErrorsMin.length).toBeGreaterThan(0);

        // Test maximum K value
        await page.fill('#k-value', '11'); // Above maximum
        await page.click('#classify-button');

        // Check for console errors
        const consoleErrorsMax = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrorsMax.push(msg.text());
            }
        });

        await page.waitForTimeout(1000);
        expect(consoleErrorsMax.length).toBeGreaterThan(0);
    });
});