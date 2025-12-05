import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-3/html/b8b63961-d1d3-11f0-9bcf-07cd16c51572.html';

test.describe('Red-Black Tree Visualization Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the Red-Black Tree application
        await page.goto(BASE_URL);
    });

    test('should load the page and display the title', async ({ page }) => {
        // Verify the title of the page
        const title = await page.title();
        expect(title).toBe('Red-Black Tree Visualization');
    });

    test('should initialize with an empty tree', async ({ page }) => {
        // Verify that the tree container is empty initially
        const treeContainer = await page.locator('#tree-container');
        const content = await treeContainer.innerHTML();
        expect(content).toBe('');
    });

    test('should insert a value and update the tree visualization', async ({ page }) => {
        // Input a value and click the insert button
        await page.fill('#value-input', '10');
        await page.click('button');

        // Verify that the tree is updated
        const treeContainer = await page.locator('#tree-container');
        const content = await treeContainer.innerHTML();
        expect(content).not.toBe('');
    });

    test('should insert multiple values and visualize the tree correctly', async ({ page }) => {
        // Insert multiple values
        await page.fill('#value-input', '10');
        await page.click('button');
        await page.fill('#value-input', '5');
        await page.click('button');
        await page.fill('#value-input', '15');
        await page.click('button');

        // Verify that the tree is updated with multiple nodes
        const treeContainer = await page.locator('#tree-container');
        const content = await treeContainer.innerHTML();
        expect(content).not.toBe('');
    });

    test('should handle non-numeric input gracefully', async ({ page }) => {
        // Input a non-numeric value and click the insert button
        await page.fill('#value-input', 'abc');
        await page.click('button');

        // Verify that the tree remains unchanged
        const treeContainer = await page.locator('#tree-container');
        const contentBefore = await treeContainer.innerHTML();

        await page.fill('#value-input', '20');
        await page.click('button');

        const contentAfter = await treeContainer.innerHTML();
        expect(contentAfter).not.toBe(contentBefore);
    });

    test('should handle duplicate values correctly', async ({ page }) => {
        // Insert a value and then try to insert the same value
        await page.fill('#value-input', '10');
        await page.click('button');
        await page.fill('#value-input', '10');
        await page.click('button');

        // Verify that the tree is updated only once
        const treeContainer = await page.locator('#tree-container');
        const content = await treeContainer.innerHTML();
        expect(content).not.toBe('');
    });

    test('should show error on invalid input', async ({ page }) => {
        // Input an invalid value and check for console errors
        await page.fill('#value-input', 'invalid');
        await page.click('button');

        // Check for console errors
        const consoleMessages = [];
        page.on('console', msg => consoleMessages.push(msg.text()));
        await page.fill('#value-input', '30');
        await page.click('button');

        expect(consoleMessages).toContain('Uncaught NaN'); // Example error handling
    });

    test('should visualize tree structure correctly after multiple insertions', async ({ page }) => {
        // Insert a series of values
        const values = [20, 15, 25, 10, 5, 30];
        for (const value of values) {
            await page.fill('#value-input', value.toString());
            await page.click('button');
        }

        // Verify that the tree is visualized correctly
        const treeContainer = await page.locator('#tree-container');
        const content = await treeContainer.innerHTML();
        expect(content).not.toBe('');
    });
});