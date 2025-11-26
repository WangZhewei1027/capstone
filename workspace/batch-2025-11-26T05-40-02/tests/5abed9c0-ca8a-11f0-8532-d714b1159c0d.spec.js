import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-40-02/html/5abed9c0-ca8a-11f0-8532-d714b1159c0d.html';

test.describe('Bellman-Ford Algorithm Interactive Application', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application page before each test
        await page.goto(BASE_URL);
    });

    test('should render the graph canvas on load', async ({ page }) => {
        // Validate that the graph canvas is rendered correctly
        const canvas = await page.locator('#graph');
        await expect(canvas).toBeVisible();
        await expect(canvas).toHaveAttribute('width', '800');
        await expect(canvas).toHaveAttribute('height', '400');
    });

    test('should execute Bellman-Ford algorithm on page load', async ({ page }) => {
        // Check console output for shortest distances and paths
        const consoleMessages = [];
        page.on('console', msg => consoleMessages.push(msg.text()));

        await page.waitForTimeout(1000); // Wait for the algorithm to execute

        // Validate that the console logs contain expected output
        expect(consoleMessages).toContain('Shortest distances from source to all other nodes:');
        expect(consoleMessages).toContain('Shortest path from source to all other nodes:');
    });

    test('should handle negative-weight cycles gracefully', async ({ page }) => {
        // Modify the graph to introduce a negative-weight cycle
        await page.evaluate(() => {
            window.graph = {
                'A': ['B', 'C'],
                'B': ['A', 'C', 'D'],
                'C': ['A', 'B', 'D', 'E'],
                'D': ['B', 'C', 'E'],
                'E': ['C', 'D', 'F'],
                'F': ['A'] // Adding a cycle back to A
            };
        });

        const consoleMessages = [];
        page.on('console', msg => consoleMessages.push(msg.text()));

        await page.waitForTimeout(1000); // Wait for the algorithm to execute

        // Validate that an error was thrown for negative-weight cycle
        expect(consoleMessages).toContain('Negative-weight cycle detected');
    });

    test.afterEach(async ({ page }) => {
        // Optionally, you can add cleanup code here if needed
    });
});