import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-4/html/47b71c60-d1d4-11f0-959c-5fbc7dc7191d.html';

test.describe('Topological Sort Visualization', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application page before each test
        await page.goto(BASE_URL);
    });

    test('should load the page and display initial elements', async ({ page }) => {
        // Verify the title of the page
        await expect(page).toHaveTitle('Topological Sort Visualization');

        // Check if the graph container is visible
        const graphContainer = await page.locator('#graph-container');
        await expect(graphContainer).toBeVisible();

        // Check if the result area is empty initially
        const resultArea = await page.locator('#result');
        await expect(resultArea).toHaveText('');
    });

    test('should add an edge and update the graph', async ({ page }) => {
        // Input values for nodes
        await page.fill('#from-node', 'A');
        await page.fill('#to-node', 'B');

        // Click the "Add Edge" button
        await page.click('button:has-text("Add Edge")');

        // Verify that the nodes are displayed in the graph
        const nodesDiv = await page.locator('#nodes');
        await expect(nodesDiv).toContainText('A');
        await expect(nodesDiv).toContainText('B');

        // Check that the input fields are cleared after adding an edge
        await expect(page.locator('#from-node')).toHaveValue('');
        await expect(page.locator('#to-node')).toHaveValue('');
    });

    test('should show alert when trying to add an edge with empty nodes', async ({ page }) => {
        // Click the "Add Edge" button without filling inputs
        await page.click('button:has-text("Add Edge")');

        // Verify that an alert is shown
        const [alert] = await Promise.all([
            page.waitForEvent('dialog'),
            page.click('button:has-text("Add Edge")'),
        ]);
        expect(alert.message()).toBe('Both nodes are required');
        await alert.dismiss();
    });

    test('should perform topological sort and display result', async ({ page }) => {
        // Add edges to create a DAG
        await page.fill('#from-node', 'A');
        await page.fill('#to-node', 'B');
        await page.click('button:has-text("Add Edge")');

        await page.fill('#from-node', 'B');
        await page.fill('#to-node', 'C');
        await page.click('button:has-text("Add Edge")');

        // Perform topological sort
        await page.click('button:has-text("Perform Topological Sort")');

        // Verify the result of the topological sort
        const resultArea = await page.locator('#result');
        await expect(resultArea).toHaveText(/Topological Sort: A -> B -> C/);
    });

    test('should handle cycles in the graph and display appropriate message', async ({ page }) => {
        // Add edges that create a cycle
        await page.fill('#from-node', 'A');
        await page.fill('#to-node', 'B');
        await page.click('button:has-text("Add Edge")');

        await page.fill('#from-node', 'B');
        await page.fill('#to-node', 'C');
        await page.click('button:has-text("Add Edge")');

        await page.fill('#from-node', 'C');
        await page.fill('#to-node', 'A'); // This creates a cycle
        await page.click('button:has-text("Add Edge")');

        // Perform topological sort
        await page.click('button:has-text("Perform Topological Sort")');

        // Verify the result indicates a cycle
        const resultArea = await page.locator('#result');
        await expect(resultArea).toHaveText('Graph has a cycle, topological sort not possible.');
    });
});