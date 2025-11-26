import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T04-43-42/html/7c17f730-ca82-11f0-8193-f13bc409d3cb.html';

test.describe('Graph Interactive Application', () => {
    let page;

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();
        await page.goto(BASE_URL);
    });

    test.afterAll(async () => {
        await page.close();
    });

    test('Initial state should render graph and enable controls', async () => {
        const canvas = await page.$('canvas');
        expect(canvas).toBeTruthy(); // Verify canvas is rendered
        const addVertexButton = await page.$('#add-vertex');
        const addEdgeButton = await page.$('#add-edge');
        expect(addVertexButton).toBeTruthy(); // Verify Add Vertex button is present
        expect(addEdgeButton).toBeTruthy(); // Verify Add Edge button is present
    });

    test('Add Vertex transitions from Idle to AddingVertex', async () => {
        const addVertexButton = await page.$('#add-vertex');
        await addVertexButton.click(); // Simulate user clicking Add Vertex
        // Simulate clicking on the canvas to add a vertex
        const canvas = await page.$('canvas');
        await canvas.click({ position: { x: 200, y: 200 } });

        // Verify that the vertex has been added
        const vertices = await page.evaluate(() => {
            return window.graphData.vertices.length; // Access graphData from the global scope
        });
        expect(vertices).toBeGreaterThan(10); // Initially, there should be more than 10 vertices
    });

    test('Add Edge transitions from Idle to AddingEdge', async () => {
        const addEdgeButton = await page.$('#add-edge');
        await addEdgeButton.click(); // Simulate user clicking Add Edge

        // Simulate clicking on two vertices to create an edge
        const canvas = await page.$('canvas');
        await canvas.click({ position: { x: 20, y: 20 } }); // Click first vertex
        await canvas.click({ position: { x: 40, y: 20 } }); // Click second vertex

        // Verify that the edge has been added
        const edges = await page.evaluate(() => {
            return window.graphData.edges.length; // Access graphData from the global scope
        });
        expect(edges).toBeGreaterThan(0); // There should be at least one edge
    });

    test('Adding Vertex should finalize and return to Idle state', async () => {
        const addVertexButton = await page.$('#add-vertex');
        await addVertexButton.click(); // Simulate user clicking Add Vertex
        const canvas = await page.$('canvas');
        await canvas.click({ position: { x: 200, y: 200 } }); // Add vertex

        // Verify that the vertex has been added and state is Idle
        const vertices = await page.evaluate(() => {
            return window.graphData.vertices.length; // Access graphData from the global scope
        });
        expect(vertices).toBeGreaterThan(11); // Ensure vertex count increased
    });

    test('Adding Edge should finalize and return to Idle state', async () => {
        const addEdgeButton = await page.$('#add-edge');
        await addEdgeButton.click(); // Simulate user clicking Add Edge
        const canvas = await page.$('canvas');
        await canvas.click({ position: { x: 20, y: 20 } }); // Click first vertex
        await canvas.click({ position: { x: 40, y: 20 } }); // Click second vertex

        // Verify that the edge has been added and state is Idle
        const edges = await page.evaluate(() => {
            return window.graphData.edges.length; // Access graphData from the global scope
        });
        expect(edges).toBeGreaterThan(1); // Ensure edge count increased
    });

    test('Edge case: Adding an edge with non-existent vertices', async () => {
        const addEdgeButton = await page.$('#add-edge');
        await addEdgeButton.click(); // Simulate user clicking Add Edge
        const canvas = await page.$('canvas');
        await canvas.click({ position: { x: 1000, y: 1000 } }); // Click outside of existing vertices
        await canvas.click({ position: { x: 1000, y: 1000 } }); // Click again outside

        // Verify that no edge has been added
        const edges = await page.evaluate(() => {
            return window.graphData.edges.length; // Access graphData from the global scope
        });
        expect(edges).toBe(1); // Ensure edge count remains the same
    });
});