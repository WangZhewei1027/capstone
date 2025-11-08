import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/f9338ca0-bcab-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Interactive Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('Initial state should be idle', async ({ page }) => {
        const nodeInput = await page.locator('#nodeInput');
        const addNodeButton = await page.locator('#addNodeButton');
        const addEdgeButton = await page.locator('#addEdgeButton');
        const showAdjacencyButton = await page.locator('#showAdjacencyButton');

        // Verify that the input fields are empty and buttons are enabled
        await expect(nodeInput).toBeVisible();
        await expect(addNodeButton).toBeEnabled();
        await expect(addEdgeButton).toBeEnabled();
        await expect(showAdjacencyButton).toBeEnabled();
    });

    test('Add Node transitions to adding_node state', async ({ page }) => {
        const nodeInput1 = await page.locator('#nodeInput1');
        const addNodeButton1 = await page.locator('#addNodeButton1');

        await nodeInput.fill('Node A');
        await addNodeButton.click();

        // Verify that Node A is added to the graph
        const graph = await page.locator('#graph');
        await expect(graph).toContainText('Node A');

        // Verify that the input field is cleared after adding
        await expect(nodeInput).toHaveValue('');
    });

    test('Adding duplicate node should not change state', async ({ page }) => {
        const nodeInput2 = await page.locator('#nodeInput2');
        const addNodeButton2 = await page.locator('#addNodeButton2');

        await nodeInput.fill('Node A');
        await addNodeButton.click(); // First addition

        await nodeInput.fill('Node A'); // Duplicate
        await addNodeButton.click(); // Attempt to add duplicate

        // Verify that Node A is still only added once
        const graph1 = await page.locator('#graph1');
        await expect(graph).toHaveText('Node A', { exact: true });
    });

    test('Add Edge transitions to adding_edge state', async ({ page }) => {
        const nodeInput3 = await page.locator('#nodeInput3');
        const addNodeButton3 = await page.locator('#addNodeButton3');
        const nodeA = await page.locator('#nodeA');
        const nodeB = await page.locator('#nodeB');
        const addEdgeButton1 = await page.locator('#addEdgeButton1');

        // Add two nodes
        await nodeInput.fill('Node A');
        await addNodeButton.click();
        await nodeInput.fill('Node B');
        await addNodeButton.click();

        // Select nodes to add an edge
        await nodeA.selectOption('Node A');
        await nodeB.selectOption('Node B');
        await addEdgeButton.click();

        // Verify that an edge is drawn between Node A and Node B
        const graph2 = await page.locator('#graph2');
        await expect(graph).toContainText('Edge from Node A to Node B');
    });

    test('Show Adjacency List transitions to displaying_adjacency_list state', async ({ page }) => {
        const showAdjacencyButton1 = await page.locator('#showAdjacencyButton1');
        await showAdjacencyButton.click();

        // Verify that the adjacency list is displayed
        const adjacencyList = await page.locator('#adjacencyList');
        await expect(adjacencyList).toBeVisible();
        await expect(adjacencyList).toContainText('Node A');
        await expect(adjacencyList).toContainText('Node B');
    });

    test('Adjacency List should not show if no nodes are added', async ({ page }) => {
        const showAdjacencyButton2 = await page.locator('#showAdjacencyButton2');
        await showAdjacencyButton.click();

        // Verify that the adjacency list is empty
        const adjacencyList1 = await page.locator('#adjacencyList1');
        await expect(adjacencyList).toBeVisible();
        await expect(adjacencyList).toHaveText(''); // Assuming it should be empty
    });

    test('Edge case: Adding edge without nodes should not change state', async ({ page }) => {
        const addEdgeButton2 = await page.locator('#addEdgeButton2');
        await addEdgeButton.click(); // Attempt to add edge without nodes

        // Verify that no edges are drawn
        const graph3 = await page.locator('#graph3');
        await expect(graph).not.toContainText('Edge from');
    });

    test.afterEach(async ({ page }) => {
        // Reset the application state if necessary
        await page.reload();
    });
});