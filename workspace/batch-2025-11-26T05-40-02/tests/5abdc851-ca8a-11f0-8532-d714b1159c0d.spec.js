import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-40-02/html/5abdc851-ca8a-11f0-8532-d714b1159c0d.html';

test.describe('Weighted Graph Application', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application before each test
        await page.goto(BASE_URL);
    });

    test('should be in Idle state initially', async ({ page }) => {
        // Verify that the application is in the Idle state
        const graph = await page.locator('#graph');
        const addVertexButton = await page.locator('#add-vertex');
        const addEdgeButton = await page.locator('#add-edge');

        await expect(graph).toHaveText('');
        await expect(addVertexButton).toBeVisible();
        await expect(addEdgeButton).toBeVisible();
    });

    test('should add a vertex and transition to Vertex Added state', async ({ page }) => {
        // Add a vertex and check the state transition
        const vertexInput = await page.locator('#vertex');
        const addVertexButton = await page.locator('#add-vertex');

        await vertexInput.fill('Vertex 1');
        await addVertexButton.click();

        // Verify that the vertex was added to the graph
        const graph = await page.locator('#graph');
        await expect(graph).toContainText('Vertex 1');
    });

    test('should add multiple vertices', async ({ page }) => {
        // Add multiple vertices to the graph
        const vertexInput = await page.locator('#vertex');
        const addVertexButton = await page.locator('#add-vertex');

        await vertexInput.fill('Vertex 1');
        await addVertexButton.click();
        await vertexInput.fill('Vertex 2');
        await addVertexButton.click();

        // Verify that both vertices are present
        const graph = await page.locator('#graph');
        await expect(graph).toContainText('Vertex 1');
        await expect(graph).toContainText('Vertex 2');
    });

    test('should add an edge and transition to Edge Added state', async ({ page }) => {
        // Add an edge and check the state transition
        const addEdgeButton = await page.locator('#add-edge');

        await addEdgeButton.click();

        // Verify that an edge input was added to the graph
        const graph = await page.locator('#graph');
        const edgeInputs = await graph.locator('input[type="number"]');
        await expect(edgeInputs).toHaveCount(1);
    });

    test('should add multiple edges', async ({ page }) => {
        // Add multiple edges to the graph
        const addEdgeButton = await page.locator('#add-edge');

        await addEdgeButton.click();
        await addEdgeButton.click();

        // Verify that two edge inputs are present
        const graph = await page.locator('#graph');
        const edgeInputs = await graph.locator('input[type="number"]');
        await expect(edgeInputs).toHaveCount(2);
    });

    test('should not add a vertex if input is empty', async ({ page }) => {
        // Try to add a vertex with an empty input
        const addVertexButton = await page.locator('#add-vertex');

        await addVertexButton.click();

        // Verify that no vertex was added
        const graph = await page.locator('#graph');
        await expect(graph).toHaveText('');
    });

    test('should not add an edge if no vertices exist', async ({ page }) => {
        // Try to add an edge without any vertices
        const addEdgeButton = await page.locator('#add-edge');

        await addEdgeButton.click();

        // Verify that an edge input was added even without vertices
        const graph = await page.locator('#graph');
        const edgeInputs = await graph.locator('input[type="number"]');
        await expect(edgeInputs).toHaveCount(1);
    });
});