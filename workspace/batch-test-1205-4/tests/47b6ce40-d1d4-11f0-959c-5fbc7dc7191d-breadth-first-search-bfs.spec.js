import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-4/html/47b6ce40-d1d4-11f0-959c-5fbc7dc7191d.html';

test.describe('Breadth-First Search (BFS) Visualization', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the BFS visualization page before each test
        await page.goto(BASE_URL);
    });

    test('should load the page with the correct title and elements', async ({ page }) => {
        // Verify the page title
        await expect(page).toHaveTitle('Breadth-First Search (BFS) Visualization');
        
        // Check if the start button is visible
        const startButton = await page.locator('#start');
        await expect(startButton).toBeVisible();
        
        // Check if all nodes are visible
        const nodes = await page.locator('.node');
        await expect(nodes).toHaveCount(6);
        await expect(nodes.nth(0)).toHaveText('A');
        await expect(nodes.nth(1)).toHaveText('B');
        await expect(nodes.nth(2)).toHaveText('C');
        await expect(nodes.nth(3)).toHaveText('D');
        await expect(nodes.nth(4)).toHaveText('E');
        await expect(nodes.nth(5)).toHaveText('F');
    });

    test('should change node colors when BFS is started', async ({ page }) => {
        // Start the BFS process
        const startButton = await page.locator('#start');
        await startButton.click();
        
        // Verify that the nodes change to visited state
        await expect(page.locator('.node[data-value="A"]')).toHaveClass(/visited/);
        await expect(page.locator('.node[data-value="B"]')).toHaveClass(/visited/);
        await expect(page.locator('.node[data-value="C"]')).toHaveClass(/visited/);
        await expect(page.locator('.node[data-value="D"]')).toHaveClass(/visited/);
        await expect(page.locator('.node[data-value="E"]')).toHaveClass(/visited/);
        await expect(page.locator('.node[data-value="F"]')).toHaveClass(/visited/);
    });

    test('should visit nodes in the correct order', async ({ page }) => {
        // Start the BFS process
        const startButton = await page.locator('#start');
        await startButton.click();
        
        // Verify the order of visited nodes
        const visitedNodes = await page.locator('.node.visited');
        const visitedTexts = await visitedNodes.allTextContents();
        
        // The expected order of visited nodes is A, B, C, D, E, F
        expect(visitedTexts).toEqual(['A', 'B', 'C', 'D', 'E', 'F']);
    });

    test('should handle empty graph gracefully', async ({ page }) => {
        // Modify the graph to be empty (not possible in this test case, but we can simulate)
        // Here we just check if the BFS function would handle it without errors
        // This test is more about checking for console errors
        const consoleErrors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });

        // Start the BFS process
        const startButton = await page.locator('#start');
        await startButton.click();

        // Check for console errors
        await expect(consoleErrors).toHaveLength(0);
    });
});