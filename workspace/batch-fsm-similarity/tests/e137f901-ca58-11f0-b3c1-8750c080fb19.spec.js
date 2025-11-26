import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-25T23-45-53/html/e137f901-ca58-11f0-b3c1-8750c080fb19.html';

test.describe('Depth-First Search (DFS) Visualization', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('Initial state is Idle', async ({ page }) => {
        // Verify that the Start DFS button is enabled
        const startButton = await page.locator('button');
        await expect(startButton).toBeEnabled();
    });

    test('Start DFS transitions to StartingDFS state', async ({ page }) => {
        const startButton = await page.locator('button');
        await startButton.click();

        // Verify that the Start DFS button is disabled after click
        await expect(startButton).toBeDisabled();
        
        // Verify that the first node (A) is highlighted as visited
        await expect(page.locator('[data-value="A"]')).toHaveClass(/visited/);
    });

    test('Visiting nodes transitions to VisitingNode state', async ({ page }) => {
        const startButton = await page.locator('button');
        await startButton.click();

        // Wait for the DFS to visit the first node
        await page.waitForTimeout(1000); // Wait for the first node visit

        // Verify that node B is visited
        await expect(page.locator('[data-value="B"]')).toHaveClass(/visited/);
        
        // Verify that node C is visited
        await expect(page.locator('[data-value="C"]')).toHaveClass(/visited/);
    });

    test('Completing DFS transitions to CompletedDFS state', async ({ page }) => {
        const startButton = await page.locator('button');
        await startButton.click();

        // Wait for the DFS to complete visiting all nodes
        await page.waitForTimeout(7000); // Adjust based on the total time taken for DFS

        // Verify that all nodes are visited
        const visitedNodes = await page.locator('.node.visited');
        const totalNodes = await page.locator('.node').count();
        expect(await visitedNodes.count()).toBe(totalNodes);
    });

    test('Resetting DFS returns to Idle state', async ({ page }) => {
        const startButton = await page.locator('button');
        await startButton.click();

        // Wait for the DFS to complete visiting all nodes
        await page.waitForTimeout(7000); // Adjust based on the total time taken for DFS

        // Simulate clicking the Start DFS button again to reset
        await startButton.click();

        // Verify that the Start DFS button is enabled again
        await expect(startButton).toBeEnabled();

        // Verify that no nodes are visited
        const visitedNodes = await page.locator('.node.visited');
        expect(await visitedNodes.count()).toBe(0);
    });

    test('Edge case: Clicking Start DFS multiple times', async ({ page }) => {
        const startButton = await page.locator('button');
        await startButton.click();

        // Wait for the DFS to start
        await page.waitForTimeout(1000);
        
        // Click the Start DFS button again while DFS is running
        await startButton.click();

        // Verify that the button remains disabled
        await expect(startButton).toBeDisabled();
    });
});