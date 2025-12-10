import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-2/html/24933590-d1d2-11f0-a359-f3a4ddd3c298.html';

test.describe('Hash Table Demonstration', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the hash table demonstration page before each test
        await page.goto(BASE_URL);
    });

    test('Initial state should render the page correctly', async ({ page }) => {
        // Validate that the initial elements are present
        const keyInput = await page.locator('#key');
        const valueInput = await page.locator('#value');
        const insertButton = await page.locator('button[onclick="insert()"]');
        const searchButton = await page.locator('button[onclick="search()"]');
        const removeButton = await page.locator('button[onclick="remove()"]');
        
        await expect(keyInput).toBeVisible();
        await expect(valueInput).toBeVisible();
        await expect(insertButton).toBeVisible();
        await expect(searchButton).toBeVisible();
        await expect(removeButton).toBeVisible();
    });

    test('Insert a key-value pair', async ({ page }) => {
        // Test inserting a key-value pair
        await page.fill('#key', 'testKey');
        await page.fill('#value', 'testValue');
        await page.click('button[onclick="insert()"]');

        // Validate the hash table displays the new entry
        const tableBody = await page.locator('#hashTable');
        await expect(tableBody).toContainText('testKey');
        await expect(tableBody).toContainText('testValue');
    });

    test('Search for an existing key', async ({ page }) => {
        // Insert a key-value pair first
        await page.fill('#key', 'searchKey');
        await page.fill('#value', 'searchValue');
        await page.click('button[onclick="insert()"]');

        // Now search for the key
        await page.fill('#key', 'searchKey');
        await page.click('button[onclick="search()"]');

        // Validate the alert shows the correct value
        page.on('dialog', async dialog => {
            await expect(dialog.message()).toBe('Found: searchValue');
            await dialog.dismiss();
        });
    });

    test('Search for a non-existing key', async ({ page }) => {
        // Search for a key that does not exist
        await page.fill('#key', 'nonExistentKey');
        await page.click('button[onclick="search()"]');

        // Validate the alert shows the key not found message
        page.on('dialog', async dialog => {
            await expect(dialog.message()).toBe('Key not found!');
            await dialog.dismiss();
        });
    });

    test('Remove an existing key', async ({ page }) => {
        // Insert a key-value pair first
        await page.fill('#key', 'removeKey');
        await page.fill('#value', 'removeValue');
        await page.click('button[onclick="insert()"]');

        // Now remove the key
        await page.fill('#key', 'removeKey');
        await page.click('button[onclick="remove()"]');

        // Validate the alert shows the key removed message
        page.on('dialog', async dialog => {
            await expect(dialog.message()).toBe('Key removed!');
            await dialog.dismiss();
        });

        // Validate the hash table no longer contains the entry
        const tableBody1 = await page.locator('#hashTable');
        await expect(tableBody).not.toContainText('removeKey');
        await expect(tableBody).not.toContainText('removeValue');
    });

    test('Remove a non-existing key', async ({ page }) => {
        // Attempt to remove a key that does not exist
        await page.fill('#key', 'nonExistentKey');
        await page.click('button[onclick="remove()"]');

        // Validate the alert shows the key not found message
        page.on('dialog', async dialog => {
            await expect(dialog.message()).toBe('Key not found!');
            await dialog.dismiss();
        });
    });

    test('Insert duplicate key updates the value', async ({ page }) => {
        // Insert a key-value pair
        await page.fill('#key', 'duplicateKey');
        await page.fill('#value', 'initialValue');
        await page.click('button[onclick="insert()"]');

        // Update the same key with a new value
        await page.fill('#key', 'duplicateKey');
        await page.fill('#value', 'updatedValue');
        await page.click('button[onclick="insert()"]');

        // Validate the hash table displays the updated entry
        const tableBody2 = await page.locator('#hashTable');
        await expect(tableBody).toContainText('duplicateKey');
        await expect(tableBody).toContainText('updatedValue');
    });
});