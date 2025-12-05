import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-3/html/b8b85c40-d1d3-11f0-9bcf-07cd16c51572.html';

test.describe('K-Means Clustering Application', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the K-Means Clustering application
        await page.goto(BASE_URL);
    });

    test('should load the page and display initial elements', async ({ page }) => {
        // Verify the title of the page
        await expect(page).toHaveTitle('K-Means Clustering Demonstration');
        
        // Check if the canvas and button are visible
        const canvas = await page.locator('#canvas');
        const button = await page.locator('#kmeans');
        await expect(canvas).toBeVisible();
        await expect(button).toBeVisible();
        
        // Check if the result div is initially empty
        const resultDiv = await page.locator('#result');
        await expect(resultDiv).toHaveText('');
    });

    test('should draw points on canvas when clicked', async ({ page }) => {
        // Click on the canvas to add a point
        const canvas = await page.locator('#canvas');
        await canvas.click({ position: { x: 250, y: 200 } });

        // Verify that the point is drawn (check for black point)
        const drawnPoint = await page.evaluate(() => {
            const ctx = document.getElementById('canvas').getContext('2d');
            const imageData = ctx.getImageData(250, 200, 1, 1).data;
            return imageData[0] === 0 && imageData[1] === 0 && imageData[2] === 0; // Check if the pixel is black
        });
        expect(drawnPoint).toBe(true);
    });

    test('should run K-Means clustering and update result', async ({ page }) => {
        // Click on the canvas to add points
        const canvas = await page.locator('#canvas');
        await canvas.click({ position: { x: 100, y: 100 } });
        await canvas.click({ position: { x: 200, y: 200 } });
        await canvas.click({ position: { x: 300, y: 300 } });

        // Click the K-Means button to run clustering
        const button = await page.locator('#kmeans');
        await button.click();

        // Verify that the result div is updated with the correct text
        const resultDiv = await page.locator('#result');
        await expect(resultDiv).toHaveText(/3 points clustered into 3 clusters/);
    });

    test('should handle multiple clicks and clustering', async ({ page }) => {
        // Click on the canvas multiple times to add points
        const canvas = await page.locator('#canvas');
        await canvas.click({ position: { x: 50, y: 50 } });
        await canvas.click({ position: { x: 150, y: 150 } });
        await canvas.click({ position: { x: 250, y: 250 } });
        await canvas.click({ position: { x: 350, y: 350 } });

        // Click the K-Means button to run clustering
        const button = await page.locator('#kmeans');
        await button.click();

        // Verify that the result div reflects the number of points added
        const resultDiv = await page.locator('#result');
        await expect(resultDiv).toHaveText(/4 points clustered into 3 clusters/);
    });

    test('should handle edge case of no points', async ({ page }) => {
        // Click the K-Means button without adding any points
        const button = await page.locator('#kmeans');
        await button.click();

        // Verify that the result div is updated with zero points
        const resultDiv = await page.locator('#result');
        await expect(resultDiv).toHaveText(/0 points clustered into 3 clusters/);
    });

    test('should handle canvas clicks and clustering correctly', async ({ page }) => {
        // Click on the canvas to add points
        const canvas = await page.locator('#canvas');
        await canvas.click({ position: { x: 100, y: 100 } });
        await canvas.click({ position: { x: 400, y: 300 } });

        // Click the K-Means button to run clustering
        const button = await page.locator('#kmeans');
        await button.click();

        // Verify that the result div is updated with the correct number of points
        const resultDiv = await page.locator('#result');
        await expect(resultDiv).toHaveText(/2 points clustered into 3 clusters/);
    });
});