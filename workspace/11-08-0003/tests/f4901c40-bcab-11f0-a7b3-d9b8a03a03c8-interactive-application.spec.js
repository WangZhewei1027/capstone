import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/f4901c40-bcab-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Interactive Application FSM Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('Initial state should be idle', async ({ page }) => {
        const nodeInput = await page.locator('#nodeInput');
        const addNodeBtn = await page.locator('#addNodeBtn');
        const firstNodeSelect = await page.locator('#firstNodeSelect');
        const secondNodeSelect = await page.locator('#secondNodeSelect');
        
        // Verify that inputs are empty and no nodes are present
        await expect(nodeInput).toHaveValue('');
        await expect(addNodeBtn).toBeEnabled();
        await expect(firstNodeSelect).toHaveCount(0);
        await expect(secondNodeSelect).toHaveCount(0);
    });

    test('Add a node and transition to node_added state', async ({ page }) => {
        const nodeInput1 = await page.locator('#nodeInput1');
        const addNodeBtn1 = await page.locator('#addNodeBtn1');
        
        // Add a node
        await nodeInput.fill('A');
        await addNodeBtn.click();
        
        // Verify the adjacency list updates
        const adjacencyList = await page.locator('#adjacency-list tbody tr');
        await expect(adjacencyList).toHaveCount(1);
        await expect(adjacencyList.nth(0)).toContainText('A');
        
        // Verify that the node selectors are updated
        const firstNodeSelect1 = await page.locator('#firstNodeSelect1');
        const secondNodeSelect1 = await page.locator('#secondNodeSelect1');
        await expect(firstNodeSelect).toHaveCount(1);
        await expect(secondNodeSelect).toHaveCount(1);
    });

    test('Add an edge and transition to edge_added state', async ({ page }) => {
        const nodeInput2 = await page.locator('#nodeInput2');
        const addNodeBtn2 = await page.locator('#addNodeBtn2');
        const firstNodeSelect2 = await page.locator('#firstNodeSelect2');
        const secondNodeSelect2 = await page.locator('#secondNodeSelect2');
        const addEdgeBtn = await page.locator('#addEdgeBtn');
        
        // Add two nodes
        await nodeInput.fill('A');
        await addNodeBtn.click();
        await nodeInput.fill('B');
        await addNodeBtn.click();
        
        // Add an edge
        await firstNodeSelect.selectOption('A');
        await secondNodeSelect.selectOption('B');
        await addEdgeBtn.click();
        
        // Verify the adjacency list updates
        const adjacencyList1 = await page.locator('#adjacency-list tbody tr');
        await expect(adjacencyList).toHaveCount(1);
        await expect(adjacencyList.nth(0)).toContainText('A');
        await expect(adjacencyList.nth(0)).toContainText('B');
    });

    test('Reset graph and return to idle state', async ({ page }) => {
        const nodeInput3 = await page.locator('#nodeInput3');
        const addNodeBtn3 = await page.locator('#addNodeBtn3');
        const resetBtn = await page.locator('#resetBtn');
        
        // Add a node
        await nodeInput.fill('A');
        await addNodeBtn.click();
        
        // Reset the graph
        await resetBtn.click();
        
        // Verify that the adjacency list is empty and inputs are cleared
        const adjacencyList2 = await page.locator('#adjacency-list tbody tr');
        await expect(adjacencyList).toHaveCount(0);
        await expect(nodeInput).toHaveValue('');
    });

    test('Add duplicate node should not change state', async ({ page }) => {
        const nodeInput4 = await page.locator('#nodeInput4');
        const addNodeBtn4 = await page.locator('#addNodeBtn4');
        
        // Add a node
        await nodeInput.fill('A');
        await addNodeBtn.click();
        
        // Attempt to add the same node again
        await nodeInput.fill('A');
        await addNodeBtn.click();
        
        // Verify the adjacency list still has only one node
        const adjacencyList3 = await page.locator('#adjacency-list tbody tr');
        await expect(adjacencyList).toHaveCount(1);
    });
});