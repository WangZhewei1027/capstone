import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-40-02/html/5abeb2b0-ca8a-11f0-8532-d714b1159c0d.html';

test.describe('Depth-First Search Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should display the initial idle state', async ({ page }) => {
        const input = await page.locator('#graph');
        const button = await page.locator('#dfs-button');

        // Verify that the input field is present and empty
        await expect(input).toBeVisible();
        await expect(input).toHaveValue('');

        // Verify that the button is present and disabled
        await expect(button).toBeVisible();
        await expect(button).toBeDisabled();
    });

    test('should transition to Input Received state on valid input', async ({ page }) => {
        const input = await page.locator('#graph');
        const button = await page.locator('#dfs-button');

        // Input valid graph data
        await input.fill('A -> B, B -> C, C -> A');

        // Verify that the button is enabled after input
        await expect(button).toBeEnabled();
    });

    test('should perform DFS and transition to DFS Performed state', async ({ page }) => {
        const input = await page.locator('#graph');
        const button = await page.locator('#dfs-button');
        const graphContainer = await page.locator('#graph-container');

        // Input valid graph data
        await input.fill('A -> B, B -> C, C -> A');

        // Click the Perform DFS button
        await button.click();

        // Verify that the graph is drawn in the container
        await expect(graphContainer).toContainText('A');
        await expect(graphContainer).toContainText('B');
        await expect(graphContainer).toContainText('C');

        // Check if the DFS results are displayed (assuming some output is generated)
        await expect(graphContainer).toHaveText(/DFS traversal results displayed/);
    });

    test('should handle empty input gracefully', async ({ page }) => {
        const input = await page.locator('#graph');
        const button = await page.locator('#dfs-button');

        // Input empty graph data
        await input.fill('');

        // Verify that the button is disabled
        await expect(button).toBeDisabled();
    });

    test('should handle invalid graph input', async ({ page }) => {
        const input = await page.locator('#graph');
        const button = await page.locator('#dfs-button');
        const graphContainer = await page.locator('#graph-container');

        // Input invalid graph data
        await input.fill('Invalid Input');

        // Verify that the button is disabled
        await expect(button).toBeDisabled();

        // Check that no graph is drawn
        await expect(graphContainer).toBeEmpty();
    });

    test('should detect cycles in the graph', async ({ page }) => {
        const input = await page.locator('#graph');
        const button = await page.locator('#dfs-button');
        const graphContainer = await page.locator('#graph-container');

        // Input graph data that creates a cycle
        await input.fill('A -> B, B -> C, C -> A');

        // Click the Perform DFS button
        await button.click();

        // Verify that the cycle detection message is displayed
        await expect(graphContainer).toHaveText(/Cycle detected from node/);
    });

    test.afterEach(async ({ page }) => {
        // Optionally, reset the application state if necessary
        await page.reload();
    });
});