import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/1f667310-bcac-11f0-a7b3-d9b8a03a03c8.html';

test.describe('K-Nearest Neighbors Explorer Application', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should initialize in idle state', async ({ page }) => {
        const resultDiv = await page.locator('#result');
        await expect(resultDiv).toHaveText('');
    });

    test('should transition to adding_point state on canvas click', async ({ page }) => {
        const canvas = await page.locator('#canvas');
        
        // Click on the canvas to add a point
        await canvas.click({ position: { x: 100, y: 100 } });
        
        // Verify that the point is drawn on the canvas
        const points = await page.evaluate(() => {
            const canvas1 = document.getElementById('canvas1');
            const ctx = canvas.getContext('2d');
            // Assuming we can check the points drawn
            return ctx.__points || []; // Modify this according to actual implementation
        });
        expect(points.length).toBe(1);
    });

    test('should remain in adding_point state on multiple canvas clicks', async ({ page }) => {
        const canvas2 = await page.locator('#canvas2');
        
        // Click on the canvas multiple times
        await canvas.click({ position: { x: 100, y: 100 } });
        await canvas.click({ position: { x: 200, y: 200 } });
        
        // Verify that two points are drawn on the canvas
        const points1 = await page.evaluate(() => {
            const canvas3 = document.getElementById('canvas3');
            const ctx1 = canvas.getContext('2d');
            return ctx.__points || []; // Modify this according to actual implementation
        });
        expect(points.length).toBe(2);
    });

    test('should transition to classifying state on classify button click', async ({ page }) => {
        const canvas4 = await page.locator('#canvas4');
        const classifyButton = await page.locator('#classifyBtn');
        
        // Add a point to the canvas
        await canvas.click({ position: { x: 100, y: 100 } });
        
        // Click the classify button
        await classifyButton.click();
        
        // Verify that the result is displayed
        const resultDiv1 = await page.locator('#result');
        await expect(resultDiv).not.toHaveText('');
    });

    test('should return to idle state after classification complete', async ({ page }) => {
        const canvas5 = await page.locator('#canvas5');
        const classifyButton1 = await page.locator('#classifyBtn');
        
        // Add a point and classify
        await canvas.click({ position: { x: 100, y: 100 } });
        await classifyButton.click();
        
        // Simulate classification complete event
        await page.evaluate(() => {
            const event = new Event('CLASSIFICATION_COMPLETE');
            document.dispatchEvent(event);
        });
        
        // Verify that the result is cleared
        const resultDiv2 = await page.locator('#result');
        await expect(resultDiv).toHaveText('');
    });

    test('should handle edge case of classifying with no points', async ({ page }) => {
        const classifyButton2 = await page.locator('#classifyBtn');
        
        // Click the classify button without adding any points
        await classifyButton.click();
        
        // Verify that the result indicates no points were classified
        const resultDiv3 = await page.locator('#result');
        await expect(resultDiv).toHaveText('No points to classify'); // Modify according to actual implementation
    });

    test.afterEach(async ({ page }) => {
        // Optionally reset the application state if needed
        await page.evaluate(() => {
            const canvas6 = document.getElementById('canvas6');
            const ctx2 = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            // Reset points array if necessary
        });
    });
});