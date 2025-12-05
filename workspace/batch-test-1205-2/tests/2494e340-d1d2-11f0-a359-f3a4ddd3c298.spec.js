import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-2/html/2494e340-d1d2-11f0-a359-f3a4ddd3c298.html';

test.describe('Prim\'s Algorithm Visualization Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application page before each test
        await page.goto(BASE_URL);
    });

    test('Initial state is Idle', async ({ page }) => {
        // Validate that the initial state is Idle
        const resetButton = await page.locator('button[onclick="resetGraph()"]');
        const startButton = await page.locator('button[onclick="startPrim()"]');
        await expect(resetButton).toBeVisible();
        await expect(startButton).toBeVisible();
    });

    test('Reset Graph transitions to Graph Reset state', async ({ page }) => {
        // Click the Reset Graph button and verify the graph is reset
        await page.click('button[onclick="resetGraph()"]');
        const canvas = await page.locator('#canvas');
        const canvasContent = await canvas.evaluate(canvas => canvas.toDataURL());
        expect(canvasContent).toBe('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA...'); // Check for empty canvas
    });

    test('Start Prim\'s Algorithm transitions to Running Prim state', async ({ page }) => {
        // Click the Start Prim's Algorithm button and verify the state transition
        await page.click('button[onclick="startPrim()"]');
        const runningState = await page.evaluate(() => running);
        expect(runningState).toBe(true);
    });

    test('Adding a vertex while running Prim\'s Algorithm', async ({ page }) => {
        // Start Prim's Algorithm and then add a vertex
        await page.click('button[onclick="startPrim()"]');
        await page.click('#canvas', { position: { x: 100, y: 100 } });
        const verticesCount = await page.evaluate(() => vertices.length);
        expect(verticesCount).toBe(1); // Verify that one vertex has been added
    });

    test('Graph Reset clears all vertices and edges', async ({ page }) => {
        // Add a vertex, then reset the graph and verify it is cleared
        await page.click('#canvas', { position: { x: 150, y: 150 } });
        await page.click('button[onclick="resetGraph()"]');
        const verticesCount1 = await page.evaluate(() => vertices.length);
        const edgesCount = await page.evaluate(() => edges.length);
        expect(verticesCount).toBe(0); // Verify no vertices
        expect(edgesCount).toBe(0); // Verify no edges
    });

    test('Error handling when starting Prim\'s Algorithm with no vertices', async ({ page }) => {
        // Attempt to start Prim's Algorithm without any vertices and expect no state change
        await page.click('button[onclick="startPrim()"]');
        const runningState1 = await page.evaluate(() => running);
        expect(runningState).toBe(false); // Should not be running
    });

    test('Adding multiple vertices', async ({ page }) => {
        // Add multiple vertices and verify the count
        await page.click('#canvas', { position: { x: 200, y: 200 } });
        await page.click('#canvas', { position: { x: 250, y: 250 } });
        const verticesCount2 = await page.evaluate(() => vertices.length);
        expect(verticesCount).toBe(2); // Verify that two vertices have been added
    });

    test('Check visual feedback after adding vertices', async ({ page }) => {
        // Add a vertex and check if it is drawn on the canvas
        await page.click('#canvas', { position: { x: 300, y: 300 } });
        const canvas1 = await page.locator('#canvas1');
        const canvasContent1 = await canvas.evaluate(canvas => canvas.toDataURL());
        expect(canvasContent).not.toBe('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA...'); // Check for non-empty canvas
    });

    test.afterEach(async ({ page }) => {
        // Log any console errors after each test
        const consoleErrors = await page.evaluate(() => {
            return console.error ? console.error : null;
        });
        expect(consoleErrors).toBeNull();
    });
});