import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-4/html/47b595c0-d1d4-11f0-959c-5fbc7dc7191d.html';

test.describe('Binary Search Tree Visualization Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the BST visualization page before each test
        await page.goto(BASE_URL);
    });

    test('should load the page and display the title', async ({ page }) => {
        // Verify the page title
        const title = await page.title();
        expect(title).toBe('Binary Search Tree Visualization');
    });

    test('should insert a node and display it', async ({ page }) => {
        // Input a value and click the insert button
        await page.fill('#nodeValue', '10');
        await page.click('button');

        // Verify the node is displayed in the BST
        const node = await page.locator('.node').nth(0);
        await expect(node).toHaveText('10');
    });

    test('should insert multiple nodes and display them correctly', async ({ page }) => {
        // Insert multiple nodes
        await page.fill('#nodeValue', '10');
        await page.click('button');
        await page.fill('#nodeValue', '5');
        await page.click('button');
        await page.fill('#nodeValue', '15');
        await page.click('button');

        // Verify the nodes are displayed in the BST
        const nodes = await page.locator('.node');
        await expect(nodes).toHaveCount(3);
        await expect(nodes.nth(0)).toHaveText('10');
        await expect(nodes.nth(1)).toHaveText('5');
        await expect(nodes.nth(2)).toHaveText('15');
    });

    test('should handle invalid input gracefully', async ({ page }) => {
        // Input an invalid value and click the insert button
        await page.fill('#nodeValue', 'invalid');
        await page.click('button');

        // Verify that an alert is shown (we cannot directly test alerts, but we can check for the input value reset)
        const inputValue = await page.inputValue('#nodeValue');
        expect(inputValue).toBe('invalid'); // Input should not change if invalid
    });

    test('should clear input after valid insertion', async ({ page }) => {
        // Input a valid value and click the insert button
        await page.fill('#nodeValue', '20');
        await page.click('button');

        // Verify the input is cleared
        const inputValue = await page.inputValue('#nodeValue');
        expect(inputValue).toBe('');
    });

    test('should display nodes in correct order', async ({ page }) => {
        // Insert nodes in a specific order
        await page.fill('#nodeValue', '30');
        await page.click('button');
        await page.fill('#nodeValue', '20');
        await page.click('button');
        await page.fill('#nodeValue', '40');
        await page.click('button');

        // Verify the nodes are displayed correctly
        const nodes = await page.locator('.node');
        await expect(nodes).toHaveCount(3);
        await expect(nodes.nth(0)).toHaveText('30'); // Root
        await expect(nodes.nth(1)).toHaveText('20'); // Left child
        await expect(nodes.nth(2)).toHaveText('40'); // Right child
    });

    test('should not insert duplicate nodes', async ({ page }) => {
        // Insert a node
        await page.fill('#nodeValue', '25');
        await page.click('button');
        await page.fill('#nodeValue', '25'); // Attempt to insert duplicate
        await page.click('button');

        // Verify only one node is displayed
        const nodes = await page.locator('.node');
        await expect(nodes).toHaveCount(1);
        await expect(nodes.nth(0)).toHaveText('25');
    });
});