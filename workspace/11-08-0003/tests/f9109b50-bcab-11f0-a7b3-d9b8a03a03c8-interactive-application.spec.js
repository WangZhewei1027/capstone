import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/f9109b50-bcab-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Binary Tree Interactive Module', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should be in idle state initially', async ({ page }) => {
        const currentNodeText = await page.textContent('#currentNode');
        expect(currentNodeText).toBe('');
    });

    test('should add a node and transition to node_added state', async ({ page }) => {
        await page.click('button:has-text("Add Node")');
        const node = await page.locator('.node').first();
        expect(await node.isVisible()).toBeTruthy();
        expect(await node.textContent()).toMatch(/\d+/); // Check if node has an ID
    });

    test('should traverse the tree in pre-order', async ({ page }) => {
        await page.click('button:has-text("Add Node")');
        await page.click('button:has-text("Pre-order Traversal")');
        // Validate traversal animation or state change
        const currentNodeText1 = await page.textContent('#currentNode');
        expect(currentNodeText).toMatch(/\d+/); // Check if current node is updated
    });

    test('should traverse the tree in in-order', async ({ page }) => {
        await page.click('button:has-text("Add Node")');
        await page.click('button:has-text("In-order Traversal")');
        const currentNodeText2 = await page.textContent('#currentNode');
        expect(currentNodeText).toMatch(/\d+/);
    });

    test('should traverse the tree in post-order', async ({ page }) => {
        await page.click('button:has-text("Add Node")');
        await page.click('button:has-text("Post-order Traversal")');
        const currentNodeText3 = await page.textContent('#currentNode');
        expect(currentNodeText).toMatch(/\d+/);
    });

    test('should reset the tree and return to idle state', async ({ page }) => {
        await page.click('button:has-text("Add Node")');
        await page.click('button:has-text("Reset Tree")');
        const currentNodeText4 = await page.textContent('#currentNode');
        expect(currentNodeText).toBe('');
        const nodesCount = await page.locator('.node').count();
        expect(nodesCount).toBe(0); // Ensure all nodes are removed
    });

    test('should handle multiple nodes and transitions correctly', async ({ page }) => {
        // Add multiple nodes
        for (let i = 0; i < 3; i++) {
            await page.click('button:has-text("Add Node")');
        }
        // Traverse in-order
        await page.click('button:has-text("In-order Traversal")');
        const currentNodeText5 = await page.textContent('#currentNode');
        expect(currentNodeText).toMatch(/\d+/);
        
        // Reset the tree
        await page.click('button:has-text("Reset Tree")');
        const resetNodeText = await page.textContent('#currentNode');
        expect(resetNodeText).toBe('');
    });

    test('should remain in the same state when adding nodes repeatedly', async ({ page }) => {
        await page.click('button:has-text("Add Node")');
        const initialNodeCount = await page.locator('.node').count();
        await page.click('button:has-text("Add Node")');
        const newNodeCount = await page.locator('.node').count();
        expect(newNodeCount).toBe(initialNodeCount + 1); // Ensure a new node is added
    });

    test('should handle edge cases with no nodes', async ({ page }) => {
        await page.click('button:has-text("Pre-order Traversal")');
        const currentNodeText6 = await page.textContent('#currentNode');
        expect(currentNodeText).toBe(''); // No nodes should mean no current node
    });
});