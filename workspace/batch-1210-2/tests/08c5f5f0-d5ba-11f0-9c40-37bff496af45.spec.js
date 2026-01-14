import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-1210-2/html/08c5f5f0-d5ba-11f0-9c40-37bff496af45.html';

test.describe('Binary Search Tree Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application page before each test
        await page.goto(BASE_URL);
    });

    test('Initial state is Idle', async ({ page }) => {
        // Verify that the initial state is Idle
        const input = await page.locator('#input');
        const searchButton = await page.locator('#search-btn');
        const addButton = await page.locator('#add-btn');
        
        await expect(input).toBeVisible();
        await expect(searchButton).toBeVisible();
        await expect(addButton).toBeVisible();
    });

    test('Add value to the Binary Search Tree', async ({ page }) => {
        // Test adding a value to the tree
        const input = await page.locator('#input');
        const addButton = await page.locator('#add-btn');
        
        await input.fill('10');
        await addButton.click();
        
        // Verify that the value is added to the tree
        const treeDiv = await page.locator('#tree');
        await expect(treeDiv).toContainText('10');
    });

    test('Search for an existing value in the Binary Search Tree', async ({ page }) => {
        // Test searching for a value that exists in the tree
        const input = await page.locator('#input');
        const addButton = await page.locator('#add-btn');
        const searchButton = await page.locator('#search-btn');
        
        await input.fill('20');
        await addButton.click();
        
        await input.fill('20');
        await searchButton.click();
        
        // Verify that the search result is displayed
        const treeDiv = await page.locator('#tree');
        await expect(treeDiv).toContainText('Found: 20');
    });

    test('Search for a non-existing value in the Binary Search Tree', async ({ page }) => {
        // Test searching for a value that does not exist in the tree
        const input = await page.locator('#input');
        const searchButton = await page.locator('#search-btn');
        
        await input.fill('30');
        await searchButton.click();
        
        // Verify that the not found message is displayed
        const treeDiv = await page.locator('#tree');
        await expect(treeDiv).toContainText('Not found');
    });

    test('Add multiple values and verify the tree structure', async ({ page }) => {
        // Test adding multiple values and verify the tree structure
        const input = await page.locator('#input');
        const addButton = await page.locator('#add-btn');
        
        await input.fill('15');
        await addButton.click();
        await input.fill('5');
        await addButton.click();
        await input.fill('25');
        await addButton.click();
        
        // Verify that all values are added to the tree
        const treeDiv = await page.locator('#tree');
        await expect(treeDiv).toContainText('15');
        await expect(treeDiv).toContainText('5');
        await expect(treeDiv).toContainText('25');
    });

    test('Check console errors on invalid input', async ({ page }) => {
        // Test for console errors when adding invalid input
        await page.evaluate(() => {
            console.error = jest.fn(); // Mock console.error
        });

        const input = await page.locator('#input');
        const addButton = await page.locator('#add-btn');
        
        await input.fill('invalid');
        await addButton.click();

        // Check if console.error was called
        const consoleErrors = await page.evaluate(() => console.error.mock.calls);
        expect(consoleErrors.length).toBeGreaterThan(0);
    });
});