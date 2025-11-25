import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-25T17-44-33/html/66d21f60-ca26-11f0-9127-ddf02ab917cc.html';

test.describe('Linked List Demonstration', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the linked list demonstration page before each test
        await page.goto(BASE_URL);
    });

    test('should be in idle state initially', async ({ page }) => {
        // Verify that the list is empty when the application is loaded
        const listItems = await page.locator('#list li').count();
        expect(listItems).toBe(0);
    });

    test('should add a node and transition to node_added state', async ({ page }) => {
        // Add a node and check if it appears in the list
        await page.fill('#nodeValue', 'Node 1');
        await page.click("button[onclick='addNode()']");

        const listItems = await page.locator('#list li');
        expect(await listItems.count()).toBe(1);
        expect(await listItems.nth(0).textContent()).toBe('Node 1');
    });

    test('should add multiple nodes and verify the list', async ({ page }) => {
        // Add multiple nodes and verify their presence
        await page.fill('#nodeValue', 'Node 1');
        await page.click("button[onclick='addNode()']");
        await page.fill('#nodeValue', 'Node 2');
        await page.click("button[onclick='addNode()']");
        await page.fill('#nodeValue', 'Node 3');
        await page.click("button[onclick='addNode()']");

        const listItems = await page.locator('#list li');
        expect(await listItems.count()).toBe(3);
        expect(await listItems.nth(0).textContent()).toBe('Node 1');
        expect(await listItems.nth(1).textContent()).toBe('Node 2');
        expect(await listItems.nth(2).textContent()).toBe('Node 3');
    });

    test('should remove a node and transition to node_removed state', async ({ page }) => {
        // Add nodes and then remove one, checking the state transition
        await page.fill('#nodeValue', 'Node 1');
        await page.click("button[onclick='addNode()']");
        await page.fill('#nodeValue', 'Node 2');
        await page.click("button[onclick='addNode()']");
        await page.fill('#nodeValue', 'Node 3');
        await page.click("button[onclick='addNode()']");

        // Remove the last node
        await page.click("button[onclick='removeNode()']");

        const listItems = await page.locator('#list li');
        expect(await listItems.count()).toBe(2);
        expect(await listItems.nth(0).textContent()).toBe('Node 1');
        expect(await listItems.nth(1).textContent()).toBe('Node 2');
    });

    test('should not remove a node if the list is empty', async ({ page }) => {
        // Attempt to remove a node when the list is empty
        await page.click("button[onclick='removeNode()']");

        const listItems = await page.locator('#list li').count();
        expect(listItems).toBe(0); // The list should still be empty
    });

    test('should handle adding empty node value', async ({ page }) => {
        // Attempt to add an empty node value
        await page.fill('#nodeValue', '');
        await page.click("button[onclick='addNode()']");

        const listItems = await page.locator('#list li').count();
        expect(listItems).toBe(0); // The list should still be empty
    });

    test('should maintain the correct state after multiple operations', async ({ page }) => {
        // Add and remove nodes in succession and verify the final state
        await page.fill('#nodeValue', 'Node 1');
        await page.click("button[onclick='addNode()']");
        await page.fill('#nodeValue', 'Node 2');
        await page.click("button[onclick='addNode()']");
        await page.click("button[onclick='removeNode()']");
        await page.fill('#nodeValue', 'Node 3');
        await page.click("button[onclick='addNode()']");

        const listItems = await page.locator('#list li');
        expect(await listItems.count()).toBe(2);
        expect(await listItems.nth(0).textContent()).toBe('Node 1');
        expect(await listItems.nth(1).textContent()).toBe('Node 3');
    });
});