import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-25T17-48-25/html/f19a88d0-ca26-11f0-a9b8-37a2979a9f59.html';

test.describe('Binary Search Tree Visualization', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should be in Idle state initially', async ({ page }) => {
        const input = await page.locator('input[type="number"]');
        const insertButton = await page.locator('button[onclick="insertNode()"]');
        const clearButton = await page.locator('button[onclick="clearTree()"]');

        await expect(input).toBeVisible();
        await expect(insertButton).toBeVisible();
        await expect(clearButton).toBeVisible();
    });

    test('should transition to InsertingNode state on valid input and button click', async ({ page }) => {
        const input = await page.locator('input[type="number"]');
        const insertButton = await page.locator('button[onclick="insertNode()"]');

        await input.fill('10');
        await insertButton.click();

        // Check if the input is cleared and the tree is rendered
        await expect(input).toHaveValue('');
        const bstContainer = await page.locator('#bst-container');
        await expect(bstContainer).toContainText('10');
    });

    test('should not insert invalid input', async ({ page }) => {
        const input = await page.locator('input[type="number"]');
        const insertButton = await page.locator('button[onclick="insertNode()"]');

        await input.fill('invalid');
        await insertButton.click();

        // Check that the tree remains empty
        const bstContainer = await page.locator('#bst-container');
        await expect(bstContainer).toBeEmpty();
    });

    test('should insert multiple nodes and render the tree correctly', async ({ page }) => {
        const input = await page.locator('input[type="number"]');
        const insertButton = await page.locator('button[onclick="insertNode()"]');

        await input.fill('10');
        await insertButton.click();
        await input.fill('5');
        await insertButton.click();
        await input.fill('15');
        await insertButton.click();

        const bstContainer = await page.locator('#bst-container');
        await expect(bstContainer).toContainText('10');
        await expect(bstContainer).toContainText('5');
        await expect(bstContainer).toContainText('15');
    });

    test('should transition to ClearingTree state and clear the tree', async ({ page }) => {
        const input = await page.locator('input[type="number"]');
        const insertButton = await page.locator('button[onclick="insertNode()"]');
        const clearButton = await page.locator('button[onclick="clearTree()"]');

        await input.fill('10');
        await insertButton.click();

        await clearButton.click();

        const bstContainer = await page.locator('#bst-container');
        await expect(bstContainer).toBeEmpty();
    });

    test('should handle multiple clear actions correctly', async ({ page }) => {
        const input = await page.locator('input[type="number"]');
        const insertButton = await page.locator('button[onclick="insertNode()"]');
        const clearButton = await page.locator('button[onclick="clearTree()"]');

        await input.fill('10');
        await insertButton.click();
        await clearButton.click();

        const bstContainer = await page.locator('#bst-container');
        await expect(bstContainer).toBeEmpty();

        // Clear again and check if still empty
        await clearButton.click();
        await expect(bstContainer).toBeEmpty();
    });
});