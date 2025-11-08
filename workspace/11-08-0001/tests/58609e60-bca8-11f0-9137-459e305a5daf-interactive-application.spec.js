import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0001/html/58609e60-bca8-11f0-9137-459e305a5daf.html';

test.describe('Interactive Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('Initial state is idle', async ({ page }) => {
        const arrayDisplay = await page.locator('#arrayDisplay');
        await expect(arrayDisplay).toHaveText('');
    });

    test('Add item to array', async ({ page }) => {
        const inputField = await page.locator('#itemInput');
        const addButton = await page.locator('.add-btn');
        
        await inputField.fill('Item 1');
        await addButton.click();

        const arrayDisplay = await page.locator('#arrayDisplay');
        await expect(arrayDisplay).toHaveText('Array: [Item 1]');
    });

    test('Add multiple items to array', async ({ page }) => {
        const inputField = await page.locator('#itemInput');
        const addButton = await page.locator('.add-btn');

        await inputField.fill('Item 1');
        await addButton.click();
        await inputField.fill('Item 2');
        await addButton.click();

        const arrayDisplay = await page.locator('#arrayDisplay');
        await expect(arrayDisplay).toHaveText('Array: [Item 1, Item 2]');
    });

    test('Remove last item from array', async ({ page }) => {
        const inputField = await page.locator('#itemInput');
        const addButton = await page.locator('.add-btn');
        const removeButton = await page.locator('.remove-btn');

        await inputField.fill('Item 1');
        await addButton.click();
        await inputField.fill('Item 2');
        await addButton.click();
        await removeButton.click();

        const arrayDisplay = await page.locator('#arrayDisplay');
        await expect(arrayDisplay).toHaveText('Array: [Item 1]');
    });

    test('Remove item from empty array', async ({ page }) => {
        const removeButton = await page.locator('.remove-btn');
        await removeButton.click();

        const arrayDisplay = await page.locator('#arrayDisplay');
        await expect(arrayDisplay).toHaveText('The array is empty.');
    });

    test('Display array', async ({ page }) => {
        const inputField = await page.locator('#itemInput');
        const addButton = await page.locator('.add-btn');
        const displayButton = await page.locator('.display-btn');

        await inputField.fill('Item 1');
        await addButton.click();
        await displayButton.click();

        const arrayDisplay = await page.locator('#arrayDisplay');
        await expect(arrayDisplay).toHaveText('Array: [Item 1]');
    });

    test('Display empty array', async ({ page }) => {
        const displayButton = await page.locator('.display-btn');
        await displayButton.click();

        const arrayDisplay = await page.locator('#arrayDisplay');
        await expect(arrayDisplay).toHaveText('The array is empty.');
    });

    test('Alert on empty input when adding item', async ({ page }) => {
        const addButton = await page.locator('.add-btn');
        await addButton.click();

        const alert = await page.waitForEvent('dialog');
        await expect(alert.message()).toContain('Please enter an item.');
        await alert.dismiss();
    });
});