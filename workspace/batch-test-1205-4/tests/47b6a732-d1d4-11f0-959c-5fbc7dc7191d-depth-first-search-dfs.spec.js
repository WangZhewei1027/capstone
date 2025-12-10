import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-4/html/47b6a732-d1d4-11f0-959c-5fbc7dc7191d.html';

test.describe('Depth-First Search (DFS) Visualization', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the DFS visualization page before each test
        await page.goto(BASE_URL);
    });

    test('should load the page and display nodes', async ({ page }) => {
        // Verify that the page loads correctly and displays all nodes
        const nodes = await page.locator('.node');
        expect(await nodes.count()).toBe(7); // Expecting 7 nodes (A, B, C, D, E, F, G)

        const nodeValues = await nodes.evaluateAll(nodes => nodes.map(node => node.textContent));
        expect(nodeValues).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G']); // Check node values
    });

    test('should visit nodes in correct order when DFS is run', async ({ page }) => {
        // Click the "Run DFS" button to start the DFS
        await page.click('button');

        // Wait for the DFS to complete (considering the delay in the DFS implementation)
        await page.waitForTimeout(5000); // Wait for enough time to cover all nodes

        // Check that all nodes have been visited
        const visitedNodes = await page.locator('.visited');
        expect(await visitedNodes.count()).toBe(7); // All nodes should be visited

        // Verify the order of visited nodes visually (A, B, D, E, C, F, G)
        const visitedClasses = await visitedNodes.evaluateAll(nodes => nodes.map(node => node.getAttribute('data-value')));
        expect(visitedClasses).toEqual(['A', 'B', 'D', 'E', 'C', 'F', 'G']);
    });

    test('should not visit a node more than once', async ({ page }) => {
        // Click the "Run DFS" button to start the DFS
        await page.click('button');

        // Wait for the DFS to complete
        await page.waitForTimeout(5000);

        // Check that all nodes have been visited
        const visitedNodes = await page.locator('.visited');
        expect(await visitedNodes.count()).toBe(7); // All nodes should be visited

        // Check that no node has the visited class more than once
        const allNodes = await page.locator('.node');
        for (let i = 0; i < await allNodes.count(); i++) {
            const nodeClass = await allNodes.nth(i).getAttribute('class');
            expect(nodeClass.split(' ').includes('visited')).toBeLessThanOrEqual(1); // Each node can only be visited once
        }
    });

    test('should handle clicking the button multiple times', async ({ page }) => {
        // Click the "Run DFS" button multiple times
        await page.click('button');
        await page.waitForTimeout(2000); // Wait for partial completion
        await page.click('button'); // Click again

        // Wait for the DFS to complete
        await page.waitForTimeout(5000);

        // Check that all nodes have been visited only once
        const visitedNodes = await page.locator('.visited');
        expect(await visitedNodes.count()).toBe(7); // All nodes should be visited

        const allNodes = await page.locator('.node');
        for (let i = 0; i < await allNodes.count(); i++) {
            const nodeClass = await allNodes.nth(i).getAttribute('class');
            expect(nodeClass.split(' ').includes('visited')).toBeLessThanOrEqual(1); // Each node can only be visited once
        }
    });

    test('should not throw errors during execution', async ({ page }) => {
        // Listen for console errors
        const consoleErrors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });

        // Click the "Run DFS" button
        await page.click('button');

        // Wait for the DFS to complete
        await page.waitForTimeout(5000);

        // Assert that no console errors were thrown
        expect(consoleErrors.length).toBe(0); // No errors should occur during execution
    });
});