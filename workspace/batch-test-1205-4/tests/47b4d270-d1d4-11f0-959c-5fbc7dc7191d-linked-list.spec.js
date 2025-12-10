import { test, expect } from '@playwright/test';

test.describe('Linked List Visualization', () => {
    let page;

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();
        await page.goto('http://127.0.0.1:5500/workspace/batch-test-1205-4/html/47b4d270-d1d4-11f0-959c-5fbc7dc7191d.html');
    });

    test.afterAll(async () => {
        await page.close();
    });

    test('should load the page and display the title', async () => {
        const title = await page.title();
        expect(title).toBe('Linked List Visualization');
    });

    test('should initially display an empty linked list', async () => {
        const linkedListDiv = await page.locator('#linkedList');
        const content = await linkedListDiv.innerHTML();
        expect(content).toBe('');
    });

    test.describe('Adding Nodes', () => {
        test('should add a node to the linked list', async () => {
            await page.fill('#nodeValue', 'Node 1');
            await page.click('button:has-text("Add Node")');

            const linkedListDiv = await page.locator('#linkedList');
            const content = await linkedListDiv.innerHTML();
            expect(content).toContain('Node 1');
        });

        test('should add multiple nodes to the linked list', async () => {
            await page.fill('#nodeValue', 'Node 2');
            await page.click('button:has-text("Add Node")');
            await page.fill('#nodeValue', 'Node 3');
            await page.click('button:has-text("Add Node")');

            const linkedListDiv = await page.locator('#linkedList');
            const content = await linkedListDiv.innerHTML();
            expect(content).toContain('Node 2');
            expect(content).toContain('Node 3');
        });

        test('should not add a node if input is empty', async () => {
            await page.fill('#nodeValue', '');
            await page.click('button:has-text("Add Node")');

            const linkedListDiv = await page.locator('#linkedList');
            const content = await linkedListDiv.innerHTML();
            expect(content).not.toContain('Node 1'); // Ensure previous nodes remain
        });
    });

    test.describe('Removing Nodes', () => {
        test('should remove the last node from the linked list', async () => {
            await page.click('button:has-text("Remove Node")');

            const linkedListDiv = await page.locator('#linkedList');
            const content = await linkedListDiv.innerHTML();
            expect(content).not.toContain('Node 3');
        });

        test('should remove nodes until the list is empty', async () => {
            await page.click('button:has-text("Remove Node")'); // Remove Node 2
            await page.click('button:has-text("Remove Node")'); // Remove Node 1

            const linkedListDiv = await page.locator('#linkedList');
            const content = await linkedListDiv.innerHTML();
            expect(content).toBe(''); // List should be empty
        });

        test('should not remove a node if the list is empty', async () => {
            await page.click('button:has-text("Remove Node")');

            const linkedListDiv = await page.locator('#linkedList');
            const content = await linkedListDiv.innerHTML();
            expect(content).toBe(''); // List should still be empty
        });
    });

    test('should handle console errors gracefully', async () => {
        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.error(msg.text());
            }
        });

        // Trigger an error by trying to remove a node from an empty list
        await page.click('button:has-text("Remove Node")');

        // Check if any console errors were logged
        const consoleErrors = await page.evaluate(() => {
            return window.console.error.calls.map(call => call.arguments);
        });

        expect(consoleErrors.length).toBeGreaterThan(0); // Expect at least one error to be logged
    });
});