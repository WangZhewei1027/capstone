import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-4/html/47b56eb1-d1d4-11f0-959c-5fbc7dc7191d.html';

test.describe('Binary Tree Visualization Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the binary tree visualization page before each test
        await page.goto(BASE_URL);
    });

    test('should load the page and display the title', async ({ page }) => {
        // Verify the page title
        const title = await page.title();
        expect(title).toBe('Binary Tree Visualization');
    });

    test('should display the binary tree with initial values', async ({ page }) => {
        // Check if the tree is displayed after the initial values are inserted
        const tree = await page.locator('#tree');
        await expect(tree).toBeVisible();

        // Check if the nodes are rendered correctly
        const nodes = await tree.locator('.node');
        expect(await nodes.count()).toBe(7); // Expecting 7 nodes for the values [5, 3, 8, 1, 4, 7, 9]
    });

    test('should display correct node values', async ({ page }) => {
        // Verify that the nodes contain the correct values
        const nodeValues = await page.locator('.node').allTextContents();
        expect(nodeValues).toEqual(['5', '3', '8', '1', '4', '7', '9']);
    });

    test('should maintain correct structure of the binary tree', async ({ page }) => {
        // Check the structure of the binary tree
        const nodes = await page.locator('.node');
        const leftChild = await nodes.nth(1); // Node with value 3
        const rightChild = await nodes.nth(2); // Node with value 8
        const leftLeftChild = await nodes.nth(3); // Node with value 1
        const leftRightChild = await nodes.nth(4); // Node with value 4
        const rightLeftChild = await nodes.nth(5); // Node with value 7
        const rightRightChild = await nodes.nth(6); // Node with value 9

        // Assert the left child of root (5) is 3
        expect(await leftChild.innerText()).toBe('3');
        // Assert the right child of root (5) is 8
        expect(await rightChild.innerText()).toBe('8');
        // Assert the left child of (3) is 1
        expect(await leftLeftChild.innerText()).toBe('1');
        // Assert the right child of (3) is 4
        expect(await leftRightChild.innerText()).toBe('4');
        // Assert the left child of (8) is 7
        expect(await rightLeftChild.innerText()).toBe('7');
        // Assert the right child of (8) is 9
        expect(await rightRightChild.innerText()).toBe('9');
    });

    test('should handle errors gracefully', async ({ page }) => {
        // Simulate an error scenario (if applicable)
        // Since there are no interactive elements to trigger errors in the current implementation,
        // we will just check for any console errors during the initial load.
        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.error('Console error:', msg.text());
            }
        });

        // Check for any errors in the console
        const consoleErrors = await page.evaluate(() => {
            return window.console.error;
        });
        expect(consoleErrors).toBeUndefined();
    });
});