import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-40-02/html/5abda140-ca8a-11f0-8532-d714b1159c0d.html';

test.describe('Red-Black Tree Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application page before each test
        await page.goto(BASE_URL);
    });

    test('Initial state should render the Idle state correctly', async ({ page }) => {
        // Validate that the initial state renders correctly
        const title = await page.locator('h2').innerText();
        expect(title).toBe('Red-Black Tree');

        const treeDiv = await page.locator('.tree');
        expect(await treeDiv.count()).toBe(1);
    });

    test('Tree should initialize correctly and transition to Tree Initialized state', async ({ page }) => {
        // Simulate the initialization of the tree
        await page.evaluate(() => {
            const tree = new RedBlackTree();
            tree.insert(5);
            tree.insert(3);
            tree.insert(7);
            tree.insert(2);
            tree.insert(4);
            tree.insert(6);
            tree.insert(8);
        });

        // Validate the tree structure after initialization
        const treeContent = await page.locator('.tree').innerText();
        expect(treeContent).toContain('Left Child: Root');
        expect(treeContent).toContain('Right Child: Root');
        expect(treeContent).toContain('Parent: Root');
    });

    test('Tree should correctly display nodes after multiple insertions', async ({ page }) => {
        // Execute the insertion logic
        await page.evaluate(() => {
            const tree = new RedBlackTree();
            tree.insert(5);
            tree.insert(3);
            tree.insert(7);
            tree.insert(2);
            tree.insert(4);
            tree.insert(6);
            tree.insert(8);
            tree.display(tree.root);
        });

        // Validate that the tree structure has been updated correctly
        const treeDiv = await page.locator('.tree');
        expect(await treeDiv.innerText()).toContain('5');
        expect(await treeDiv.innerText()).toContain('3');
        expect(await treeDiv.innerText()).toContain('7');
        expect(await treeDiv.innerText()).toContain('2');
        expect(await treeDiv.innerText()).toContain('4');
        expect(await treeDiv.innerText()).toContain('6');
        expect(await treeDiv.innerText()).toContain('8');
    });

    test('Hovering over nodes should change their color', async ({ page }) => {
        // Ensure the tree is initialized
        await page.evaluate(() => {
            const tree = new RedBlackTree();
            tree.insert(5);
            tree.insert(3);
            tree.insert(7);
            tree.insert(2);
            tree.insert(4);
            tree.insert(6);
            tree.insert(8);
        });

        // Hover over a node and check the color change
        const node = await page.locator('.node span').first();
        await node.hover();
        const color = await node.evaluate(node => getComputedStyle(node).color);
        expect(color).toBe('rgb(255, 0, 0)'); // Expect red color on hover
    });

    test('Edge case: Inserting duplicate values should not change the tree structure', async ({ page }) => {
        // Initialize the tree and insert values
        await page.evaluate(() => {
            const tree = new RedBlackTree();
            tree.insert(5);
            tree.insert(3);
            tree.insert(7);
            tree.insert(5); // Attempt to insert duplicate
            tree.display(tree.root);
        });

        // Validate that the tree structure remains unchanged
        const treeDiv = await page.locator('.tree');
        expect(await treeDiv.innerText()).toContain('5');
        expect(await treeDiv.innerText()).toContain('3');
        expect(await treeDiv.innerText()).toContain('7');
        expect(await treeDiv.innerText()).not.toContain('5 (duplicate)');
    });

    test.afterEach(async ({ page }) => {
        // Cleanup actions can be performed here if necessary
    });
});