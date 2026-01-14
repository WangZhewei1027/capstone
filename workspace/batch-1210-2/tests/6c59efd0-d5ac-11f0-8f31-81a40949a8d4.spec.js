import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-1210-2/html/6c59efd0-d5ac-11f0-8f31-81a40949a8d4.html';

test.describe('Binary Search Tree Application', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the Binary Search Tree application
        await page.goto(BASE_URL);
    });

    test('should render the initial state correctly', async ({ page }) => {
        // Verify that the initial state (Idle) is rendered
        const treeDiv = await page.locator('#tree');
        await expect(treeDiv).toBeVisible();
        const content = await treeDiv.innerHTML();
        expect(content).toBe('');
    });

    test('should insert a node and transition to Tree Populated state', async ({ page }) => {
        // Insert a node and check the transitions to Tree Populated state
        await page.evaluate(() => {
            let data = "5";
            bst.insert(data);
            bst.inOrderTraversal();
            bst.preOrderTraversal();
            bst.postOrderTraversal();
        });

        // Verify the expected output after insertion
        const treeDiv = await page.locator('#tree');
        const content = await treeDiv.innerHTML();
        expect(content).toContain('<p>Left: 5</p>');
        expect(content).toContain('<p>Preorder: 5</p>');
        expect(content).toContain('<p>Postorder: 5</p>');
    });

    test('should handle multiple inserts correctly', async ({ page }) => {
        // Insert multiple nodes and check the output
        await page.evaluate(() => {
            bst.insert(3);
            bst.insert(7);
            bst.insert(5);
            bst.inOrderTraversal();
            bst.preOrderTraversal();
            bst.postOrderTraversal();
        });

        // Verify the expected output after multiple insertions
        const treeDiv = await page.locator('#tree');
        const content = await treeDiv.innerHTML();
        expect(content).toContain('<p>Left: 3</p>');
        expect(content).toContain('<p>Left: 5</p>');
        expect(content).toContain('<p>Left: 7</p>');
        expect(content).toContain('<p>Preorder: 3</p>');
        expect(content).toContain('<p>Preorder: 5</p>');
        expect(content).toContain('<p>Preorder: 7</p>');
        expect(content).toContain('<p>Postorder: 3</p>');
        expect(content).toContain('<p>Postorder: 5</p>');
        expect(content).toContain('<p>Postorder: 7</p>');
    });

    test('should not crash on invalid data types', async ({ page }) => {
        // Attempt to insert invalid data and check for errors
        const error = await page.evaluate(() => {
            try {
                bst.insert("invalid");
                return null;
            } catch (e) {
                return e.message;
            }
        });

        expect(error).toBeNull(); // Expect no error to be thrown
    });

    test('should handle edge cases for empty tree', async ({ page }) => {
        // Test traversals on an empty tree
        await page.evaluate(() => {
            bst = new BinarySearchTree(); // Reset the BST
            bst.inOrderTraversal();
            bst.preOrderTraversal();
            bst.postOrderTraversal();
        });

        const treeDiv = await page.locator('#tree');
        const content = await treeDiv.innerHTML();
        expect(content).toBe(''); // Expect no content for an empty tree
    });

    test.afterEach(async ({ page }) => {
        // Cleanup actions if necessary
        await page.evaluate(() => {
            document.getElementById("tree").innerHTML = ''; // Clear the tree after each test
        });
    });
});