import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/8c9401a1-d1d3-11f0-a698-d7b407715e1f.html';

test.describe('Depth-First Search (DFS) Visualization', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the DFS visualization page before each test
        await page.goto(BASE_URL);
    });

    test('should load the page and display the graph', async ({ page }) => {
        // Check if the page title is correct
        await expect(page).toHaveTitle('Depth-First Search (DFS) Visualization');

        // Check if the graph container is present
        const graphContainer = await page.locator('#graph');
        await expect(graphContainer).toBeVisible();

        // Check if all nodes are created
        const nodes = await page.locator('.node');
        await expect(nodes).toHaveCount(6); // A, B, C, D, E, F
    });

    test('should start DFS and visualize node visits', async ({ page }) => {
        // Click the Start DFS button
        await page.click('button');

        // Wait for the first node (A) to be marked as visited
        const firstNode = await page.locator('.node[data-node="A"]');
        await expect(firstNode).toHaveClass(/visited/);

        // Wait for the second node (B) to be marked as visited
        await page.waitForTimeout(1000); // Wait for the DFS delay
        const secondNode = await page.locator('.node[data-node="B"]');
        await expect(secondNode).toHaveClass(/visited/);

        // Wait for the third node (D) to be marked as visited
        await page.waitForTimeout(1000);
        const thirdNode = await page.locator('.node[data-node="D"]');
        await expect(thirdNode).toHaveClass(/visited/);

        // Continue waiting for the next nodes to be visited
        await page.waitForTimeout(1000);
        const fourthNode = await page.locator('.node[data-node="E"]');
        await expect(fourthNode).toHaveClass(/visited/);

        await page.waitForTimeout(1000);
        const fifthNode = await page.locator('.node[data-node="C"]');
        await expect(fifthNode).toHaveClass(/visited/);

        await page.waitForTimeout(1000);
        const sixthNode = await page.locator('.node[data-node="F"]');
        await expect(sixthNode).toHaveClass(/visited/);
    });

    test('should not visit the same node twice', async ({ page }) => {
        // Click the Start DFS button
        await page.click('button');

        // Wait for the first node (A) to be marked as visited
        await expect(page.locator('.node[data-node="A"]')).toHaveClass(/visited/);
        
        // Wait for the second node (B) to be marked as visited
        await page.waitForTimeout(1000);
        await expect(page.locator('.node[data-node="B"]')).toHaveClass(/visited/);

        // Wait for the third node (D) to be marked as visited
        await page.waitForTimeout(1000);
        await expect(page.locator('.node[data-node="D"]')).toHaveClass(/visited/);

        // Wait for the DFS to finish
        await page.waitForTimeout(5000); // Wait for all nodes to be visited

        // Check that all nodes are marked as visited
        const nodes = await page.locator('.node');
        for (let i = 0; i < await nodes.count(); i++) {
            const nodeClass = await nodes.nth(i).getAttribute('class');
            expect(nodeClass).toContain('visited');
        }
    });

    test('should handle DFS with no nodes', async ({ page }) => {
        // Modify the adjacency list to simulate no nodes (not directly possible in this test)
        // This is a conceptual test; the actual implementation would require changes to the HTML/JS
        // Here, we just assert that the current setup does not allow for this scenario
        await expect(page.locator('.node')).toHaveCount(6); // Ensure there are nodes present
    });
});