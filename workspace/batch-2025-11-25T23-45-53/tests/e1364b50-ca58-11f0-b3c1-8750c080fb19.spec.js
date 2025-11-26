import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-25T23-45-53/html/e1364b50-ca58-11f0-b3c1-8750c080fb19.html';

test.describe('Linked List Visualization', () => {
    let page;

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();
        await page.goto(BASE_URL);
    });

    test.afterAll(async () => {
        await page.close();
    });

    test('Initial state should be Idle', async () => {
        const linkedListDiv = await page.$('#linkedList');
        const nodeCount = await linkedListDiv.evaluate(el => el.children.length);
        expect(nodeCount).toBe(0); // Verify that the list is initially empty
    });

    test.describe('Adding Nodes', () => {
        test('User can add a node', async () => {
            await page.click('button:has-text("Add Node")');
            const linkedListDiv = await page.$('#linkedList');
            const nodeCount = await linkedListDiv.evaluate(el => el.children.length);
            expect(nodeCount).toBe(1); // Verify that one node is added
        });

        test('Node should display correct value', async () => {
            const linkedListDiv = await page.$('#linkedList');
            const firstNode = await linkedListDiv.$('.node');
            const nodeText = await firstNode.innerText();
            expect(nodeText).toBe('Node 1'); // Verify the value of the first node
        });

        test('User can add multiple nodes', async () => {
            await page.click('button:has-text("Add Node")');
            await page.click('button:has-text("Add Node")');
            const linkedListDiv = await page.$('#linkedList');
            const nodeCount = await linkedListDiv.evaluate(el => el.children.length);
            expect(nodeCount).toBe(3); // Verify that three nodes are added
        });
    });

    test.describe('Removing Nodes', () => {
        test('User can remove a node', async () => {
            await page.click('button:has-text("Remove Node")');
            const linkedListDiv = await page.$('#linkedList');
            const nodeCount = await linkedListDiv.evaluate(el => el.children.length);
            expect(nodeCount).toBe(2); // Verify that one node is removed
        });

        test('Removing all nodes should leave the list empty', async () => {
            await page.click('button:has-text("Remove Node")');
            await page.click('button:has-text("Remove Node")');
            const linkedListDiv = await page.$('#linkedList');
            const nodeCount = await linkedListDiv.evaluate(el => el.children.length);
            expect(nodeCount).toBe(0); // Verify that the list is empty
        });
    });

    test.describe('Clearing the List', () => {
        test('User can clear the list', async () => {
            await page.click('button:has-text("Add Node")');
            await page.click('button:has-text("Add Node")');
            await page.click('button:has-text("Clear List")');
            const linkedListDiv = await page.$('#linkedList');
            const nodeCount = await linkedListDiv.evaluate(el => el.children.length);
            expect(nodeCount).toBe(0); // Verify that the list is cleared
        });
    });

    test.describe('State Transitions', () => {
        test('Adding a node transitions from Idle to AddingNode', async () => {
            await page.click('button:has-text("Add Node")');
            const linkedListDiv = await page.$('#linkedList');
            const nodeCount = await linkedListDiv.evaluate(el => el.children.length);
            expect(nodeCount).toBe(1); // Verify transition to AddingNode
        });

        test('Removing a node transitions from Idle to RemovingNode', async () => {
            await page.click('button:has-text("Add Node")');
            await page.click('button:has-text("Remove Node")');
            const linkedListDiv = await page.$('#linkedList');
            const nodeCount = await linkedListDiv.evaluate(el => el.children.length);
            expect(nodeCount).toBe(0); // Verify transition to RemovingNode
        });

        test('Clearing the list transitions from Idle to ClearingList', async () => {
            await page.click('button:has-text("Add Node")');
            await page.click('button:has-text("Clear List")');
            const linkedListDiv = await page.$('#linkedList');
            const nodeCount = await linkedListDiv.evaluate(el => el.children.length);
            expect(nodeCount).toBe(0); // Verify transition to ClearingList
        });
    });
});