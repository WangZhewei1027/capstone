import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-3/html/b8b83531-d1d3-11f0-9bcf-07cd16c51572.html';

test.describe('Linear Regression Demo', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application before each test
        await page.goto(BASE_URL);
    });

    test('should load the page and display initial elements', async ({ page }) => {
        // Verify the title and presence of canvas and buttons
        await expect(page).toHaveTitle('Linear Regression Demo');
        await expect(page.locator('h1')).toBeVisible();
        await expect(page.locator('#canvas')).toBeVisible();
        await expect(page.locator('button:has-text("Generate Random Data")')).toBeVisible();
        await expect(page.locator('button:has-text("Perform Linear Regression")')).toBeVisible();
    });

    test('should generate random data and display points on canvas', async ({ page }) => {
        // Click the "Generate Random Data" button
        await page.click('button:has-text("Generate Random Data")');

        // Check that the canvas has been updated with data points
        const canvas = await page.locator('#canvas');
        const dataPoints = await canvas.evaluate(canvas => {
            const ctx = canvas.getContext('2d');
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            return imageData.data.filter((_, index) => index % 4 === 3).some(alpha => alpha > 0);
        });

        expect(dataPoints).toBe(true; // Expect that there are visible data points on the canvas
    });

    test('should perform linear regression and display the equation', async ({ page }) => {
        // Generate random data first
        await page.click('button:has-text("Generate Random Data")');

        // Click the "Perform Linear Regression" button
        await page.click('button:has-text("Perform Linear Regression")');

        // Check that the output contains the regression equation
        const outputText = await page.locator('#output').innerText();
        expect(outputText).toMatch(/Equation: y = [\d.-]+x \+ [\d.-]+/); // Expect the output to match the regression equation format
    });

    test('should handle multiple regression calculations', async ({ page }) => {
        // Generate random data and perform regression multiple times
        for (let i = 0; i < 3; i++) {
            await page.click('button:has-text("Generate Random Data")');
            await page.click('button:has-text("Perform Linear Regression")');

            // Check that the output contains the regression equation
            const outputText = await page.locator('#output').innerText();
            expect(outputText).toMatch(/Equation: y = [\d.-]+x \+ [\d.-]+/);
        }
    });

    test('should show visual feedback for regression line', async ({ page }) => {
        // Generate random data and perform regression
        await page.click('button:has-text("Generate Random Data")');
        await page.click('button:has-text("Perform Linear Regression")');

        // Check that the regression line is drawn on the canvas
        const canvas = await page.locator('#canvas');
        const hasRegressionLine = await canvas.evaluate(canvas => {
            const ctx = canvas.getContext('2d');
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            return imageData.data.some((_, index) => index % 4 === 0 && imageData.data[index] === 255); // Check for red color
        });

        expect(hasRegressionLine).toBe(true); // Expect that a red line is drawn
    });

    test('should handle errors gracefully', async ({ page }) => {
        // Click the "Perform Linear Regression" button without generating data
        await page.click('button:has-text("Perform Linear Regression")');

        // Check that the output does not contain an equation
        const outputText = await page.locator('#output').innerText();
        expect(outputText).not.toMatch(/Equation: y = [\d.-]+x \+ [\d.-]+/); // Expect no equation output
    });
});