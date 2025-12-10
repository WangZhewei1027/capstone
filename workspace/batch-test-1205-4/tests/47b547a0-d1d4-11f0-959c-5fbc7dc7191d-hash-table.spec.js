import { test, expect } from '@playwright/test';

const url = 'http://127.0.0.1:5500/workspace/batch-test-1205-4/html/47b547a0-d1d4-11f0-959c-5fbc7dc7191d.html';

test.describe('Hash Table Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(url);
    });

    test('should load the page with default elements', async ({ page }) => {
        // Verify that the page title is correct
        await expect(page).toHaveTitle('Hash Table Demo');
        
        // Check if input fields and button are visible
        await expect(page.locator('#keyInput')).toBeVisible();
        await expect(page.locator('#valueInput')).toBeVisible();
        await expect(page.locator('button')).toHaveText('Add to Hash Table');
    });

    test('should add a key-value pair to the hash table', async ({ page }) => {
        // Input key and value
        await page.fill('#keyInput', 'key1');
        await page.fill('#valueInput', 'value1');
        
        // Click the button to add to hash table
        await page.click('button');

        // Verify that the hash table has been updated
        const tableBody = page.locator('#tableBody');
        await expect(tableBody).toContainText('0'); // Check hash index
        await expect(tableBody).toContainText('key1'); // Check key
        await expect(tableBody).toContainText('value1'); // Check value
    });

    test('should update the value for an existing key', async ({ page }) => {
        // Add initial key-value pair
        await page.fill('#keyInput', 'key1');
        await page.fill('#valueInput', 'value1');
        await page.click('button');

        // Update the value for the same key
        await page.fill('#keyInput', 'key1');
        await page.fill('#valueInput', 'value2');
        await page.click('button');

        // Verify that the hash table has been updated with the new value
        const tableBody = page.locator('#tableBody');
        await expect(tableBody).toContainText('0'); // Check hash index
        await expect(tableBody).toContainText('key1'); // Check key
        await expect(tableBody).toContainText('value2'); // Check updated value
    });

    test('should show alert when key or value is empty', async ({ page }) => {
        // Attempt to add an entry with empty key
        await page.fill('#keyInput', '');
        await page.fill('#valueInput', 'value1');
        await page.click('button');

        // Expect an alert to be shown
        await expect(page.locator('text=Both key and value must be provided.')).toBeVisible();

        // Attempt to add an entry with empty value
        await page.fill('#keyInput', 'key1');
        await page.fill('#valueInput', '');
        await page.click('button');

        // Expect an alert to be shown
        await expect(page.locator('text=Both key and value must be provided.')).toBeVisible();
    });

    test('should not allow duplicate keys', async ({ page }) => {
        // Add initial key-value pair
        await page.fill('#keyInput', 'key1');
        await page.fill('#valueInput', 'value1');
        await page.click('button');

        // Add the same key with a different value
        await page.fill('#keyInput', 'key1');
        await page.fill('#valueInput', 'value3');
        await page.click('button');

        // Verify that the hash table has been updated with the new value
        const tableBody = page.locator('#tableBody');
        await expect(tableBody).toContainText('0'); // Check hash index
        await expect(tableBody).toContainText('key1'); // Check key
        await expect(tableBody).toContainText('value3'); // Check updated value
    });

    test('should render the hash table correctly after multiple entries', async ({ page }) => {
        // Add multiple key-value pairs
        await page.fill('#keyInput', 'key1');
        await page.fill('#valueInput', 'value1');
        await page.click('button');

        await page.fill('#keyInput', 'key2');
        await page.fill('#valueInput', 'value2');
        await page.click('button');

        await page.fill('#keyInput', 'key3');
        await page.fill('#valueInput', 'value3');
        await page.click('button');

        // Verify that all entries are rendered correctly
        const tableBody = page.locator('#tableBody');
        await expect(tableBody).toContainText('0'); // Check hash index for key1
        await expect(tableBody).toContainText('key1');
        await expect(tableBody).toContainText('value1');

        await expect(tableBody).toContainText('1'); // Check hash index for key2
        await expect(tableBody).toContainText('key2');
        await expect(tableBody).toContainText('value2');

        await expect(tableBody).toContainText('2'); // Check hash index for key3
        await expect(tableBody).toContainText('key3');
        await expect(tableBody).toContainText('value3');
    });
});