import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-25T23-45-53/html/e136e790-ca58-11f0-b3c1-8750c080fb19.html';

test.describe('Binary Search Tree Visualization', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application before each test
        await page.goto(BASE_URL);
    });

    test('should be in Idle state initially', async ({ page }) => {
        // Verify that the input is enabled and no nodes are displayed
        const input = await page.locator('#valueInput');
        const bstContainer = await page.locator('#bst');
        await expect(input).toBeEnabled();
        await expect(bstContainer).toHaveText('');
    });

    test('should transition to InsertStart when Insert button is clicked with valid input', async ({ page }) => {
        // Input a value and click Insert
        await page.fill('#valueInput', '10');
        await page.click('button[onclick="insertNode()"]');

        // Verify that the input is cleared and controls are disabled
        await expect(page.locator('#valueInput')).toHaveValue('');
        await expect(page.locator('button[onclick="insertNode()"]')).toBeDisabled();
    });

    test('should transition to InsertingNode when valid input is provided', async ({ page }) => {
        // Insert a valid value
        await page.fill('#valueInput', '20');
        await page.click('button[onclick="insertNode()"]');

        // Verify that the tree has been updated with the new node
        const bstContainer = await page.locator('#bst');
        await expect(bstContainer).toContainText('20');
    });

    test('should reset the tree when Reset button is clicked', async ({ page }) => {
        // Insert a value and then reset
        await page.fill('#valueInput', '30');
        await page.click('button[onclick="insertNode()"]');
        await page.click('button[onclick="resetTree()"]');

        // Verify that the tree is empty
        const bstContainer = await page.locator('#bst');
        await expect(bstContainer).toHaveText('');
    });

    test('should re-enable controls after resetting the tree', async ({ page }) => {
        // Reset the tree and check if controls are enabled
        await page.click('button[onclick="resetTree()"]');
        const input = await page.locator('#valueInput');
        await expect(input).toBeEnabled();
    });

    test('should not insert node when input is empty', async ({ page }) => {
        // Click Insert without providing any input
        await page.click('button[onclick="insertNode()"]');

        // Verify that no nodes are added to the tree
        const bstContainer = await page.locator('#bst');
        await expect(bstContainer).toHaveText('');
    });

    test('should handle invalid input gracefully', async ({ page }) => {
        // Input an invalid value and attempt to insert
        await page.fill('#valueInput', 'abc');
        await page.click('button[onclick="insertNode()"]');

        // Verify that the tree remains unchanged
        const bstContainer = await page.locator('#bst');
        await expect(bstContainer).toHaveText('');
    });
});