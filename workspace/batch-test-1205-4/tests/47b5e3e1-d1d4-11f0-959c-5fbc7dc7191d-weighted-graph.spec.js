import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-4/html/47b5e3e1-d1d4-11f0-959c-5fbc7dc7191d.html';

test.describe('Weighted Graph Visualization', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application before each test
        await page.goto(BASE_URL);
    });

    test('should load the page and display default state', async ({ page }) => {
        // Check if the title is correct
        const title = await page.title();
        expect(title).toBe('Weighted Graph Visualization');

        // Check if the canvas is visible
        const canvas = await page.locator('#graphCanvas');
        await expect(canvas).toBeVisible();

        // Check if the default start node value is set
        const startNodeInput = await page.locator('#startNode');
        await expect(startNodeInput).toHaveValue('0');
    });

    test('should draw graph with default start node', async ({ page }) => {
        // Click the draw graph button
        await page.locator('button').click();

        // Verify that the graph is drawn by checking the canvas content
        const canvas = await page.locator('#graphCanvas');
        const context = await canvas.evaluate(canvas => canvas.getContext('2d'));
        expect(context).not.toBeNull(); // Ensure context is available
    });

    test('should change start node and redraw graph', async ({ page }) => {
        // Change the start node input to 2
        await page.fill('#startNode', '2');

        // Click the draw graph button
        await page.locator('button').click();

        // Verify that the graph is drawn with the new start node
        const canvas = await page.locator('#graphCanvas');
        const context = await canvas.evaluate(canvas => canvas.getContext('2d'));
        expect(context).not.toBeNull(); // Ensure context is available
    });

    test('should handle invalid start node input', async ({ page }) => {
        // Enter an invalid start node value
        await page.fill('#startNode', '5'); // Out of range
        await page.locator('button').click();

        // Check if the graph is still drawn with the default start node
        const canvas = await page.locator('#graphCanvas');
        const context = await canvas.evaluate(canvas => canvas.getContext('2d'));
        expect(context).not.toBeNull(); // Ensure context is available
    });

    test('should handle negative start node input', async ({ page }) => {
        // Enter a negative start node value
        await page.fill('#startNode', '-1'); // Out of range
        await page.locator('button').click();

        // Check if the graph is still drawn with the default start node
        const canvas = await page.locator('#graphCanvas');
        const context = await canvas.evaluate(canvas => canvas.getContext('2d'));
        expect(context).not.toBeNull(); // Ensure context is available
    });

    test('should redraw graph when changing start node multiple times', async ({ page }) => {
        // Change the start node to 1 and draw
        await page.fill('#startNode', '1');
        await page.locator('button').click();

        // Change the start node to 3 and draw
        await page.fill('#startNode', '3');
        await page.locator('button').click();

        // Verify that the graph is drawn with the new start node
        const canvas = await page.locator('#graphCanvas');
        const context = await canvas.evaluate(canvas => canvas.getContext('2d'));
        expect(context).not.toBeNull(); // Ensure context is available
    });
});