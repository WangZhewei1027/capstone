import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/f3e31360-bcab-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Interactive Graph Visualization Application', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should start in idle state and create a node on canvas click', async ({ page }) => {
        const canvas = await page.locator('#canvas');
        await canvas.click({ position: { x: 50, y: 50 } });

        const nodes = await page.locator('.node');
        expect(await nodes.count()).toBe(1); // Verify one node is created
    });

    test('should transition to creating_node state on canvas click', async ({ page }) => {
        const canvas1 = await page.locator('#canvas1');
        await canvas.click({ position: { x: 100, y: 100 } });

        const nodes1 = await page.locator('.node');
        expect(await nodes.count()).toBe(1); // Verify node is created
    });

    test('should create an edge when a node is clicked', async ({ page }) => {
        const canvas2 = await page.locator('#canvas2');
        await canvas.click({ position: { x: 150, y: 150 } }); // Create first node
        await canvas.click({ position: { x: 200, y: 200 } }); // Create second node

        const firstNode = await page.locator('.node').nth(0);
        await firstNode.click(); // Click first node to create edge

        await page.waitForTimeout(500); // Wait for prompt to appear
        await page.keyboard.type('5'); // Enter weight for edge
        await page.keyboard.press('Enter'); // Confirm prompt

        const edges = await page.locator('.edge');
        expect(await edges.count()).toBe(1); // Verify one edge is created
    });

    test('should remain in creating_node state on canvas click', async ({ page }) => {
        const canvas3 = await page.locator('#canvas3');
        await canvas.click({ position: { x: 250, y: 250 } }); // Create a node

        const nodes2 = await page.locator('.node');
        expect(await nodes.count()).toBe(1); // Verify node is created

        await canvas.click({ position: { x: 300, y: 300 } }); // Click again to create another node
        expect(await nodes.count()).toBe(2); // Verify second node is created
    });

    test('should prompt for weight when creating edge', async ({ page }) => {
        const canvas4 = await page.locator('#canvas4');
        await canvas.click({ position: { x: 350, y: 350 } }); // Create first node
        await canvas.click({ position: { x: 400, y: 400 } }); // Create second node

        const firstNode1 = await page.locator('.node').nth(0);
        await firstNode.click(); // Click first node to create edge

        await page.waitForTimeout(500); // Wait for prompt
        const [prompt] = await Promise.all([
            page.waitForEvent('dialog'), // Wait for the dialog to appear
            page.keyboard.type('10'), // Type weight
            page.keyboard.press('Enter'), // Confirm prompt
        ]);

        expect(prompt.message()).toBe('Enter weight for the edge:'); // Check prompt message
        await prompt.dismiss(); // Dismiss the prompt
    });

    test('should clear graph and return to idle state', async ({ page }) => {
        const canvas5 = await page.locator('#canvas5');
        await canvas.click({ position: { x: 450, y: 450 } }); // Create a node
        await canvas.click({ position: { x: 500, y: 500 } }); // Create another node

        const clearButton = await page.locator('#clear-btn');
        await clearButton.click(); // Click clear button

        const nodes3 = await page.locator('.node');
        expect(await nodes.count()).toBe(0); // Verify no nodes are present
    });

    test('should not create edge if weight is not provided', async ({ page }) => {
        const canvas6 = await page.locator('#canvas6');
        await canvas.click({ position: { x: 550, y: 550 } }); // Create first node
        await canvas.click({ position: { x: 600, y: 600 } }); // Create second node

        const firstNode2 = await page.locator('.node').nth(0);
        await firstNode.click(); // Click first node to create edge

        await page.waitForTimeout(500); // Wait for prompt
        await page.keyboard.press('Enter'); // Confirm without entering weight

        const edges1 = await page.locator('.edge');
        expect(await edges.count()).toBe(0); // Verify no edge is created
    });
});