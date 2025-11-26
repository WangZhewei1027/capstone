import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T04-43-42/html/7c17a910-ca82-11f0-8193-f13bc409d3cb.html';

test.describe('Binary Search Tree Visualization', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should render tree in idle state', async ({ page }) => {
        const tree = await page.locator('#tree');
        await expect(tree).toBeVisible();
        await expect(tree).toHaveText('50'); // Initial root node
    });

    test('should show error alert when input is empty', async ({ page }) => {
        await page.click('#insert');
        await expect(page.locator('#error-dialog')).toBeVisible(); // Assuming error dialog appears
        await page.click('#dismiss-error'); // Assuming there's a dismiss button
        await expect(page.locator('#error-dialog')).toBeHidden();
    });

    test('should insert a valid node and update tree visualization', async ({ page }) => {
        await page.fill('#input', '25'); // Assuming there's an input field
        await page.click('#insert');
        await expect(page.locator('#tree')).toContainText('25'); // Check if the new node is added
    });

    test('should validate input and show feedback', async ({ page }) => {
        await page.fill('#input', 'abc'); // Invalid input
        await page.click('#insert');
        await expect(page.locator('#error-dialog')).toBeVisible(); // Error dialog should show
        await page.click('#dismiss-error');
        await expect(page.locator('#error-dialog')).toBeHidden();
    });

    test('should reset the tree when reset button is clicked', async ({ page }) => {
        await page.click('#reset');
        await expect(page.locator('#tree')).toHaveText(''); // Tree should be empty after reset
    });

    test('should delete a node and update tree visualization', async ({ page }) => {
        await page.fill('#input', '20'); // Assuming 20 is a node to delete
        await page.click('#delete'); // Assuming there's a delete button
        await expect(page.locator('#tree')).not.toContainText('20'); // Check if the node is removed
    });

    test('should handle invalid delete operation gracefully', async ({ page }) => {
        await page.fill('#input', '100'); // Non-existent node
        await page.click('#delete');
        await expect(page.locator('#error-dialog')).toBeVisible(); // Error dialog should show
        await page.click('#dismiss-error');
        await expect(page.locator('#error-dialog')).toBeHidden();
    });

    test('should show the correct inorder traversal', async ({ page }) => {
        await page.click('#inorder-traversal'); // Assuming there's a button to show traversal
        const traversalOutput = await page.locator('#traversal-output'); // Assuming there's an output area
        await expect(traversalOutput).toHaveText('20, 25, 30, 40, 50, 60, 70, 80'); // Expected traversal output
    });

    test.afterEach(async ({ page }) => {
        // Any cleanup can be done here if necessary
    });
});