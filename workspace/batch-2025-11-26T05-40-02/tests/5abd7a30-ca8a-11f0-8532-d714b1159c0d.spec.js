import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-40-02/html/5abd7a30-ca8a-11f0-8532-d714b1159c0d.html';

test.describe('Binary Search Tree Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application before each test
        await page.goto(BASE_URL);
    });

    test('should display the initial state with input and buttons', async ({ page }) => {
        // Verify that the input field and buttons are present in the initial state
        const inputField = await page.locator('#data');
        const addButton = await page.locator('#add-btn');
        const searchButton = await page.locator('#search-btn');
        
        await expect(inputField).toBeVisible();
        await expect(addButton).toBeVisible();
        await expect(searchButton).toBeVisible();
    });

    test('should add a node and display it', async ({ page }) => {
        // Test adding a node to the binary search tree
        await page.fill('#data', '10');
        await page.click('#add-btn');

        // Verify that the node is displayed in the tree
        const treeDisplay = await page.locator('#tree');
        await expect(treeDisplay).toContainText('10');
    });

    test('should add multiple nodes and display them in order', async ({ page }) => {
        // Test adding multiple nodes
        await page.fill('#data', '10');
        await page.click('#add-btn');
        await page.fill('#data', '5');
        await page.click('#add-btn');
        await page.fill('#data', '15');
        await page.click('#add-btn');

        // Verify that the nodes are displayed in the correct order
        const treeDisplay = await page.locator('#tree');
        await expect(treeDisplay).toContainText('5');
        await expect(treeDisplay).toContainText('10');
        await expect(treeDisplay).toContainText('15');
    });

    test('should search for an existing node and log the result', async ({ page }) => {
        // Test searching for an existing node
        await page.fill('#data', '10');
        await page.click('#add-btn');
        await page.fill('#data', '5');
        await page.click('#add-btn');
        await page.fill('#data', '15');
        await page.click('#add-btn');

        // Search for an existing node
        await page.fill('#data', '5');
        await page.click('#search-btn');

        // Verify that the console logs the found message
        const consoleLog = await page.evaluate(() => console.log);
        await expect(consoleLog).toContain('Found 5 in the tree');
    });

    test('should search for a non-existing node and log the result', async ({ page }) => {
        // Test searching for a non-existing node
        await page.fill('#data', '10');
        await page.click('#add-btn');

        // Search for a non-existing node
        await page.fill('#data', '20');
        await page.click('#search-btn');

        // Verify that the console logs the not found message
        const consoleLog = await page.evaluate(() => console.log);
        await expect(consoleLog).toContain('Not found in the tree');
    });

    test('should handle empty input when adding a node', async ({ page }) => {
        // Test adding a node with empty input
        await page.click('#add-btn');

        // Verify that no nodes are displayed
        const treeDisplay = await page.locator('#tree');
        await expect(treeDisplay).toHaveText('');
    });

    test('should handle empty input when searching for a node', async ({ page }) => {
        // Test searching with empty input
        await page.click('#search-btn');

        // Verify that the console logs the not found message
        const consoleLog = await page.evaluate(() => console.log);
        await expect(consoleLog).toContain('Not found in the tree');
    });
});