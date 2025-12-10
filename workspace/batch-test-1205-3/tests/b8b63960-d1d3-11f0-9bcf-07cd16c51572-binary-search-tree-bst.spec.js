import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-3/html/b8b63960-d1d3-11f0-9bcf-07cd16c51572.html';

test.describe('Binary Search Tree Visualization', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the BST visualization page before each test
        await page.goto(BASE_URL);
    });

    test('should load the page and display initial elements', async ({ page }) => {
        // Verify that the input field and button are present
        const inputField = page.locator('#insertValue');
        const insertButton = page.locator('button');

        await expect(inputField).toBeVisible();
        await expect(insertButton).toBeVisible();
    });

    test('should insert a valid number and visualize it', async ({ page }) => {
        // Insert a valid number and check the visualization
        const inputField = page.locator('#insertValue');
        const insertButton = page.locator('button');

        await inputField.fill('10');
        await insertButton.click();

        // Check if the node is visualized
        const node = page.locator('.node');
        await expect(node).toHaveText('10');
    });

    test('should insert multiple numbers and visualize the BST structure', async ({ page }) => {
        // Insert multiple numbers and check the visualization
        const inputField = page.locator('#insertValue');
        const insertButton = page.locator('button');

        await inputField.fill('10');
        await insertButton.click();

        await inputField.fill('5');
        await insertButton.click();

        await inputField.fill('15');
        await insertButton.click();

        // Check if the nodes are visualized correctly
        const nodes = page.locator('.node');
        await expect(nodes).toHaveCount(3);
        await expect(nodes.nth(0)).toHaveText('10');
        await expect(nodes.nth(1)).toHaveText('5');
        await expect(nodes.nth(2)).toHaveText('15');
    });

    test('should show an alert for invalid input', async ({ page }) => {
        // Insert an invalid value and check for alert
        const inputField = page.locator('#insertValue');
        const insertButton = page.locator('button');

        await inputField.fill('invalid');
        await insertButton.click();

        // Expect an alert to be shown
        page.on('dialog', async dialog => {
            expect(dialog.message()).toBe('Please enter a valid number.');
            await dialog.dismiss();
        });
    });

    test('should clear the input field after insertion', async ({ page }) => {
        // Insert a valid number and check if the input field is cleared
        const inputField = page.locator('#insertValue');
        const insertButton = page.locator('button');

        await inputField.fill('20');
        await insertButton.click();

        // Check if the input field is cleared
        await expect(inputField).toHaveValue('');
    });

    test('should visualize nodes correctly with multiple insertions', async ({ page }) => {
        // Insert multiple numbers and check the visualization
        const inputField = page.locator('#insertValue');
        const insertButton = page.locator('button');

        await inputField.fill('30');
        await insertButton.click();

        await inputField.fill('20');
        await insertButton.click();

        await inputField.fill('40');
        await insertButton.click();

        // Check if the nodes are visualized correctly
        const nodes = page.locator('.node');
        await expect(nodes).toHaveCount(3);
        await expect(nodes.nth(0)).toHaveText('30');
        await expect(nodes.nth(1)).toHaveText('20');
        await expect(nodes.nth(2)).toHaveText('40');
    });
});