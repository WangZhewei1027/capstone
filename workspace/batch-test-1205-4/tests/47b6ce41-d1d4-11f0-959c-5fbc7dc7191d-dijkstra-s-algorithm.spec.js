import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-4/html/47b6ce41-d1d4-11f0-959c-5fbc7dc7191d.html';

test.describe('Dijkstra\'s Algorithm Visualization', () => {
    test.beforeEach(async ({ page }) => {
        // Load the application page before each test
        await page.goto(BASE_URL);
    });

    test('should display the graph on initial load', async ({ page }) => {
        // Check that the graph is displayed
        const graphContainer = await page.locator('#graph');
        await expect(graphContainer).toBeVisible();

        // Check that there are 5 nodes displayed
        const nodes = await graphContainer.locator('.node');
        await expect(nodes).toHaveCount(5);
    });

    test('should run Dijkstra\'s algorithm and display results', async ({ page }) => {
        // Click the "Run Dijkstra's Algorithm" button
        await page.click('#run');

        // Check that the result div is updated with distances
        const resultDiv = await page.locator('#result');
        await expect(resultDiv).toBeVisible();
        await expect(resultDiv).toContainText('Shortest distances from node 0:');

        // Verify that the distances for each node are displayed correctly
        await expect(resultDiv).toContainText('Node 0: 0');
        await expect(resultDiv).toContainText('Node 1: 10');
        await expect(resultDiv).toContainText('Node 2: 5');
        await expect(resultDiv).toContainText('Node 3: 14');
        await expect(resultDiv).toContainText('Node 4: 7');
    });

    test('should highlight the shortest path after running the algorithm', async ({ page }) => {
        // Click the "Run Dijkstra's Algorithm" button
        await page.click('#run');

        // Check that the shortest path nodes are highlighted
        const nodes = await page.locator('.node');
        await expect(nodes.nth(0)).toHaveClass(/shortest-path/); // Node 0
        await expect(nodes.nth(2)).toHaveClass(/shortest-path/); // Node 2
        await expect(nodes.nth(1)).toHaveClass(/shortest-path/); // Node 1
        await expect(nodes.nth(3)).toHaveClass(/shortest-path/); // Node 3
        await expect(nodes.nth(4)).toHaveClass(/shortest-path/); // Node 4
    });

    test('should reset the graph when running the algorithm multiple times', async ({ page }) => {
        // Click the "Run Dijkstra's Algorithm" button twice
        await page.click('#run');
        await page.click('#run');

        // Check that the result div is updated with distances again
        const resultDiv = await page.locator('#result');
        await expect(resultDiv).toBeVisible();
        await expect(resultDiv).toContainText('Shortest distances from node 0:');

        // Verify that the distances are still displayed correctly
        await expect(resultDiv).toContainText('Node 0: 0');
        await expect(resultDiv).toContainText('Node 1: 10');
        await expect(resultDiv).toContainText('Node 2: 5');
        await expect(resultDiv).toContainText('Node 3: 14');
        await expect(resultDiv).toContainText('Node 4: 7');

        // Check that the shortest path nodes are highlighted again
        const nodes = await page.locator('.node');
        await expect(nodes.nth(0)).toHaveClass(/shortest-path/); // Node 0
        await expect(nodes.nth(2)).toHaveClass(/shortest-path/); // Node 2
        await expect(nodes.nth(1)).toHaveClass(/shortest-path/); // Node 1
        await expect(nodes.nth(3)).toHaveClass(/shortest-path/); // Node 3
        await expect(nodes.nth(4)).toHaveClass(/shortest-path/); // Node 4
    });

    test('should handle errors gracefully', async ({ page }) => {
        // Simulate an error scenario (if applicable)
        // Since the code does not have explicit error handling, we will just check for console errors
        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.error(msg.text());
            }
        });

        // Click the "Run Dijkstra's Algorithm" button
        await page.click('#run');

        // Check for any console errors
        const consoleErrors = await page.evaluate(() => {
            return window.console.error.calls.map(call => call.arguments);
        });

        expect(consoleErrors).toHaveLength(0);
    });
});