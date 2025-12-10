import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/8c92f030-d1d3-11f0-a698-d7b407715e1f.html';

test.describe('Binary Search Tree Visualization', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application page before each test
        await page.goto(BASE_URL);
    });

    test('should load the page and display the title', async ({ page }) => {
        // Verify that the title is displayed correctly
        const title = await page.title();
        expect(title).toBe('Binary Search Tree Visualization');
    });

    test('should insert a node into the BST and visualize it', async ({ page }) => {
        // Input a value and click the insert button
        await page.fill('#valueInput', '10');
        await page.click('#insertBtn');

        // Check that the tree container has the node
        const node = await page.locator('.node').innerText();
        expect(node).toBe('10');
    });

    test('should insert multiple nodes into the BST and visualize them', async ({ page }) => {
        // Insert multiple values
        await page.fill('#valueInput', '10');
        await page.click('#insertBtn');
        await page.fill('#valueInput', '5');
        await page.click('#insertBtn');
        await page.fill('#valueInput', '15');
        await page.click('#insertBtn');

        // Check that the tree container has the nodes
        const nodes = await page.locator('.node').allInnerTexts();
        expect(nodes).toEqual(['10', '5', '15']);
    });

    test('should clear the BST and remove all nodes', async ({ page }) => {
        // Insert a value, then clear the tree
        await page.fill('#valueInput', '10');
        await page.click('#insertBtn');
        await page.click('#clearBtn');

        // Check that the tree container is empty
        const treeContent = await page.locator('#tree').innerHTML();
        expect(treeContent).toBe('');
    });

    test('should handle invalid input gracefully', async ({ page }) => {
        // Input an invalid value and check that no node is added
        await page.fill('#valueInput', 'invalid');
        await page.click('#insertBtn');

        // Check that the tree container is still empty
        const treeContent = await page.locator('#tree').innerHTML();
        expect(treeContent).toBe('');
    });

    test('should handle edge case of inserting duplicate values', async ({ page }) => {
        // Insert a value, then try to insert the same value again
        await page.fill('#valueInput', '10');
        await page.click('#insertBtn');
        await page.fill('#valueInput', '10');
        await page.click('#insertBtn');

        // Check that the tree container has only one node
        const nodes = await page.locator('.node').allInnerTexts();
        expect(nodes).toEqual(['10']);
    });
});