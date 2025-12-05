import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-2/html/2493d1d1-d1d2-11f0-a359-f3a4ddd3c298.html';

test.describe('Weighted Graph Visualization', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application page before each test
        await page.goto(BASE_URL);
    });

    test('should render the graph container', async ({ page }) => {
        // Validate that the graph container is rendered
        const graphContainer = await page.locator('#graph');
        await expect(graphContainer).toBeVisible();
    });

    test('should create nodes A, B, C, D, E', async ({ page }) => {
        // Validate that all nodes are created
        const nodes = await page.locator('.node');
        await expect(nodes).toHaveCount(5);

        const nodeTexts = await nodes.allTextContents();
        expect(nodeTexts).toEqual(expect.arrayContaining(['A', 'B', 'C', 'D', 'E']));
    });

    test('should create edges with weights', async ({ page }) => {
        // Validate that edges are created between nodes with correct weights
        const edges = await page.locator('.edge');
        await expect(edges).toHaveCount(7); // A-B, A-C, B-D, C-D, C-E, D-E

        // Check for weight labels
        const weightLabels = await page.locator('div:has-text("5"), div:has-text("3"), div:has-text("2"), div:has-text("1"), div:has-text("2"), div:has-text("4")');
        await expect(weightLabels).toHaveCount(6); // Ensure all weights are present
    });

    test('should position nodes correctly', async ({ page }) => {
        // Validate the position of nodes
        const positions = {
            'A': [0, 0],
            'B': [1, 1],
            'C': [1, -1],
            'D': [2, 0],
            'E': [3, 0]
        };

        for (const [node, pos] of Object.entries(positions)) {
            const nodeElement = await page.locator(`.node:has-text("${node}")`);
            const boundingBox = await nodeElement.boundingBox();
            const expectedX = (pos[0] + 0.5) * 100; // Compensate for the width of the div
            const expectedY = (pos[1] + 1.5) * 100; // Compensate for the height of the div

            expect(boundingBox.x).toBeCloseTo(expectedX, 1);
            expect(boundingBox.y).toBeCloseTo(expectedY, 1);
        }
    });

    test('should log errors if any occur', async ({ page }) => {
        // Listen for console messages and check for errors
        const consoleMessages = [];
        page.on('console', msg => consoleMessages.push(msg.text()));

        // Trigger any potential errors (if applicable)
        await page.reload();

        // Validate that no ReferenceError, SyntaxError, or TypeError occurs
        const errorMessages = consoleMessages.filter(msg => msg.includes('ReferenceError') || msg.includes('SyntaxError') || msg.includes('TypeError'));
        expect(errorMessages).toHaveLength(0);
    });
});