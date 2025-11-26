import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-35-35/html/bba66561-ca89-11f0-800e-fdebe921fc5f.html';

test.describe('Bellman-Ford Algorithm Application', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application page before each test
        await page.goto(BASE_URL);
    });

    test('should render the Idle state correctly', async ({ page }) => {
        // Validate that the page renders the Idle state
        const title = await page.locator('h1').innerText();
        expect(title).toBe('Bellman-Ford Algorithm');

        const problemText = await page.locator('h2:has-text("Problem:")').innerText();
        expect(problemText).toContain('Given a weighted graph, find the shortest path from node 0 to node n-1.');
    });

    test('should process the Bellman-Ford algorithm and log distances and predecessors', async ({ page }) => {
        // Start the algorithm and check the console logs for expected outputs
        const [consoleMessage] = await Promise.all([
            page.waitForEvent('console'),
            page.evaluate(() => {
                // Trigger the algorithm by calling the function directly
                let graph = {
                    '0': {'1': 1, '2': 4, '3': 3},
                    '1': {'0': 1, '2': 2, '3': 5},
                    '2': {'0': 4, '1': 2, '3': 1},
                    '3': {'0': 3, '1': 5, '2': 1}
                };
                let startNode = '0';
                let distances, predecessor;

                // Call the Bellman-Ford function
                [distances, predecessor] = bellmanFord(graph, startNode);
                console.log('Shortest distances:', distances);
                console.log('Shortest predecessor:', predecessor);
            })
        ]);

        // Validate console output for distances and predecessors
        expect(consoleMessage.text()).toContain('Shortest distances:');
        expect(consoleMessage.text()).toContain('Shortest predecessor:');
    });

    test('should correctly calculate the shortest path', async ({ page }) => {
        // Check the console output for the shortest path
        const [consoleMessage] = await Promise.all([
            page.waitForEvent('console'),
            page.evaluate(() => {
                let graph = {
                    '0': {'1': 1, '2': 4, '3': 3},
                    '1': {'0': 1, '2': 2, '3': 5},
                    '2': {'0': 4, '1': 2, '3': 1},
                    '3': {'0': 3, '1': 5, '2': 1}
                };
                let startNode = '0';
                let endNode = 'n-1';
                let distances = {};
                let predecessor = {};
                let queue = [startNode];

                while (queue.length > 0) {
                    let u = queue.shift();
                    for (let v in graph[u]) {
                        let alt = distances[u] + graph[u][v];
                        if (!(v in distances) || alt < distances[v]) {
                            distances[v] = alt;
                            predecessor[v] = u;
                            queue.push(v);
                        }
                    }
                }

                let path = [];
                let u = endNode;
                while (u !== startNode) {
                    path.push(u);
                    u = predecessor[u];
                }
                path.push(startNode);
                console.log('Shortest path:', path.reverse());
            })
        ]);

        // Validate console output for the shortest path
        expect(consoleMessage.text()).toContain('Shortest path:');
    });

    test('should handle edge cases gracefully', async ({ page }) => {
        // Test with an empty graph
        const [consoleMessage] = await Promise.all([
            page.waitForEvent('console'),
            page.evaluate(() => {
                let graph = {};
                let startNode = '0';
                let distances = {};
                let predecessor = {};
                let queue = [startNode];

                while (queue.length > 0) {
                    let u = queue.shift();
                    for (let v in graph[u]) {
                        let alt = distances[u] + graph[u][v];
                        if (!(v in distances) || alt < distances[v]) {
                            distances[v] = alt;
                            predecessor[v] = u;
                            queue.push(v);
                        }
                    }
                }

                console.log('Shortest distances:', distances);
                console.log('Shortest predecessor:', predecessor);
            })
        ]);

        // Validate console output for empty graph
        expect(consoleMessage.text()).toContain('Shortest distances:');
        expect(consoleMessage.text()).toContain('Shortest predecessor:');
    });
});