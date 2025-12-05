import { test, expect } from '@playwright/test';

const url = 'http://127.0.0.1:5500/workspace/batch-test-1205-3/html/b8b771e1-d1d3-11f0-9bcf-07cd16c51572.html';

test.describe('Bellman-Ford Algorithm Visualization', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application page before each test
        await page.goto(url);
    });

    test('should load the page and display the graph', async ({ page }) => {
        // Verify that the page loads correctly
        await expect(page).toHaveTitle(/Bellman-Ford Algorithm Visualization/);
        const graph = await page.locator('#graph');
        await expect(graph).toBeVisible();
    });

    test('should run Bellman-Ford algorithm and display results', async ({ page }) => {
        // Click the button to run the algorithm
        await page.click('button');
        
        // Verify that the result is displayed correctly
        const result = await page.locator('#result');
        await expect(result).toBeVisible();
        await expect(result).toHaveText(/Vertex Distance from Source:/);
    });

    test('should handle negative-weight cycle error', async ({ page }) => {
        // Modify the edges to create a negative-weight cycle
        await page.evaluate(() => {
            window.edges.push({ from: 4, to: 0, weight: -1 });
        });

        // Click the button to run the algorithm
        await page.click('button');

        // Verify that the error message is displayed
        const result = await page.locator('#result');
        await expect(result).toBeVisible();
        await expect(result).toHaveText(/Negative-weight cycle detected/);
    });

    test('should not throw an error for valid graph', async ({ page }) => {
        // Ensure the graph is valid and run the algorithm
        await page.click('button');

        // Verify that the result does not contain error messages
        const result = await page.locator('#result');
        await expect(result).toBeVisible();
        await expect(result).not.toHaveText(/Negative-weight cycle detected/);
    });

    test('should display correct distances from source vertex', async ({ page }) => {
        // Run the Bellman-Ford algorithm
        await page.click('button');

        // Verify the distances are displayed correctly
        const result = await page.locator('#result');
        await expect(result).toHaveText(/V0: 0/);
        await expect(result).toHaveText(/V1: -1/);
        await expect(result).toHaveText(/V2: 2/);
        await expect(result).toHaveText(/V3: 1/);
        await expect(result).toHaveText(/V4: 1/);
    });
});