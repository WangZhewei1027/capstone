import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-35-35/html/bba63e52-ca89-11f0-800e-fdebe921fc5f.html';

test.describe('BFS Interactive Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('Initial state - Idle', async ({ page }) => {
        // Validate the initial state of the application
        const inputField = await page.locator('#graph');
        const bfsButton = await page.locator('#bfs-btn');
        const graphContainer = await page.locator('#graph-container');

        await expect(inputField).toBeVisible();
        await expect(inputField).toHaveAttribute('placeholder', 'Enter graph vertices');
        await expect(bfsButton).toBeVisible();
        await expect(graphContainer).toBeEmpty();
    });

    test('Input graph vertices', async ({ page }) => {
        // Test user input for graph vertices
        const inputField = await page.locator('#graph');
        await inputField.fill('1 2 3');
        
        // Validate that the input is correctly reflected
        await expect(inputField).toHaveValue('1 2 3');
    });

    test('Click BFS button - Transition to Processing', async ({ page }) => {
        // Test clicking the BFS button and transitioning to Processing state
        const inputField = await page.locator('#graph');
        const bfsButton = await page.locator('#bfs-btn');
        
        await inputField.fill('1 2 3');
        await bfsButton.click();

        // Validate that the graph-container is still empty during processing
        const graphContainer = await page.locator('#graph-container');
        await expect(graphContainer).toBeEmpty();
    });

    test('Display results after BFS processing', async ({ page }) => {
        // Test that results are displayed after BFS processing
        const inputField = await page.locator('#graph');
        const bfsButton = await page.locator('#bfs-btn');
        
        await inputField.fill('1 2 3');
        await bfsButton.click();

        // Wait for the results to be displayed
        const graphContainer = await page.locator('#graph-container');
        await expect(graphContainer).toContainText('1');
        await expect(graphContainer).toContainText('2');
        await expect(graphContainer).toContainText('3');
    });

    test('Edge case - Empty input', async ({ page }) => {
        // Test behavior when no input is provided
        const bfsButton = await page.locator('#bfs-btn');
        await bfsButton.click();

        const graphContainer = await page.locator('#graph-container');
        await expect(graphContainer).toBeEmpty(); // Expect no results to be displayed
    });

    test('Edge case - Invalid input', async ({ page }) => {
        // Test behavior when invalid input is provided
        const inputField = await page.locator('#graph');
        const bfsButton = await page.locator('#bfs-btn');
        
        await inputField.fill('invalid input');
        await bfsButton.click();

        const graphContainer = await page.locator('#graph-container');
        await expect(graphContainer).toBeEmpty(); // Expect no results to be displayed
    });
});