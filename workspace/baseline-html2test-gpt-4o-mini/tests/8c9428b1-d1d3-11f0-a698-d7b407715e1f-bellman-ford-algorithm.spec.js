import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/8c9428b1-d1d3-11f0-a698-d7b407715e1f.html';

test.describe('Bellman-Ford Algorithm Visualization', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the Bellman-Ford Algorithm page before each test
        await page.goto(BASE_URL);
    });

    test('should load the page and display initial graph', async ({ page }) => {
        // Verify that the title is correct
        await expect(page.title()).resolves.toBe('Bellman-Ford Algorithm Visualization');

        // Check that the graph is drawn with the correct nodes
        const nodes = await page.locator('.node');
        expect(await nodes.count()).toBe(5); // There should be 5 nodes: A, B, C, D, E

        // Check that the edges are displayed correctly
        const edges = await page.locator('.edge');
        expect(await edges.count()).toBe(8); // There should be 8 edges
    });

    test('should run the Bellman-Ford algorithm and display results', async ({ page }) => {
        // Click the button to run the algorithm
        await page.click('button');

        // Verify that the result is displayed
        const resultDiv = await page.locator('#result');
        await expect(resultDiv).toBeVisible();

        // Check for the shortest distances from vertex A
        await expect(resultDiv).toContainText('Shortest distances from vertex A:');
        await expect(resultDiv).toContainText('A: 0');
        await expect(resultDiv).toContainText('B: -1');
        await expect(resultDiv).toContainText('C: 2');
        await expect(resultDiv).toContainText('D: 1');
        await expect(resultDiv).toContainText('E: -2');
    });

    test('should detect negative weight cycles', async ({ page }) => {
        // Modify the edges to create a negative weight cycle
        await page.evaluate(() => {
            const edges = [
                { from: 'A', to: 'B', weight: -1 },
                { from: 'B', to: 'C', weight: -2 },
                { from: 'C', to: 'A', weight: -1 }
            ];
            window.edges = edges; // Update the global edges variable
        });

        // Click the button to run the algorithm
        await page.click('button');

        // Verify that the result indicates a negative weight cycle
        const resultDiv = await page.locator('#result');
        await expect(resultDiv).toContainText('Graph contains a negative weight cycle.');
    });

    test('should handle errors gracefully', async ({ page }) => {
        // Simulate an error by modifying the edges to be an empty array
        await page.evaluate(() => {
            window.edges = [];
        });

        // Click the button to run the algorithm
        await page.click('button');

        // Verify that the result indicates no paths found
        const resultDiv = await page.locator('#result');
        await expect(resultDiv).toContainText('Shortest distances from vertex A:');
        await expect(resultDiv).toContainText('A: 0');
    });
});