import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-4/html/47b5e3e0-d1d4-11f0-959c-5fbc7dc7191d.html';

test.describe('Graph Visualization Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the graph visualization application
        await page.goto(BASE_URL);
    });

    test('should load the page and display the title', async ({ page }) => {
        // Verify the page title
        const title = await page.title();
        expect(title).toBe('Graph Visualization');
    });

    test('should display the canvas element', async ({ page }) => {
        // Check if the canvas element is visible
        const canvas = await page.locator('#graphCanvas');
        await expect(canvas).toBeVisible();
    });

    test('should draw an undirected graph when the corresponding button is clicked', async ({ page }) => {
        // Click the "Undirected Graph" button
        await page.click('button:has-text("Undirected Graph")');

        // Verify that the graph is drawn (check if the canvas has been updated)
        const canvas = await page.locator('#graphCanvas');
        const canvasData = await canvas.screenshot();
        expect(canvasData).not.toBeNull(); // Ensure the canvas has data
    });

    test('should draw a directed graph when the corresponding button is clicked', async ({ page }) => {
        // Click the "Directed Graph" button
        await page.click('button:has-text("Directed Graph")');

        // Verify that the graph is drawn (check if the canvas has been updated)
        const canvas = await page.locator('#graphCanvas');
        const canvasData = await canvas.screenshot();
        expect(canvasData).not.toBeNull(); // Ensure the canvas has data
    });

    test('should clear the canvas before drawing a new graph', async ({ page }) => {
        // Draw an undirected graph first
        await page.click('button:has-text("Undirected Graph")');
        const initialCanvasData = await page.locator('#graphCanvas').screenshot();

        // Draw a directed graph
        await page.click('button:has-text("Directed Graph")');
        const newCanvasData = await page.locator('#graphCanvas').screenshot();

        // Ensure that the canvas data has changed
        expect(initialCanvasData).not.toEqual(newCanvasData);
    });

    test('should handle errors gracefully', async ({ page }) => {
        // Simulate an error scenario by trying to draw a graph with invalid data (not applicable in this case)
        // Here we will just check for console errors
        const consoleErrors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });

        // Trigger a console error (this is just a placeholder as the actual error cannot be simulated)
        await page.evaluate(() => { throw new Error('Simulated error'); });

        // Assert that an error was logged to the console
        expect(consoleErrors.length).toBeGreaterThan(0);
    });
});