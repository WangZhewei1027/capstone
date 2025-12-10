import { test, expect } from '@playwright/test';

const baseURL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/8c922ce0-d1d3-11f0-a698-d7b407715e1f.html';

test.describe('Linked List Visualization Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(baseURL);
    });

    test('should load the page and display initial state', async ({ page }) => {
        // Verify the initial title and that the linked list is empty
        await expect(page.locator('h1')).toHaveText('Linked List Visualization');
        const linkedList = page.locator('#linkedList');
        await expect(linkedList).toBeEmpty();
    });

    test('should add a node to the linked list', async ({ page }) => {
        // Input a value and click the add button
        await page.fill('#nodeValue', 'Node 1');
        await page.click('button:has-text("Add Node")');

        // Verify that the node is added to the linked list
        const linkedList = page.locator('#linkedList');
        await expect(linkedList).toContainText('Node 1');
    });

    test('should add multiple nodes to the linked list', async ({ page }) => {
        // Add multiple nodes
        await page.fill('#nodeValue', 'Node 1');
        await page.click('button:has-text("Add Node")');
        await page.fill('#nodeValue', 'Node 2');
        await page.click('button:has-text("Add Node")');

        // Verify that both nodes are present
        const linkedList = page.locator('#linkedList');
        await expect(linkedList).toContainText('Node 1');
        await expect(linkedList).toContainText('Node 2');
    });

    test('should remove the last node from the linked list', async ({ page }) => {
        // Add nodes before removing
        await page.fill('#nodeValue', 'Node 1');
        await page.click('button:has-text("Add Node")');
        await page.fill('#nodeValue', 'Node 2');
        await page.click('button:has-text("Add Node")');
        
        // Remove the last node
        await page.click('button:has-text("Remove Node")');

        // Verify that the last node is removed
        const linkedList = page.locator('#linkedList');
        await expect(linkedList).not.toContainText('Node 2');
    });

    test('should remove all nodes from the linked list', async ({ page }) => {
        // Add nodes before removing
        await page.fill('#nodeValue', 'Node 1');
        await page.click('button:has-text("Add Node")');
        await page.fill('#nodeValue', 'Node 2');
        await page.click('button:has-text("Add Node")');
        await page.fill('#nodeValue', 'Node 3');
        await page.click('button:has-text("Add Node")');

        // Remove nodes until none are left
        await page.click('button:has-text("Remove Node")');
        await page.click('button:has-text("Remove Node")');
        await page.click('button:has-text("Remove Node")');

        // Verify that the linked list is empty
        const linkedList = page.locator('#linkedList');
        await expect(linkedList).toBeEmpty();
    });

    test('should not add a node if input is empty', async ({ page }) => {
        // Attempt to add an empty node
        await page.click('button:has-text("Add Node")');

        // Verify that the linked list is still empty
        const linkedList = page.locator('#linkedList');
        await expect(linkedList).toBeEmpty();
    });

    test('should handle multiple adds and removes correctly', async ({ page }) => {
        // Add nodes
        await page.fill('#nodeValue', 'Node 1');
        await page.click('button:has-text("Add Node")');
        await page.fill('#nodeValue', 'Node 2');
        await page.click('button:has-text("Add Node")');
        await page.fill('#nodeValue', 'Node 3');
        await page.click('button:has-text("Add Node")');

        // Remove one node
        await page.click('button:has-text("Remove Node")');

        // Verify the remaining nodes
        const linkedList = page.locator('#linkedList');
        await expect(linkedList).toContainText('Node 1');
        await expect(linkedList).toContainText('Node 2');
        await expect(linkedList).not.toContainText('Node 3');
    });
});