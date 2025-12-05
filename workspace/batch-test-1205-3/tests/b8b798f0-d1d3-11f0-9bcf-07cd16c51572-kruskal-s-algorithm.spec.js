import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-3/html/b8b798f0-d1d3-11f0-9bcf-07cd16c51572.html';

test.describe('Kruskal\'s Algorithm Visualization', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application page before each test
        await page.goto(BASE_URL);
    });

    test('should load the page and display the canvas', async ({ page }) => {
        // Verify that the page loads correctly
        await expect(page).toHaveTitle("Kruskal's Algorithm Visualization");
        const canvas = await page.locator('#graphCanvas');
        await expect(canvas).toBeVisible();
    });

    test('should display the output div', async ({ page }) => {
        // Check that the output div is present and visible
        const outputDiv = await page.locator('#output');
        await expect(outputDiv).toBeVisible();
        await expect(outputDiv).toHaveText('');
    });

    test('should run Kruskal\'s algorithm and update the output', async ({ page }) => {
        // Click the button to run the algorithm
        await page.click('button');

        // Verify that the output is updated with the correct MST edges
        const outputDiv = await page.locator('#output');
        await expect(outputDiv).toHaveText(/Minimum Spanning Tree Edges: \d+, \d+, \d+/);
    });

    test('should draw edges correctly on the canvas', async ({ page }) => {
        // Click the button to run the algorithm
        await page.click('button');

        // Check that the canvas has drawn the edges
        const canvas = await page.locator('#graphCanvas');
        const canvasHandle = await canvas.evaluate((canvas) => canvas);
        
        // Check if the canvas has drawn something (this is a basic check)
        const context = canvasHandle.getContext('2d');
        const imageData = context.getImageData(0, 0, canvasHandle.width, canvasHandle.height);
        expect(imageData.data.some(value => value !== 0)).toBeTruthy(); // Check if any pixel is drawn
    });

    test('should handle errors gracefully', async ({ page }) => {
        // Intentionally cause an error by modifying the script (not applicable here, just a placeholder)
        // This is where you would check for console errors if applicable.
        // For example, you can check for ReferenceErrors or other expected errors.
        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.log('Error message:', msg.text());
            }
        });

        // Click the button to run the algorithm
        await page.click('button');

        // Here we would normally assert for specific errors if they were expected.
        // Since we are not modifying the code, we will just log the errors.
    });
});