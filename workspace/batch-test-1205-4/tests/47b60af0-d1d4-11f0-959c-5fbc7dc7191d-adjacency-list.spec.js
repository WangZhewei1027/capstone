import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-4/html/47b60af0-d1d4-11f0-959c-5fbc7dc7191d.html';

test.describe('Adjacency List Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application page before each test
        await page.goto(BASE_URL);
    });

    test('should load the page and display initial state', async ({ page }) => {
        // Verify the page title
        await expect(page).toHaveTitle('Adjacency List Example');
        
        // Check that the adjacency list is initially empty
        const adjacencyList = await page.locator('#adjacency-list').textContent();
        expect(adjacencyList).toBe('{}');
    });

    test('should add a single edge to the adjacency list', async ({ page }) => {
        // Input vertex and adjacent vertices
        await page.fill('#vertex-input', 'A');
        await page.fill('#adjacent-input', 'B,C');

        // Click the "Add Edge" button
        await page.click('#add-edge');

        // Verify the adjacency list is updated correctly
        const adjacencyList = await page.locator('#adjacency-list').textContent();
        expect(adjacencyList).toBe('{"A":["B","C"]}');
    });

    test('should add multiple edges to the same vertex', async ({ page }) => {
        // Add first edge
        await page.fill('#vertex-input', 'A');
        await page.fill('#adjacent-input', 'B');
        await page.click('#add-edge');

        // Add second edge to the same vertex
        await page.fill('#vertex-input', 'A');
        await page.fill('#adjacent-input', 'C');
        await page.click('#add-edge');

        // Verify the adjacency list is updated correctly
        const adjacencyList = await page.locator('#adjacency-list').textContent();
        expect(adjacencyList).toBe('{"A":["B","C"]}');
    });

    test('should handle duplicate adjacent vertices gracefully', async ({ page }) => {
        // Input vertex and adjacent vertices
        await page.fill('#vertex-input', 'A');
        await page.fill('#adjacent-input', 'B,C,B'); // Duplicate B
        await page.click('#add-edge');

        // Verify the adjacency list is updated correctly
        const adjacencyList = await page.locator('#adjacency-list').textContent();
        expect(adjacencyList).toBe('{"A":["B","C"]}');
    });

    test('should not add an edge if vertex input is empty', async ({ page }) => {
        // Input adjacent vertices only
        await page.fill('#adjacent-input', 'B,C');
        await page.click('#add-edge');

        // Verify the adjacency list remains empty
        const adjacencyList = await page.locator('#adjacency-list').textContent();
        expect(adjacencyList).toBe('{}');
    });

    test('should not add an edge if adjacent vertices input is empty', async ({ page }) => {
        // Input vertex only
        await page.fill('#vertex-input', 'A');
        await page.click('#add-edge');

        // Verify the adjacency list remains empty
        const adjacencyList = await page.locator('#adjacency-list').textContent();
        expect(adjacencyList).toBe('{}');
    });

    test('should clear input fields after adding an edge', async ({ page }) => {
        // Input vertex and adjacent vertices
        await page.fill('#vertex-input', 'A');
        await page.fill('#adjacent-input', 'B');
        await page.click('#add-edge');

        // Verify input fields are cleared
        const vertexInputValue = await page.locator('#vertex-input').inputValue();
        const adjacentInputValue = await page.locator('#adjacent-input').inputValue();
        expect(vertexInputValue).toBe('');
        expect(adjacentInputValue).toBe('');
    });
});