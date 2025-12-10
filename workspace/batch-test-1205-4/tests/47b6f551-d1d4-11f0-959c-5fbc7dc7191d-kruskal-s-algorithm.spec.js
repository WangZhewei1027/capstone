import { test, expect } from '@playwright/test';

const url = 'http://127.0.0.1:5500/workspace/batch-test-1205-4/html/47b6f551-d1d4-11f0-959c-5fbc7dc7191d.html';

test.describe('Kruskal\'s Algorithm Visualization', () => {
    
    test.beforeEach(async ({ page }) => {
        // Navigate to the application page before each test
        await page.goto(url);
    });

    test('should load the page and display the graph', async ({ page }) => {
        // Verify that the page title is correct
        await expect(page).toHaveTitle("Kruskal's Algorithm Visualization");

        // Check if the SVG graph element is present
        const graph = await page.locator('#graph');
        await expect(graph).toBeVisible();

        // Check if the button to run the algorithm is present
        const button = await page.locator('button:has-text("Run Kruskal\'s Algorithm")');
        await expect(button).toBeVisible();
    });

    test('should draw the initial graph on page load', async ({ page }) => {
        // Check that the initial edges are drawn
        const edges = await page.locator('.edge');
        await expect(edges).toHaveCount(5); // There are 5 edges defined

        // Check that the initial vertices are drawn
        const vertices = await page.locator('.vertex');
        await expect(vertices).toHaveCount(4); // There are 4 vertices defined
    });

    test('should run Kruskal\'s Algorithm and draw the MST', async ({ page }) => {
        // Click the button to run the algorithm
        const button = await page.locator('button:has-text("Run Kruskal\'s Algorithm")');
        await button.click();

        // Wait for the MST lines to be drawn
        const mstEdges = await page.locator('.mst');
        await expect(mstEdges).toHaveCount(3); // MST should have 3 edges for 4 vertices
    });

    test('should show correct weights on edges', async ({ page }) => {
        // Check that the weights of the edges are displayed correctly
        const weights = await page.locator('.label');
        const weightTexts = await weights.allTextContents();

        // The expected weights based on the edges defined
        const expectedWeights = ['10', '6', '5', '15', '4'];
        expect(weightTexts).toEqual(expect.arrayContaining(expectedWeights));
    });

    test('should handle edge cases gracefully', async ({ page }) => {
        // Simulate an edge case by modifying the edges array (not possible in this test)
        // Instead, we will check for any console errors when running the algorithm
        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.error('Console error:', msg.text());
            }
        });

        // Click the button to run the algorithm
        const button = await page.locator('button:has-text("Run Kruskal\'s Algorithm")');
        await button.click();

        // Check for any console errors after running the algorithm
        await expect(page).toHaveConsoleErrors();
    });

    test('should maintain accessibility standards', async ({ page }) => {
        // Check if the button has accessible name
        const button = await page.locator('button:has-text("Run Kruskal\'s Algorithm")');
        const accessibleName = await button.evaluate(el => el.getAttribute('aria-label'));
        expect(accessibleName).toBe('Run Kruskal\'s Algorithm');
    });

    test.afterEach(async ({ page }) => {
        // Optionally, you can add any cleanup code here
    });
});