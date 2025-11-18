import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-18-0002/html/76a071a0-c466-11f0-be4b-41561101a3d0.html';

test.describe('Linked List Explorer', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test.describe('Idle State Tests', () => {
        test('should display empty list initially', async ({ page }) => {
            const listContent = await page.locator('#list').innerHTML();
            expect(listContent).toBe('');
        });

        test('should show error message when trying to add empty node', async ({ page }) => {
            await page.click('button:has-text("Add Node")');
            const outputMessage = await page.locator('#output').innerText();
            expect(outputMessage).toBe('Please enter a value to add.');
        });
    });

    test.describe('Adding Node State Tests', () => {
        test('should add a node and update the list', async ({ page }) => {
            await page.fill('#valueInput', 'Node 1');
            await page.click('button:has-text("Add Node")');
            const listContent = await page.locator('#list').innerHTML();
            expect(listContent).toContain('Node 1');
            const outputMessage = await page.locator('#output').innerText();
            expect(outputMessage).toBe('Added node with value: Node 1');
        });

        test('should add multiple nodes and update the list accordingly', async ({ page }) => {
            await page.fill('#valueInput', 'Node 1');
            await page.click('button:has-text("Add Node")');
            await page.fill('#valueInput', 'Node 2');
            await page.click('button:has-text("Add Node")');
            const listContent = await page.locator('#list').innerHTML();
            expect(listContent).toContain('Node 1');
            expect(listContent).toContain('Node 2');
            const outputMessage = await page.locator('#output').innerText();
            expect(outputMessage).toBe('Added node with value: Node 2');
        });

        test('should handle invalid input gracefully', async ({ page }) => {
            await page.fill('#valueInput', '');
            await page.click('button:has-text("Add Node")');
            const outputMessage = await page.locator('#output').innerText();
            expect(outputMessage).toBe('Please enter a value to add.');
        });
    });

    test.describe('Removing Node State Tests', () => {
        test('should remove a node and update the list', async ({ page }) => {
            await page.fill('#valueInput', 'Node 1');
            await page.click('button:has-text("Add Node")');
            await page.click('button:has-text("Remove Node")');
            const listContent = await page.locator('#list').innerHTML();
            expect(listContent).toBe('');
            const outputMessage = await page.locator('#output').innerText();
            expect(outputMessage).toBe('Removed node with value: Node 1');
        });

        test('should show error message when trying to remove from an empty list', async ({ page }) => {
            await page.click('button:has-text("Remove Node")');
            const outputMessage = await page.locator('#output').innerText();
            expect(outputMessage).toBe('No nodes to remove.');
        });

        test('should remove multiple nodes correctly', async ({ page }) => {
            await page.fill('#valueInput', 'Node 1');
            await page.click('button:has-text("Add Node")');
            await page.fill('#valueInput', 'Node 2');
            await page.click('button:has-text("Add Node")');
            await page.click('button:has-text("Remove Node")');
            const listContent = await page.locator('#list').innerHTML();
            expect(listContent).toContain('Node 1');
            expect(listContent).not.toContain('Node 2');
            const outputMessage = await page.locator('#output').innerText();
            expect(outputMessage).toBe('Removed node with value: Node 2');
        });
    });

    test.describe('Clearing List State Tests', () => {
        test('should clear the list and show appropriate message', async ({ page }) => {
            await page.fill('#valueInput', 'Node 1');
            await page.click('button:has-text("Add Node")');
            await page.click('button:has-text("Clear List")');
            const listContent = await page.locator('#list').innerHTML();
            expect(listContent).toBe('');
            const outputMessage = await page.locator('#output').innerText();
            expect(outputMessage).toBe('Cleared all nodes from the list.');
        });

        test('should handle clear list on empty list gracefully', async ({ page }) => {
            await page.click('button:has-text("Clear List")');
            const outputMessage = await page.locator('#output').innerText();
            expect(outputMessage).toBe('Cleared all nodes from the list.');
        });
    });
});