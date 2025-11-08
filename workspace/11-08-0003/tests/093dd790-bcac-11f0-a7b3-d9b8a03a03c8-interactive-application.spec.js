import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/093dd790-bcac-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Depth-First Search (DFS) Interactive Module', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('Initial state is idle', async ({ page }) => {
        // Verify the initial state is idle
        const startButton = await page.locator('#startBtn');
        await expect(startButton).toBeVisible();
        await expect(page.locator('#graph .node.visited')).toHaveCount(0);
    });

    test('Start DFS transitions to running state', async ({ page }) => {
        // Click the Start DFS button
        await page.click('#startBtn');

        // Verify that the DFS has started
        await expect(page.locator('#instructions p')).toHaveText('DFS is running...');
        await expect(page.locator('#graph .node.visited')).toHaveCount(1); // At least one node should be visited
    });

    test('Node visited during DFS', async ({ page }) => {
        // Start DFS
        await page.click('#startBtn');

        // Wait for a node to be visited
        await page.waitForTimeout(1000); // Adjust timeout based on the DFS implementation

        // Check if at least one node has been visited
        const visitedNodes = await page.locator('#graph .node.visited');
        await expect(visitedNodes).toHaveCount(1); // At least one node should be visited
    });

    test('Complete DFS transitions to done state', async ({ page }) => {
        // Start DFS
        await page.click('#startBtn');

        // Wait for the DFS to complete
        await page.waitForTimeout(3000); // Adjust based on the DFS completion time

        // Verify that the completion message is shown
        await expect(page.locator('#instructions p')).toHaveText('DFS is complete!');
        await expect(page.locator('#graph .node.visited')).toHaveCount(5); // All nodes should be visited
    });

    test('Reset transitions back to idle state', async ({ page }) => {
        // Start DFS
        await page.click('#startBtn');

        // Wait for the DFS to complete
        await page.waitForTimeout(3000);

        // Click the reset button
        await page.click('#resetBtn'); // Assuming there is a reset button

        // Verify that the state is back to idle
        await expect(page.locator('#instructions p')).toHaveText('Click "Start DFS" to see the algorithm in action!');
        await expect(page.locator('#graph .node.visited')).toHaveCount(0);
    });

    test('Edge case: Start DFS multiple times', async ({ page }) => {
        // Start DFS
        await page.click('#startBtn');
        await page.waitForTimeout(1000); // Allow some nodes to be visited

        // Start DFS again
        await page.click('#startBtn');

        // Verify that the state is still running and nodes are being visited
        await expect(page.locator('#instructions p')).toHaveText('DFS is running...');
        await expect(page.locator('#graph .node.visited')).toHaveCount(1); // At least one node should be visited
    });

    test('Error scenario: Click reset before starting DFS', async ({ page }) => {
        // Click the reset button without starting DFS
        await page.click('#resetBtn'); // Assuming there is a reset button

        // Verify that the state remains idle
        await expect(page.locator('#instructions p')).toHaveText('Click "Start DFS" to see the algorithm in action!');
        await expect(page.locator('#graph .node.visited')).toHaveCount(0);
    });
});