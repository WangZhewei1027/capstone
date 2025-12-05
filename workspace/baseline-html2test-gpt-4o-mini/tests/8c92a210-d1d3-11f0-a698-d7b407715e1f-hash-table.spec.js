import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/8c92a210-d1d3-11f0-a698-d7b407715e1f.html';

test.describe('Hash Table Demonstration', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the hash table demonstration page before each test
        await page.goto(BASE_URL);
    });

    test('should load the page and display default state', async ({ page }) => {
        // Verify the page title
        await expect(page).toHaveTitle('Hash Table Demonstration');
        
        // Check that the initial table state is correct
        const tableBody = await page.locator('#tableBody');
        await expect(tableBody).toContainText('No entries yet');
    });

    test('should add a key-value pair to the hash table', async ({ page }) => {
        // Input key and value
        await page.fill('#key', 'testKey');
        await page.fill('#value', 'testValue');
        
        // Click the add button
        await page.click('#addButton');
        
        // Verify that the table updates with the new entry
        const tableBody = await page.locator('#tableBody');
        await expect(tableBody).toContainText('testKey');
        await expect(tableBody).toContainText('testValue');
    });

    test('should show an alert when key or value is missing', async ({ page }) => {
        // Click the add button without filling inputs
        await page.click('#addButton');
        
        // Verify that an alert is shown
        const [alert] = await Promise.all([
            page.waitForEvent('dialog'),
            page.click('#addButton'),
        ]);
        expect(alert.message()).toBe('Please enter both key and value.');
        await alert.dismiss();
    });

    test('should update the value of an existing key', async ({ page }) => {
        // Add initial key-value pair
        await page.fill('#key', 'updateKey');
        await page.fill('#value', 'initialValue');
        await page.click('#addButton');

        // Update the value for the existing key
        await page.fill('#key', 'updateKey');
        await page.fill('#value', 'updatedValue');
        await page.click('#addButton');

        // Verify that the table updates with the new value
        const tableBody = await page.locator('#tableBody');
        await expect(tableBody).toContainText('updatedValue');
        await expect(tableBody).not.toContainText('initialValue');
    });

    test('should handle multiple entries in the hash table', async ({ page }) => {
        // Add multiple key-value pairs
        await page.fill('#key', 'key1');
        await page.fill('#value', 'value1');
        await page.click('#addButton');

        await page.fill('#key', 'key2');
        await page.fill('#value', 'value2');
        await page.click('#addButton');

        // Verify that both entries are present in the table
        const tableBody = await page.locator('#tableBody');
        await expect(tableBody).toContainText('key1');
        await expect(tableBody).toContainText('value1');
        await expect(tableBody).toContainText('key2');
        await expect(tableBody).toContainText('value2');
    });

    test('should display no entries message when all entries are removed', async ({ page }) => {
        // Add a key-value pair
        await page.fill('#key', 'removeKey');
        await page.fill('#value', 'removeValue');
        await page.click('#addButton');

        // Remove the entry by adding the same key with an empty value
        await page.fill('#key', 'removeKey');
        await page.fill('#value', '');
        await page.click('#addButton');

        // Verify that the table shows no entries
        const tableBody = await page.locator('#tableBody');
        await expect(tableBody).toContainText('No entries yet');
    });
});