import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-18-0001/html/a296faf0-c465-11f0-af61-192d6dbad219.html';

test.describe('Interactive Linked List Explorer', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test.describe('Adding Nodes', () => {
        test('should add a node to the linked list', async ({ page }) => {
            await page.fill('#nodeValue', 'Node 1');
            await page.click('#addNode');
            const listContent = await page.innerHTML('#list');
            expect(listContent).toContain('Node 1');
        });

        test('should add multiple nodes to the linked list', async ({ page }) => {
            await page.fill('#nodeValue', 'Node 1');
            await page.click('#addNode');
            await page.fill('#nodeValue', 'Node 2');
            await page.click('#addNode');
            const listContent1 = await page.innerHTML('#list');
            expect(listContent).toContain('Node 1');
            expect(listContent).toContain('Node 2');
        });

        test('should not add a node if input is empty', async ({ page }) => {
            await page.click('#addNode'); // Click without filling input
            const listContent2 = await page.innerHTML('#list');
            expect(listContent).toBe(''); // Should still be empty
        });
    });

    test.describe('Removing Nodes', () => {
        test('should remove the tail node from the linked list', async ({ page }) => {
            await page.fill('#nodeValue', 'Node 1');
            await page.click('#addNode');
            await page.fill('#nodeValue', 'Node 2');
            await page.click('#addNode');
            await page.click('#removeNode');
            const listContent3 = await page.innerHTML('#list');
            expect(listContent).not.toContain('Node 2'); // Node 2 should be removed
        });

        test('should not remove a node if the list is empty', async ({ page }) => {
            await page.click('#removeNode'); // Click remove on empty list
            const listContent4 = await page.innerHTML('#list');
            expect(listContent).toBe(''); // Should still be empty
        });

        test('should remove the last node and leave the list empty', async ({ page }) => {
            await page.fill('#nodeValue', 'Node 1');
            await page.click('#addNode');
            await page.click('#removeNode');
            const listContent5 = await page.innerHTML('#list');
            expect(listContent).toBe(''); // List should be empty after removing last node
        });
    });

    test.describe('State Transitions', () => {
        test('should transition to addingNode state when adding a node', async ({ page }) => {
            await page.fill('#nodeValue', 'Node 1');
            await page.click('#addNode');
            const outputContent = await page.innerHTML('#output');
            expect(outputContent).toContain('Adding Node'); // Assuming some visual feedback for state
        });

        test('should transition to removingNode state when removing a node', async ({ page }) => {
            await page.fill('#nodeValue', 'Node 1');
            await page.click('#addNode');
            await page.click('#removeNode');
            const outputContent1 = await page.innerHTML('#output');
            expect(outputContent).toContain('Removing Node'); // Assuming some visual feedback for state
        });
    });

    test.describe('Edge Cases', () => {
        test('should handle adding nodes with special characters', async ({ page }) => {
            await page.fill('#nodeValue', '@Node#1!');
            await page.click('#addNode');
            const listContent6 = await page.innerHTML('#list');
            expect(listContent).toContain('@Node#1!');
        });

        test('should handle removing nodes when only one node exists', async ({ page }) => {
            await page.fill('#nodeValue', 'Single Node');
            await page.click('#addNode');
            await page.click('#removeNode');
            const listContent7 = await page.innerHTML('#list');
            expect(listContent).toBe(''); // Should be empty after removal
        });
    });
});