import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-18-0001/html/99fc38b0-c465-11f0-af61-192d6dbad219.html';

test.describe('Interactive Binary Search Tree (BST) Exploration', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should start in idle state', async ({ page }) => {
        // Verify the initial state of the application
        const bstVisualization = await page.locator('#bst-visualization').innerHTML();
        expect(bstVisualization).toBe('');
    });

    test('should insert a node and transition to inserting state', async ({ page }) => {
        // Insert a node and check the BST visualization
        await page.fill('#value', '10');
        await page.click('button:has-text("Insert Node")');

        // Check if the BST visualization has been updated
        const bstVisualization1 = await page.locator('#bst-visualization').innerHTML();
        expect(bstVisualization).toContain('10'); // Expect to see the inserted node
    });

    test('should insert multiple nodes and visualize correctly', async ({ page }) => {
        // Insert multiple nodes
        await page.fill('#value', '15');
        await page.click('button:has-text("Insert Node")');

        await page.fill('#value', '5');
        await page.click('button:has-text("Insert Node")');

        // Check if the BST visualization has been updated
        const bstVisualization2 = await page.locator('#bst-visualization').innerHTML();
        expect(bstVisualization).toContain('15');
        expect(bstVisualization).toContain('5');
    });

    test('should delete a node and transition back to idle state', async ({ page }) => {
        // Insert a node first
        await page.fill('#value', '20');
        await page.click('button:has-text("Insert Node")');

        // Now delete the node
        await page.fill('#value', '20');
        await page.click('button:has-text("Delete Node")');

        // Verify that the BST visualization is empty again
        const bstVisualization3 = await page.locator('#bst-visualization').innerHTML();
        expect(bstVisualization).toBe('');
    });

    test('should handle deletion of a non-existent node gracefully', async ({ page }) => {
        // Attempt to delete a node that doesn't exist
        await page.fill('#value', '999');
        await page.click('button:has-text("Delete Node")');

        // Verify that the BST visualization remains unchanged
        const bstVisualization4 = await page.locator('#bst-visualization').innerHTML();
        expect(bstVisualization).toBe('');
    });

    test('should visualize the BST correctly after multiple insertions and deletions', async ({ page }) => {
        // Insert multiple nodes
        await page.fill('#value', '30');
        await page.click('button:has-text("Insert Node")');

        await page.fill('#value', '20');
        await page.click('button:has-text("Insert Node")');

        await page.fill('#value', '40');
        await page.click('button:has-text("Insert Node")');

        // Delete one node
        await page.fill('#value', '20');
        await page.click('button:has-text("Delete Node")');

        // Verify the BST visualization
        const bstVisualization5 = await page.locator('#bst-visualization').innerHTML();
        expect(bstVisualization).toContain('30');
        expect(bstVisualization).toContain('40');
        expect(bstVisualization).not.toContain('20'); // Deleted node should not be present
    });

    test('should not allow inserting non-numeric values', async ({ page }) => {
        // Attempt to insert a non-numeric value
        await page.fill('#value', 'abc');
        await page.click('button:has-text("Insert Node")');

        // Verify that the BST visualization remains unchanged
        const bstVisualization6 = await page.locator('#bst-visualization').innerHTML();
        expect(bstVisualization).toBe('');
    });

    test('should not allow deleting non-numeric values', async ({ page }) => {
        // Attempt to delete a non-numeric value
        await page.fill('#value', 'xyz');
        await page.click('button:has-text("Delete Node")');

        // Verify that the BST visualization remains unchanged
        const bstVisualization7 = await page.locator('#bst-visualization').innerHTML();
        expect(bstVisualization).toBe('');
    });
});