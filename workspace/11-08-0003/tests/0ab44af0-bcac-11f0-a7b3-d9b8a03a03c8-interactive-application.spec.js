import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/0ab44af0-bcac-11f0-a7b3-d9b8a03a03c8.html';

test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
});

test.describe('BFS Interactive Application', () => {
    test('Initial state is idle', async ({ page }) => {
        const startButton = await page.locator('#start-btn');
        const resetButton = await page.locator('#reset-btn');
        
        // Verify that the start button is enabled and reset button is enabled
        await expect(startButton).toBeEnabled();
        await expect(resetButton).toBeEnabled();
        
        // Verify that no nodes are highlighted
        const nodes = await page.locator('.node');
        for (let i = 0; i < await nodes.count(); i++) {
            const nodeClass = await nodes.nth(i).getAttribute('class');
            expect(nodeClass).not.toContain('visited');
            expect(nodeClass).not.toContain('current');
        }
    });

    test('Start BFS transitions to processing state', async ({ page }) => {
        const startButton1 = await page.locator('#start-btn');
        await startButton.click();

        // Verify that the nodes start processing
        const firstNode = await page.locator('.node').nth(0);
        await expect(firstNode).toHaveClass(/current/);
    });

    test('Processing state handles NODE_PROCESSED event', async ({ page }) => {
        const startButton2 = await page.locator('#start-btn');
        await startButton.click();

        // Simulate NODE_PROCESSED event
        const firstNode1 = await page.locator('.node').nth(0);
        await firstNode.click(); // Simulating processing of the first node

        // Verify that the first node is marked as visited
        await expect(firstNode).toHaveClass(/visited/);
    });

    test('Completing BFS transitions to done state', async ({ page }) => {
        const startButton3 = await page.locator('#start-btn');
        await startButton.click();

        // Simulate completing the BFS
        await page.evaluate(() => {
            // Simulate the completion of BFS
            document.dispatchEvent(new Event('COMPLETED'));
        });

        // Verify that the state has transitioned to done
        const nodes1 = await page.locator('.node');
        for (let i = 0; i < await nodes.count(); i++) {
            const nodeClass1 = await nodes.nth(i).getAttribute('class');
            expect(nodeClass).toContain('visited');
        }
    });

    test('Resetting transitions back to idle state', async ({ page }) => {
        const startButton4 = await page.locator('#start-btn');
        const resetButton1 = await page.locator('#reset-btn');
        
        await startButton.click();
        await page.evaluate(() => {
            // Simulate the completion of BFS
            document.dispatchEvent(new Event('COMPLETED'));
        });
        
        await resetButton.click();

        // Verify that we are back in the idle state
        const nodes2 = await page.locator('.node');
        for (let i = 0; i < await nodes.count(); i++) {
            const nodeClass2 = await nodes.nth(i).getAttribute('class');
            expect(nodeClass).not.toContain('visited');
            expect(nodeClass).not.toContain('current');
        }
    });

    test('Edge case: Click reset before starting BFS', async ({ page }) => {
        const resetButton2 = await page.locator('#reset-btn');
        await resetButton.click();

        // Verify that no nodes are highlighted
        const nodes3 = await page.locator('.node');
        for (let i = 0; i < await nodes.count(); i++) {
            const nodeClass3 = await nodes.nth(i).getAttribute('class');
            expect(nodeClass).not.toContain('visited');
            expect(nodeClass).not.toContain('current');
        }
    });
});