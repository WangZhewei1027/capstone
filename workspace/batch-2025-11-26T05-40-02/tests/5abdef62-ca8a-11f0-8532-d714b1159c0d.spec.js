import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-40-02/html/5abdef62-ca8a-11f0-8532-d714b1159c0d.html';

test.describe('Union-Find Interactive Application', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application before each test
        await page.goto(BASE_URL);
    });

    test('should render the graph in the Idle state', async ({ page }) => {
        // Validate that the graph is rendered correctly in the Idle state
        const graphDiv = await page.locator('#graph');
        await expect(graphDiv).toBeVisible();

        const nodeCount = await graphDiv.locator('.node').count();
        // Expecting 6 nodes based on the provided graph structure
        await expect(nodeCount).toBe(6);
    });

    test('should have correct node colors', async ({ page }) => {
        // Validate that nodes have the correct colors based on their connections
        const nodes = await page.locator('.node');
        const firstNodeColor = await nodes.nth(0).evaluate(node => node.style.background);
        const secondNodeColor = await nodes.nth(1).evaluate(node => node.style.background);

        // Expecting the first node to be light blue and the second to be light green
        await expect(firstNodeColor).toBe('lightblue');
        await expect(secondNodeColor).toBe('lightgreen');
    });

    test('should not have any interactive elements', async ({ page }) => {
        // Validate that there are no buttons or inputs in the application
        const buttons = await page.locator('button');
        const inputs = await page.locator('input');

        await expect(buttons).toHaveCount(0);
        await expect(inputs).toHaveCount(0);
    });

    test('should not change state on user interaction', async ({ page }) => {
        // Validate that there are no state transitions since there are no interactive elements
        const graphDiv = await page.locator('#graph');
        await expect(graphDiv).toBeVisible();

        // Simulate a click on the graph (though it should not change anything)
        await graphDiv.click();

        // Validate that the graph still has the same number of nodes
        const nodeCountAfterClick = await graphDiv.locator('.node').count();
        await expect(nodeCountAfterClick).toBe(6);
    });

    test('should maintain the same graph structure on reload', async ({ page }) => {
        // Validate that the graph structure remains the same after a reload
        await page.reload();
        const graphDiv = await page.locator('#graph');
        await expect(graphDiv).toBeVisible();

        const nodeCountAfterReload = await graphDiv.locator('.node').count();
        await expect(nodeCountAfterReload).toBe(6);
    });

    test.afterEach(async ({ page }) => {
        // Any necessary cleanup can be done here
        // For this application, there is no specific cleanup needed
    });
});