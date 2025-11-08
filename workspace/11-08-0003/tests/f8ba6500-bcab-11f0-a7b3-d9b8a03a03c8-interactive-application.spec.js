import { test, expect } from '@playwright/test';

const baseURL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/f8ba6500-bcab-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Interactive Application - Array Manipulation', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(baseURL);
    });

    test('Initial state should be idle', async ({ page }) => {
        const inputValue = await page.locator('#inputValue').inputValue();
        expect(inputValue).toBe('');
        const arrayDisplay = await page.locator('#arrayDisplay').innerHTML();
        expect(arrayDisplay).toBe('');
    });

    test('Adding a value to the array', async ({ page }) => {
        await page.fill('#inputValue', 'Test Value');
        await page.click('button:has-text("Add to Array")');

        const arrayDisplay1 = await page.locator('#arrayDisplay1').innerHTML();
        expect(arrayDisplay).toContain('Test Value');
    });

    test('Removing the last element from the array', async ({ page }) => {
        await page.fill('#inputValue', 'First Value');
        await page.click('button:has-text("Add to Array")');
        await page.fill('#inputValue', 'Second Value');
        await page.click('button:has-text("Add to Array")');

        await page.click('button:has-text("Remove Last Element")');

        const arrayDisplay2 = await page.locator('#arrayDisplay2').innerHTML();
        expect(arrayDisplay).not.toContain('Second Value');
        expect(arrayDisplay).toContain('First Value');
    });

    test('Displaying the array', async ({ page }) => {
        await page.fill('#inputValue', 'Item 1');
        await page.click('button:has-text("Add to Array")');
        await page.fill('#inputValue', 'Item 2');
        await page.click('button:has-text("Add to Array")');

        await page.click('button:has-text("Display Array")');

        const arrayDisplay3 = await page.locator('#arrayDisplay3').innerHTML();
        expect(arrayDisplay).toContain('Item 1');
        expect(arrayDisplay).toContain('Item 2');
    });

    test('Adding an empty value should not change the array', async ({ page }) => {
        await page.fill('#inputValue', '');
        await page.click('button:has-text("Add to Array")');

        const arrayDisplay4 = await page.locator('#arrayDisplay4').innerHTML();
        expect(arrayDisplay).toBe('');
    });

    test('Removing from an empty array should not cause errors', async ({ page }) => {
        await page.click('button:has-text("Remove Last Element")');

        const arrayDisplay5 = await page.locator('#arrayDisplay5').innerHTML();
        expect(arrayDisplay).toBe('');
    });

    test('Display array when it is empty', async ({ page }) => {
        await page.click('button:has-text("Display Array")');

        const arrayDisplay6 = await page.locator('#arrayDisplay6').innerHTML();
        expect(arrayDisplay).toBe('');
    });
});