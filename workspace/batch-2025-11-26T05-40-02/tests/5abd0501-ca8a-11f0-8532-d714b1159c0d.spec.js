import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-40-02/html/5abd0501-ca8a-11f0-8532-d714b1159c0d.html';

test.describe('Hash Table Demo Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the Hash Table Demo application
        await page.goto(BASE_URL);
    });

    test('should display the initial state with empty hash table', async ({ page }) => {
        // Validate that the hash table is initially empty
        const hashTableContent = await page.locator('#hashTable').innerText();
        expect(hashTableContent).toBe('');
    });

    test('should add a new key-value pair to the hash table', async ({ page }) => {
        // Fill in the key and value fields
        await page.fill('#key', 'testKey');
        await page.fill('#value', '10');
        
        // Submit the form
        await page.click('button[type="submit"]');

        // Validate that the hash table displays the new key-value pair
        const hashTableContent = await page.locator('#hashTable').innerText();
        expect(hashTableContent).toContain('"testKey": 10');
    });

    test('should update the value of an existing key in the hash table', async ({ page }) => {
        // Add the initial key-value pair
        await page.fill('#key', 'testKey');
        await page.fill('#value', '10');
        await page.click('button[type="submit"]');

        // Update the value for the same key
        await page.fill('#value', '5');
        await page.click('button[type="submit"]');

        // Validate that the hash table reflects the updated value
        const hashTableContent = await page.locator('#hashTable').innerText();
        expect(hashTableContent).toContain('"testKey": 15');
    });

    test('should handle empty key submission gracefully', async ({ page }) => {
        // Attempt to submit an empty key
        await page.fill('#key', '');
        await page.fill('#value', '10');
        await page.click('button[type="submit"]');

        // Validate that the hash table remains unchanged
        const hashTableContent = await page.locator('#hashTable').innerText();
        expect(hashTableContent).toBe('');
    });

    test('should handle non-numeric value submission gracefully', async ({ page }) => {
        // Attempt to submit a non-numeric value
        await page.fill('#key', 'testKey');
        await page.fill('#value', 'non-numeric');
        await page.click('button[type="submit"]');

        // Validate that the hash table does not update
        const hashTableContent = await page.locator('#hashTable').innerText();
        expect(hashTableContent).toContain('"testKey": 0'); // Assuming non-numeric is treated as 0
    });

    test('should not update hash table on duplicate key submission without value change', async ({ page }) => {
        // Add the initial key-value pair
        await page.fill('#key', 'duplicateKey');
        await page.fill('#value', '20');
        await page.click('button[type="submit"]');

        // Attempt to submit the same key with the same value
        await page.fill('#key', 'duplicateKey');
        await page.fill('#value', '20');
        await page.click('button[type="submit"]');

        // Validate that the hash table still shows the original value
        const hashTableContent = await page.locator('#hashTable').innerText();
        expect(hashTableContent).toContain('"duplicateKey": 20');
    });
});