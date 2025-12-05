import { test, expect } from '@playwright/test';

const url = 'http://127.0.0.1:5500/workspace/batch-test-1205-3/html/b8b5eb41-d1d3-11f0-9bcf-07cd16c51572.html';

test.describe('Hash Table Demonstration', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the hash table demonstration page before each test
        await page.goto(url);
    });

    test('should load the page and display initial state', async ({ page }) => {
        // Verify the page title
        await expect(page).toHaveTitle('Hash Table Demonstration');
        
        // Check that the hash table is empty initially
        const tableBody = await page.locator('#hashTableBody');
        const rows = await tableBody.locator('tr').count();
        expect(rows).toBe(0);
    });

    test('should add a key-value pair to the hash table', async ({ page }) => {
        // Input key and value
        await page.fill('#key', 'testKey');
        await page.fill('#value', 'testValue');
        
        // Click the add button
        await page.click('button');

        // Verify that the key-value pair is added to the table
        const tableBody = await page.locator('#hashTableBody');
        const rows = await tableBody.locator('tr');
        expect(await rows.count()).toBe(1);
        expect(await rows.nth(0).locator('td').nth(0).textContent()).toBe('testKey');
        expect(await rows.nth(0).locator('td').nth(1).textContent()).toBe('testValue');
    });

    test('should clear input fields after adding a key-value pair', async ({ page }) => {
        // Input key and value
        await page.fill('#key', 'anotherKey');
        await page.fill('#value', 'anotherValue');
        
        // Click the add button
        await page.click('button');

        // Verify that the input fields are cleared
        const keyInput = await page.locator('#key').inputValue();
        const valueInput = await page.locator('#value').inputValue();
        expect(keyInput).toBe('');
        expect(valueInput).toBe('');
    });

    test('should show an alert when trying to add an empty key or value', async ({ page }) => {
        // Attempt to add a key-value pair without a key
        await page.fill('#value', 'valueOnly');
        await page.click('button');

        // Verify that an alert is shown
        await page.waitForTimeout(500); // Wait for alert to appear
        const alertText = await page.evaluate(() => window.alert);
        expect(alertText).toBe('Please enter both key and value.');

        // Attempt to add a key-value pair without a value
        await page.fill('#key', 'keyOnly');
        await page.click('button');

        // Verify that an alert is shown
        await page.waitForTimeout(500); // Wait for alert to appear
        expect(alertText).toBe('Please enter both key and value.');
    });

    test('should correctly handle multiple key-value pairs', async ({ page }) => {
        // Add first key-value pair
        await page.fill('#key', 'key1');
        await page.fill('#value', 'value1');
        await page.click('button');

        // Add second key-value pair
        await page.fill('#key', 'key2');
        await page.fill('#value', 'value2');
        await page.click('button');

        // Verify that both key-value pairs are present in the table
        const tableBody = await page.locator('#hashTableBody');
        const rows = await tableBody.locator('tr');
        expect(await rows.count()).toBe(2);
        expect(await rows.nth(0).locator('td').nth(0).textContent()).toBe('key1');
        expect(await rows.nth(0).locator('td').nth(1).textContent()).toBe('value1');
        expect(await rows.nth(1).locator('td').nth(0).textContent()).toBe('key2');
        expect(await rows.nth(1).locator('td').nth(1).textContent()).toBe('value2');
    });
});