import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-25T23-45-53/html/e1370ea1-ca58-11f0-b3c1-8750c080fb19.html';

test.describe('Graph Visualization Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test.describe('Idle State Tests', () => {
        test('should enable controls in Idle state', async ({ page }) => {
            const addNodeButton = await page.locator('button:has-text("Add Node")');
            const addEdgeButton = await page.locator('button:has-text("Add Edge")');
            const toggleDirectedButton = await page.locator('button:has-text("Toggle Directed/Undirected")');

            await expect(addNodeButton).toBeVisible();
            await expect(addEdgeButton).toBeVisible();
            await expect(toggleDirectedButton).toBeVisible();
        });
    });

    test.describe('Adding Node Tests', () => {
        test('should transition to AddingNode state on Add Node click', async ({ page }) => {
            const addNodeButton = await page.locator('button:has-text("Add Node")');
            await addNodeButton.click();

            const graph = await page.locator('#graph');
            await expect(graph.locator('.node')).toHaveCount(1);
        });

        test('should finalize node addition and return to Idle state', async ({ page }) => {
            await page.locator('button:has-text("Add Node")').click();
            await page.locator('.node').click();

            const graph = await page.locator('#graph');
            await expect(graph.locator('.node')).toHaveCount(0);
        });
    });

    test.describe('Removing Node Tests', () => {
        test('should remove a node and redraw edges', async ({ page }) => {
            await page.locator('button:has-text("Add Node")').click();
            await page.locator('button:has-text("Add Node")').click();
            await page.locator('.node').nth(0).click();

            const graph = await page.locator('#graph');
            await expect(graph.locator('.node')).toHaveCount(1);
        });
    });

    test.describe('Adding Edge Tests', () => {
        test('should transition to AddingEdge state on Add Edge click', async ({ page }) => {
            await page.locator('button:has-text("Add Node")').click();
            await page.locator('button:has-text("Add Node")').click();
            await page.locator('button:has-text("Add Edge")').click();

            const graph = await page.locator('#graph');
            await expect(graph.locator('.edge')).toHaveCount(1);
        });
    });

    test.describe('Toggling Directed Tests', () => {
        test('should toggle directed state and redraw edges', async ({ page }) => {
            await page.locator('button:has-text("Add Node")').click();
            await page.locator('button:has-text("Add Node")').click();
            await page.locator('button:has-text("Add Edge")').click();
            await page.locator('button:has-text("Toggle Directed/Undirected")').click();

            const graph = await page.locator('#graph');
            await expect(graph.locator('.edge')).toHaveCount(1);
        });
    });

    test.describe('Edge Redrawing Tests', () => {
        test('should redraw edges after adding an edge', async ({ page }) => {
            await page.locator('button:has-text("Add Node")').click();
            await page.locator('button:has-text("Add Node")').click();
            await page.locator('button:has-text("Add Edge")').click();

            const graph = await page.locator('#graph');
            await expect(graph.locator('.edge')).toHaveCount(1);
        });
    });

    test.afterEach(async ({ page }) => {
        // Cleanup actions can be added here if necessary
    });
});