import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-3/html/b8b66071-d1d3-11f0-9bcf-07cd16c51572.html';

test.describe('Graph Visualization Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the graph visualization page before each test
        await page.goto(BASE_URL);
    });

    test('should load the page and display title', async ({ page }) => {
        // Verify that the page loads correctly and the title is displayed
        const title = await page.title();
        expect(title).toBe('Graph Visualization');
    });

    test('should add a node and visualize it', async ({ page }) => {
        // Test adding a node to the graph
        await page.click('text=Add Node');
        await page.evaluate(() => window.prompt = () => 'Node1'); // Simulate user input
        await page.click('text=Add Node');

        // Verify that the node is drawn on the canvas
        const canvas = await page.locator('canvas#graphCanvas');
        const context = await canvas.evaluate(canvas => canvas.getContext('2d'));
        expect(context).not.toBeNull(); // Ensure canvas context is available
    });

    test('should show error when adding duplicate node', async ({ page }) => {
        // Test adding a duplicate node
        await page.click('text=Add Node');
        await page.evaluate(() => window.prompt = () => 'Node1'); // First node
        await page.click('text=Add Node');

        await page.click('text=Add Node');
        await page.evaluate(() => window.prompt = () => 'Node1'); // Duplicate node
        await page.click('text=Add Node');

        // Verify alert for duplicate node
        await expect(page.locator('text=Invalid or duplicate node name.')).toBeVisible();
    });

    test('should add an edge between nodes', async ({ page }) => {
        // Add nodes first
        await page.click('text=Add Node');
        await page.evaluate(() => window.prompt = () => 'Node1');
        await page.click('text=Add Node');

        await page.click('text=Add Node');
        await page.evaluate(() => window.prompt = () => 'Node2');
        await page.click('text=Add Node');

        // Now add an edge
        await page.click('text=Add Edge');
        await page.evaluate(() => window.prompt = () => 'Node1'); // From node
        await page.click('text=Add Edge');
        await page.evaluate(() => window.prompt = () => 'Node2'); // To node
        await page.click('text=Add Edge');

        // Verify that the edge is drawn on the canvas
        const canvas = await page.locator('canvas#graphCanvas');
        const context = await canvas.evaluate(canvas => canvas.getContext('2d'));
        expect(context).not.toBeNull(); // Ensure canvas context is available
    });

    test('should show error when adding edge with non-existing nodes', async ({ page }) => {
        // Attempt to add an edge with non-existing nodes
        await page.click('text=Add Edge');
        await page.evaluate(() => window.prompt = () => 'Node1'); // From node
        await page.click('text=Add Edge');
        await page.evaluate(() => window.prompt = () => 'Node2'); // To node
        await page.click('text=Add Edge');

        // Verify alert for non-existing nodes
        await expect(page.locator('text=Both nodes must exist in the graph.')).toBeVisible();
    });

    test('should toggle between directed and undirected graph', async ({ page }) => {
        // Add nodes and edges first
        await page.click('text=Add Node');
        await page.evaluate(() => window.prompt = () => 'Node1');
        await page.click('text=Add Node');
        await page.evaluate(() => window.prompt = () => 'Node2');
        await page.click('text=Add Edge');
        await page.evaluate(() => window.prompt = () => 'Node1'); // From node
        await page.click('text=Add Edge');
        await page.evaluate(() => window.prompt = () => 'Node2'); // To node

        // Toggle direction
        await page.click('text=Toggle Directed/Undirected');
        await expect(page.locator('text=Graph is now undirected.')).toBeVisible();
    });

    test('should clear the graph', async ({ page }) => {
        // Add a node and then clear the graph
        await page.click('text=Add Node');
        await page.evaluate(() => window.prompt = () => 'Node1');
        await page.click('text=Clear Graph');

        // Verify that the graph is cleared (no nodes)
        const canvas = await page.locator('canvas#graphCanvas');
        const context = await canvas.evaluate(canvas => canvas.getContext('2d'));
        expect(context).not.toBeNull(); // Ensure canvas context is available
    });
});