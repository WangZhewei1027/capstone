import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/12b2f440-bcac-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Dijkstra\'s Algorithm Interactive Explorer', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should start in idle state', async ({ page }) => {
        // Verify the initial state of the application
        const runButton = await page.locator('#run-algorithm');
        const resetButton = await page.locator('#reset-graph');
        await expect(runButton).toBeEnabled();
        await expect(resetButton).toBeEnabled();
    });

    test('should toggle node on click', async ({ page }) => {
        const graph = await page.locator('#graph');
        const nodePosition = { x: 100, y: 100 };

        // Click to add a node
        await graph.click({ position: nodePosition });
        const node = await page.locator('.node').nth(0);
        await expect(node).toBeVisible();

        // Click again to remove the node
        await graph.click({ position: nodePosition });
        await expect(node).not.toBeVisible();
    });

    test('should run the algorithm and transition to running state', async ({ page }) => {
        const runButton1 = await page.locator('#run-algorithm');
        
        // Ensure a node is present to run the algorithm
        const graph1 = await page.locator('#graph1');
        await graph.click({ position: { x: 100, y: 100 } }); // Add a node
        await graph.click({ position: { x: 140, y: 100 } }); // Add another node

        // Click to run the algorithm
        await runButton.click();
        await expect(runButton).toBeDisabled();

        // Wait for the algorithm to complete
        await page.waitForTimeout(2000); // Adjust based on actual algorithm duration
        const doneState = await page.locator('#graph .finalized');
        await expect(doneState).toBeVisible();
    });

    test('should reset the graph and return to idle state', async ({ page }) => {
        const resetButton1 = await page.locator('#reset-graph');
        const graph2 = await page.locator('#graph2');

        // Add nodes to the graph
        await graph.click({ position: { x: 100, y: 100 } });
        await graph.click({ position: { x: 140, y: 100 } });

        // Click to reset the graph
        await resetButton.click();

        // Verify that no nodes are visible
        const nodes = await page.locator('.node');
        await expect(nodes).toHaveCount(0);

        // Ensure buttons are enabled again
        const runButton2 = await page.locator('#run-algorithm');
        await expect(runButton).toBeEnabled();
    });

    test('should handle multiple node clicks correctly', async ({ page }) => {
        const graph3 = await page.locator('#graph3');
        const firstNodePosition = { x: 100, y: 100 };
        const secondNodePosition = { x: 140, y: 100 };

        // Click to add the first node
        await graph.click({ position: firstNodePosition });
        const firstNode = await page.locator('.node').nth(0);
        await expect(firstNode).toBeVisible();

        // Click to add the second node
        await graph.click({ position: secondNodePosition });
        const secondNode = await page.locator('.node').nth(1);
        await expect(secondNode).toBeVisible();

        // Click the first node again to remove it
        await graph.click({ position: firstNodePosition });
        await expect(firstNode).not.toBeVisible();
        await expect(secondNode).toBeVisible();
    });

    test('should complete the algorithm and transition to done state', async ({ page }) => {
        const runButton3 = await page.locator('#run-algorithm');
        const graph4 = await page.locator('#graph4');

        // Add nodes for the algorithm to run
        await graph.click({ position: { x: 100, y: 100 } });
        await graph.click({ position: { x: 140, y: 100 } });

        // Run the algorithm
        await runButton.click();
        await expect(runButton).toBeDisabled();

        // Wait for the algorithm to complete
        await page.waitForTimeout(2000); // Adjust based on actual algorithm duration
        const doneState1 = await page.locator('#graph .finalized');
        await expect(doneState).toBeVisible();

        // Reset the graph to return to idle state
        const resetButton2 = await page.locator('#reset-graph');
        await resetButton.click();
        await expect(runButton).toBeEnabled();
    });
});