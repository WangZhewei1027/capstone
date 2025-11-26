import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-35-35/html/bba57b01-ca89-11f0-800e-fdebe921fc5f.html';

test.describe('Union-Find Interactive Application', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('Initial state - Idle', async ({ page }) => {
        // Verify that the graph is empty on initial load
        const graphContent = await page.locator('#graph').innerHTML();
        expect(graphContent).toBe('');
    });

    test('Add Vertex - Valid Input', async ({ page }) => {
        // Add a vertex and verify the state transition to Vertex Added
        await page.fill('#n', '0'); // Adding vertex 0
        await page.click('#add-vertex');
        
        const graphContent = await page.locator('#graph').innerHTML();
        expect(graphContent).toContain('Node 0');
    });

    test('Add Vertex - Invalid Input', async ({ page }) => {
        // Attempt to add a vertex with invalid input and verify no change
        await page.fill('#n', '10'); // Invalid index
        await page.click('#add-vertex');
        
        const graphContent = await page.locator('#graph').innerHTML();
        expect(graphContent).not.toContain('Node 10');
    });

    test('Add Multiple Vertices', async ({ page }) => {
        // Add multiple vertices and verify they are added correctly
        await page.fill('#n', '1');
        await page.click('#add-vertex');
        await page.fill('#n', '2');
        await page.click('#add-vertex');

        const graphContent = await page.locator('#graph').innerHTML();
        expect(graphContent).toContain('Node 1');
        expect(graphContent).toContain('Node 2');
    });

    test('Merge Vertices - Valid Input', async ({ page }) => {
        // Add vertices and then merge them
        await page.fill('#n', '0');
        await page.click('#add-vertex');
        await page.fill('#n', '1');
        await page.click('#add-vertex');
        
        // Now merge vertices 0 and 1
        await page.fill('#n', '0'); // First vertex
        await page.fill('#n', '1'); // Second vertex
        await page.click('#merge-vertices');

        const graphContent = await page.locator('#graph').innerHTML();
        expect(graphContent).toContain('Node 0');
        expect(graphContent).toContain('Node 1');
    });

    test('Merge Vertices - Invalid Input', async ({ page }) => {
        // Attempt to merge vertices that do not exist
        await page.fill('#n', '10'); // Invalid index
        await page.fill('#n', '11'); // Invalid index
        await page.click('#merge-vertices');

        const graphContent = await page.locator('#graph').innerHTML();
        expect(graphContent).not.toContain('Node 10');
        expect(graphContent).not.toContain('Node 11');
    });

    test('Display Union-Find', async ({ page }) => {
        // Add vertices and display the union-find structure
        await page.fill('#n', '0');
        await page.click('#add-vertex');
        await page.fill('#n', '1');
        await page.click('#add-vertex');
        
        // Display the union-find structure
        await page.click('#display-union-find');

        // Verify that the display action works
        const graphContent = await page.locator('#graph').innerHTML();
        expect(graphContent).toContain('Node 0');
        expect(graphContent).toContain('Node 1');
    });

    test('Add Vertex - Check Visual Feedback', async ({ page }) => {
        // Add a vertex and check for visual feedback
        await page.fill('#n', '2');
        await page.click('#add-vertex');

        const graphNodes = await page.locator('#graph .node').count();
        expect(graphNodes).toBe(1); // Only one node should be present
    });

    test('Merge Vertices - Check Visual Feedback', async ({ page }) => {
        // Add vertices and then merge them, checking visual feedback
        await page.fill('#n', '0');
        await page.click('#add-vertex');
        await page.fill('#n', '1');
        await page.click('#add-vertex');

        // Merge vertices
        await page.fill('#n', '0');
        await page.fill('#n', '1');
        await page.click('#merge-vertices');

        const graphNodes = await page.locator('#graph .node').count();
        expect(graphNodes).toBe(2); // Both nodes should still be present
    });
});