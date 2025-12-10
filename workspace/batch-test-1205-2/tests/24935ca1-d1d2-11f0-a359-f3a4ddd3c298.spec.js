import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-2/html/24935ca1-d1d2-11f0-a359-f3a4ddd3c298.html';

test.describe('Binary Tree Visualization Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the Binary Tree Visualization page before each test
        await page.goto(BASE_URL);
    });

    test('should render the initial state correctly', async ({ page }) => {
        // Validate that the initial state (Idle) is rendered
        const title = await page.locator('h1').innerText();
        expect(title).toBe('Binary Tree Visualization');

        const treeDiv = await page.locator('#tree');
        const treeContent = await treeDiv.evaluate(node => node.innerHTML);
        expect(treeContent).toBe('');
    });

    test('should visualize the binary tree after initialization', async ({ page }) => {
        // Validate that the tree is visualized correctly
        const treeDiv1 = await page.locator('#tree');

        // Wait for the tree to be visualized
        await page.waitForTimeout(100); // Allow time for the visualization to complete

        const nodes = await treeDiv.locator('.node').count();
        expect(nodes).toBe(7); // Expecting 7 nodes to be visualized

        const lines = await treeDiv.locator('.line').count();
        expect(lines).toBeGreaterThan(0); // Expecting at least one line to connect nodes
    });

    test('should display correct node values', async ({ page }) => {
        // Validate that the correct node values are displayed
        const nodeValues = await page.locator('.node').allTextContents();
        const expectedValues = ['10', '5', '15', '3', '7', '12', '18'];
        expect(nodeValues).toEqual(expectedValues);
    });

    test('should handle errors in visualization gracefully', async ({ page }) => {
        // Simulate an error scenario by modifying the tree structure
        await page.evaluate(() => {
            const tree = new BinaryTree();
            tree.root = null; // Intentionally setting root to null to simulate an error
            tree.visualize(tree.root);
        });

        // Check for console errors
        const consoleErrors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });

        await page.waitForTimeout(100); // Allow time for the visualization to attempt

        expect(consoleErrors.length).toBeGreaterThan(0); // Expecting at least one error to be logged
    });
});