import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-35-35/html/bba490a0-ca89-11f0-800e-fdebe921fc5f.html';

test.describe('Hash Table Interactive Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application before each test
        await page.goto(BASE_URL);
    });

    test('should display the initial page with title', async ({ page }) => {
        // Validate that the initial page renders correctly
        const title = await page.locator('h1').textContent();
        expect(title).toBe('Hash Table Example');
    });

    test('should add a key-value pair to the hash table', async ({ page }) => {
        // Input key and value
        await page.fill('#key', 'testKey');
        await page.fill('#value', 'testValue');

        // Click the Add button
        await page.click('#add-btn');

        // Validate that the key-value pair is added to the hash table display
        const tableRow = await page.locator('#hash-table tr').last();
        const cells = await tableRow.locator('td').allTextContents();
        expect(cells).toEqual(['testKey', 'testValue']);
    });

    test('should not add duplicate keys to the hash table', async ({ page }) => {
        // Input the same key and value
        await page.fill('#key', 'duplicateKey');
        await page.fill('#value', 'value1');
        await page.click('#add-btn');

        // Add the same key with a different value
        await page.fill('#value', 'value2');
        await page.click('#add-btn');

        // Validate that the hash table still has only one entry for the key
        const tableRows = await page.locator('#hash-table tr');
        expect(await tableRows.count()).toBe(1);
        const cells = await tableRows.first().locator('td').allTextContents();
        expect(cells).toEqual(['duplicateKey', 'value2']);
    });

    test('should display multiple key-value pairs correctly', async ({ page }) => {
        // Add multiple key-value pairs
        await page.fill('#key', 'key1');
        await page.fill('#value', 'value1');
        await page.click('#add-btn');

        await page.fill('#key', 'key2');
        await page.fill('#value', 'value2');
        await page.click('#add-btn');

        // Validate that both entries are displayed
        const tableRows = await page.locator('#hash-table tr');
        expect(await tableRows.count()).toBe(2);
        
        const firstRowCells = await tableRows.nth(0).locator('td').allTextContents();
        expect(firstRowCells).toEqual(['key1', 'value1']);

        const secondRowCells = await tableRows.nth(1).locator('td').allTextContents();
        expect(secondRowCells).toEqual(['key2', 'value2']);
    });

    test('should not add empty key or value', async ({ page }) => {
        // Attempt to add an entry with an empty key
        await page.fill('#key', '');
        await page.fill('#value', 'valueWithNoKey');
        await page.click('#add-btn');

        // Validate that no entry is added
        const tableRows = await page.locator('#hash-table tr');
        expect(await tableRows.count()).toBe(0);

        // Attempt to add an entry with an empty value
        await page.fill('#key', 'keyWithNoValue');
        await page.fill('#value', '');
        await page.click('#add-btn');

        // Validate that no entry is added
        expect(await tableRows.count()).toBe(0);
    });

    test('should handle multiple entries correctly', async ({ page }) => {
        // Add multiple entries
        await page.fill('#key', 'key1');
        await page.fill('#value', 'value1');
        await page.click('#add-btn');

        await page.fill('#key', 'key2');
        await page.fill('#value', 'value2');
        await page.click('#add-btn');

        await page.fill('#key', 'key3');
        await page.fill('#value', 'value3');
        await page.click('#add-btn');

        // Validate that all entries are displayed correctly
        const tableRows = await page.locator('#hash-table tr');
        expect(await tableRows.count()).toBe(3);

        const expectedValues = [
            ['key1', 'value1'],
            ['key2', 'value2'],
            ['key3', 'value3']
        ];

        for (let i = 0; i < expectedValues.length; i++) {
            const cells = await tableRows.nth(i).locator('td').allTextContents();
            expect(cells).toEqual(expectedValues[i]);
        }
    });
});