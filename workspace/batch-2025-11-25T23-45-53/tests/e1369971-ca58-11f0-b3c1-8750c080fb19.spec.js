import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-25T23-45-53/html/e1369971-ca58-11f0-b3c1-8750c080fb19.html';

test.describe('Hash Map Demonstration Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('Initial state should be Idle', async ({ page }) => {
        const output = await page.locator('#output').innerText();
        expect(output).toBe('');
    });

    test('Store value successfully', async ({ page }) => {
        await page.fill('#key', 'testKey');
        await page.fill('#value', 'testValue');
        await page.click('#storeButton');

        const output = await page.locator('#output').innerText();
        expect(output).toContain('Stored: { testKey: testValue }');
    });

    test('Store value with empty key or value', async ({ page }) => {
        await page.fill('#key', '');
        await page.fill('#value', 'testValue');
        await page.click('#storeButton');

        const output = await page.locator('#output').innerText();
        expect(output).toContain('Please enter both a key and a value.');
    });

    test('Get value successfully', async ({ page }) => {
        await page.fill('#key', 'testKey');
        await page.fill('#value', 'testValue');
        await page.click('#storeButton');
        await page.fill('#key', 'testKey');
        await page.click('#getButton');

        const output = await page.locator('#output').innerText();
        expect(output).toContain('Value for key "testKey": testValue');
    });

    test('Get value for non-existing key', async ({ page }) => {
        await page.fill('#key', 'nonExistingKey');
        await page.click('#getButton');

        const output = await page.locator('#output').innerText();
        expect(output).toContain('Key "nonExistingKey" does not exist.');
    });

    test('Clear hash map', async ({ page }) => {
        await page.fill('#key', 'testKey');
        await page.fill('#value', 'testValue');
        await page.click('#storeButton');
        await page.click('#clearButton');

        const output = await page.locator('#output').innerText();
        expect(output).toContain('Hash Map cleared.');
    });

    test('Attempt to store value after clearing', async ({ page }) => {
        await page.fill('#key', 'testKey');
        await page.fill('#value', 'testValue');
        await page.click('#storeButton');
        await page.click('#clearButton');
        await page.fill('#key', 'testKey');
        await page.fill('#value', 'testValue');
        await page.click('#storeButton');

        const output = await page.locator('#output').innerText();
        expect(output).toContain('Stored: { testKey: testValue }');
    });

    test('Error message on storing empty key', async ({ page }) => {
        await page.fill('#key', '');
        await page.fill('#value', 'testValue');
        await page.click('#storeButton');

        const output = await page.locator('#output').innerText();
        expect(output).toContain('Please enter both a key and a value.');
    });

    test('Error message on getting non-existing key', async ({ page }) => {
        await page.fill('#key', 'nonExistingKey');
        await page.click('#getButton');

        const output = await page.locator('#output').innerText();
        expect(output).toContain('Key "nonExistingKey" does not exist.');
    });
});