import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-10-0003-4o-mini/html/8fe053a0-bde1-11f0-a01f-e98a4888d298.html';

test.describe('Interactive Linked List Application', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the interactive application before each test
        await page.goto(BASE_URL);
    });

    test('should start in idle state', async ({ page }) => {
        // Verify that the linked list is empty initially
        const list = await page.locator('#linkedList');
        const nodes = await list.locator('.node').count();
        expect(nodes).toBe(0);
    });

    test('should add a node and transition to addingNode state', async ({ page }) => {
        // Click the "Add Node" button
        await page.click('button:has-text("Add Node")');

        // Verify that a new node is added
        const list = await page.locator('#linkedList');
        const nodes = await list.locator('.node').count();
        expect(nodes).toBe(1);

        // Verify the content of the new node
        const newNode = await list.locator('.node').nth(0);
        const nodeText = await newNode.textContent();
        expect(nodeText).toContain('Node 1');
    });

    test('should add multiple nodes and verify their count', async ({ page }) => {
        // Add three nodes
        for (let i = 0; i < 3; i++) {
            await page.click('button:has-text("Add Node")');
        }

        // Verify that three nodes are added
        const list = await page.locator('#linkedList');
        const nodes = await list.locator('.node').count();
        expect(nodes).toBe(3);
    });

    test('should remove a node and transition back to idle state', async ({ page }) => {
        // Add a node first
        await page.click('button:has-text("Add Node")');

        // Click the remove button on the node
        const removeButton = await page.locator('.remove').nth(0);
        await removeButton.click();

        // Verify that the node is removed after the animation
        const list = await page.locator('#linkedList');
        const nodes = await list.locator('.node').count();
        expect(nodes).toBe(0);
    });

    test('should remove multiple nodes and verify their count', async ({ page }) => {
        // Add three nodes
        for (let i = 0; i < 3; i++) {
            await page.click('button:has-text("Add Node")');
        }

        // Remove two nodes
        const removeButtons = await page.locator('.remove');
        await removeButtons.nth(0).click();
        await removeButtons.nth(1).click();

        // Verify that one node remains
        const list = await page.locator('#linkedList');
        const nodes = await list.locator('.node').count();
        expect(nodes).toBe(1);
    });

    test('should handle edge case of removing a node when none exist', async ({ page }) => {
        // Attempt to remove a node when none exist
        const removeButtons = await page.locator('.remove').count();
        expect(removeButtons).toBe(0);
    });

    test('should not allow adding a node if it exceeds a certain limit (if applicable)', async ({ page }) => {
        // Assuming there's a limit of 5 nodes for this example
        for (let i = 0; i < 5; i++) {
            await page.click('button:has-text("Add Node")');
        }

        // Attempt to add one more node
        await page.click('button:has-text("Add Node")');

        // Verify that the count does not exceed 5
        const list = await page.locator('#linkedList');
        const nodes = await list.locator('.node').count();
        expect(nodes).toBe(5);
    });
});