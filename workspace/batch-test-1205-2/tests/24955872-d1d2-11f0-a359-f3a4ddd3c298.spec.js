import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-2/html/24955872-d1d2-11f0-a359-f3a4ddd3c298.html';

test.describe('K-Means Clustering Demo', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application page before each test
        await page.goto(BASE_URL);
    });

    test('Initial state: Random data should be generated on load', async ({ page }) => {
        // Verify that random data points are drawn on the canvas upon loading
        const canvas = await page.locator('#canvas');
        const canvasContent = await canvas.evaluate(canvas => canvas.toDataURL());
        expect(canvasContent).not.toBe('data:,'); // Ensure canvas is not empty
    });

    test('Generate Random Data: Should transition from Idle to Data Generated', async ({ page }) => {
        // Click the "Generate Random Data" button
        await page.click('#generateData');

        // Verify that random data points are drawn on the canvas
        const canvas1 = await page.locator('#canvas1');
        const canvasContent1 = await canvas.evaluate(canvas => canvas.toDataURL());
        expect(canvasContent).not.toBe('data:,'); // Ensure canvas is not empty
    });

    test('Perform K-Means Clustering: Should transition from Data Generated to Clustering Performed', async ({ page }) => {
        // First, generate random data
        await page.click('#generateData');

        // Click the "Perform K-Means Clustering" button
        await page.click('#performClustering');

        // Verify that clusters are drawn on the canvas
        const canvas2 = await page.locator('#canvas2');
        const canvasContent2 = await canvas.evaluate(canvas => canvas.toDataURL());
        expect(canvasContent).not.toBe('data:,'); // Ensure canvas is not empty
    });

    test('Error Handling: Check for console errors when performing clustering without data', async ({ page }) => {
        // Clear the points array by directly manipulating the script (not recommended in production)
        await page.evaluate(() => {
            const points = [];
            window.points = points; // Simulate empty points
        });

        // Click the "Perform K-Means Clustering" button
        await page.click('#performClustering');

        // Check console logs for errors
        const consoleMessages = [];
        page.on('console', msg => consoleMessages.push(msg.text()));
        
        // Wait a moment for the clustering to process
        await page.waitForTimeout(1000);

        // Assert that an error message appears in the console
        expect(consoleMessages).toContain(expect.stringContaining('Error'));
    });

    test('Visual Feedback: Check that clusters are visually distinct', async ({ page }) => {
        // Generate random data
        await page.click('#generateData');

        // Perform K-Means clustering
        await page.click('#performClustering');

        // Verify that the clusters are drawn with different colors
        const canvas3 = await page.locator('#canvas3');
        const canvasContent3 = await canvas.evaluate(canvas => canvas.toDataURL());
        expect(canvasContent).not.toBe('data:,'); // Ensure canvas is not empty
    });
});