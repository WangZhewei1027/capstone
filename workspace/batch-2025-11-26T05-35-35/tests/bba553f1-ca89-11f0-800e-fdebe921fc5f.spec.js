import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-35-35/html/bba553f1-ca89-11f0-800e-fdebe921fc5f.html';

test.describe('Weighted Graph Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application before each test
        await page.goto(BASE_URL);
    });

    test('Initial state is Idle', async ({ page }) => {
        // Validate that the application starts in the Idle state
        const verticesInput = await page.locator('#vertices');
        const edgesInput = await page.locator('#edges');
        await expect(verticesInput).toBeVisible();
        await expect(edgesInput).toBeVisible();
    });

    test('Add Vertex functionality', async ({ page }) => {
        // Test adding a vertex
        const verticesInput = await page.locator('#vertices');
        const addVertexButton = await page.locator('#add-vertex');

        await verticesInput.fill('A');
        await addVertexButton.click();

        // Verify that the vertex is rendered
        const graph = await page.locator('#graph');
        await expect(graph).toContainText('A');
    });

    test('Add Edge functionality', async ({ page }) => {
        // Test adding an edge
        const verticesInput = await page.locator('#vertices');
        const edgesInput = await page.locator('#edges');
        const addVertexButton = await page.locator('#add-vertex');
        const addEdgeButton = await page.locator('#add-edge');

        await verticesInput.fill('A,B');
        await addVertexButton.click();
        await edgesInput.fill('A-B');
        await addEdgeButton.click();

        // Verify that the edge is rendered
        const graph = await page.locator('#graph');
        await expect(graph).toContainText('A-B');
    });

    test('Input Vertices updates graph', async ({ page }) => {
        // Test dynamic update of vertices
        const verticesInput = await page.locator('#vertices');

        await verticesInput.fill('C,D');
        await expect(page.locator('#graph')).toContainText('C');
        await expect(page.locator('#graph')).toContainText('D');
    });

    test('Input Edges updates graph', async ({ page }) => {
        // Test dynamic update of edges
        const verticesInput = await page.locator('#vertices');
        const edgesInput = await page.locator('#edges');
        const addVertexButton = await page.locator('#add-vertex');

        await verticesInput.fill('E,F');
        await addVertexButton.click();
        await edgesInput.fill('E-F');
        await expect(page.locator('#graph')).toContainText('E-F');
    });

    test('Add Vertex with empty input does not add', async ({ page }) => {
        // Test that clicking Add Vertex with empty input does not add a vertex
        const addVertexButton = await page.locator('#add-vertex');
        await addVertexButton.click();

        // Verify that no vertex is rendered
        const graph = await page.locator('#graph');
        await expect(graph).not.toContainText('undefined');
    });

    test('Add Edge with empty input does not add', async ({ page }) => {
        // Test that clicking Add Edge with empty input does not add an edge
        const addEdgeButton = await page.locator('#add-edge');
        await addEdgeButton.click();

        // Verify that no edge is rendered
        const graph = await page.locator('#graph');
        await expect(graph).not.toContainText('undefined');
    });

    test('Input Vertices with empty input clears graph', async ({ page }) => {
        // Test that clearing the vertices input clears the graph
        const verticesInput = await page.locator('#vertices');

        await verticesInput.fill('G,H');
        await expect(page.locator('#graph')).toContainText('G');
        await expect(page.locator('#graph')).toContainText('H');

        await verticesInput.fill('');
        await expect(page.locator('#graph')).not.toContainText('G');
        await expect(page.locator('#graph')).not.toContainText('H');
    });

    test('Input Edges with empty input clears edges', async ({ page }) => {
        // Test that clearing the edges input clears the edges in the graph
        const verticesInput = await page.locator('#vertices');
        const edgesInput = await page.locator('#edges');
        const addVertexButton = await page.locator('#add-vertex');

        await verticesInput.fill('I,J');
        await addVertexButton.click();
        await edgesInput.fill('I-J');
        await expect(page.locator('#graph')).toContainText('I-J');

        await edgesInput.fill('');
        await expect(page.locator('#graph')).not.toContainText('I-J');
    });
});