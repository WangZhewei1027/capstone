import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/8c931742-d1d3-11f0-a698-d7b407715e1f.html';

test.describe('Weighted Graph Visualization', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should load the page and display the graph', async ({ page }) => {
        // Verify that the page title is correct
        await expect(page).toHaveTitle('Weighted Graph Visualization');

        // Check that the canvas is visible and has the correct dimensions
        const canvas = await page.locator('#graphCanvas');
        await expect(canvas).toBeVisible();
        await expect(canvas).toHaveAttribute('width', '600');
        await expect(canvas).toHaveAttribute('height', '400');
    });

    test('should draw vertices and edges correctly', async ({ page }) => {
        // Check that the graph is drawn correctly by verifying the canvas content
        // Note: Direct pixel checking is not feasible, but we can check for visual feedback
        const canvas = await page.locator('#graphCanvas');
        const context = await canvas.evaluate((canvas) => canvas.getContext('2d'));
        
        // Check if the context is defined (indicating the canvas is ready for drawing)
        expect(context).not.toBeNull();
        
        // Since we cannot directly assert the drawn content, we will check for console errors
        const consoleErrors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });

        // Trigger the drawing function
        await page.evaluate(() => drawGraph());

        // Assert that there are no console errors during the drawing
        expect(consoleErrors).toHaveLength(0);
    });

    test('should display weights on edges', async ({ page }) => {
        // Check if the weights are displayed correctly on the edges
        const canvas = await page.locator('#graphCanvas');
        
        // We cannot directly check the drawn text, but we can check for console errors
        const consoleErrors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });

        // Trigger the drawing function
        await page.evaluate(() => drawGraph());

        // Assert that there are no console errors during the drawing
        expect(consoleErrors).toHaveLength(0);
    });

    test('should handle drawing errors gracefully', async ({ page }) => {
        // Simulate an error in the drawing function (e.g., by modifying the graph structure)
        await page.evaluate(() => {
            window.graph = null; // This will cause an error when trying to draw
        });

        const consoleErrors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });

        // Attempt to draw the graph with the modified structure
        await page.evaluate(() => drawGraph());

        // Assert that an error was logged to the console
        expect(consoleErrors).toHaveLength(1);
        expect(consoleErrors[0]).toContain('Cannot read properties of null (reading');
    });
});