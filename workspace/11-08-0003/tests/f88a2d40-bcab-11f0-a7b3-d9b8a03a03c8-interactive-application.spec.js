import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/f88a2d40-bcab-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Hash Map Explorer Application', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test.describe('Idle State Tests', () => {
        test('should display initial state with empty hashmap', async ({ page }) => {
            const hashmapContent = await page.locator('#hashmap').innerText();
            expect(hashmapContent).toBe('');
        });

        test('should show alert when adding without key or value', async ({ page }) => {
            await page.click('#add');
            const alertText = await page.evaluate(() => window.alert);
            expect(alertText).toBe('Please enter both Key and Value');
        });
    });

    test.describe('Adding Key-Value Pairs', () => {
        test('should add a new key-value pair successfully', async ({ page }) => {
            await page.fill('#key', 'testKey');
            await page.fill('#value', 'testValue');
            await page.click('#add');

            const hashmapContent1 = await page.locator('#hashmap').innerText();
            expect(hashmapContent).toContain('testKey: testValue');
        });

        test('should handle key collision correctly', async ({ page }) => {
            await page.fill('#key', 'collisionKey');
            await page.fill('#value', 'firstValue');
            await page.click('#add');

            await page.fill('#key', 'collisionKey');
            await page.fill('#value', 'secondValue');
            await page.click('#add');

            const hashmapContent2 = await page.locator('#hashmap').innerText();
            expect(hashmapContent).toContain('collisionKey: Collision: firstValue -> secondValue');
        });
    });

    test.describe('Retrieving Key-Value Pairs', () => {
        test('should retrieve an existing key successfully', async ({ page }) => {
            await page.fill('#key', 'retrieveKey');
            await page.fill('#value', 'retrieveValue');
            await page.click('#add');

            await page.fill('#retrieveKey', 'retrieveKey');
            await page.click('#retrieve');

            const highlightedPair = await page.locator('.highlight').innerText();
            expect(highlightedPair).toContain('retrieveKey: retrieveValue');
        });

        test('should show alert when retrieving a non-existing key', async ({ page }) => {
            await page.fill('#retrieveKey', 'nonExistingKey');
            await page.click('#retrieve');

            const alertText1 = await page.evaluate(() => window.alert);
            expect(alertText).toBe('Key not found');
        });
    });

    test.describe('Removing Key-Value Pairs', () => {
        test('should remove an existing key successfully', async ({ page }) => {
            await page.fill('#key', 'removeKey');
            await page.fill('#value', 'removeValue');
            await page.click('#add');

            await page.fill('#removeKey', 'removeKey');
            await page.click('#remove');

            const hashmapContent3 = await page.locator('#hashmap').innerText();
            expect(hashmapContent).not.toContain('removeKey: removeValue');
        });

        test('should show alert when removing a non-existing key', async ({ page }) => {
            await page.fill('#removeKey', 'nonExistingKey');
            await page.click('#remove');

            const alertText2 = await page.evaluate(() => window.alert);
            expect(alertText).toBe('Key not found');
        });
    });

    test.describe('Edge Cases', () => {
        test('should not allow adding empty key', async ({ page }) => {
            await page.fill('#value', 'valueWithoutKey');
            await page.click('#add');

            const alertText3 = await page.evaluate(() => window.alert);
            expect(alertText).toBe('Please enter both Key and Value');
        });

        test('should not allow adding empty value', async ({ page }) => {
            await page.fill('#key', 'keyWithoutValue');
            await page.click('#add');

            const alertText4 = await page.evaluate(() => window.alert);
            expect(alertText).toBe('Please enter both Key and Value');
        });
    });
});