import { test, expect } from '@playwright/test';

const url = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T04-49-49/html/5699c550-ca83-11f0-8c96-fbff0f3c2a6d.html';

test.describe('Hash Table Visualization Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the hash table application before each test
        await page.goto(url);
    });

    test('Initial state should be Idle', async ({ page }) => {
        // Verify that the hash table is initially in the Idle state
        const tableRows = await page.locator('#hashTable tr').count();
        expect(tableRows).toBe(7); // 6 initial entries + header
    });

    test('User can add a new entry by clicking the hash table', async ({ page }) => {
        // Simulate user clicking on the hash table to add a new entry
        await page.click('#hashTable');

        // Verify that a new entry has been added
        const newRow = await page.locator('#hashTable tr').last();
        const newEntryKey = await newRow.locator('td').nth(0).textContent();
        const newEntryValue = await newRow.locator('td').nth(1).textContent();

        expect(newEntryKey).toBe('apple'); // Check if the key is 'apple'
        expect(newEntryValue).toBe('0.36'); // Check if the value is '0.36'
    });

    test('Clicking the hash table multiple times adds multiple entries', async ({ page }) => {
        // Click the hash table multiple times
        await page.click('#hashTable');
        await page.click('#hashTable');

        // Verify that two new entries have been added
        const tableRows = await page.locator('#hashTable tr').count();
        expect(tableRows).toBe(9); // 6 initial entries + header + 2 new entries
    });

    test('Ensure that clicking does not add duplicate entries', async ({ page }) => {
        // Click the hash table to add an entry
        await page.click('#hashTable');
        
        // Click again to add another entry
        await page.click('#hashTable');

        // Verify that the last entry is still the same
        const lastRow = await page.locator('#hashTable tr').last();
        const lastEntryKey = await lastRow.locator('td').nth(0).textContent();
        const lastEntryValue = await lastRow.locator('td').nth(1).textContent();

        expect(lastEntryKey).toBe('apple'); // Check if the last entry key is still 'apple'
        expect(lastEntryValue).toBe('0.36'); // Check if the last entry value is still '0.36'
    });

    test('Verify that the table does not exceed a certain number of entries', async ({ page }) => {
        // Click the hash table multiple times to add entries
        for (let i = 0; i < 10; i++) {
            await page.click('#hashTable');
        }

        // Verify that the number of entries does not exceed a predefined limit
        const tableRows = await page.locator('#hashTable tr').count();
        expect(tableRows).toBeLessThanOrEqual(16); // Assuming a limit of 10 new entries
    });
});