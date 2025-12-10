import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-2/html/24949520-d1d2-11f0-a359-f3a4ddd3c298.html';

test.describe('Depth-First Search (DFS) Visualization', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the DFS Visualization page before each test
        await page.goto(BASE_URL);
    });

    test('Initial state is Idle', async ({ page }) => {
        // Verify that the initial state is Idle
        const startButton = await page.locator('#startDFS');
        await expect(startButton).toBeVisible();
        await expect(startButton).toHaveText('Start DFS');
    });

    test('Start DFS transitions to Visiting Node state', async ({ page }) => {
        // Click the Start DFS button and check the transition to Visiting Node state
        await page.click('#startDFS');

        // Verify that the first node is marked as visited
        const firstNode = await page.locator('#node0');
        await expect(firstNode).toHaveClass(/visited/);
    });

    test('Nodes are marked as visited during DFS', async ({ page }) => {
        // Start the DFS and check if all nodes are visited
        await page.click('#startDFS');

        // Verify that all nodes are visited
        const visitedNodes = await page.locator('.node.visited');
        const totalNodes = await page.locator('.node').count();
        await expect(visitedNodes).toHaveCount(totalNodes);
    });

    test('Clicking Start DFS resets visited state', async ({ page }) => {
        // Start DFS to visit nodes
        await page.click('#startDFS');

        // Ensure nodes are visited
        const firstNode1 = await page.locator('#node0');
        await expect(firstNode).toHaveClass(/visited/);

        // Click Start DFS again to reset and start over
        await page.click('#startDFS');

        // Verify that nodes are reset and no nodes are visited
        const visitedNodes1 = await page.locator('.node.visited');
        await expect(visitedNodes).toHaveCount(0);
    });

    test('Clicking Start DFS multiple times works correctly', async ({ page }) => {
        // Click Start DFS multiple times and verify behavior
        await page.click('#startDFS');
        await expect(page.locator('#node0')).toHaveClass(/visited/);

        await page.click('#startDFS');
        await expect(page.locator('#node0')).toHaveClass(/visited/);

        // Ensure all nodes are visited after multiple clicks
        const visitedNodes2 = await page.locator('.node.visited');
        const totalNodes1 = await page.locator('.node').count();
        await expect(visitedNodes).toHaveCount(totalNodes);
    });

    test('Check for console errors during DFS execution', async ({ page }) => {
        // Listen for console errors
        const consoleErrors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });

        // Start DFS
        await page.click('#startDFS');

        // Wait for a moment to allow DFS to complete
        await page.waitForTimeout(1000);

        // Assert that there are no console errors
        expect(consoleErrors).toHaveLength(0);
    });
});