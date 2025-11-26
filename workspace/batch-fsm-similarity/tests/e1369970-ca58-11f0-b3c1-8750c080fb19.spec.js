import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-25T23-45-53/html/e1369970-ca58-11f0-b3c1-8750c080fb19.html';

test.describe('Hash Table Demonstration Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should start in Idle state', async ({ page }) => {
        // Verify that input fields are enabled and buttons are clickable
        const keyInput = await page.locator('#key');
        const valueInput = await page.locator('#value');
        const addButton = await page.locator('button:has-text("Add to Hash Table")');
        const searchButton = await page.locator('button:has-text("Search in Hash Table")');

        await expect(keyInput).toBeEnabled();
        await expect(valueInput).toBeEnabled();
        await expect(addButton).toBeEnabled();
        await expect(searchButton).toBeEnabled();
    });

    test('should add an entry to the hash table', async ({ page }) => {
        // Fill in the key and value, then click the add button
        await page.fill('#key', 'testKey');
        await page.fill('#value', 'testValue');
        await page.click('button:has-text("Add to Hash Table")');

        // Verify that the entry is added to the table
        const tableBody = await page.locator('#tableBody');
        await expect(tableBody).toContainText('testKey');
        await expect(tableBody).toContainText('testValue');
    });

    test('should search for an existing entry', async ({ page }) => {
        // Add an entry first
        await page.fill('#key', 'searchKey');
        await page.fill('#value', 'searchValue');
        await page.click('button:has-text("Add to Hash Table")');

        // Now search for the entry
        await page.fill('#key', 'searchKey');
        await page.click('button:has-text("Search in Hash Table")');

        // Verify that the correct alert is shown
        await page.waitForTimeout(500); // Wait for alert to show
        const alertText = await page.evaluate(() => window.alert);
        expect(alertText).toContain('Value for "searchKey": searchValue');
    });

    test('should show an error alert for a non-existing entry', async ({ page }) => {
        // Attempt to search for a non-existing key
        await page.fill('#key', 'nonExistingKey');
        await page.click('button:has-text("Search in Hash Table")');

        // Verify that the correct alert is shown
        await page.waitForTimeout(500); // Wait for alert to show
        const alertText = await page.evaluate(() => window.alert);
        expect(alertText).toContain('Key "nonExistingKey" not found.');
    });

    test('should clear inputs after adding an entry', async ({ page }) => {
        // Fill in the key and value, then click the add button
        await page.fill('#key', 'clearKey');
        await page.fill('#value', 'clearValue');
        await page.click('button:has-text("Add to Hash Table")');

        // Verify that the inputs are cleared
        const keyValue = await page.inputValue('#key');
        const valueValue = await page.inputValue('#value');
        expect(keyValue).toBe('');
        expect(valueValue).toBe('');
    });

    test('should display the hash table contents correctly', async ({ page }) => {
        // Add multiple entries
        await page.fill('#key', 'key1');
        await page.fill('#value', 'value1');
        await page.click('button:has-text("Add to Hash Table")');

        await page.fill('#key', 'key2');
        await page.fill('#value', 'value2');
        await page.click('button:has-text("Add to Hash Table")');

        // Verify that both entries are displayed
        const tableBody = await page.locator('#tableBody');
        await expect(tableBody).toContainText('key1');
        await expect(tableBody).toContainText('value1');
        await expect(tableBody).toContainText('key2');
        await expect(tableBody).toContainText('value2');
    });
});