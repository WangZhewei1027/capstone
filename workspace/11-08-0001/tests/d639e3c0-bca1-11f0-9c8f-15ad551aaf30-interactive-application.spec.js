import { test, expect } from '@playwright/test';

const baseURL = 'http://127.0.0.1:5500/workspace/11-08-0001/html/d639e3c0-bca1-11f0-9c8f-15ad551aaf30.html';

test.describe('Interactive Linked List Application', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(baseURL);
    });

    test('should start in idle state', async ({ page }) => {
        const message = await page.locator('#message').innerText();
        expect(message).toBe('');
        const nodes = await page.locator('.node').count();
        expect(nodes).toBe(0);
    });

    test('should add a node and transition to adding state', async ({ page }) => {
        await page.fill('#nodeValue', 'Node 1');
        await page.click('button:has-text("Add Node")');

        const message = await page.locator('#message').innerText();
        expect(message).toBe('Node added!');

        const nodes = await page.locator('.node').count();
        expect(nodes).toBe(1);
        expect(await page.locator('.node').nth(0).innerText()).toBe('Node 1');
    });

    test('should show message when adding a node with empty input', async ({ page }) => {
        await page.click('button:has-text("Add Node")');

        const alertMessage = await page.evaluate(() => window.alert);
        expect(alertMessage).toBe('Please enter a value!');
    });

    test('should remove a node and transition to removing state', async ({ page }) => {
        await page.fill('#nodeValue', 'Node 1');
        await page.click('button:has-text("Add Node")');
        await page.fill('#nodeValue', 'Node 2');
        await page.click('button:has-text("Add Node")');

        await page.click('button:has-text("Remove Node")');

        const message = await page.locator('#message').innerText();
        expect(message).toBe('Node removed!');

        const nodes = await page.locator('.node').count();
        expect(nodes).toBe(1);
        expect(await page.locator('.node').nth(0).innerText()).toBe('Node 1');
    });

    test('should show message when trying to remove a node with no nodes present', async ({ page }) => {
        await page.click('button:has-text("Remove Node")');

        const message = await page.locator('#message').innerText();
        expect(message).toBe('No nodes to remove!');
    });

    test('should handle multiple adds and removes correctly', async ({ page }) => {
        await page.fill('#nodeValue', 'Node 1');
        await page.click('button:has-text("Add Node")');
        await page.fill('#nodeValue', 'Node 2');
        await page.click('button:has-text("Add Node")');
        await page.fill('#nodeValue', 'Node 3');
        await page.click('button:has-text("Add Node")');

        let nodes = await page.locator('.node').count();
        expect(nodes).toBe(3);

        await page.click('button:has-text("Remove Node")');
        await page.click('button:has-text("Remove Node")');

        nodes = await page.locator('.node').count();
        expect(nodes).toBe(1);
        expect(await page.locator('.node').nth(0).innerText()).toBe('Node 1');
    });

    test('should clear input field after adding a node', async ({ page }) => {
        await page.fill('#nodeValue', 'Node 1');
        await page.click('button:has-text("Add Node")');

        const inputValue = await page.locator('#nodeValue').inputValue();
        expect(inputValue).toBe('');
    });

    test('should show correct messages for add and remove actions', async ({ page }) => {
        await page.fill('#nodeValue', 'Node 1');
        await page.click('button:has-text("Add Node")');
        await page.click('button:has-text("Remove Node")');

        const addMessage = await page.locator('#message').innerText();
        expect(addMessage).toBe('Node added!');

        await page.click('button:has-text("Remove Node")');
        const removeMessage = await page.locator('#message').innerText();
        expect(removeMessage).toBe('Node removed!');
    });
});