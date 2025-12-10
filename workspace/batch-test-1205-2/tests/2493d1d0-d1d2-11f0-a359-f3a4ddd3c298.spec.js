import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-2/html/2493d1d0-d1d2-11f0-a359-f3a4ddd3c298.html';

test.describe('Graph Visualization Application', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application page before each test
        await page.goto(BASE_URL);
    });

    test('should add a node and verify its presence', async ({ page }) => {
        // Click the "Add Node" button
        await page.click('button[onclick="addNode()"]');
        
        // Verify that a new node is added to the graph
        const nodes = await page.locator('.node').count();
        expect(nodes).toBe(1); // Expect one node to be present
    });

    test('should add multiple nodes and verify their presence', async ({ page }) => {
        // Add multiple nodes
        await page.click('button[onclick="addNode()"]');
        await page.click('button[onclick="addNode()"]');
        
        // Verify that two nodes are present
        const nodes1 = await page.locator('.node').count();
        expect(nodes).toBe(2); // Expect two nodes to be present
    });

    test('should select a node and transition to Node Selected state', async ({ page }) => {
        // Add a node and select it
        await page.click('button[onclick="addNode()"]');
        await page.click('.node'); // Click on the node to select it
        
        // Verify that the node is selected
        const selectedNode = await page.evaluate(() => selectedNode1);
        expect(selectedNode).toBe(0); // Expect the first node to be selected
    });

    test('should draw an edge between two selected nodes', async ({ page }) => {
        // Add two nodes
        await page.click('button[onclick="addNode()"]');
        await page.click('button[onclick="addNode()"]');
        
        // Select the first node
        await page.click('.node:first-of-type');
        // Select the second node
        await page.click('.node:last-of-type');
        
        // Verify that an edge is drawn
        const edges = await page.locator('.edge').count();
        expect(edges).toBe(1); // Expect one edge to be drawn
    });

    test('should alert when trying to add a directed edge without selecting nodes', async ({ page }) => {
        // Click the "Add Directed Edge" button without selecting nodes
        const [alert] = await Promise.all([
            page.waitForEvent('dialog'), // Wait for the alert dialog
            page.click('button[onclick="addDirectedEdge()"]')
        ]);
        
        // Verify the alert message
        expect(alert.message()).toBe("Select two nodes to add a directed edge. Click the first node, then the second node.");
        await alert.dismiss(); // Dismiss the alert
    });

    test('should alert when trying to add an undirected edge without selecting nodes', async ({ page }) => {
        // Click the "Add Undirected Edge" button without selecting nodes
        const [alert] = await Promise.all([
            page.waitForEvent('dialog'), // Wait for the alert dialog
            page.click('button[onclick="addUndirectedEdge()"]')
        ]);
        
        // Verify the alert message
        expect(alert.message()).toBe("Select two nodes to add an undirected edge. Click the first node, then the second node.");
        await alert.dismiss(); // Dismiss the alert
    });

    test('should handle selecting the same node twice', async ({ page }) => {
        // Add a node and select it
        await page.click('button[onclick="addNode()"]');
        await page.click('.node'); // Select the node
        
        // Select the same node again
        await page.click('.node');
        
        // Verify that no edge is drawn
        const edges1 = await page.locator('.edge').count();
        expect(edges).toBe(0); // Expect no edges to be drawn
    });

    test('should handle selecting nodes in the correct order for directed edges', async ({ page }) => {
        // Add two nodes
        await page.click('button[onclick="addNode()"]');
        await page.click('button[onclick="addNode()"]');
        
        // Select the first node
        await page.click('.node:first-of-type');
        // Select the second node
        await page.click('.node:last-of-type');
        
        // Verify that an edge is drawn
        const edges2 = await page.locator('.edge').count();
        expect(edges).toBe(1); // Expect one edge to be drawn
    });
});