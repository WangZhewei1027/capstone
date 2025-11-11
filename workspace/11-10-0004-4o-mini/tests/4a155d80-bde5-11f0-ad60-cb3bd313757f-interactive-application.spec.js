import { test, expect } from '@playwright/test';

const baseUrl = 'http://127.0.0.1:5500/workspace/11-10-0004-4o-mini/html/4a155d80-bde5-11f0-ad60-cb3bd313757f.html';

test.describe('Interactive Linked List Application', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(baseUrl);
    });

    test('should be in idle state initially', async ({ page }) => {
        const listContainer = await page.locator('#listContainer');
        const nodes = await listContainer.locator('.node').count();
        expect(nodes).toBe(0); // No nodes should be present initially
    });

    test('should add a node and transition to node_added state', async ({ page }) => {
        await page.fill('#nodeValue', 'Node 1');
        await page.click('#addNodeBtn');

        const nodes = await page.locator('.node').count();
        expect(nodes).toBe(1); // One node should be added

        const node = await page.locator('.node').nth(0);
        await expect(node).toHaveText('Node 1'); // Check if the node has the correct value
    });

    test('should highlight new node on add', async ({ page }) => {
        await page.fill('#nodeValue', 'Node 2');
        await page.click('#addNodeBtn');

        const node = await page.locator('.node').nth(0);
        await expect(node).toHaveClass(/selected/); // Check if the new node is highlighted
    });

    test('should delete a selected node and transition to node_deleted state', async ({ page }) => {
        await page.fill('#nodeValue', 'Node 3');
        await page.click('#addNodeBtn');
        await page.click('.node'); // Select the node
        await page.click('#deleteNodeBtn');

        const nodes = await page.locator('.node').count();
        expect(nodes).toBe(0); // Node should be deleted
    });

    test('should traverse the list and transition to traversing state', async ({ page }) => {
        await page.fill('#nodeValue', 'Node 4');
        await page.click('#addNodeBtn');
        await page.fill('#nodeValue', 'Node 5');
        await page.click('#addNodeBtn');

        await page.click('#traverseListBtn');

        // Assuming traversal highlights nodes in some way
        const nodes = await page.locator('.node');
        await expect(nodes.nth(0)).toHaveClass(/traversing/); // Check if the first node is traversed
        await expect(nodes.nth(1)).toHaveClass(/traversing/); // Check if the second node is traversed
    });

    test('should clear the list and transition to list_cleared state', async ({ page }) => {
        await page.fill('#nodeValue', 'Node 6');
        await page.click('#addNodeBtn');

        await page.click('#clearListBtn');

        const nodes = await page.locator('.node').count();
        expect(nodes).toBe(0); // List should be cleared
    });

    test('should handle edge case of adding a node with empty value', async ({ page }) => {
        await page.click('#addNodeBtn');

        const nodes = await page.locator('.node').count();
        expect(nodes).toBe(0); // No node should be added
    });

    test('should handle edge case of deleting a node when none is selected', async ({ page }) => {
        await page.fill('#nodeValue', 'Node 7');
        await page.click('#addNodeBtn');
        await page.click('#deleteNodeBtn'); // Attempt to delete without selection

        const nodes = await page.locator('.node').count();
        expect(nodes).toBe(1); // Node should still exist
    });
});