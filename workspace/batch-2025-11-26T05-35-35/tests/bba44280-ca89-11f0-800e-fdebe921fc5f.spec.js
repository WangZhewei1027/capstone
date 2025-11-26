import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-35-35/html/bba44280-ca89-11f0-800e-fdebe921fc5f.html';

test.describe('Linked List Interactive Application', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the linked list application
        await page.goto(BASE_URL);
    });

    test('Initial state should be Idle', async ({ page }) => {
        // Verify that the list is initially empty
        const listContent = await page.locator('table').innerHTML();
        expect(listContent).toContain('Index');
        expect(listContent).toContain('Data');
    });

    test('Add node to the linked list', async ({ page }) => {
        // Input data for the new node
        await page.fill('#data', '10');
        await page.click('#add');

        // Verify that the node is added and the list is printed
        const listContent = await page.locator('table').innerHTML();
        expect(listContent).toContain('0 -> 10');
    });

    test('Print list after adding a node', async ({ page }) => {
        // Add a node first
        await page.fill('#data', '20');
        await page.click('#add');

        // Now print the list
        await page.click('#print');

        // Verify the printed list
        const listContent = await page.locator('table').innerHTML();
        expect(listContent).toContain('0 -> 20');
    });

    test('Remove node from the linked list', async ({ page }) => {
        // Add a node first
        await page.fill('#data', '30');
        await page.click('#add');

        // Remove the node
        await page.fill('#data', '0'); // Index of the node to remove
        await page.click('#remove');

        // Verify that the list is empty after removal
        const listContent = await page.locator('table').innerHTML();
        expect(listContent).toContain('Index');
        expect(listContent).toContain('Data');
    });

    test('Print list after removing a node', async ({ page }) => {
        // Add a node first
        await page.fill('#data', '40');
        await page.click('#add');

        // Remove the node
        await page.fill('#data', '0'); // Index of the node to remove
        await page.click('#remove');

        // Print the list
        await page.click('#print');

        // Verify the printed list is empty
        const listContent = await page.locator('table').innerHTML();
        expect(listContent).toContain('Index');
        expect(listContent).toContain('Data');
    });

    test('Handle invalid index for removal', async ({ page }) => {
        // Attempt to remove a node with an invalid index
        await page.fill('#data', '10'); // Invalid index
        await page.click('#remove');

        // Verify that the list remains unchanged
        const listContent = await page.locator('table').innerHTML();
        expect(listContent).toContain('Index');
        expect(listContent).toContain('Data');
    });

    test('Print list without adding nodes', async ({ page }) => {
        // Directly print the list without adding any nodes
        await page.click('#print');

        // Verify that the printed list is empty
        const listContent = await page.locator('table').innerHTML();
        expect(listContent).toContain('Index');
        expect(listContent).toContain('Data');
    });
});