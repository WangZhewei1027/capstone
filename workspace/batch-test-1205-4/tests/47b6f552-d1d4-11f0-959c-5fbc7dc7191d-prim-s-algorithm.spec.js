import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-4/html/47b6f552-d1d4-11f0-959c-5fbc7dc7191d.html';

test.describe('Prim\'s Algorithm Visualization', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application before each test
        await page.goto(BASE_URL);
    });

    test('should load the page with correct title and elements', async ({ page }) => {
        // Verify the title of the page
        await expect(page).toHaveTitle("Prim's Algorithm Visualization");
        
        // Check if the canvas and button are present
        const canvas = await page.locator('#canvas');
        const button = await page.locator('button');

        await expect(canvas).toBeVisible();
        await expect(button).toBeVisible();
        await expect(button).toHaveText("Start Prim's Algorithm");
    });

    test('should start Prim\'s Algorithm and visualize the MST', async ({ page }) => {
        // Click the button to start the algorithm
        await page.click('button');

        // Wait for the edges to be highlighted
        await page.waitForTimeout(1000); // Wait for the first edge to be highlighted

        // Check if the selected edge is visible
        const selectedEdges = await page.locator('.selected');
        await expect(selectedEdges).toHaveCount(1); // Initially, one edge should be selected

        // Wait for the next edge to be highlighted
        await page.waitForTimeout(1000);
        await expect(selectedEdges).toHaveCount(2); // Now two edges should be selected

        // Wait for the next edge to be highlighted
        await page.waitForTimeout(1000);
        await expect(selectedEdges).toHaveCount(3); // Now three edges should be selected
    });

    test('should log the Minimum Spanning Tree edges in the console', async ({ page }) => {
        // Intercept console messages to verify the output
        const consoleMessages = [];
        page.on('console', msg => consoleMessages.push(msg.text()));

        // Start the algorithm
        await page.click('button');

        // Wait for the algorithm to finish
        await page.waitForTimeout(8000); // Wait for enough time for the algorithm to complete

        // Check if the console logs the MST edges
        await expect(consoleMessages).toContain('Minimum Spanning Tree Edges:');
    });

    test('should handle errors gracefully', async ({ page }) => {
        // Trigger an error by manipulating the DOM or calling a function that doesn't exist
        await page.evaluate(() => {
            // This will cause a ReferenceError since `nonExistentFunction` is not defined
            try {
                nonExistentFunction();
            } catch (e) {
                console.error(e);
            }
        });

        // Check for console errors
        const consoleErrors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });

        // Wait for a moment to capture console errors
        await page.waitForTimeout(1000);
        await expect(consoleErrors).toHaveLength(1); // Expect one error to be logged
    });
});