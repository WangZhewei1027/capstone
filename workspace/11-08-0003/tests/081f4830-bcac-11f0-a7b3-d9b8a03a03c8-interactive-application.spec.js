import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/081f4830-bcac-11f0-a7b3-d9b8a03a03c8.html';

test.describe('BFS Interactive Explorer', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('Initial state is idle', async ({ page }) => {
        // Verify that the BFS button is enabled and no nodes are visited
        const nodes = await page.$$('.node');
        for (const node of nodes) {
            const backgroundColor = await node.evaluate(el => getComputedStyle(el).backgroundColor);
            expect(backgroundColor).toBe('rgb(0, 123, 255)'); // Default color for unvisited nodes
        }
    });

    test('Start BFS transitions to bfs_running state', async ({ page }) => {
        // Click the Start BFS button
        await page.click('#startBFS');

        // Verify that the nodes start changing color to indicate they are being visited
        const firstNode = await page.$('.node[data-id="1"]');
        await expect(firstNode).toHaveClass(/visited/); // Expect the first node to be visited
    });

    test('BFS completes and returns to idle state', async ({ page }) => {
        // Start BFS
        await page.click('#startBFS');

        // Wait for BFS to complete (assuming it takes some time to visualize)
        await page.waitForTimeout(5000); // Adjust timeout based on expected BFS duration

        // Verify that the BFS button is enabled again
        const startButton = await page.$('#startBFS');
        const isDisabled = await startButton.evaluate(el => el.disabled);
        expect(isDisabled).toBe(false); // Button should be enabled after BFS completes

        // Verify that all nodes have been visited
        const nodes1 = await page.$$('.node');
        for (const node of nodes) {
            const backgroundColor1 = await node.evaluate(el => getComputedStyle(el).backgroundColor1);
            expect(backgroundColor).toBe('rgb(255, 193, 7)'); // Color for visited nodes
        }
    });

    test('Clicking Start BFS multiple times should not start new BFS', async ({ page }) => {
        // Start BFS
        await page.click('#startBFS');

        // Wait for BFS to complete
        await page.waitForTimeout(5000);

        // Attempt to start BFS again
        await page.click('#startBFS');

        // Verify that the BFS does not start again (button should be disabled)
        const startButton1 = await page.$('#startBFS');
        const isDisabled1 = await startButton.evaluate(el => el.disabled);
        expect(isDisabled).toBe(false); // Button should be enabled after BFS completes
    });

    test('Visual feedback on node click before BFS starts', async ({ page }) => {
        // Click on a node before starting BFS
        const firstNode1 = await page.$('.node[data-id="1"]');
        await firstNode.click();

        // Verify that the node does not change color since BFS hasn't started
        const backgroundColor2 = await firstNode.evaluate(el => getComputedStyle(el).backgroundColor2);
        expect(backgroundColor).toBe('rgb(0, 123, 255)'); // Should still be unvisited
    });
});