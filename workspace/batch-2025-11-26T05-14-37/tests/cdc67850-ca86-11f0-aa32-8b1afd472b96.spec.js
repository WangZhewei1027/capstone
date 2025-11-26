import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-14-37/html/cdc67850-ca86-11f0-aa32-8b1afd472b96.html';

test.describe('Hash Map Example Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the Hash Map Example page before each test
        await page.goto(BASE_URL);
    });

    test('should display the title correctly', async ({ page }) => {
        // Validate that the title of the page is displayed correctly
        const title = await page.locator('h1').innerText();
        expect(title).toBe('Hash Map Example');
    });

    test('should initialize the map div', async ({ page }) => {
        // Check that the map div is present in the DOM
        const mapDiv = await page.locator('#map');
        await expect(mapDiv).toBeVisible();
    });

    test('should handle empty state correctly', async ({ page }) => {
        // Validate that the map is empty initially
        const mapDiv = await page.locator('#map');
        const content = await mapDiv.innerText();
        expect(content).toBe('');
    });

    test('should add a key-value pair', async ({ page }) => {
        // Simulate adding a key-value pair (assuming a function exists in hashMap.js)
        await page.evaluate(() => {
            // Assuming there's a function addKeyValue in hashMap.js
            window.addKeyValue('key1', 'value1');
        });

        const mapDiv = await page.locator('#map');
        const content = await mapDiv.innerText();
        expect(content).toContain('key1: value1');
    });

    test('should update a value for an existing key', async ({ page }) => {
        // Add initial key-value pair
        await page.evaluate(() => {
            window.addKeyValue('key1', 'value1');
        });

        // Update the value for the existing key
        await page.evaluate(() => {
            window.addKeyValue('key1', 'value2');
        });

        const mapDiv = await page.locator('#map');
        const content = await mapDiv.innerText();
        expect(content).toContain('key1: value2');
    });

    test('should handle non-existent key retrieval gracefully', async ({ page }) => {
        // Attempt to retrieve a non-existent key (assuming a function exists)
        const result = await page.evaluate(() => {
            return window.getValue('nonExistentKey'); // Assuming this function exists
        });

        expect(result).toBeUndefined(); // Expect undefined for non-existent key
    });

    test('should handle key deletion', async ({ page }) => {
        // Add a key-value pair
        await page.evaluate(() => {
            window.addKeyValue('key1', 'value1');
        });

        // Delete the key
        await page.evaluate(() => {
            window.deleteKey('key1'); // Assuming this function exists
        });

        const mapDiv = await page.locator('#map');
        const content = await mapDiv.innerText();
        expect(content).not.toContain('key1: value1');
    });

    test('should handle edge case of adding duplicate keys', async ({ page }) => {
        // Add a key-value pair
        await page.evaluate(() => {
            window.addKeyValue('key1', 'value1');
        });

        // Attempt to add the same key with a different value
        await page.evaluate(() => {
            window.addKeyValue('key1', 'value2'); // Assuming this function handles duplicates
        });

        const mapDiv = await page.locator('#map');
        const content = await mapDiv.innerText();
        expect(content).toContain('key1: value2'); // Expect the last value to be retained
    });

    test('should show error on invalid input', async ({ page }) => {
        // Simulate adding a key-value pair with invalid input (assuming error handling exists)
        const result = await page.evaluate(() => {
            return window.addKeyValue('', ''); // Assuming this should trigger an error
        });

        expect(result).toBe('Error: Invalid key or value'); // Expect an error message
    });
});