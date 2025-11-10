import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0001/html/d9287830-bca1-11f0-9c8f-15ad551aaf30.html';

test.describe('Hash Table Exploration Application', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application before each test
        await page.goto(BASE_URL);
    });

    test('initial state should render empty hash table', async ({ page }) => {
        // Verify that the hash table is rendered with empty buckets
        const buckets = await page.locator('.bucket');
        expect(await buckets.count()).toBe(5);
        for (let i = 0; i < 5; i++) {
            expect(await buckets.nth(i).innerText()).toBe('Empty');
        }
    });

    test('should transition to addingKey state on ADD_KEY event', async ({ page }) => {
        // Simulate adding a key
        await page.fill('#inputKey', '1');
        await page.click('#addButton');

        // Verify that the buckets are still displayed (onExit of idle state)
        const buckets = await page.locator('.bucket');
        expect(await buckets.count()).toBe(5);
    });

    test('should add a key and transition back to idle state', async ({ page }) => {
        // Add a key and verify the state transition
        await page.fill('#inputKey', '1');
        await page.click('#addButton');

        // Verify the key was added to the hash table
        const buckets = await page.locator('.bucket');
        expect(await buckets.nth(1).innerText()).toBe('1'); // Assuming hash(1) % 5 = 1
    });

    test('should alert when hash table is full', async ({ page }) => {
        // Fill the hash table to its limit
        for (let i = 0; i < 5; i++) {
            await page.fill('#inputKey', i.toString());
            await page.click('#addButton');
        }

        // Try to add one more key and expect an alert
        await page.fill('#inputKey', '5');
        const [alert] = await Promise.all([
            page.waitForEvent('dialog'),
            page.click('#addButton'),
        ]);

        expect(alert.message()).toContain('Hash table is full');
        await alert.dismiss();

        // Verify that the state is still idle and the last bucket remains empty
        const buckets = await page.locator('.bucket');
        expect(await buckets.nth(4).innerText()).toBe('Empty');
    });

    test('should handle edge case of adding duplicate keys', async ({ page }) => {
        // Add a key
        await page.fill('#inputKey', '2');
        await page.click('#addButton');

        // Try to add the same key again
        await page.fill('#inputKey', '2');
        await page.click('#addButton');

        // Verify that the key remains in the hash table
        const buckets = await page.locator('.bucket');
        expect(await buckets.nth(2).innerText()).toBe('2'); // Assuming hash(2) % 5 = 2
    });

    test('should render buckets correctly after adding keys', async ({ page }) => {
        // Add multiple keys
        await page.fill('#inputKey', '0');
        await page.click('#addButton');

        await page.fill('#inputKey', '1');
        await page.click('#addButton');

        await page.fill('#inputKey', '2');
        await page.click('#addButton');

        // Verify the buckets are correctly occupied
        const buckets = await page.locator('.bucket');
        expect(await buckets.nth(0).innerText()).toBe('0'); // hash(0) % 5 = 0
        expect(await buckets.nth(1).innerText()).toBe('1'); // hash(1) % 5 = 1
        expect(await buckets.nth(2).innerText()).toBe('2'); // hash(2) % 5 = 2
    });
});