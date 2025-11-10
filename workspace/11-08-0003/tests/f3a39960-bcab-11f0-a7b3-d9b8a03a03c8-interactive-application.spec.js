import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/f3a39960-bcab-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Interactive Graph Application', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test.describe('State: idle', () => {
        test('should create a node on graph click', async ({ page }) => {
            const graph = await page.locator('#graph');
            await graph.click({ position: { x: 100, y: 100 } });

            const node = await page.locator('.node');
            await expect(node).toHaveCount(1);
            await expect(node).toHaveCSS('left', '60px'); // 100 - 40 (offset)
            await expect(node).toHaveCSS('top', '85px'); // 100 - 15 (offset)
        });

        test('should reset graph on button click', async ({ page }) => {
            const graph1 = await page.locator('#graph1');
            await graph.click({ position: { x: 100, y: 100 } });
            await page.locator('button').click();

            const nodes = await page.locator('.node');
            await expect(nodes).toHaveCount(0);
        });
    });

    test.describe('State: creating_node', () => {
        test('should not transition on node click', async ({ page }) => {
            const graph2 = await page.locator('#graph2');
            await graph.click({ position: { x: 100, y: 100 } });

            const node1 = await page.locator('.node1');
            await node.click();

            const nodes1 = await page.locator('.node');
            await expect(nodes).toHaveCount(1); // Still one node
        });

        test('should transition to connecting_edge on node mouse down', async ({ page }) => {
            const graph3 = await page.locator('#graph3');
            await graph.click({ position: { x: 100, y: 100 } });

            const node2 = await page.locator('.node2');
            await node.dispatchEvent('mousedown');

            // Check if we are in connecting_edge state
            // Assuming there's a way to check the current state, e.g., a data attribute
            const currentState = await page.evaluate(() => window.currentState);
            await expect(currentState).toBe('connecting_edge');
        });
    });

    test.describe('State: connecting_edge', () => {
        test('should transition to drawing_edge on mouse move', async ({ page }) => {
            const graph4 = await page.locator('#graph4');
            await graph.click({ position: { x: 100, y: 100 } });
            const node3 = await page.locator('.node3');
            await node.dispatchEvent('mousedown');

            await graph.dispatchEvent('mousemove', { clientX: 200, clientY: 200 });

            const currentState1 = await page.evaluate(() => window.currentState1);
            await expect(currentState).toBe('drawing_edge');
        });

        test('should transition to edge_created on mouse up', async ({ page }) => {
            const graph5 = await page.locator('#graph5');
            await graph.click({ position: { x: 100, y: 100 } });
            const node4 = await page.locator('.node4');
            await node.dispatchEvent('mousedown');
            await graph.dispatchEvent('mousemove', { clientX: 200, clientY: 200 });
            await graph.dispatchEvent('mouseup');

            const currentState2 = await page.evaluate(() => window.currentState2);
            await expect(currentState).toBe('edge_created');
        });
    });

    test.describe('State: drawing_edge', () => {
        test('should transition to edge_created on mouse up', async ({ page }) => {
            const graph6 = await page.locator('#graph6');
            await graph.click({ position: { x: 100, y: 100 } });
            const node5 = await page.locator('.node5');
            await node.dispatchEvent('mousedown');
            await graph.dispatchEvent('mousemove', { clientX: 200, clientY: 200 });
            await graph.dispatchEvent('mouseup');

            const currentState3 = await page.evaluate(() => window.currentState3);
            await expect(currentState).toBe('edge_created');
        });
    });

    test.describe('State: edge_created', () => {
        test('should return to idle on graph click', async ({ page }) => {
            const graph7 = await page.locator('#graph7');
            await graph.click({ position: { x: 100, y: 100 } });
            const node6 = await page.locator('.node6');
            await node.dispatchEvent('mousedown');
            await graph.dispatchEvent('mousemove', { clientX: 200, clientY: 200 });
            await graph.dispatchEvent('mouseup');

            await graph.click({ position: { x: 50, y: 50 } });

            const currentState4 = await page.evaluate(() => window.currentState4);
            await expect(currentState).toBe('idle');
        });

        test('should reset graph on button click', async ({ page }) => {
            const graph8 = await page.locator('#graph8');
            await graph.click({ position: { x: 100, y: 100 } });
            const node7 = await page.locator('.node7');
            await node.dispatchEvent('mousedown');
            await graph.dispatchEvent('mousemove', { clientX: 200, clientY: 200 });
            await graph.dispatchEvent('mouseup');

            await page.locator('button').click();

            const nodes2 = await page.locator('.node');
            await expect(nodes).toHaveCount(0);
        });
    });
});