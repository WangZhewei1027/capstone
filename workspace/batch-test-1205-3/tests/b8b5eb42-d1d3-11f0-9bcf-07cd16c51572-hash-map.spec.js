import { test, expect } from '@playwright/test';

const url = 'http://127.0.0.1:5500/workspace/batch-test-1205-3/html/b8b5eb42-d1d3-11f0-9bcf-07cd16c51572.html';

test.describe('Hash Map Demonstration Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application page before each test
        await page.goto(url);
    });

    test('should load the page and display the title', async ({ page }) => {
        // Verify that the page loads correctly and the title is displayed
        const title = await page.title();
        expect(title).toBe('Hash Map Demonstration');
    });

    test('should add a key-value pair and display the output', async ({ page }) => {
        // Test adding a key-value pair
        await page.fill('#keyInput', 'testKey');
        await page.fill('#valueInput', 'testValue');
        await page.click('button:has-text("Add")');

        // Verify the output message
        const output = await page.textContent('#output');
        expect(output).toBe('Added: testKey -> testValue');
    });

    test('should retrieve a value by key and display the output', async ({ page }) => {
        // First, add a key-value pair
        await page.fill('#keyInput', 'testKey');
        await page.fill('#valueInput', 'testValue');
        await page.click('button:has-text("Add")');

        // Now, retrieve the value by key
        await page.fill('#getKeyInput', 'testKey');
        await page.click('button:has-text("Get Value")');

        // Verify the output message
        const output = await page.textContent('#output');
        expect(output).toBe('Value for testKey: testValue');
    });

    test('should show an error message when retrieving a non-existent key', async ({ page }) => {
        // Attempt to retrieve a value for a non-existent key
        await page.fill('#getKeyInput', 'nonExistentKey');
        await page.click('button:has-text("Get Value")');

        // Verify the output message
        const output = await page.textContent('#output');
        expect(output).toBe('Key nonExistentKey not found.');
    });

    test('should delete a key-value pair and display the output', async ({ page }) => {
        // First, add a key-value pair
        await page.fill('#keyInput', 'testKey');
        await page.fill('#valueInput', 'testValue');
        await page.click('button:has-text("Add")');

        // Now, delete the key-value pair
        await page.fill('#deleteKeyInput', 'testKey');
        await page.click('button:has-text("Delete")');

        // Verify the output message
        const output = await page.textContent('#output');
        expect(output).toBe('Deleted key: testKey');
    });

    test('should show an error message when deleting a non-existent key', async ({ page }) => {
        // Attempt to delete a non-existent key
        await page.fill('#deleteKeyInput', 'nonExistentKey');
        await page.click('button:has-text("Delete")');

        // Verify the output message
        const output = await page.textContent('#output');
        expect(output).toBe('Key nonExistentKey not found.');
    });

    test('should alert when trying to add a key-value pair with empty fields', async ({ page }) => {
        // Attempt to add a key-value pair with empty fields
        await page.click('button:has-text("Add")');

        // Check for alert
        page.on('dialog', async dialog => {
            expect(dialog.message()).toBe('Both key and value are required!');
            await dialog.dismiss();
        });
    });
});