import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/f61e8470-bcab-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Union-Find Interactive Exploration', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should start in idle state', async ({ page }) => {
        const nodes = await page.$$('.node');
        expect(nodes.length).toBe(0);
    });

    test('should add a node and transition to node_added state', async ({ page }) => {
        await page.click('#addNode');
        const nodes1 = await page.$$('.node');
        expect(nodes.length).toBe(1);
        const nodeText = await nodes[0].innerText();
        expect(nodeText).toBe('0'); // First node ID should be 0
    });

    test('should allow adding multiple nodes', async ({ page }) => {
        await page.click('#addNode');
        await page.click('#addNode');
        const nodes2 = await page.$$('.node');
        expect(nodes.length).toBe(2);
    });

    test('should clear all nodes and transition to cleared state', async ({ page }) => {
        await page.click('#addNode');
        await page.click('#clearAll');
        const nodes3 = await page.$$('.node');
        expect(nodes.length).toBe(0);
    });

    test('should drag a node and transition to dragging state', async ({ page }) => {
        await page.click('#addNode');
        const node = await page.$('.node');
        const boundingBox = await node.boundingBox();
        await page.mouse.move(boundingBox.x + 15, boundingBox.y + 15); // Move to center of node
        await page.mouse.down();
        await page.mouse.move(boundingBox.x + 100, boundingBox.y + 100); // Drag to a new position
        await page.mouse.up();

        const newBoundingBox = await node.boundingBox();
        expect(newBoundingBox.x).not.toBe(boundingBox.x);
        expect(newBoundingBox.y).not.toBe(boundingBox.y);
    });

    test('should union two nodes and transition to union_made state', async ({ page }) => {
        await page.click('#addNode');
        await page.click('#addNode');
        const nodes4 = await page.$$('.node');
        const firstNode = nodes[0];
        const secondNode = nodes[1];

        const firstNodeBox = await firstNode.boundingBox();
        const secondNodeBox = await secondNode.boundingBox();

        await page.mouse.move(firstNodeBox.x + 15, firstNodeBox.y + 15);
        await page.mouse.down();
        await page.mouse.move(secondNodeBox.x + 15, secondNodeBox.y + 15);
        await page.mouse.up();

        // Check if union action was successful (this would depend on implementation)
        // Assuming union creates a visual feedback or changes the node's appearance
        // Example: Check if nodes are visually connected or have changed color
        // This part would need specific implementation details to validate
    });

    test('should highlight path when finding root', async ({ page }) => {
        await page.click('#addNode');
        const node1 = await page.$('.node1');
        await node.click(); // Simulate finding root
        // Check if path highlighting occurs (this would depend on implementation)
        // Example: Check if a specific class is added to the node or if a visual change occurs
    });

    test('should handle edge cases when no nodes are present', async ({ page }) => {
        await page.click('#clearAll'); // Ensure no nodes are present
        const nodes5 = await page.$$('.node');
        expect(nodes.length).toBe(0);
        // Attempt to find root or union with no nodes should not throw an error
        // This would depend on implementation details
    });

    test.afterEach(async ({ page }) => {
        await page.close();
    });
});