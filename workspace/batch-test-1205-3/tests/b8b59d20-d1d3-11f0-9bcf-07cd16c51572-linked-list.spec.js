import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-3/html/b8b59d20-d1d3-11f0-9bcf-07cd16c51572.html';

test.describe('Linked List Visualization Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the Linked List Visualization page before each test
        await page.goto(BASE_URL);
    });

    test('should load the page and display the title', async ({ page }) => {
        // Verify that the page loads correctly and the title is displayed
        const title = await page.title();
        expect(title).toBe('Linked List Visualization');
        const header = await page.locator('h1');
        await expect(header).toBeVisible();
        await expect(header).toHaveText('Linked List Visualization');
    });

    test('should add a node to the linked list', async ({ page }) => {
        // Test adding a node with a valid value
        await page.fill('#nodeValue', 'Node 1');
        await page.click('button:has-text("Add Node")');

        // Verify that the node is added to the DOM
        const node = await page.locator('.node');
        await expect(node).toHaveText('Node 1');
        await expect(node).toHaveCount(1);
    });

    test('should add multiple nodes to the linked list', async ({ page }) => {
        // Test adding multiple nodes
        await page.fill('#nodeValue', 'Node 1');
        await page.click('button:has-text("Add Node")');
        await page.fill('#nodeValue', 'Node 2');
        await page.click('button:has-text("Add Node")');

        // Verify that both nodes are displayed
        const nodes = await page.locator('.node');
        await expect(nodes).toHaveCount(2);
        await expect(nodes.nth(0)).toHaveText('Node 1');
        await expect(nodes.nth(1)).toHaveText('Node 2');
    });

    test('should show an alert when trying to add an empty node', async ({ page }) => {
        // Test adding a node with an empty value
        await page.click('button:has-text("Add Node")');

        // Verify that the alert is shown
        page.on('dialog', async dialog => {
            expect(dialog.message()).toBe('Please enter a valid value');
            await dialog.dismiss();
        });
    });

    test('should not add a node if input is empty', async ({ page }) => {
        // Ensure no nodes are added when input is empty
        await page.click('button:has-text("Add Node")');

        // Verify that no nodes are displayed
        const nodes = await page.locator('.node');
        await expect(nodes).toHaveCount(0);
    });

    test('should render nodes correctly with arrows', async ({ page }) => {
        // Test adding nodes and verify the rendering with arrows
        await page.fill('#nodeValue', 'Node 1');
        await page.click('button:has-text("Add Node")');
        await page.fill('#nodeValue', 'Node 2');
        await page.click('button:has-text("Add Node")');

        // Verify that the nodes and arrows are rendered correctly
        const nodes = await page.locator('.node');
        const arrows = await page.locator('.arrow');
        await expect(nodes).toHaveCount(2);
        await expect(arrows).toHaveCount(1); // One arrow between two nodes
    });
});