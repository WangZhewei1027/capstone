import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/23b2e9d0-bcac-11f0-a7b3-d9b8a03a03c8.html';

test.describe('K-Means Clustering Interactive Module', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should initialize canvas on idle state', async ({ page }) => {
        const canvas = await page.locator('#canvas');
        await expect(canvas).toBeVisible();
        // Additional checks for canvas initialization can be added here
    });

    test('should add points on canvas click in idle state', async ({ page }) => {
        const canvas1 = await page.locator('#canvas1');
        await canvas.click({ position: { x: 50, y: 50 } });
        await canvas.click({ position: { x: 100, y: 100 } });

        const points = await page.evaluate(() => {
            const ctx = document.getElementById('canvas').getContext('2d');
            return ctx.__points; // Assuming points are stored in a way we can access
        });

        expect(points.length).toBe(2); // Verify two points were added
    });

    test('should update centroids when K value changes', async ({ page }) => {
        const kSlider = await page.locator('#k-slider');
        await kSlider.fill('3'); // Change K value to 3
        await page.waitForTimeout(100); // Wait for any animations or updates

        const centroids = await page.evaluate(() => {
            const ctx1 = document.getElementById('canvas').getContext('2d');
            return ctx.__centroids; // Assuming centroids are stored in a way we can access
        });

        expect(centroids.length).toBe(3); // Verify centroids are updated to 3
    });

    test('should run K-Means algorithm on button click', async ({ page }) => {
        const canvas2 = await page.locator('#canvas2');
        await canvas.click({ position: { x: 50, y: 50 } });
        await canvas.click({ position: { x: 100, y: 100 } });

        const kSlider1 = await page.locator('#k-slider');
        await kSlider.fill('2'); // Set K value to 2

        const runButton = await page.locator('#run-button');
        await runButton.click();

        // Wait for K-Means animation to complete
        await page.waitForTimeout(1000); // Adjust based on actual animation duration

        const finalCentroids = await page.evaluate(() => {
            const ctx2 = document.getElementById('canvas').getContext('2d');
            return ctx.__centroids; // Assuming centroids are stored in a way we can access
        });

        expect(finalCentroids.length).toBe(2); // Verify final centroids are 2
    });

    test('should remain in addingPoints state on multiple canvas clicks', async ({ page }) => {
        const canvas3 = await page.locator('#canvas3');
        await canvas.click({ position: { x: 50, y: 50 } });
        await canvas.click({ position: { x: 100, y: 100 } });

        const points1 = await page.evaluate(() => {
            const ctx3 = document.getElementById('canvas').getContext('2d');
            return ctx.__points; // Assuming points are stored in a way we can access
        });

        expect(points.length).toBe(2); // Verify points remain in adding state
    });

    test('should return to idle state after K-Means animation completes', async ({ page }) => {
        const canvas4 = await page.locator('#canvas4');
        await canvas.click({ position: { x: 50, y: 50 } });
        await canvas.click({ position: { x: 100, y: 100 } });

        const kSlider2 = await page.locator('#k-slider');
        await kSlider.fill('2'); // Set K value to 2

        const runButton1 = await page.locator('#run-button');
        await runButton.click();

        // Wait for K-Means animation to complete
        await page.waitForTimeout(1000); // Adjust based on actual animation duration

        const currentState = await page.evaluate(() => {
            return document.getElementById('canvas').__currentState; // Assuming current state is stored
        });

        expect(currentState).toBe('idle'); // Verify state is idle after completion
    });

    test('should handle edge cases for K value', async ({ page }) => {
        const kSlider3 = await page.locator('#k-slider');
        await kSlider.fill('0'); // Invalid K value
        const runButton2 = await page.locator('#run-button');
        await runButton.click();

        const errorMessage = await page.locator('.error-message'); // Assuming there's an error message element
        await expect(errorMessage).toBeVisible();
    });

    test('should clear canvas on exit from idle state', async ({ page }) => {
        const canvas5 = await page.locator('#canvas5');
        await canvas.click({ position: { x: 50, y: 50 } });

        // Simulate exiting idle state
        await page.evaluate(() => {
            // Assuming a function to clear canvas exists
            clearCanvas();
        });

        const points2 = await page.evaluate(() => {
            const ctx4 = document.getElementById('canvas').getContext('2d');
            return ctx.__points; // Assuming points are stored in a way we can access
        });

        expect(points.length).toBe(0); // Verify canvas is cleared
    });
});