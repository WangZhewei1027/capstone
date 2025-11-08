import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/0e65e140-bcac-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Kruskal\'s Algorithm Visualizer', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should initialize graph in idle state', async ({ page }) => {
        // Verify that the graph is initialized and empty
        const edges = await page.$$('.edge');
        expect(edges.length).toBe(0);
    });

    test('should transition to adding_edge state on ADD_EDGE event', async ({ page }) => {
        // Click the "Add Edge" button
        await page.click('#addEdgeBtn');

        // Verify that an edge is added to the graph
        const edges1 = await page.$$('.edge');
        expect(edges.length).toBe(1); // One edge should be added
    });

    test('should return to idle state after EDGE_ADDED event', async ({ page }) => {
        // Add an edge first
        await page.click('#addEdgeBtn');
        const edgesBefore = await page.$$('.edge');
        expect(edgesBefore.length).toBe(1);

        // Simulate the EDGE_ADDED event (this should be handled in the application logic)
        // For testing purposes, we will directly call the function to simulate the event
        await page.evaluate(() => {
            const edgeAddedEvent = new Event('EDGE_ADDED');
            document.dispatchEvent(edgeAddedEvent);
        });

        // Verify that we are back in idle state
        const edgesAfter = await page.$$('.edge');
        expect(edgesAfter.length).toBe(1); // Still one edge, but we are in idle state
    });

    test('should transition to running_algorithm state on RUN_KRUSKAL event', async ({ page }) => {
        // Add an edge first
        await page.click('#addEdgeBtn');

        // Click the "Run Kruskal's Algorithm" button
        await page.click('#runKruskalBtn');

        // Verify that the algorithm is running (you might want to check for visual feedback)
        // This could be a loading spinner or some indication that the algorithm is running
        // For this example, we will assume there's a visual change or a state variable we can check
        // Here we will just wait for a short time to simulate the running state
        await page.waitForTimeout(1000); // Simulate waiting for the algorithm to run

        // Check if the edges are visually updated (this would depend on your implementation)
        const edges2 = await page.$$('.edge');
        expect(edges.length).toBe(1); // Still one edge, but should have visual changes
    });

    test('should return to idle state after ANIMATION_COMPLETE event', async ({ page }) => {
        // Add an edge and run the algorithm
        await page.click('#addEdgeBtn');
        await page.click('#runKruskalBtn');

        // Simulate the ANIMATION_COMPLETE event
        await page.evaluate(() => {
            const animationCompleteEvent = new Event('ANIMATION_COMPLETE');
            document.dispatchEvent(animationCompleteEvent);
        });

        // Verify that we are back in idle state
        const edges3 = await page.$$('.edge');
        expect(edges.length).toBe(1); // Still one edge, but we are in idle state
    });

    test('should handle multiple edge additions', async ({ page }) => {
        // Add multiple edges
        await page.click('#addEdgeBtn');
        await page.click('#addEdgeBtn');

        // Verify that two edges are added
        const edges4 = await page.$$('.edge');
        expect(edges.length).toBe(2); // Two edges should be added
    });

    test('should not add edges if in running_algorithm state', async ({ page }) => {
        // Add an edge first
        await page.click('#addEdgeBtn');

        // Run the algorithm
        await page.click('#runKruskalBtn');

        // Attempt to add another edge while the algorithm is running
        await page.click('#addEdgeBtn');

        // Verify that no new edge is added
        const edges5 = await page.$$('.edge');
        expect(edges.length).toBe(1); // Still only one edge should be present
    });

    test.afterEach(async ({ page }) => {
        // Cleanup if necessary (e.g., reset the graph)
        await page.evaluate(() => {
            const graphContainer = document.getElementById('graph');
            graphContainer.innerHTML = ''; // Clear the graph for the next test
        });
    });
});