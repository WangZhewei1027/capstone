import { test, expect } from '@playwright/test';

const URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-3/html/b8b68781-d1d3-11f0-9bcf-07cd16c51572.html';

test.describe('Adjacency List Application Tests', () => {
    
    test.beforeEach(async ({ page }) => {
        // Navigate to the application page before each test
        await page.goto(URL);
    });

    test('should load the page and display the title', async ({ page }) => {
        // Verify the page title is correct
        const title = await page.title();
        expect(title).toBe('Adjacency List Representation');
    });

    test('should initialize with empty graph container', async ({ page }) => {
        // Check that the graph container is empty on initial load
        const graphContainer = await page.locator('#graph-container');
        await expect(graphContainer).toHaveText('');
    });

    test('should create adjacency list with valid input', async ({ page }) => {
        // Input vertices and edges
        await page.fill('#vertices', 'A,B,C');
        await page.fill('#edges', 'A:B,B:C,C:A');

        // Click the button to create the adjacency list
        await page.click('button');

        // Verify the adjacency list is displayed correctly
        const graphContainer = await page.locator('#graph-container');
        await expect(graphContainer).toContainText('A -> B');
        await expect(graphContainer).toContainText('B -> C');
        await expect(graphContainer).toContainText('C -> A');
    });

    test('should handle empty vertices input', async ({ page }) => {
        // Input empty vertices and edges
        await page.fill('#vertices', '');
        await page.fill('#edges', 'A:B,B:C,C:A');

        // Click the button to create the adjacency list
        await page.click('button');

        // Verify that the graph container does not display any vertices
        const graphContainer = await page.locator('#graph-container');
        await expect(graphContainer).toContainText('Adjacency List:');
        await expect(graphContainer).not.toContainText('->');
    });

    test('should handle empty edges input', async ({ page }) => {
        // Input vertices and empty edges
        await page.fill('#vertices', 'A,B,C');
        await page.fill('#edges', '');

        // Click the button to create the adjacency list
        await page.click('button');

        // Verify that the adjacency list is displayed with no edges
        const graphContainer = await page.locator('#graph-container');
        await expect(graphContainer).toContainText('A -> ');
        await expect(graphContainer).toContainText('B -> ');
        await expect(graphContainer).toContainText('C -> ');
    });

    test('should handle invalid edge format', async ({ page }) => {
        // Input valid vertices and invalid edges
        await page.fill('#vertices', 'A,B,C');
        await page.fill('#edges', 'A-B,B:C,C:A');

        // Click the button to create the adjacency list
        await page.click('button');

        // Verify that the adjacency list is displayed correctly
        const graphContainer = await page.locator('#graph-container');
        await expect(graphContainer).toContainText('A -> ');
        await expect(graphContainer).toContainText('B -> ');
        await expect(graphContainer).toContainText('C -> ');
    });

    test('should display adjacency list with multiple edges', async ({ page }) => {
        // Input vertices and multiple edges
        await page.fill('#vertices', 'A,B,C,D');
        await page.fill('#edges', 'A:B,A:C,B:D');

        // Click the button to create the adjacency list
        await page.click('button');

        // Verify the adjacency list is displayed correctly
        const graphContainer = await page.locator('#graph-container');
        await expect(graphContainer).toContainText('A -> B, C');
        await expect(graphContainer).toContainText('B -> D');
        await expect(graphContainer).toContainText('C -> ');
        await expect(graphContainer).toContainText('D -> ');
    });

    test('should show correct adjacency list for repeated edges', async ({ page }) => {
        // Input vertices and repeated edges
        await page.fill('#vertices', 'A,B');
        await page.fill('#edges', 'A:B,A:B');

        // Click the button to create the adjacency list
        await page.click('button');

        // Verify the adjacency list is displayed correctly
        const graphContainer = await page.locator('#graph-container');
        await expect(graphContainer).toContainText('A -> B, B');
        await expect(graphContainer).toContainText('B -> ');
    });

    test('should log errors for invalid JavaScript code', async ({ page }) => {
        // Listen for console errors
        const consoleErrors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });

        // Intentionally trigger an error by modifying the input
        await page.fill('#vertices', 'A,B,C');
        await page.fill('#edges', 'A:B,B:C,C:A:Invalid');

        // Click the button to create the adjacency list
        await page.click('button');

        // Wait for a moment to allow any console errors to be logged
        await page.waitForTimeout(1000);

        // Check that an error was logged
        expect(consoleErrors.length).toBeGreaterThan(0);
    });
});