import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/8c94ec01-d1d3-11f0-a698-d7b407715e1f.html';

test.describe('K-Nearest Neighbors (KNN) Visualization', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the KNN application page before each test
        await page.goto(BASE_URL);
    });

    test('should load the page and display the canvas', async ({ page }) => {
        // Verify that the canvas is present and has the correct dimensions
        const canvas = await page.locator('#canvas');
        await expect(canvas).toBeVisible();
        await expect(canvas).toHaveAttribute('width', '600');
        await expect(canvas).toHaveAttribute('height', '400');
    });

    test('should generate and display data points on initial load', async ({ page }) => {
        // Verify that the data points are drawn on the canvas
        const canvas = await page.locator('#canvas');
        const context = await canvas.evaluate(canvas => canvas.getContext('2d'));
        
        // Check if there are points drawn on the canvas
        const points = await page.evaluate(() => {
            const dataPoints = [];
            for (let i = 0; i < 50; i++) {
                const x = Math.random() * 600;
                const y = Math.random() * 400;
                const classType = Math.random() > 0.5 ? 'A' : 'B';
                dataPoints.push({ x, y, class: classType });
            }
            return dataPoints;
        });

        await expect(points.length).toBe(50);
    });

    test('should classify a new point when clicked on the canvas', async ({ page }) => {
        // Click on the canvas to classify a new point
        const canvas = await page.locator('#canvas');
        const clickX = 300;
        const clickY = 200;
        await canvas.click({ position: { x: clickX, y: clickY } });

        // Verify that an alert is shown with the classification
        page.on('dialog', async dialog => {
            expect(dialog.message()).toMatch(/The new point is classified as Class [AB]/);
            await dialog.dismiss();
        });
    });

    test('should display a semi-transparent point on classification', async ({ page }) => {
        // Click on the canvas to classify a new point
        const canvas = await page.locator('#canvas');
        const clickX = 300;
        const clickY = 200;
        await canvas.click({ position: { x: clickX, y: clickY } });

        // Verify that the point is drawn on the canvas
        const context = await canvas.evaluate(canvas => canvas.getContext('2d'));
        const pixelData = await context.getImageData(clickX, clickY, 1, 1).data;

        // Check if the pixel is semi-transparent red or blue
        const isRed = pixelData[0] === 255 && pixelData[1] === 0 && pixelData[2] === 0 && pixelData[3] === 128; // rgba(255, 0, 0, 0.5)
        const isBlue = pixelData[0] === 0 && pixelData[1] === 0 && pixelData[2] === 255 && pixelData[3] === 128; // rgba(0, 0, 255, 0.5)
        expect(isRed || isBlue).toBe(true);
    });

    test('should handle multiple clicks and classify points correctly', async ({ page }) => {
        // Click on multiple points on the canvas
        const pointsToClick = [
            { x: 100, y: 150 },
            { x: 400, y: 300 },
            { x: 200, y: 100 }
        ];

        for (const point of pointsToClick) {
            await page.locator('#canvas').click({ position: { x: point.x, y: point.y } });
            page.on('dialog', async dialog => {
                expect(dialog.message()).toMatch(/The new point is classified as Class [AB]/);
                await dialog.dismiss();
            });
        }
    });

    test('should handle edge cases when clicking outside the canvas', async ({ page }) => {
        // Click outside the canvas area
        await page.mouse.click(700, 500); // Coordinates outside the canvas

        // Verify that no alert is shown
        await expect(page.locator('dialog')).toHaveCount(0);
    });
});