import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/8c931741-d1d3-11f0-a698-d7b407715e1f.html';

test.describe('Graph Visualization Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the graph visualization application
        await page.goto(BASE_URL);
    });

    test('should load the page and display initial elements', async ({ page }) => {
        // Check if the title is correct
        await expect(page.title()).resolves.toBe('Graph Visualization');

        // Verify that the graph container is present
        const graphContainer = await page.locator('#graph-container');
        await expect(graphContainer).toBeVisible();

        // Verify that the graph type select box has options
        const graphTypeSelect = await page.locator('#graph-type');
        await expect(graphTypeSelect).toBeVisible();
        await expect(graphTypeSelect).toHaveCount(2);
    });

    test('should draw an undirected graph when selected', async ({ page }) => {
        // Select "Undirected" from the dropdown
        await page.selectOption('#graph-type', 'undirected');

        // Click the "Draw Graph" button
        await page.click('#draw-graph');

        // Verify that nodes are drawn
        const nodes = await page.locator('.node');
        await expect(nodes).toHaveCount(6); // Expecting 6 nodes

        // Verify that edges are drawn
        const edges = await page.locator('.edge');
        await expect(edges).toBeVisible();
    });

    test('should draw a directed graph when selected', async ({ page }) => {
        // Select "Directed" from the dropdown
        await page.selectOption('#graph-type', 'directed');

        // Click the "Draw Graph" button
        await page.click('#draw-graph');

        // Verify that nodes are drawn
        const nodes = await page.locator('.node');
        await expect(nodes).toHaveCount(6); // Expecting 6 nodes

        // Verify that edges are drawn
        const edges = await page.locator('.edge');
        await expect(edges).toBeVisible();

        // Check for arrowheads indicating directed edges
        const arrows = await page.locator('div[style*="clipPath"]');
        await expect(arrows).toBeVisible();
        await expect(arrows).toHaveCount(edges.count()); // Each edge should have an arrow
    });

    test('should clear previous graph and draw a new one', async ({ page }) => {
        // Draw the first graph
        await page.click('#draw-graph');
        const initialNodes = await page.locator('.node');
        await expect(initialNodes).toHaveCount(6);

        // Draw the graph again
        await page.click('#draw-graph');
        const newNodes = await page.locator('.node');
        await expect(newNodes).toHaveCount(6); // Expecting 6 new nodes

        // Ensure the new nodes are different from the initial nodes
        await expect(initialNodes).not.toEqual(newNodes);
    });

    test('should handle edge cases gracefully', async ({ page }) => {
        // Attempt to draw a graph with 0 nodes (not implemented, but testing behavior)
        // This is a hypothetical test as the current implementation does not allow for this.
        // If the implementation were to allow it, we would check for appropriate error handling.
        // await page.click('#draw-graph', { numNodes: 0 });
        // await expect(page.locator('#error-message')).toHaveText('Cannot draw graph with 0 nodes');
    });

    test.afterEach(async ({ page }) => {
        // Check for any console errors after each test
        const consoleErrors = await page.evaluate(() => {
            return window.console.error.calls.map(call => call.arguments);
        });
        expect(consoleErrors).toHaveLength(0); // Expect no console errors
    });
});