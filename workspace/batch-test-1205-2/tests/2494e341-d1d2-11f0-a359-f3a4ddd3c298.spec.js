import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-2/html/2494e341-d1d2-11f0-a359-f3a4ddd3c298.html';

test.describe('Topological Sort Visualization', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application page before each test
        await page.goto(BASE_URL);
    });

    test('Initial state should display the graph', async ({ page }) => {
        // Validate that the graph is displayed in the initial state
        const graphDiv = await page.locator('#graph');
        await expect(graphDiv).toBeVisible();
        const nodes = await graphDiv.locator('.node').count();
        expect(nodes).toBeGreaterThan(0); // Ensure there are nodes displayed
    });

    test('Clicking the sort button transitions to sorting state', async ({ page }) => {
        // Click the sort button and check for the result display
        await page.click('#sortButton');

        // Validate that the result is displayed after sorting
        const resultDiv = await page.locator('#result');
        await expect(resultDiv).toBeVisible();
    });

    test('Sorting should display the correct topological order', async ({ page }) => {
        // Perform the sort and check the result
        await page.click('#sortButton');

        const resultText = await page.locator('#result').textContent();
        expect(resultText).toMatch(/Topological Sort Order: A -> B -> C -> D -> E -> F/);
    });

    test('Sorting a cyclic graph should return an error message', async ({ page }) => {
        // Modify the graph to create a cycle (this part is conceptual as we cannot modify the actual code)
        // For testing purposes, we assume a cycle exists and check for the error message
        // This would normally require a different setup or a mock
        await page.evaluate(() => {
            const cyclicGraph = {
                A: ['B'],
                B: ['C'],
                C: ['A'] // Cycle here
            };
            window.graph = cyclicGraph; // Simulating a cyclic graph
        });

        await page.click('#sortButton');

        const resultText1 = await page.locator('#result').textContent();
        expect(resultText).toBe('Graph has at least one cycle!');
    });

    test('Result should not be displayed until sort button is clicked', async ({ page }) => {
        // Ensure the result is not visible before clicking the sort button
        const resultDiv1 = await page.locator('#result');
        await expect(resultDiv).toBeEmpty(); // Initially empty
    });

    test('Clicking sort button multiple times should still display the correct result', async ({ page }) => {
        // Click the sort button multiple times
        await page.click('#sortButton');
        await page.click('#sortButton'); // Click again to see if it handles multiple clicks

        const resultText2 = await page.locator('#result').textContent();
        expect(resultText).toMatch(/Topological Sort Order: A -> B -> C -> D -> E -> F/);
    });

    test('Graph should display nodes correctly', async ({ page }) => {
        // Validate that nodes are displayed correctly
        const nodes1 = await page.locator('.node');
        const nodeCount = await nodes.count();
        expect(nodeCount).toBe(6); // A, B, C, D, E, F
    });

    test('Result should clear if graph is modified', async ({ page }) => {
        // Simulate modifying the graph and check if the result is cleared
        await page.evaluate(() => {
            window.graph = {
                A: ['B'],
                B: ['C'],
                C: ['D'],
                D: ['E'],
                E: ['F'],
                F: []
            };
        });

        await page.click('#sortButton'); // Sort again after modification

        const resultText3 = await page.locator('#result').textContent();
        expect(resultText).toMatch(/Topological Sort Order: A -> B -> C -> D -> E -> F/);
    });

    test.afterEach(async ({ page }) => {
        // Optionally, you can add any cleanup or reset logic here
    });
});