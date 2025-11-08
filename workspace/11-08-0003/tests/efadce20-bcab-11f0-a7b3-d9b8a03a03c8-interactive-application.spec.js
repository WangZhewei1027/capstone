import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/efadce20-bcab-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Interactive Linked List Application', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application before each test
        await page.goto(BASE_URL);
    });

    test('should start in idle state', async ({ page }) => {
        // Verify that the linked list is empty initially
        const linkedList = await page.locator('#linked-list');
        const nodes = await linkedList.locator('.node').count();
        expect(nodes).toBe(0);
    });

    test('should transition to addingNode state on Add Node click', async ({ page }) => {
        // Click the Add Node button
        await page.click('#add-node');

        // Verify that a node has been added
        const linkedList1 = await page.locator('#linked-list');
        const nodes1 = await linkedList.locator('.node').count();
        expect(nodes).toBe(1);
        expect(await linkedList.locator('.node').nth(0).innerText()).toContain('Node 1');
    });

    test('should allow adding multiple nodes', async ({ page }) => {
        // Add multiple nodes
        await page.click('#add-node');
        await page.click('#add-node');

        // Verify that two nodes are present
        const linkedList2 = await page.locator('#linked-list');
        const nodes2 = await linkedList.locator('.node').count();
        expect(nodes).toBe(2);
        expect(await linkedList.locator('.node').nth(0).innerText()).toContain('Node 1');
        expect(await linkedList.locator('.node').nth(1).innerText()).toContain('Node 2');
    });

    test('should remove a node and update indices', async ({ page }) => {
        // Add a node and then remove it
        await page.click('#add-node');
        await page.click('#add-node');
        await page.click('.remove-btn');

        // Verify that one node is removed and indices are updated
        const linkedList3 = await page.locator('#linked-list');
        const nodes3 = await linkedList.locator('.node').count();
        expect(nodes).toBe(1);
        expect(await linkedList.locator('.node').nth(0).innerText()).toContain('Node 1');
    });

    test('should remove the last node and leave the list empty', async ({ page }) => {
        // Add a node and remove it
        await page.click('#add-node');
        await page.click('.remove-btn');

        // Verify that the linked list is empty
        const linkedList4 = await page.locator('#linked-list');
        const nodes4 = await linkedList.locator('.node').count();
        expect(nodes).toBe(0);
    });

    test('should not crash when removing a node from an empty list', async ({ page }) => {
        // Attempt to remove a node when none exist
        const removeButtons = await page.locator('.remove-btn').count();
        expect(removeButtons).toBe(0);
    });

    test('should handle multiple remove actions correctly', async ({ page }) => {
        // Add three nodes
        await page.click('#add-node');
        await page.click('#add-node');
        await page.click('#add-node');

        // Remove the first node
        await page.click('.remove-btn');

        // Verify that the remaining nodes are correctly indexed
        const linkedList5 = await page.locator('#linked-list');
        const nodes5 = await linkedList.locator('.node').count();
        expect(nodes).toBe(2);
        expect(await linkedList.locator('.node').nth(0).innerText()).toContain('Node 1');
        expect(await linkedList.locator('.node').nth(1).innerText()).toContain('Node 2');
    });
});