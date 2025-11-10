import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0002/html/7e7c7a60-bca8-11f0-a405-53d454efe32f.html';

test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
});

test.describe('Interactive Hash Table Application', () => {
    test('should initialize hash table UI in idle state', async ({ page }) => {
        const buckets = await page.$$('.bucket');
        expect(buckets.length).toBe(5); // Verify 5 buckets are created
    });

    test('should add an entry and transition to idle state', async ({ page }) => {
        await page.fill('#key', 'key1');
        await page.fill('#value', 'value1');
        await page.click('button:has-text("Add")');

        const alertText = await page.waitForEvent('dialog');
        expect(alertText.message()).toBe('key1 added.');
        await alertText.dismiss();

        const bucket = await page.locator('#bucket-1'); // Assuming hash('key1') % 5 = 1
        await expect(bucket).toHaveText(/value1/); // Verify value is added
    });

    test('should retrieve an entry and transition to idle state', async ({ page }) => {
        await page.fill('#key', 'key1');
        await page.click('button:has-text("Retrieve")');

        const alertText = await page.waitForEvent('dialog');
        expect(alertText.message()).toBe('value1');
        await alertText.dismiss();

        const bucket = await page.locator('#bucket-1');
        await expect(bucket).toHaveText(/value1/); // Verify value is still present
    });

    test('should handle entry not found during retrieval', async ({ page }) => {
        await page.fill('#key', 'nonexistentKey');
        await page.click('button:has-text("Retrieve")');

        const alertText = await page.waitForEvent('dialog');
        expect(alertText.message()).toBe('Entry not found.');
        await alertText.dismiss();
    });

    test('should delete an entry and transition to idle state', async ({ page }) => {
        await page.fill('#key', 'key1');
        await page.click('button:has-text("Delete")');

        const alertText = await page.waitForEvent('dialog');
        expect(alertText.message()).toBe('key1 deleted.');
        await alertText.dismiss();

        const bucket = await page.locator('#bucket-1');
        await expect(bucket).toHaveText(''); // Verify bucket is empty
    });

    test('should handle entry not found during deletion', async ({ page }) => {
        await page.fill('#key', 'nonexistentKey');
        await page.click('button:has-text("Delete")');

        const alertText = await page.waitForEvent('dialog');
        expect(alertText.message()).toBe('Entry not found.');
        await alertText.dismiss();
    });

    test('should handle adding multiple entries and verify state transitions', async ({ page }) => {
        await page.fill('#key', 'key2');
        await page.fill('#value', 'value2');
        await page.click('button:has-text("Add")');
        const alertText1 = await page.waitForEvent('dialog');
        expect(alertText1.message()).toBe('key2 added.');
        await alertText1.dismiss();

        await page.fill('#key', 'key3');
        await page.fill('#value', 'value3');
        await page.click('button:has-text("Add")');
        const alertText2 = await page.waitForEvent('dialog');
        expect(alertText2.message()).toBe('key3 added.');
        await alertText2.dismiss();

        const bucket2 = await page.locator('#bucket-2'); // Assuming hash('key2') % 5 = 2
        await expect(bucket2).toHaveText(/value2/); // Verify value2 is added

        const bucket3 = await page.locator('#bucket-3'); // Assuming hash('key3') % 5 = 3
        await expect(bucket3).toHaveText(/value3/); // Verify value3 is added
    });
});