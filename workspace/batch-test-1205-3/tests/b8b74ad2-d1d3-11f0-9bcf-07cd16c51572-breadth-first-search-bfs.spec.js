import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-3/html/b8b74ad2-d1d3-11f0-9bcf-07cd16c51572.html';

test.describe('Breadth-First Search (BFS) Visualization', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the BFS visualization page before each test
        await page.goto(BASE_URL);
    });

    test('should load the page and display initial state', async ({ page }) => {
        // Verify the title of the page
        await expect(page).toHaveTitle('Breadth-First Search (BFS) Visualization');
        
        // Check that all nodes are present and not visited
        const nodes = await page.$$('.node');
        for (const node of nodes) {
            const className = await node.getAttribute('class');
            expect(className).not.toContain('visited');
        }

        // Check that the queue display is empty initially
        const queueDisplay = await page.locator('#queueDisplay');
        await expect(queueDisplay).toHaveText('');
    });

    test('should toggle node state on click', async ({ page }) => {
        // Click on node A to toggle its state
        await page.click('#A');
        const nodeA = await page.locator('#A');
        await expect(nodeA).toHaveClass(/visited/);

        // Click on node B to toggle its state
        await page.click('#B');
        const nodeB = await page.locator('#B');
        await expect(nodeB).toHaveClass(/visited/);

        // Click on node A again to toggle its state off
        await page.click('#A');
        await expect(nodeA).not.toHaveClass(/visited/);
    });

    test('should perform BFS and update queue display', async ({ page }) => {
        // Start BFS
        await page.click('button');

        // Wait for some time to allow BFS to process
        await page.waitForTimeout(3000);

        // Check that the queue display is updated
        const queueDisplay = await page.locator('#queueDisplay');
        const queueText = await queueDisplay.textContent();
        expect(queueText).not.toBe('');

        // Verify that nodes are marked as visited
        const visitedNodes = await page.$$('.node.visited');
        expect(visitedNodes.length).toBeGreaterThan(0);
    });

    test('should handle edge case of starting BFS from a visited node', async ({ page }) => {
        // Click on node A to toggle its state
        await page.click('#A');
        
        // Start BFS
        await page.click('button');

        // Wait for some time to allow BFS to process
        await page.waitForTimeout(3000);

        // Check that the queue display is updated
        const queueDisplay = await page.locator('#queueDisplay');
        const queueText = await queueDisplay.textContent();
        expect(queueText).not.toBe('');

        // Verify that node A is marked as visited
        const nodeA = await page.locator('#A');
        await expect(nodeA).toHaveClass(/visited/);
    });

    test('should not allow toggling of visited nodes', async ({ page }) => {
        // Start BFS
        await page.click('button');

        // Wait for some time to allow BFS to process
        await page.waitForTimeout(3000);

        // Click on node A which should already be visited
        await page.click('#A');

        // Verify that node A remains visited
        const nodeA = await page.locator('#A');
        await expect(nodeA).toHaveClass(/visited/);
    });

    test('should not crash on invalid interactions', async ({ page }) => {
        // Click on a non-existent node (should not crash)
        await page.evaluate(() => {
            const event = new MouseEvent('click', { bubbles: true });
            document.getElementById('nonExistentNode')?.dispatchEvent(event);
        });

        // Check that no errors are thrown in the console
        const consoleErrors = await page.evaluate(() => {
            return window.console.error.calls || [];
        });
        expect(consoleErrors.length).toBe(0);
    });
});