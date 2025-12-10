import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/8c9428b0-d1d3-11f0-a698-d7b407715e1f.html';

test.describe('Dijkstra\'s Algorithm Visualization', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application page before each test
        await page.goto(BASE_URL);
    });

    test('should load the page and display the canvas', async ({ page }) => {
        // Verify that the canvas is visible on initial load
        const canvas = await page.locator('canvas#canvas');
        await expect(canvas).toBeVisible();
    });

    test('should create a graph on initial load', async ({ page }) => {
        // Verify that the graph is drawn on the canvas after creation
        const canvas = await page.locator('canvas#canvas');
        const initialImage = await canvas.screenshot();
        await expect(initialImage).not.toBeNull();
    });

    test('should run Dijkstra\'s algorithm and visualize the path', async ({ page }) => {
        // Click the button to run Dijkstra's algorithm
        await page.click('button:has-text("Run Dijkstra\'s Algorithm")');

        // Wait for a moment to allow the algorithm to run and visualize the path
        await page.waitForTimeout(2000); // Adjust timeout as necessary

        // Verify that the path is drawn on the canvas
        const canvas = await page.locator('canvas#canvas');
        const afterRunImage = await canvas.screenshot();
        await expect(afterRunImage).not.toEqual(await canvas.screenshot());
    });

    test('should reset the canvas and create a new graph', async ({ page }) => {
        // Run Dijkstra's algorithm first
        await page.click('button:has-text("Run Dijkstra\'s Algorithm")');
        await page.waitForTimeout(2000); // Wait for visualization

        // Click the reset button
        await page.click('button:has-text("Reset")');

        // Verify that the canvas is cleared and a new graph is created
        const canvas = await page.locator('canvas#canvas');
        const resetImage = await canvas.screenshot();
        await expect(resetImage).not.toEqual(await canvas.screenshot());
    });

    test('should handle multiple runs of Dijkstra\'s algorithm', async ({ page }) => {
        // Run Dijkstra's algorithm multiple times
        for (let i = 0; i < 3; i++) {
            await page.click('button:has-text("Run Dijkstra\'s Algorithm")');
            await page.waitForTimeout(2000); // Wait for visualization
            await page.click('button:has-text("Reset")');
        }

        // Verify that the canvas is cleared and a new graph is created each time
        const canvas = await page.locator('canvas#canvas');
        const finalImage = await canvas.screenshot();
        await expect(finalImage).not.toEqual(await canvas.screenshot());
    });

    test('should not throw errors during execution', async ({ page }) => {
        // Check for console errors during the execution of the algorithm
        page.on('console', msg => {
            if (msg.type() === 'error') {
                throw new Error(`Console error: ${msg.text()}`);
            }
        });

        // Run Dijkstra's algorithm
        await page.click('button:has-text("Run Dijkstra\'s Algorithm")');
        await page.waitForTimeout(2000); // Wait for visualization
    });
});