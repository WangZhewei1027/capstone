import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-35-35/html/bba66562-ca89-11f0-800e-fdebe921fc5f.html';

test.describe('Floyd-Warshall Algorithm Interactive Application', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application before each test
        await page.goto(BASE_URL);
    });

    test('should start in the Idle state', async ({ page }) => {
        // Validate that the application is in the Idle state by checking the page title
        const title = await page.title();
        expect(title).toBe('Floyd-Warshall Algorithm');
    });

    test('should prompt for number of vertices', async ({ page }) => {
        // Simulate user input for number of vertices
        await page.evaluate(() => {
            window.prompt = () => '3'; // Simulate input of 3 vertices
        });

        // Trigger the input vertices state
        await page.evaluate(() => {
            const numVertices = parseInt(prompt("Enter the number of vertices:"));
        });

        // Validate that the input was processed
        const verticesInput = await page.evaluate(() => {
            return window.numVertices; // Assuming numVertices is stored in the window object
        });
        expect(verticesInput).toBe(3);
    });

    test('should prompt for edge weights', async ({ page }) => {
        // Simulate user input for edge weights
        await page.evaluate(() => {
            window.prompt = (msg) => {
                if (msg.includes('weight')) {
                    return '1'; // Simulate input of weight 1
                }
                return '3'; // Simulate input of 3 vertices
            };
        });

        // Trigger the input edges state
        await page.evaluate(() => {
            const numVertices = parseInt(prompt("Enter the number of vertices:"));
            const edges = [];
            for (let i = 0; i < numVertices; i++) {
                for (let j = i + 1; j < numVertices; j++) {
                    const weight = parseInt(prompt(`Enter the weight of edge ${i + 1} to ${j + 1}:`));
                    edges.push([i, j, weight]);
                }
            }
        });

        // Validate that the edges were processed
        const edgesInput = await page.evaluate(() => {
            return window.edges; // Assuming edges is stored in the window object
        });
        expect(edgesInput).toEqual([[0, 1, 1], [0, 2, 1], [1, 2, 1]]); // Adjust based on actual input
    });

    test('should calculate distances using Floyd-Warshall algorithm', async ({ page }) => {
        // Simulate user input for vertices and edges
        await page.evaluate(() => {
            window.prompt = (msg) => {
                if (msg.includes('weight')) {
                    return '1'; // Simulate input of weight 1
                }
                return '3'; // Simulate input of 3 vertices
            };
        });

        // Run the algorithm
        await page.evaluate(() => {
            const numVertices = parseInt(prompt("Enter the number of vertices:"));
            const edges = [];
            for (let i = 0; i < numVertices; i++) {
                for (let j = i + 1; j < numVertices; j++) {
                    const weight = parseInt(prompt(`Enter the weight of edge ${i + 1} to ${j + 1}:`));
                    edges.push([i, j, weight]);
                }
            }

            // Initialize distance matrix
            const distance = Array(numVertices).fill(0).map(() => Array(numVertices).fill(Infinity));
            for (let k = 0; k < numVertices; k++) {
                for (let i = 0; i < numVertices; i++) {
                    for (let j = 0; j < numVertices; j++) {
                        distance[i][j] = Math.min(distance[i][j], distance[i][k] + distance[k][j]);
                    }
                }
            }
            window.distance = distance; // Store the result in the window object for validation
        });

        // Validate the distance matrix
        const distanceMatrix = await page.evaluate(() => {
            return window.distance; // Assuming distance is stored in the window object
        });
        expect(distanceMatrix).toEqual([[0, 1, 1], [1, 0, 1], [1, 1, 0]]); // Adjust based on actual algorithm output
    });

    test('should display the final distance matrix', async ({ page }) => {
        // Simulate user input for vertices and edges
        await page.evaluate(() => {
            window.prompt = (msg) => {
                if (msg.includes('weight')) {
                    return '1'; // Simulate input of weight 1
                }
                return '3'; // Simulate input of 3 vertices
            };
        });

        // Run the algorithm and capture console output
        const consoleOutput = [];
        await page.evaluate(() => {
            const originalConsoleLog = console.log;
            console.log = (...args) => {
                originalConsoleLog(...args);
                window.consoleOutput.push(args.join(' '));
            };
            window.consoleOutput = [];

            const numVertices = parseInt(prompt("Enter the number of vertices:"));
            const edges = [];
            for (let i = 0; i < numVertices; i++) {
                for (let j = i + 1; j < numVertices; j++) {
                    const weight = parseInt(prompt(`Enter the weight of edge ${i + 1} to ${j + 1}:`));
                    edges.push([i, j, weight]);
                }
            }

            // Initialize distance matrix
            const distance = Array(numVertices).fill(0).map(() => Array(numVertices).fill(Infinity));
            for (let k = 0; k < numVertices; k++) {
                for (let i = 0; i < numVertices; i++) {
                    for (let j = 0; j < numVertices; j++) {
                        distance[i][j] = Math.min(distance[i][j], distance[i][k] + distance[k][j]);
                    }
                }
            }

            // Print the final distance matrix
            console.log("Final Distance Matrix:");
            for (let i = 0; i < numVertices; i++) {
                for (let j = 0; j < numVertices; j++) {
                    console.log(`${distance[i][j]}`);
                }
            }
        });

        // Validate the console output
        const output = await page.evaluate(() => {
            return window.consoleOutput; // Assuming consoleOutput is stored in the window object
        });
        expect(output[0]).toBe("Final Distance Matrix:");
        expect(output[1]).toBe("0");
        expect(output[2]).toBe("1");
        expect(output[3]).toBe("1");
    });

    test('should handle invalid input gracefully', async ({ page }) => {
        // Simulate invalid user input for number of vertices
        await page.evaluate(() => {
            window.prompt = () => 'invalid'; // Simulate invalid input
        });

        // Check that the application handles the invalid input
        const result = await page.evaluate(() => {
            try {
                const numVertices = parseInt(prompt("Enter the number of vertices:"));
                return numVertices; // Should be NaN or some error handling
            } catch (e) {
                return e.message; // Capture error message
            }
        });

        expect(result).toBeNaN(); // Expect NaN for invalid input
    });
});