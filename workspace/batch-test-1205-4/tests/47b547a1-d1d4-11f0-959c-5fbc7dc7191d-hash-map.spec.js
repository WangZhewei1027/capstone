import { test, expect } from '@playwright/test';

const url = 'http://127.0.0.1:5500/workspace/batch-test-1205-4/html/47b547a1-d1d4-11f0-959c-5fbc7dc7191d.html';

test.describe('Hash Map Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(url);
    });

    test('should load the page and display initial content', async ({ page }) => {
        const title = await page.title();
        expect(title).toBe('Hash Map Example');
        const output = await page.locator('#output').innerText();
        expect(output).toBe('');
    });

    test('should add a key-value pair to the HashMap', async ({ page }) => {
        await page.fill('#key', 'testKey');
        await page.fill('#value', 'testValue');
        await page.click('button:has-text("Add to HashMap")');
        
        const output = await page.locator('#output').innerText();
        expect(output).toBe('Added: {testKey: testValue} to HashMap');
    });

    test('should retrieve a value from the HashMap', async ({ page }) => {
        await page.fill('#key', 'testKey');
        await page.fill('#value', 'testValue');
        await page.click('button:has-text("Add to HashMap")');
        
        await page.fill('#key', 'testKey');
        await page.click('button:has-text("Get Value")');
        
        const output = await page.locator('#output').innerText();
        expect(output).toBe('Value: testValue');
    });

    test('should return "Key not found" for non-existent key', async ({ page }) => {
        await page.fill('#key', 'nonExistentKey');
        await page.click('button:has-text("Get Value")');
        
        const output = await page.locator('#output').innerText();
        expect(output).toBe('Value: Key not found');
    });

    test('should remove a key-value pair from the HashMap', async ({ page }) => {
        await page.fill('#key', 'testKey');
        await page.fill('#value', 'testValue');
        await page.click('button:has-text("Add to HashMap")');
        
        await page.fill('#key', 'testKey');
        await page.click('button:has-text("Remove from HashMap")');
        
        const output = await page.locator('#output').innerText();
        expect(output).toBe('testKey has been removed.');
    });

    test('should return "Key not found" when removing a non-existent key', async ({ page }) => {
        await page.fill('#key', 'nonExistentKey');
        await page.click('button:has-text("Remove from HashMap")');
        
        const output = await page.locator('#output').innerText();
        expect(output).toBe('Key not found');
    });

    test('should show all key-value pairs in the HashMap', async ({ page }) => {
        await page.fill('#key', 'key1');
        await page.fill('#value', 'value1');
        await page.click('button:has-text("Add to HashMap")');
        
        await page.fill('#key', 'key2');
        await page.fill('#value', 'value2');
        await page.click('button:has-text("Add to HashMap")');
        
        await page.click('button:has-text("Show HashMap")');
        
        const output = await page.locator('#output').innerText();
        expect(output).toBe('key1: value1, key2: value2');
    });

    test('should show "HashMap is empty" when no pairs are added', async ({ page }) => {
        await page.click('button:has-text("Show HashMap")');
        
        const output = await page.locator('#output').innerText();
        expect(output).toBe('HashMap is empty');
    });

    test('should handle empty input for adding key-value pairs', async ({ page }) => {
        await page.fill('#key', '');
        await page.fill('#value', '');
        await page.click('button:has-text("Add to HashMap")');
        
        const output = await page.locator('#output').innerText();
        expect(output).toBe('Added: {: } to HashMap');
    });
});