import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-25T23-45-53/html/e1370ea2-ca58-11f0-b3c1-8750c080fb19.html';

test.describe('Weighted Graph Visualization', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should be in Idle state on load', async ({ page }) => {
        const graphDiv = await page.locator('#graph');
        await expect(graphDiv).toBeVisible();
    });

    test('should transition to AddingNode state when Add Node button is clicked', async ({ page }) => {
        await page.click('text=Add Node');
        const nodeInput = await page.locator('input[name="node"]');
        await expect(nodeInput).toBeVisible();
    });

    test('should transition to AddingEdge state when Add Edge button is clicked', async ({ page }) => {
        await page.click('text=Add Edge');
        const edgeInput = await page.locator('input[name="edge"]');
        await expect(edgeInput).toBeVisible();
    });

    test('should transition to RemovingNode state when Remove Node button is clicked', async ({ page }) => {
        await page.click('text=Remove Node');
        const confirmRemoval = await page.locator('text=Confirm Removal');
        await expect(confirmRemoval).toBeVisible();
    });

    test('should transition to RemovingEdge state when Remove Edge button is clicked', async ({ page }) => {
        await page.click('text=Remove Edge');
        const confirmEdgeRemoval = await page.locator('text=Confirm Edge Removal');
        await expect(confirmEdgeRemoval).toBeVisible();
    });

    test('should transition to ResettingGraph state when Reset button is clicked', async ({ page }) => {
        await page.click('text=Reset');
        const confirmReset = await page.locator('text=Confirm Reset');
        await expect(confirmReset).toBeVisible();
    });

    test('should return to Idle state after resetting the graph', async ({ page }) => {
        await page.click('text=Reset');
        await page.click('text=Confirm Reset');
        const graphDiv = await page.locator('#graph');
        await expect(graphDiv).toHaveText('');
    });

    test('should clear node input after exiting AddingNode state', async ({ page }) => {
        await page.click('text=Add Node');
        await page.fill('input[name="node"]', 'Node A');
        await page.click('text=Add Node'); // Simulate adding the node
        const nodeInput = await page.locator('input[name="node"]');
        await expect(nodeInput).toHaveValue('');
    });

    test('should clear edge input after exiting AddingEdge state', async ({ page }) => {
        await page.click('text=Add Edge');
        await page.fill('input[name="edge"]', 'Edge A-B');
        await page.click('text=Add Edge'); // Simulate adding the edge
        const edgeInput = await page.locator('input[name="edge"]');
        await expect(edgeInput).toHaveValue('');
    });

    test('should clear node highlight after exiting RemovingNode state', async ({ page }) => {
        await page.click('text=Remove Node');
        await page.click('text=Confirm Removal');
        const nodeHighlight = await page.locator('.node.highlight');
        await expect(nodeHighlight).toHaveCount(0);
    });

    test('should clear edge highlight after exiting RemovingEdge state', async ({ page }) => {
        await page.click('text=Remove Edge');
        await page.click('text=Confirm Edge Removal');
        const edgeHighlight = await page.locator('.edge.highlight');
        await expect(edgeHighlight).toHaveCount(0);
    });

    test('should handle edge case for removing non-existent node', async ({ page }) => {
        await page.click('text=Remove Node');
        await page.click('text=Confirm Removal');
        const errorMessage = await page.locator('text=Node does not exist');
        await expect(errorMessage).toBeVisible();
    });

    test('should handle edge case for removing non-existent edge', async ({ page }) => {
        await page.click('text=Remove Edge');
        await page.click('text=Confirm Edge Removal');
        const errorMessage = await page.locator('text=Edge does not exist');
        await expect(errorMessage).toBeVisible();
    });
});