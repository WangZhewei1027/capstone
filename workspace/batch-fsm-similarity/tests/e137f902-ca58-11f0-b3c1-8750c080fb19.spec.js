import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-25T23-45-53/html/e137f902-ca58-11f0-b3c1-8750c080fb19.html';

test.describe('BFS Visualization Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the BFS Visualization application before each test
        await page.goto(BASE_URL);
    });

    test('Initial state is Idle', async ({ page }) => {
        // Verify that the application starts in the Idle state
        const input = await page.locator('#edgesInput');
        const startButton = await page.locator('button[onclick="startBFS()"]');
        const clearButton = await page.locator('button[onclick="clearCanvas()"]');

        await expect(input).toBeEnabled();
        await expect(startButton).toBeEnabled();
        await expect(clearButton).toBeEnabled();
    });

    test('Start BFS with empty input does not change state', async ({ page }) => {
        // Attempt to start BFS with empty input
        await page.click('button[onclick="startBFS()"]');

        // Verify that the state remains Idle
        const input = await page.locator('#edgesInput');
        const startButton = await page.locator('button[onclick="startBFS()"]');

        await expect(input).toBeEnabled();
        await expect(startButton).toBeEnabled();
    });

    test('Start BFS with valid input transitions to ReadingInput', async ({ page }) => {
        // Enter valid edges and start BFS
        await page.fill('#edgesInput', 'A-B, A-C, B-D');
        await page.click('button[onclick="startBFS()"]');

        // Verify that the input is read and the state transitions to DrawingGraph
        await expect(page.locator('#graphCanvas')).toBeVisible();
        await expect(page.locator('text=Drawing')).toBeVisible(); // Assuming some visual feedback is shown
    });

    test('BFS processing after drawing the graph', async ({ page }) => {
        // Enter valid edges and start BFS
        await page.fill('#edgesInput', 'A-B, A-C, B-D');
        await page.click('button[onclick="startBFS()"]');

        // Wait for the graph to be drawn
        await page.waitForTimeout(1000); // Adjust based on actual drawing time

        // Verify BFS processing starts
        await expect(page.locator('text=BFS Processing')).toBeVisible(); // Assuming some visual feedback is shown
    });

    test('Clear button resets the application', async ({ page }) => {
        // Enter valid edges and start BFS
        await page.fill('#edgesInput', 'A-B, A-C, B-D');
        await page.click('button[onclick="startBFS()"]');

        // Clear the canvas
        await page.click('button[onclick="clearCanvas()"]');

        // Verify that the input is cleared and the canvas is empty
        const input = await page.locator('#edgesInput');
        await expect(input).toHaveValue('');
        await expect(page.locator('#graphCanvas')).toHaveCount(0);
    });

    test('Clear button should enable input and start button', async ({ page }) => {
        // Enter valid edges and start BFS
        await page.fill('#edgesInput', 'A-B, A-C, B-D');
        await page.click('button[onclick="startBFS()"]');

        // Clear the canvas
        await page.click('button[onclick="clearCanvas()"]');

        // Verify that the input and start button are enabled
        const input = await page.locator('#edgesInput');
        const startButton = await page.locator('button[onclick="startBFS()"]');

        await expect(input).toBeEnabled();
        await expect(startButton).toBeEnabled();
    });

    test('BFS visualization handles invalid input gracefully', async ({ page }) => {
        // Enter invalid edges
        await page.fill('#edgesInput', 'A-B-C');
        await page.click('button[onclick="startBFS()"]');

        // Verify that the application does not crash and remains in the DrawingGraph state
        await expect(page.locator('#graphCanvas')).toBeVisible();
        await expect(page.locator('text=Error')).toBeVisible(); // Assuming some error feedback is shown
    });
});