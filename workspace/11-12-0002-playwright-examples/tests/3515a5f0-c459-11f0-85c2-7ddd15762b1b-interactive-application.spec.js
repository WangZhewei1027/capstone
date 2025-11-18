import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-12-0002-playwright-examples/html/3515a5f0-c459-11f0-85c2-7ddd15762b1b.html';

test.describe('Interactive Linked List Exploration', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test.afterEach(async ({ page }) => {
        // Optionally clear the list after each test
        await page.evaluate(() => {
            const linkedList = new LinkedList();
            linkedList.head = null;
            linkedList.tail = null;
            document.getElementById('listContainer').innerHTML = '';
            document.getElementById('output').innerText = '';
        });
    });

    test('should add a node to the linked list', async ({ page }) => {
        await page.fill('#nodeValue', 'Node 1');
        await page.click('button:has-text("Add Node")');

        const nodeCount = await page.locator('#listContainer .node').count();
        expect(nodeCount).toBe(1);
        const nodeText = await page.locator('#listContainer .node').innerText();
        expect(nodeText).toBe('Node 1');
    });

    test('should remove the last node from the linked list', async ({ page }) => {
        await page.fill('#nodeValue', 'Node 1');
        await page.click('button:has-text("Add Node")');
        await page.fill('#nodeValue', 'Node 2');
        await page.click('button:has-text("Add Node")');
        
        await page.click('button:has-text("Remove Last Node")');

        const nodeCount = await page.locator('#listContainer .node').count();
        expect(nodeCount).toBe(1);
        const nodeText = await page.locator('#listContainer .node').innerText();
        expect(nodeText).toBe('Node 1');
    });

    test('should traverse the linked list and display its values', async ({ page }) => {
        await page.fill('#nodeValue', 'Node 1');
        await page.click('button:has-text("Add Node")');
        await page.fill('#nodeValue', 'Node 2');
        await page.click('button:has-text("Add Node")');
        
        await page.click('button:has-text("Traverse List")');
        
        const outputText = await page.locator('#output').innerText();
        expect(outputText).toBe('Linked List: Node 1 -> Node 2');
    });

    test('should not add a node with empty value', async ({ page }) => {
        await page.click('button:has-text("Add Node")');

        const nodeCount = await page.locator('#listContainer .node').count();
        expect(nodeCount).toBe(0);
    });

    test('should not remove a node when the list is empty', async ({ page }) => {
        await page.click('button:has-text("Remove Last Node")');

        const nodeCount = await page.locator('#listContainer .node').count();
        expect(nodeCount).toBe(0);
    });

    test('should handle multiple additions and removals correctly', async ({ page }) => {
        await page.fill('#nodeValue', 'Node 1');
        await page.click('button:has-text("Add Node")');
        await page.fill('#nodeValue', 'Node 2');
        await page.click('button:has-text("Add Node")');
        await page.fill('#nodeValue', 'Node 3');
        await page.click('button:has-text("Add Node")');

        await page.click('button:has-text("Remove Last Node")');
        await page.click('button:has-text("Traverse List")');

        const outputText = await page.locator('#output').innerText();
        expect(outputText).toBe('Linked List: Node 1 -> Node 2');
    });
});