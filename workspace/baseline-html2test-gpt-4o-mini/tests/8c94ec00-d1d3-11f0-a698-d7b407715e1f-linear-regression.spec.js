import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/8c94ec00-d1d3-11f0-a698-d7b407715e1f.html';

test.describe('Linear Regression Demonstration', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application before each test
        await page.goto(BASE_URL);
    });

    test('should load the page with default state', async ({ page }) => {
        // Check if the title is correct
        await expect(page).toHaveTitle('Linear Regression Demonstration');

        // Verify that the canvas and buttons are present
        const canvas = await page.locator('#regressionCanvas');
        await expect(canvas).toBeVisible();

        const clearButton = await page.locator('#clearButton');
        await expect(clearButton).toBeVisible();

        // Check that the equation and data points are initially empty
        await expect(page.locator('#equation')).toHaveText('');
        await expect(page.locator('#dataPoints')).toHaveText('');
    });

    test('should add data points on canvas click', async ({ page }) => {
        // Click on the canvas to add a data point
        const canvas = await page.locator('#regressionCanvas');
        await canvas.click({ position: { x: 100, y: 200 } });

        // Verify that the data point is added to the list
        await expect(page.locator('#dataPoints')).toHaveText('(100, 200)');

        // Verify that the equation is updated
        await expect(page.locator('#equation')).not.toHaveText('');
    });

    test('should clear data points when clear button is clicked', async ({ page }) => {
        // Add a data point
        const canvas = await page.locator('#regressionCanvas');
        await canvas.click({ position: { x: 150, y: 250 } });

        // Verify that the data point is added
        await expect(page.locator('#dataPoints')).toHaveText('(150, 250)');

        // Click the clear button
        const clearButton = await page.locator('#clearButton');
        await clearButton.click();

        // Verify that the data points list and equation are cleared
        await expect(page.locator('#dataPoints')).toHaveText('');
        await expect(page.locator('#equation')).toHaveText('');
    });

    test('should handle multiple data points correctly', async ({ page }) => {
        // Add multiple data points
        const canvas = await page.locator('#regressionCanvas');
        await canvas.click({ position: { x: 100, y: 200 } });
        await canvas.click({ position: { x: 200, y: 300 } });
        await canvas.click({ position: { x: 300, y: 100 } });

        // Verify that all data points are added
        await expect(page.locator('#dataPoints')).toHaveText('(100, 200)');
        await expect(page.locator('#dataPoints')).toHaveText('(200, 300)');
        await expect(page.locator('#dataPoints')).toHaveText('(300, 100)');

        // Verify that the equation is updated
        await expect(page.locator('#equation')).not.toHaveText('');
    });

    test('should not display equation with less than two points', async ({ page }) => {
        // Click on the canvas to add a single data point
        const canvas = await page.locator('#regressionCanvas');
        await canvas.click({ position: { x: 100, y: 200 } });

        // Verify that the equation is empty
        await expect(page.locator('#equation')).toHaveText('');

        // Click the clear button
        const clearButton = await page.locator('#clearButton');
        await clearButton.click();

        // Verify that the equation remains empty
        await expect(page.locator('#equation')).toHaveText('');
    });

    test('should handle edge cases for canvas clicks', async ({ page }) => {
        // Click on the canvas at an edge position
        const canvas = await page.locator('#regressionCanvas');
        await canvas.click({ position: { x: 0, y: 0 } });

        // Verify that a point is added
        await expect(page.locator('#dataPoints')).toHaveText('(0, 0)');

        // Click on the canvas at another edge position
        await canvas.click({ position: { x: 600, y: 400 } });

        // Verify that the second point is added
        await expect(page.locator('#dataPoints')).toHaveText('(600, 400)');
    });

    test('should handle invalid clicks outside the canvas', async ({ page }) => {
        // Click outside the canvas
        await page.mouse.click(700, 500); // Assuming this is outside the canvas

        // Verify that no data points are added
        await expect(page.locator('#dataPoints')).toHaveText('');
    });
});