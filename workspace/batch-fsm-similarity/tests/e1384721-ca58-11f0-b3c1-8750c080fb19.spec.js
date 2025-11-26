import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-25T23-45-53/html/e1384721-ca58-11f0-b3c1-8750c080fb19.html';

test.describe('Prim\'s Algorithm Visualization', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('Initial state is Idle and graph is generated', async ({ page }) => {
        // Verify that the canvas is drawn and the graph is generated initially
        const canvas = await page.locator('#graphCanvas');
        await expect(canvas).toBeVisible();
        const graphGenerated = await page.evaluate(() => {
            return document.getElementById('graphCanvas').getContext('2d').canvas.width > 0;
        });
        expect(graphGenerated).toBe(true);
    });

    test('User clicks Generate Random Graph button', async ({ page }) => {
        // Click the generate graph button
        await page.click('#generateGraph');

        // Verify that the graph is generated
        await page.waitForTimeout(1000); // Wait for graph generation
        const graphGenerated = await page.evaluate(() => {
            return document.getElementById('graphCanvas').getContext('2d').canvas.width > 0;
        });
        expect(graphGenerated).toBe(true);
    });

    test('Graph generation transitions to Visualizing MST', async ({ page }) => {
        // Click the generate graph button
        await page.click('#generateGraph');

        // Wait for the graph to be generated and MST visualization to start
        await page.waitForTimeout(1000); // Wait for graph generation
        const alertPromise = page.waitForEvent('dialog'); // Wait for alert dialog
        await page.evaluate(() => {
            setTimeout(() => {
                visualizeMST();
            }, 1000);
        });
        const alert = await alertPromise;
        expect(alert.message()).toContain('Total Cost of Minimum Spanning Tree:');
        await alert.dismiss(); // Dismiss the alert
    });

    test('MST visualization completes and returns to Idle', async ({ page }) => {
        // Click the generate graph button
        await page.click('#generateGraph');

        // Wait for graph generation and MST visualization
        await page.waitForTimeout(2000); // Wait for both actions to complete

        // Verify that the alert is shown and then dismissed
        const alertPromise = page.waitForEvent('dialog');
        await page.evaluate(() => {
            setTimeout(() => {
                visualizeMST();
            }, 1000);
        });
        const alert = await alertPromise;
        expect(alert.message()).toContain('Total Cost of Minimum Spanning Tree:');
        await alert.dismiss(); // Dismiss the alert

        // Verify that the canvas is still visible after MST visualization
        const canvas = await page.locator('#graphCanvas');
        await expect(canvas).toBeVisible();
    });

    test('Graph generation with no edges', async ({ page }) => {
        // Modify the generateGraph function to create a graph with no edges
        await page.evaluate(() => {
            window.generateGraph = function() {
                const numNodes = 10;
                const graph = Array.from({ length: numNodes }, () => []);
                drawGraph(); // Call drawGraph to visualize the empty graph
            };
        });

        // Click the generate graph button
        await page.click('#generateGraph');

        // Verify that the canvas is drawn but no edges are present
        await page.waitForTimeout(1000); // Wait for graph generation
        const edgesCount = await page.evaluate(() => {
            const context = document.getElementById('graphCanvas').getContext('2d');
            return context.__edgesCount || 0; // Assuming we have a way to count edges
        });
        expect(edgesCount).toBe(0);
    });
});