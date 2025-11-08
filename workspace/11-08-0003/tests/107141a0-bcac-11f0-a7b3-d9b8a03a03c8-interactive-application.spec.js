import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/107141a0-bcac-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Dijkstra\'s Algorithm Interactive Module', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should initialize grid in idle state', async ({ page }) => {
        const grid = await page.locator('#grid');
        const nodes = await grid.locator('.node');
        expect(await nodes.count()).toBe(25); // 5x5 grid
    });

    test('should select start node and transition to SELECTING_START_NODE', async ({ page }) => {
        const firstNode = await page.locator('.node').nth(0);
        await firstNode.click();
        expect(await firstNode.evaluate(node => node.classList.contains('start'))).toBe(true);
    });

    test('should select end node and transition to SELECTING_END_NODE', async ({ page }) => {
        const firstNode1 = await page.locator('.node').nth(0);
        const secondNode = await page.locator('.node').nth(1);
        await firstNode.click();
        await secondNode.click();
        expect(await secondNode.evaluate(node => node.classList.contains('end'))).toBe(true);
    });

    test('should reset and return to idle state', async ({ page }) => {
        const resetButton = await page.locator('#resetBtn');
        await resetButton.click();
        const nodes1 = await page.locator('.node');
        for (let i = 0; i < await nodes.count(); i++) {
            const node = await nodes.nth(i);
            expect(await node.evaluate(node => node.classList.contains('start'))).toBe(false);
            expect(await node.evaluate(node => node.classList.contains('end'))).toBe(false);
        }
    });

    test('should run algorithm and transition to RUNNING_ALGORITHM', async ({ page }) => {
        const firstNode2 = await page.locator('.node').nth(0);
        const secondNode1 = await page.locator('.node').nth(1);
        await firstNode.click();
        await secondNode.click();
        const runButton = await page.locator('#runBtn');
        await runButton.click();
        // Assuming some visual feedback or state change occurs
        expect(await page.locator('.node.path').count()).toBeGreaterThan(0); // Check if path nodes are highlighted
    });

    test('should highlight path and transition to DONE', async ({ page }) => {
        const firstNode3 = await page.locator('.node').nth(0);
        const secondNode2 = await page.locator('.node').nth(1);
        await firstNode.click();
        await secondNode.click();
        const runButton1 = await page.locator('#runBtn');
        await runButton.click();
        // Wait for path to be highlighted
        await page.waitForTimeout(1000); // Adjust as necessary for animation
        expect(await page.locator('.node.path').count()).toBeGreaterThan(0);
    });

    test('should handle invalid nodes and return to idle state', async ({ page }) => {
        const resetButton1 = await page.locator('#resetBtn');
        await resetButton.click();
        const firstNode4 = await page.locator('.node').nth(0);
        const invalidNode = await page.locator('.node').nth(24); // Assuming this is an invalid selection
        await firstNode.click();
        await invalidNode.click();
        const runButton2 = await page.locator('#runBtn');
        await runButton.click();
        // Check if we returned to idle state
        const nodes2 = await page.locator('.node');
        for (let i = 0; i < await nodes.count(); i++) {
            const node1 = await nodes.nth(i);
            expect(await node.evaluate(node => node.classList.contains('start'))).toBe(false);
            expect(await node.evaluate(node => node.classList.contains('end'))).toBe(false);
        }
    });
    
    test.afterEach(async ({ page }) => {
        // Optionally, you can perform cleanup after each test
    });
});