import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-40-02/html/5abeb2b2-ca8a-11f0-8532-d714b1159c0d.html';

test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
});

test.describe('Dijkstra\'s Algorithm Interactive Application', () => {
    
    test('Initial state should be Idle', async ({ page }) => {
        // Verify that the application starts in the Idle state
        const sourceInput = await page.locator('#source');
        const targetInput = await page.locator('#target');
        const startButton = await page.locator('#start-button');
        const resetButton = await page.locator('#reset-button');
        
        await expect(sourceInput).toBeVisible();
        await expect(targetInput).toBeVisible();
        await expect(startButton).toBeVisible();
        await expect(resetButton).toBeVisible();
    });

    test('Should transition to Algorithm Running state on Start button click', async ({ page }) => {
        // Input valid source and target nodes and click Start
        await page.fill('#source', '1');
        await page.fill('#target', '2');
        await page.click('#start-button');

        // Verify that the graph is visualized
        const graphDiv = await page.locator('#graph');
        await expect(graphDiv).toContainText('Node');
        await expect(graphDiv).toContainText('Weight');
    });

    test('Should not start algorithm if source and target are the same', async ({ page }) => {
        // Input the same node for source and target
        await page.fill('#source', '1');
        await page.fill('#target', '1');
        await page.click('#start-button');

        // Verify that no graph is visualized
        const graphDiv = await page.locator('#graph');
        await expect(graphDiv).not.toContainText('Node');
    });

    test('Should transition to Reset state on Reset button click', async ({ page }) => {
        // Input valid nodes, start the algorithm, then reset
        await page.fill('#source', '1');
        await page.fill('#target', '2');
        await page.click('#start-button');
        await page.click('#reset-button');

        // Verify that the graph is reset
        const graphDiv = await page.locator('#graph');
        await expect(graphDiv).toBeEmpty();
    });

    test('Should allow starting the algorithm again after reset', async ({ page }) => {
        // Reset the graph and start again
        await page.fill('#source', '1');
        await page.fill('#target', '2');
        await page.click('#reset-button');
        await page.click('#start-button');

        // Verify that the graph is visualized again
        const graphDiv = await page.locator('#graph');
        await expect(graphDiv).toContainText('Node');
        await expect(graphDiv).toContainText('Weight');
    });

    test('Should handle edge case of empty source and target', async ({ page }) => {
        // Click Start without filling source and target
        await page.click('#start-button');

        // Verify that no graph is visualized
        const graphDiv = await page.locator('#graph');
        await expect(graphDiv).not.toContainText('Node');
    });

    test('Should handle edge case of non-numeric input', async ({ page }) => {
        // Input non-numeric values
        await page.fill('#source', 'abc');
        await page.fill('#target', 'xyz');
        await page.click('#start-button');

        // Verify that no graph is visualized
        const graphDiv = await page.locator('#graph');
        await expect(graphDiv).not.toContainText('Node');
    });

    test('Should reset graph correctly', async ({ page }) => {
        // Start the algorithm and reset
        await page.fill('#source', '1');
        await page.fill('#target', '2');
        await page.click('#start-button');
        await page.click('#reset-button');

        // Verify that the graph is empty
        const graphDiv = await page.locator('#graph');
        await expect(graphDiv).toBeEmpty();
    });
});