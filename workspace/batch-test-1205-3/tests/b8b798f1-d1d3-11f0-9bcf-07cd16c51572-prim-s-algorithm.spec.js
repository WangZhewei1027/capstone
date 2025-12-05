import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-3/html/b8b798f1-d1d3-11f0-9bcf-07cd16c51572.html';

test.describe('Prim\'s Algorithm Visualization Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application page before each test
        await page.goto(BASE_URL);
    });

    test('should load the page and display the canvas', async ({ page }) => {
        // Verify that the title is correct
        await expect(page).toHaveTitle("Prim's Algorithm Visualization");
        
        // Check that the canvas is visible
        const canvas = await page.locator('#canvas');
        await expect(canvas).toBeVisible();

        // Check that the button is visible
        const button = await page.locator('button');
        await expect(button).toBeVisible();
    });

    test('should run Prim\'s algorithm and update the canvas', async ({ page }) => {
        // Click the button to run Prim's algorithm
        await page.click('button');

        // Wait for a short duration to allow the algorithm to process
        await page.waitForTimeout(1000);

        // Check that the canvas has been updated (this can be done by checking colors or other visual changes)
        const canvas = await page.locator('#canvas');
        const context = await canvas.evaluate(canvas => canvas.getContext('2d'));
        
        // Check if the first vertex is green (indicating it was visited)
        const firstVertexColor = await context.getImageData(100, 100, 1, 1).data;
        expect(firstVertexColor).toEqual([0, 128, 0, 255]); // Expecting green color

        // Check if at least one edge is drawn in red (indicating part of the MST)
        const edgeColor = await context.getImageData(300, 300, 1, 1).data; // Check a point where an edge should be
        expect(edgeColor).toEqual([255, 0, 0, 255]); // Expecting red color
    });

    test('should handle no edges case gracefully', async ({ page }) => {
        // Simulate a scenario where there are no edges (not implemented in the provided code but for testing purposes)
        // This would require modifying the edges array in a real scenario, but for our test, we will just check for errors
        await page.evaluate(() => {
            window.edges = []; // Simulating no edges
            window.runPrim(); // Run the algorithm
        });

        // Check for console errors
        const consoleErrors = await page.evaluate(() => {
            return window.console.error.calls; // Assuming we have a way to capture console errors
        });
        
        expect(consoleErrors.length).toBeGreaterThan(0); // Expecting some error to be logged
    });

    test('should maintain state after multiple runs', async ({ page }) => {
        // Run Prim's algorithm multiple times
        await page.click('button');
        await page.waitForTimeout(1000);
        await page.click('button');
        await page.waitForTimeout(1000);

        // Check if the state is consistent
        const canvas = await page.locator('#canvas');
        const context = await canvas.evaluate(canvas => canvas.getContext('2d'));
        
        // Check if the first vertex is still green after multiple runs
        const firstVertexColor = await context.getImageData(100, 100, 1, 1).data;
        expect(firstVertexColor).toEqual([0, 128, 0, 255]); // Expecting green color
    });
});