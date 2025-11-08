import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/f76fbc90-bcab-11f0-a7b3-d9b8a03a03c8.html';

test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
});

test.describe('Interactive Application FSM Tests', () => {
    test('Initial state should be IDLE', async ({ page }) => {
        // Verify the initial state is IDLE by checking the graph and matrix
        const graphNodes = await page.locator('.node').count();
        expect(graphNodes).toBe(0);
        const matrixCells = await page.locator('#matrix td').count();
        expect(matrixCells).toBe(0);
    });

    test('Should add a node on GRAPH_CLICK in IDLE state', async ({ page }) => {
        // Click on the graph to add a node
        await page.click('#graph', { position: { x: 40, y: 40 } });
        
        // Verify that a node has been added
        const graphNodes1 = await page.locator('.node').count();
        expect(graphNodes).toBe(1);
    });

    test('Should transition to CONNECTING_NODES after adding a node', async ({ page }) => {
        // Add a node
        await page.click('#graph', { position: { x: 40, y: 40 } });
        // Click again to connect nodes
        await page.click('#graph', { position: { x: 80, y: 80 } });
        
        // Verify that we are in CONNECTING_NODES state
        const graphNodes2 = await page.locator('.node').count();
        expect(graphNodes).toBe(2);
    });

    test('Should reset the graph on RESET_BUTTON_CLICK', async ({ page }) => {
        // Add a node
        await page.click('#graph', { position: { x: 40, y: 40 } });
        // Click the reset button
        await page.click('#reset-button');
        
        // Verify that the graph is reset
        const graphNodes3 = await page.locator('.node').count();
        expect(graphNodes).toBe(0);
    });

    test('Should not add more than 10 nodes', async ({ page }) => {
        // Add 10 nodes
        for (let i = 0; i < 10; i++) {
            await page.click('#graph', { position: { x: 40 + i * 10, y: 40 + i * 10 } });
        }
        
        // Try to add an 11th node
        await page.click('#graph', { position: { x: 100, y: 100 } });
        
        // Verify that no additional node has been added
        const graphNodes4 = await page.locator('.node').count();
        expect(graphNodes).toBe(10);
    });

    test('Should transition back to IDLE state from CONNECTING_NODES on RESET_BUTTON_CLICK', async ({ page }) => {
        // Add a node and connect it
        await page.click('#graph', { position: { x: 40, y: 40 } });
        await page.click('#graph', { position: { x: 80, y: 80 } });
        // Click the reset button
        await page.click('#reset-button');
        
        // Verify that the graph is reset and we are back in IDLE state
        const graphNodes5 = await page.locator('.node').count();
        expect(graphNodes).toBe(0);
    });

    test('Should allow adding nodes again after reset', async ({ page }) => {
        // Reset the graph
        await page.click('#reset-button');
        // Add a node after reset
        await page.click('#graph', { position: { x: 40, y: 40 } });
        
        // Verify that a node has been added
        const graphNodes6 = await page.locator('.node').count();
        expect(graphNodes).toBe(1);
    });
});