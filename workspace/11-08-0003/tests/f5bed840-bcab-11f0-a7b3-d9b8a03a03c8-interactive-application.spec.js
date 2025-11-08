import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/f5bed840-bcab-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Interactive Binary Tree Application', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should start in idle state', async ({ page }) => {
        const nodeValueInput = await page.locator('#node-value');
        const addNodeButton = await page.locator('#add-node');
        
        // Verify input field is cleared and button is enabled
        await expect(nodeValueInput).toHaveValue('');
        await expect(addNodeButton).toBeEnabled();
    });

    test('should transition to addingNode state on button click', async ({ page }) => {
        const nodeValueInput1 = await page.locator('#node-value');
        const addNodeButton1 = await page.locator('#add-node');

        await nodeValueInput.fill('5');
        await addNodeButton.click();

        // Verify that the tree is rendered
        const treeContainer = await page.locator('#tree-container');
        await expect(treeContainer).toHaveText('5'); // Assuming the node is rendered with its value
    });

    test('should return to idle state if node value is invalid', async ({ page }) => {
        const nodeValueInput2 = await page.locator('#node-value');
        const addNodeButton2 = await page.locator('#add-node');

        await nodeValueInput.fill(''); // Invalid input
        await addNodeButton.click();

        // Verify that no nodes are rendered
        const treeContainer1 = await page.locator('#tree-container');
        await expect(treeContainer).toHaveText(''); // No nodes should be rendered
    });

    test('should render multiple nodes correctly', async ({ page }) => {
        const nodeValueInput3 = await page.locator('#node-value');
        const addNodeButton3 = await page.locator('#add-node');

        await nodeValueInput.fill('5');
        await addNodeButton.click();

        await nodeValueInput.fill('3');
        await addNodeButton.click();

        await nodeValueInput.fill('7');
        await addNodeButton.click();

        // Verify that all nodes are rendered
        const treeContainer2 = await page.locator('#tree-container');
        await expect(treeContainer).toHaveText(/5.*3.*7/); // Check for all values in the tree
    });

    test('should clear input field after adding a node', async ({ page }) => {
        const nodeValueInput4 = await page.locator('#node-value');
        const addNodeButton4 = await page.locator('#add-node');

        await nodeValueInput.fill('10');
        await addNodeButton.click();

        // Verify that the input field is cleared
        await expect(nodeValueInput).toHaveValue('');
    });

    test('should not add node if input is empty', async ({ page }) => {
        const nodeValueInput5 = await page.locator('#node-value');
        const addNodeButton5 = await page.locator('#add-node');

        await nodeValueInput.fill(''); // Empty input
        await addNodeButton.click();

        // Verify that no nodes are rendered
        const treeContainer3 = await page.locator('#tree-container');
        await expect(treeContainer).toHaveText(''); // No nodes should be rendered
    });

    test('should handle edge case of adding duplicate nodes', async ({ page }) => {
        const nodeValueInput6 = await page.locator('#node-value');
        const addNodeButton6 = await page.locator('#add-node');

        await nodeValueInput.fill('5');
        await addNodeButton.click();

        await nodeValueInput.fill('5'); // Duplicate input
        await addNodeButton.click();

        // Verify that only one node is rendered
        const treeContainer4 = await page.locator('#tree-container');
        await expect(treeContainer).toHaveText('5');
        await expect(treeContainer).toHaveCount(1); // Assuming nodes are unique
    });

    test.afterEach(async ({ page }) => {
        // Any necessary cleanup can be done here
    });
});