import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/15e0b490-bcac-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Depth-First Search Visualization', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application before each test
        await page.goto(BASE_URL);
    });

    test('should be in idle state initially', async ({ page }) => {
        // Validate that the initial state is idle
        const startButton = await page.locator('#startDFS');
        await expect(startButton).toBeVisible();
    });

    test('should transition to running state on START_DFS', async ({ page }) => {
        // Click the Start DFS button to transition to running state
        await page.click('#startDFS');
        // Validate that the DFS is running (you may need to check for visual feedback)
        // Assuming there's a visual change or message indicating running state
        // For example, checking if the button is disabled or some text appears
        await expect(page.locator('#startDFS')).toBeDisabled();
    });

    test('should transition to drawing state on TOGGLE_DRAW_MODE', async ({ page }) => {
        // Click the Start DFS button first
        await page.click('#startDFS');
        // Now toggle drawing mode (assuming there's a way to do this, e.g., a button)
        // For demonstration, let's assume we have a button with id 'toggleDrawMode'
        await page.click('#toggleDrawMode'); // This button needs to be added in the HTML
        // Validate that we are in drawing mode
        // Check for visual feedback or state change
        await expect(page.locator('#graphCanvas')).toHaveCSS('cursor', 'crosshair'); // Example check
    });

    test('should add a node on CLICK_CANVAS when in drawing mode', async ({ page }) => {
        // Click the Start DFS button to transition to running state
        await page.click('#startDFS');
        // Toggle drawing mode
        await page.click('#toggleDrawMode'); // This button needs to be added in the HTML
        // Click on the canvas to add a node
        const canvas = page.locator('#graphCanvas');
        await canvas.click({ position: { x: 50, y: 50 } });
        // Validate that a node was added
        const nodes = await page.locator('.node').count();
        await expect(nodes).toBeGreaterThan(0);
    });

    test('should add an edge on CLICK_CANVAS when selecting nodes', async ({ page }) => {
        // Click the Start DFS button to transition to running state
        await page.click('#startDFS');
        // Toggle drawing mode to add nodes
        await page.click('#toggleDrawMode'); // This button needs to be added in the HTML
        // Add two nodes
        const canvas1 = page.locator('#graphCanvas');
        await canvas.click({ position: { x: 50, y: 50 } });
        await canvas.click({ position: { x: 100, y: 100 } });
        // Now select the first node
        await canvas.click({ position: { x: 50, y: 50 } });
        // Click on the second node to create an edge
        await canvas.click({ position: { x: 100, y: 100 } });
        // Validate that an edge was created
        const edges = await page.locator('.edge').count();
        await expect(edges).toBeGreaterThan(0);
    });

    test('should return to idle state on DFS_COMPLETE', async ({ page }) => {
        // Click the Start DFS button to transition to running state
        await page.click('#startDFS');
        // Simulate DFS complete event
        // This might require triggering a function in the application, which is not shown in the HTML
        // For demonstration, we will assume there's a way to simulate this
        await page.evaluate(() => {
            // Simulate DFS completion
            document.dispatchEvent(new Event('DFS_COMPLETE'));
        });
        // Validate that we are back in idle state
        const startButton1 = await page.locator('#startDFS');
        await expect(startButton).toBeVisible();
    });

    test('should toggle drawing mode on RIGHT_CLICK', async ({ page }) => {
        // Click the Start DFS button to transition to running state
        await page.click('#startDFS');
        // Toggle drawing mode
        await page.click('#toggleDrawMode'); // This button needs to be added in the HTML
        // Right click on the canvas to toggle drawing mode
        const canvas2 = page.locator('#graphCanvas');
        await canvas.click({ button: 'right' });
        // Validate that drawing mode is toggled off
        await expect(canvas).toHaveCSS('cursor', 'default'); // Example check
    });

    test('should return to idle state on CLICK_NODE', async ({ page }) => {
        // Click the Start DFS button to transition to running state
        await page.click('#startDFS');
        // Toggle drawing mode to add nodes
        await page.click('#toggleDrawMode'); // This button needs to be added in the HTML
        // Add a node
        const canvas3 = page.locator('#graphCanvas');
        await canvas.click({ position: { x: 50, y: 50 } });
        // Click on the node to return to idle state
        await canvas.click({ position: { x: 50, y: 50 } });
        // Validate that we are back in idle state
        const nodes1 = await page.locator('.node').count();
        await expect(nodes).toBe(0); // Assuming clicking a node removes it
    });

    test('should handle right click correctly', async ({ page }) => {
        // Click the Start DFS button to transition to running state
        await page.click('#startDFS');
        // Right click on the canvas
        const canvas4 = page.locator('#graphCanvas');
        await canvas.click({ button: 'right' });
        // Validate that we are back in idle state
        await expect(canvas).toHaveCSS('cursor', 'default'); // Example check
    });
});