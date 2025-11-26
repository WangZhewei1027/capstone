import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-40-02/html/5abd2c11-ca8a-11f0-8532-d714b1159c0d.html';

test.describe('Interactive Set Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should initialize with default values', async ({ page }) => {
        // Verify that the input fields have default values
        const set1Value = await page.locator('#set1').inputValue();
        const set2Value = await page.locator('#set2').inputValue();
        const set3Value = await page.locator('#set3').inputValue();

        expect(set1Value).toBe('10');
        expect(set2Value).toBe('20');
        expect(set3Value).toBe('30');
    });

    test('should add a number to the set', async ({ page }) => {
        // Input a number and click add
        await page.fill('#set1', '15');
        await page.click('#add');

        // Verify that the input field is cleared
        const set1Value = await page.locator('#set1').inputValue();
        expect(set1Value).toBe('');

        // Verify that the number was added to the set
        const sets = await page.evaluate(() => window.sets);
        expect(sets).toContain(15);
    });

    test('should remove a number from the set', async ({ page }) => {
        // Add a number first
        await page.fill('#set1', '25');
        await page.click('#add');

        // Now remove the number
        await page.fill('#set1', '25');
        await page.click('#remove');

        // Verify that the input field is cleared
        const set1Value = await page.locator('#set1').inputValue();
        expect(set1Value).toBe('');

        // Verify that the number was removed from the set
        const sets = await page.evaluate(() => window.sets);
        expect(sets).not.toContain(25);
    });

    test('should not remove a number that is not in the set', async ({ page }) => {
        // Attempt to remove a number that was never added
        await page.fill('#set1', '99');
        await page.click('#remove');

        // Verify that the input field is cleared
        const set1Value = await page.locator('#set1').inputValue();
        expect(set1Value).toBe('');

        // Verify that the set remains empty
        const sets = await page.evaluate(() => window.sets);
        expect(sets).toEqual([]);
    });

    test('should handle edge cases for adding numbers', async ({ page }) => {
        // Add a number, then try adding an empty value
        await page.fill('#set1', '30');
        await page.click('#add');
        await page.fill('#set1', '');
        await page.click('#add');

        // Verify that the input field is cleared
        const set1Value = await page.locator('#set1').inputValue();
        expect(set1Value).toBe('');

        // Verify that the only number added was 30
        const sets = await page.evaluate(() => window.sets);
        expect(sets).toContain(30);
        expect(sets).toHaveLength(1);
    });

    test('should handle edge cases for removing numbers', async ({ page }) => {
        // Add a number first
        await page.fill('#set1', '40');
        await page.click('#add');

        // Now remove an empty value
        await page.fill('#set1', '');
        await page.click('#remove');

        // Verify that the input field is cleared
        const set1Value = await page.locator('#set1').inputValue();
        expect(set1Value).toBe('');

        // Verify that the number is still in the set
        const sets = await page.evaluate(() => window.sets);
        expect(sets).toContain(40);
    });

    test.afterEach(async ({ page }) => {
        // Reset the sets array after each test
        await page.evaluate(() => {
            window.sets = [];
        });
    });
});