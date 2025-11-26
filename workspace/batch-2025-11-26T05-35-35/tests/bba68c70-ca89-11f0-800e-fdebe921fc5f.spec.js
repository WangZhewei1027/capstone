import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-35-35/html/bba68c70-ca89-11f0-800e-fdebe921fc5f.html';

test.describe('Kruskal\'s Algorithm Interactive Application', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application page before each test
        await page.goto(BASE_URL);
    });

    test('should display the title correctly', async ({ page }) => {
        // Validate that the title is rendered correctly
        const title = await page.locator('h1').innerText();
        expect(title).toBe('Kruskal\'s Algorithm');
    });

    test('should display prerequisites', async ({ page }) => {
        // Validate that the prerequisites are displayed
        const prerequisites = await page.locator('ul').innerText();
        expect(prerequisites).toContain('Given a list of edges, where each edge is represented by a tuple (u, v, w)');
        expect(prerequisites).toContain('The graph is represented as an adjacency list');
    });

    test('should display input code correctly', async ({ page }) => {
        // Validate that the input code is displayed correctly
        const inputCode = await page.locator('pre code').nth(0).innerText();
        expect(inputCode).toContain('let edges = [');
        expect(inputCode).toContain('["A", "B", 2]');
    });

    test('should display output code correctly', async ({ page }) => {
        // Validate that the output code is displayed correctly
        const outputCode = await page.locator('pre code').nth(1).innerText();
        expect(outputCode).toContain('let graph = {');
        expect(outputCode).toContain('let sortedEdges = kruskal(edges, graph);');
    });

    test('should have a functioning kruskal function', async ({ page }) => {
        // Test the kruskal function directly in the browser context
        const result = await page.evaluate(() => {
            let edges = [
                ["A", "B", 2],
                ["B", "C", 3],
                ["A", "C", 4],
                ["C", "D", 5],
                ["D", "E", 6]
            ];
            let graph = {
                "A": ["B", "C"],
                "B": ["A", "C"],
                "C": ["A", "B", "D"],
                "D": ["C", "E"],
                "E": ["D"]
            };
            return kruskal(edges, graph);
        });
        // Validate that the result is as expected
        expect(result).toEqual([
            ["A", "B", 2],
            ["B", "C", 3],
            ["C", "D", 5],
            ["D", "E", 6]
        ]);
    });

    test('should handle edge cases in kruskal function', async ({ page }) => {
        // Test an edge case where there are no edges
        const result = await page.evaluate(() => {
            let edges = [];
            let graph = {};
            return kruskal(edges, graph);
        });
        // Validate that the result is an empty array
        expect(result).toEqual([]);
    });

    test('should handle invalid input in kruskal function', async ({ page }) => {
        // Test an edge case with invalid input
        const result = await page.evaluate(() => {
            let edges = null;
            let graph = {};
            try {
                return kruskal(edges, graph);
            } catch (e) {
                return e.message;
            }
        });
        // Validate that an error message is returned
        expect(result).toContain('Cannot read properties of null (reading \'sort\')');
    });
});