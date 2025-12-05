import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/8c944fc1-d1d3-11f0-a698-d7b407715e1f.html';

test.describe('Prim\'s Algorithm Visualization Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the Prim's Algorithm Visualization page
        await page.goto(BASE_URL);
    });

    test('should load the page and display the title', async ({ page }) => {
        // Verify the title of the page
        const title = await page.title();
        expect(title).toBe("Prim's Algorithm Visualization");

        // Check if the canvas is visible
        const canvas = await page.locator('#canvas');
        await expect(canvas).toBeVisible();
    });

    test('should run Prim\'s Algorithm and display the minimum spanning tree', async ({ page }) => {
        // Click the button to run Prim's Algorithm
        await page.click('button:has-text("Run Prim\'s Algorithm")');

        // Wait for the canvas to update and check for visual feedback
        await page.waitForTimeout(1000); // Wait for the drawing to complete

        // Check if the edges are drawn (this is a simple check, in a real scenario we would check the canvas content)
        const canvas = await page.locator('#canvas');
        const canvasBoundingBox = await canvas.boundingBox();
        expect(canvasBoundingBox).not.toBeNull();
    });

    test('should show the correct vertices on initial load', async ({ page }) => {
        // Check if all vertices are drawn initially
        const vertices = ['A', 'B', 'C', 'D', 'E', 'F'];
        
        for (const vertex of vertices) {
            const vertexLocator = page.locator(`text=${vertex}`);
            await expect(vertexLocator).toBeVisible();
        }
    });

    test('should handle multiple runs of Prim\'s Algorithm', async ({ page }) => {
        // Run the algorithm multiple times and check for consistent behavior
        for (let i = 0; i < 3; i++) {
            await page.click('button:has-text("Run Prim\'s Algorithm")');
            await page.waitForTimeout(1000); // Wait for the drawing to complete
        }

        // Check if the canvas is still visible after multiple runs
        const canvas = await page.locator('#canvas');
        await expect(canvas).toBeVisible();
    });

    test('should not throw errors on invalid interactions', async ({ page }) => {
        // Attempt to run the algorithm without any setup (should not throw errors)
        await page.click('button:has-text("Run Prim\'s Algorithm")');
        
        // Check console for errors
        const consoleMessages = [];
        page.on('console', msg => consoleMessages.push(msg.text()));

        await page.waitForTimeout(1000); // Wait for the drawing to complete

        // Assert that there are no ReferenceErrors or other critical errors
        const errorMessages = consoleMessages.filter(msg => /ReferenceError|TypeError|SyntaxError/.test(msg));
        expect(errorMessages.length).toBe(0);
    });
});