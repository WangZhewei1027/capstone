import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-35-35/html/bba553f0-ca89-11f0-800e-fdebe921fc5f.html';

test.describe('Graph Interactive Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application before each test
        await page.goto(BASE_URL);
    });

    test('should display the initial buttons on idle state', async ({ page }) => {
        // Verify that the buttons are present in the idle state
        await expect(page.locator('#add-node')).toBeVisible();
        await expect(page.locator('#add-edge')).toBeVisible();
        await expect(page.locator('#clear-graph')).toBeVisible();
    });

    test('should add a node to the graph', async ({ page }) => {
        // Add a node and verify it appears in the graph
        await page.fill('#node', 'Node 1');
        await page.click('#add-node');
        const nodeDiv = page.locator('.node');
        await expect(nodeDiv).toHaveText('Node 1');
    });

    test('should clear the input after adding a node', async ({ page }) => {
        // Add a node and check if the input is cleared
        await page.fill('#node', 'Node 1');
        await page.click('#add-node');
        await expect(page.locator('#node')).toHaveValue('');
    });

    test('should add an edge to the graph', async ({ page }) => {
        // Add an edge and verify it appears in the graph
        await page.fill('#edge', 'blue');
        await page.click('#add-edge');
        const edgeDiv = page.locator('.edge-blue');
        await expect(edgeDiv).toBeVisible();
    });

    test('should clear the input after adding an edge', async ({ page }) => {
        // Add an edge and check if the input is cleared
        await page.fill('#edge', 'blue');
        await page.click('#add-edge');
        await expect(page.locator('#edge')).toHaveValue('');
    });

    test('should clear the graph and reset state', async ({ page }) => {
        // Add a node and an edge, then clear the graph
        await page.fill('#node', 'Node 1');
        await page.click('#add-node');
        await page.fill('#edge', 'red');
        await page.click('#add-edge');
        
        await page.click('#clear-graph');
        
        // Verify that the graph is cleared
        const graphDiv = page.locator('#graph');
        await expect(graphDiv).toBeEmpty();
    });

    test('should handle adding a node with empty input', async ({ page }) => {
        // Attempt to add a node with empty input
        await page.click('#add-node');
        
        // Verify that no node is added
        const graphDiv = page.locator('#graph');
        await expect(graphDiv).toBeEmpty();
    });

    test('should handle adding an edge with empty input', async ({ page }) => {
        // Attempt to add an edge with empty input
        await page.click('#add-edge');
        
        // Verify that no edge is added
        const graphDiv = page.locator('#graph');
        await expect(graphDiv).toBeEmpty();
    });

    test('should allow multiple nodes to be added', async ({ page }) => {
        // Add multiple nodes and verify they are all present
        await page.fill('#node', 'Node 1');
        await page.click('#add-node');
        await page.fill('#node', 'Node 2');
        await page.click('#add-node');
        
        const nodes = page.locator('.node');
        await expect(nodes).toHaveCount(2);
        await expect(nodes.nth(0)).toHaveText('Node 1');
        await expect(nodes.nth(1)).toHaveText('Node 2');
    });

    test('should allow multiple edges to be added', async ({ page }) => {
        // Add multiple edges and verify they are all present
        await page.fill('#edge', 'blue');
        await page.click('#add-edge');
        await page.fill('#edge', 'red');
        await page.click('#add-edge');
        
        const edges = page.locator('.edge');
        await expect(edges).toHaveCount(2);
        await expect(edges.nth(0)).toHaveClass(/edge-blue/);
        await expect(edges.nth(1)).toHaveClass(/edge-red/);
    });
});