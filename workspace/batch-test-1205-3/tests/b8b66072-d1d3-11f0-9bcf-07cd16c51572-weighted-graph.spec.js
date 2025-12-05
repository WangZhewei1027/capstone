import { test, expect } from '@playwright/test';

const url = 'http://127.0.0.1:5500/workspace/batch-test-1205-3/html/b8b66072-d1d3-11f0-9bcf-07cd16c51572.html';

test.describe('Weighted Graph Visualization', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application page before each test
        await page.goto(url);
    });

    test('should load the page and display the title', async ({ page }) => {
        // Verify the page title
        const title = await page.title();
        expect(title).toBe('Weighted Graph Visualization');
    });

    test('should add a node when the "Add Node" button is clicked', async ({ page }) => {
        // Click the "Add Node" button
        await page.click('button:has-text("Add Node")');

        // Check if a node is added to the graph
        const nodes = await page.locator('.node').count();
        expect(nodes).toBe(1);
    });

    test('should add multiple nodes when the "Add Node" button is clicked multiple times', async ({ page }) => {
        // Add multiple nodes
        await page.click('button:has-text("Add Node")');
        await page.click('button:has-text("Add Node")');

        // Check if the correct number of nodes is added
        const nodes = await page.locator('.node').count();
        expect(nodes).toBe(2);
    });

    test('should show an alert when trying to add an edge with less than two nodes', async ({ page }) => {
        // Click the "Add Edge" button without adding nodes
        const [alert] = await Promise.all([
            page.waitForEvent('dialog'),
            page.click('button:has-text("Add Edge")')
        ]);

        // Verify the alert message
        expect(alert.message()).toBe('You need at least two nodes to create an edge.');
        await alert.dismiss();
    });

    test('should add an edge between two nodes when the "Add Edge" button is clicked', async ({ page }) => {
        // Add two nodes
        await page.click('button:has-text("Add Node")');
        await page.click('button:has-text("Add Node")');

        // Click the "Add Edge" button
        const [alert] = await Promise.all([
            page.waitForEvent('dialog'),
            page.click('button:has-text("Add Edge")')
        ]);

        // Verify the alert message for edge creation
        expect(alert.message()).toMatch(/Edge from Node \d to Node \d/);
        await alert.dismiss();

        // Check if an edge is added to the graph
        const edges = await page.locator('.edge').count();
        expect(edges).toBe(1);
    });

    test('should add multiple edges when the "Add Edge" button is clicked multiple times', async ({ page }) => {
        // Add three nodes
        await page.click('button:has-text("Add Node")');
        await page.click('button:has-text("Add Node")');
        await page.click('button:has-text("Add Node")');

        // Add edges
        await page.click('button:has-text("Add Edge")');
        await page.click('button:has-text("Add Edge")');

        // Check if the correct number of edges is added
        const edges = await page.locator('.edge').count();
        expect(edges).toBe(2);
    });

    test('should alert with edge creation message when adding edges', async ({ page }) => {
        // Add two nodes
        await page.click('button:has-text("Add Node")');
        await page.click('button:has-text("Add Node")');

        // Click the "Add Edge" button
        const [alert] = await Promise.all([
            page.waitForEvent('dialog'),
            page.click('button:has-text("Add Edge")')
        ]);

        // Verify the alert message for edge creation
        expect(alert.message()).toMatch(/Edge from Node \d to Node \d/);
        await alert.dismiss();
    });

    test('should show alerts for edge creation when nodes are added dynamically', async ({ page }) => {
        // Add nodes dynamically
        for (let i = 0; i < 3; i++) {
            await page.click('button:has-text("Add Node")');
        }

        // Add edges
        await page.click('button:has-text("Add Edge")');
        await page.click('button:has-text("Add Edge")');

        // Check if the correct number of edges is added
        const edges = await page.locator('.edge').count();
        expect(edges).toBe(2);
    });
});