import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/8c951310-d1d3-11f0-a698-d7b407715e1f.html';

test.describe('K-Means Clustering Application Tests', () => {
    
    test.beforeEach(async ({ page }) => {
        // Navigate to the K-Means Clustering application page before each test
        await page.goto(BASE_URL);
    });

    test('should load the page and display initial elements', async ({ page }) => {
        // Verify the title of the page
        await expect(page).toHaveTitle('K-Means Clustering Demo');
        
        // Check if the canvas and buttons are visible
        const canvas = page.locator('#canvas');
        const startButton = page.locator('#start');
        const resetButton = page.locator('#reset');

        await expect(canvas).toBeVisible();
        await expect(startButton).toBeVisible();
        await expect(resetButton).toBeVisible();
    });

    test('should reset the clustering points when reset button is clicked', async ({ page }) => {
        // Click the reset button
        await page.click('#reset');

        // Check if the canvas is cleared and points are drawn
        const canvas = page.locator('#canvas');
        const context = await canvas.evaluate(canvas => canvas.getContext('2d'));

        // Check if the context is cleared
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        expect(imageData.data.filter(value => value !== 0).length).toBe(0); // Ensure the canvas is cleared

        // Check if points are drawn (should be 30 random points)
        await expect(page.locator('canvas').locator('rect')).toHaveCount(30);
    });

    test('should start clustering when start button is clicked', async ({ page }) => {
        // Click the reset button to initialize points
        await page.click('#reset');

        // Click the start button
        await page.click('#start');

        // Verify that clustering has occurred by checking for cluster centers
        const canvas = page.locator('#canvas');
        const context = await canvas.evaluate(canvas => canvas.getContext('2d'));

        // Check if the context has drawn clusters
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        expect(imageData.data.filter(value => value === 255).length).toBeGreaterThan(0); // Expect some red pixels for clusters
    });

    test('should handle multiple resets and starts correctly', async ({ page }) => {
        // Click the reset button
        await page.click('#reset');

        // Click the start button
        await page.click('#start');

        // Verify clustering happened
        const canvas = page.locator('#canvas');
        const context = await canvas.evaluate(canvas => canvas.getContext('2d'));
        const initialImageData = context.getImageData(0, 0, canvas.width, canvas.height);

        // Click reset again
        await page.click('#reset');

        // Click start again
        await page.click('#start');

        // Verify that the canvas is not the same as before
        const newImageData = context.getImageData(0, 0, canvas.width, canvas.height);
        expect(initialImageData.data).not.toEqual(newImageData.data); // Expect different data
    });

    test('should show visual feedback on clustering', async ({ page }) => {
        // Click the reset button
        await page.click('#reset');

        // Click the start button
        await page.click('#start');

        // Check if clusters are drawn
        const canvas = page.locator('#canvas');
        const context = await canvas.evaluate(canvas => canvas.getContext('2d'));
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        
        // Expect some pixels to be red for cluster centers
        expect(imageData.data.filter((value, index) => index % 4 === 0 && value === 255).length).toBeGreaterThan(0); // Check for red pixels
    });

    test('should handle errors gracefully', async ({ page }) => {
        // Intentionally cause an error by modifying the script (not possible in this context)
        // Instead, we will just observe the console for errors during normal operation
        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.error('Error logged:', msg.text());
            }
        });

        // Click the reset button
        await page.click('#reset');

        // Click the start button
        await page.click('#start');

        // Check for console errors
        await expect(page).toHaveConsole('Error logged:'); // This is a placeholder for actual error checking
    });

    test.afterEach(async ({ page }) => {
        // Optional: Any cleanup can be done here after each test
    });
});