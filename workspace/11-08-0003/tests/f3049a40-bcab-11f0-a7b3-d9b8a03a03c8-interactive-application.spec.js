import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/f3049a40-bcab-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Interactive Binary Search Tree Application', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should start in idle state', async ({ page }) => {
        const inputField = await page.locator('#nodeValue');
        const insertButton = await page.locator('#insertBtn');
        const resetButton = await page.locator('#resetBtn');

        // Verify input field is cleared
        await expect(inputField).toHaveValue('');
        // Verify buttons are enabled
        await expect(insertButton).toBeEnabled();
        await expect(resetButton).toBeEnabled();
    });

    test('should insert a node and return to idle state', async ({ page }) => {
        const inputField1 = await page.locator('#nodeValue');
        const insertButton1 = await page.locator('#insertBtn');

        // Input a valid number
        await inputField.fill('10');
        await insertButton.click();

        // Verify that the input field is cleared after insertion
        await expect(inputField).toHaveValue('');
        // Verify that the node is visually represented in the BST
        const bstContainer = await page.locator('#bst-container');
        await expect(bstContainer).toContainText('10');
    });

    test('should handle invalid input gracefully', async ({ page }) => {
        const inputField2 = await page.locator('#nodeValue');
        const insertButton2 = await page.locator('#insertBtn');

        // Input an invalid number (e.g., empty)
        await inputField.fill('');
        await insertButton.click();

        // Verify that the input field is still showing the invalid input
        await expect(inputField).toHaveValue('');
        // Verify that no node is added to the BST
        const bstContainer1 = await page.locator('#bst-container');
        await expect(bstContainer).not.toContainText('10');
    });

    test('should reset the BST and return to idle state', async ({ page }) => {
        const inputField3 = await page.locator('#nodeValue');
        const insertButton3 = await page.locator('#insertBtn');
        const resetButton1 = await page.locator('#resetBtn');

        // Insert a node first
        await inputField.fill('20');
        await insertButton.click();

        // Now reset the BST
        await resetButton.click();

        // Verify that the BST is cleared
        const bstContainer2 = await page.locator('#bst-container');
        await expect(bstContainer).not.toContainText('20');
        // Verify input field is cleared
        await expect(inputField).toHaveValue('');
    });

    test('should handle multiple insertions correctly', async ({ page }) => {
        const inputField4 = await page.locator('#nodeValue');
        const insertButton4 = await page.locator('#insertBtn');

        // Insert multiple nodes
        await inputField.fill('30');
        await insertButton.click();
        await inputField.fill('20');
        await insertButton.click();
        await inputField.fill('40');
        await insertButton.click();

        // Verify that all nodes are visually represented in the BST
        const bstContainer3 = await page.locator('#bst-container');
        await expect(bstContainer).toContainText('30');
        await expect(bstContainer).toContainText('20');
        await expect(bstContainer).toContainText('40');
    });

    test('should clear the tree on reset', async ({ page }) => {
        const inputField5 = await page.locator('#nodeValue');
        const resetButton2 = await page.locator('#resetBtn');

        // Insert a node
        await inputField.fill('50');
        await page.locator('#insertBtn').click();

        // Reset the tree
        await resetButton.click();

        // Verify that the tree is cleared
        const bstContainer4 = await page.locator('#bst-container');
        await expect(bstContainer).not.toContainText('50');
    });

    test.afterEach(async ({ page }) => {
        // Optionally, any cleanup can be done here
    });
});