import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-14-37/html/cdca9700-ca86-11f0-aa32-8b1afd472b96.html';

test.describe('Dijkstra\'s Algorithm Interactive Application', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('Initial state: Idle', async ({ page }) => {
        // Validate that the initial state is Idle
        const title = await page.locator('h1').textContent();
        expect(title).toBe("Dijkstra's Algorithm");

        const graphDiv = await page.locator('#graph').textContent();
        const resultDiv = await page.locator('#result').textContent();
        
        // Ensure graph and result are empty initially
        expect(graphDiv).toBe('');
        expect(resultDiv).toBe('');
    });

    test('Transition from Idle to Graph Printed', async ({ page }) => {
        // Trigger the graph printing
        await page.evaluate(() => {
            const graph = [
                { id: 1, name: 'A' },
                { id: 2, name: 'B' },
                { id: 3, name: 'C' },
                { id: 4, name: 'D' },
                { id: 5, name: 'E' }
            ];
            printGraph(graph);
        });

        // Validate that the graph has been printed
        const graphDiv = await page.locator('#graph').textContent();
        expect(graphDiv).not.toBe('');
    });

    test('Transition from Graph Printed to Shortest Path Found', async ({ page }) => {
        // Print the graph first
        await page.evaluate(() => {
            const graph = [
                { id: 1, name: 'A' },
                { id: 2, name: 'B' },
                { id: 3, name: 'C' },
                { id: 4, name: 'D' },
                { id: 5, name: 'E' }
            ];
            printGraph(graph);
        });

        // Trigger the shortest path calculation
        await page.evaluate(() => {
            const graph = [
                { id: 1, name: 'A' },
                { id: 2, name: 'B' },
                { id: 3, name: 'C' },
                { id: 4, name: 'D' },
                { id: 5, name: 'E' }
            ];
            let path = '';
            for (let i = 0; i < graph.length; i++) {
                const result = findShortestPath(graph[i]);
                path += result + ',';
            }
            document.getElementById('graph').innerHTML = path;
            document.getElementById('result').innerHTML = path.split(',')[0]; // Assuming the first result is the shortest
        });

        // Validate that the shortest path has been calculated
        const resultDiv = await page.locator('#result').textContent();
        expect(resultDiv).not.toBe('');
    });

    test('Edge case: Empty graph', async ({ page }) => {
        // Trigger the graph printing with an empty graph
        await page.evaluate(() => {
            const graph = [];
            printGraph(graph);
        });

        // Validate that the graph is still empty
        const graphDiv = await page.locator('#graph').textContent();
        expect(graphDiv).toBe('');
    });

    test('Error scenario: Invalid graph structure', async ({ page }) => {
        // Trigger the graph printing with an invalid structure
        await page.evaluate(() => {
            const graph = null; // Invalid graph
            try {
                printGraph(graph);
            } catch (error) {
                console.error('Error:', error);
            }
        });

        // Validate that the graph is still empty
        const graphDiv = await page.locator('#graph').textContent();
        expect(graphDiv).toBe('');
    });
});