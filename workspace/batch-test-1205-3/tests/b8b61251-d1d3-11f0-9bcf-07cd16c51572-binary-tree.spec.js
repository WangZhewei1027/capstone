import { test, expect } from '@playwright/test';

const url = 'http://127.0.0.1:5500/workspace/batch-test-1205-3/html/b8b61251-d1d3-11f0-9bcf-07cd16c51572.html';

test.describe('Binary Tree Visualization Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the binary tree visualization page before each test
        await page.goto(url);
    });

    test('should load the page with the correct title', async ({ page }) => {
        // Verify that the page loads with the correct title
        await expect(page).toHaveTitle('Binary Tree Visualization');
    });

    test('should display input field and button', async ({ page }) => {
        // Verify that the input field and button are visible on the page
        const inputField = await page.locator('#valueInput');
        const addButton = await page.locator('button');

        await expect(inputField).toBeVisible();
        await expect(addButton).toBeVisible();
    });

    test('should add a node to the tree and update the DOM', async ({ page }) => {
        // Test adding a node and verify the DOM updates correctly
        const inputField = await page.locator('#valueInput');
        const addButton = await page.locator('button');

        await inputField.fill('10');
        await addButton.click();

        // Verify that the node is displayed in the tree
        const node = await page.locator('.node').nth(0);
        await expect(node).toHaveText('10');
    });

    test('should add multiple nodes and maintain correct structure', async ({ page }) => {
        // Test adding multiple nodes and verify the structure of the tree
        const inputField = await page.locator('#valueInput');
        const addButton = await page.locator('button');

        await inputField.fill('10');
        await addButton.click();

        await inputField.fill('5');
        await addButton.click();

        await inputField.fill('15');
        await addButton.click();

        // Verify the nodes are displayed correctly
        const firstNode = await page.locator('.node').nth(0);
        const secondNode = await page.locator('.node').nth(1);
        const thirdNode = await page.locator('.node').nth(2);

        await expect(firstNode).toHaveText('10');
        await expect(secondNode).toHaveText('5');
        await expect(thirdNode).toHaveText('15');
    });

    test('should clear input field after adding a node', async ({ page }) => {
        // Test that the input field is cleared after adding a node
        const inputField = await page.locator('#valueInput');
        const addButton = await page.locator('button');

        await inputField.fill('20');
        await addButton.click();

        // Verify that the input field is cleared
        await expect(inputField).toHaveValue('');
    });

    test('should handle adding invalid input gracefully', async ({ page }) => {
        // Test adding an empty input and verify no node is added
        const inputField = await page.locator('#valueInput');
        const addButton = await page.locator('button');

        await inputField.fill('');
        await addButton.click();

        // Verify that no nodes are added
        const nodes = await page.locator('.node');
        await expect(nodes).toHaveCount(0);
    });

    test('should display multiple nodes correctly in the tree', async ({ page }) => {
        // Test adding nodes in various orders and verify the tree structure
        const inputField = await page.locator('#valueInput');
        const addButton = await page.locator('button');

        await inputField.fill('30');
        await addButton.click();

        await inputField.fill('20');
        await addButton.click();

        await inputField.fill('40');
        await addButton.click();

        await inputField.fill('10');
        await addButton.click();

        // Verify the nodes are displayed correctly
        const nodes = await page.locator('.node');
        await expect(nodes).toHaveCount(4);
        await expect(nodes.nth(0)).toHaveText('30');
        await expect(nodes.nth(1)).toHaveText('20');
        await expect(nodes.nth(2)).toHaveText('40');
        await expect(nodes.nth(3)).toHaveText('10');
    });

    test('should show the correct visual structure of the binary tree', async ({ page }) => {
        // Test the visual structure of the binary tree after adding nodes
        const inputField = await page.locator('#valueInput');
        const addButton = await page.locator('button');

        await inputField.fill('25');
        await addButton.click();

        await inputField.fill('15');
        await addButton.click();

        await inputField.fill('35');
        await addButton.click();

        // Verify the structure visually by checking the presence of lines
        const lines = await page.locator('.line');
        await expect(lines).toHaveCount(4); // Expecting lines connecting the nodes
    });

    test('should log errors for invalid operations', async ({ page }) => {
        // Test that errors are logged for invalid operations
        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.log('Error logged:', msg.text());
            }
        });

        const inputField = await page.locator('#valueInput');
        const addButton = await page.locator('button');

        await inputField.fill('invalid');
        await addButton.click();

        // Verify that an error is logged in the console
        await expect(page).toHaveConsole('Error logged:');
    });
});