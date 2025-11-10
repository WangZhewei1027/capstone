import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0001/html/d96c5f00-bca1-11f0-9c8f-15ad551aaf30.html';

test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
});

test.describe('Interactive Application Tests', () => {
    
    test('should start in idle state', async ({ page }) => {
        const arraySection = await page.locator('#arraySection');
        const arrayItems = await arraySection.locator('.array-box');
        expect(await arrayItems.count()).toBe(0); // No items should be present
    });

    test('should add an item to the array', async ({ page }) => {
        const inputField = await page.locator('#arrayInput');
        const addButton = await page.locator('#addButton');

        await inputField.fill('Test Item');
        await addButton.click();

        const arrayItems = await page.locator('.array-box');
        expect(await arrayItems.count()).toBe(1); // One item should be present
        expect(await arrayItems.first().innerText()).toBe('Test Item'); // Check the item text
    });

    test('should sort the array', async ({ page }) => {
        const inputField = await page.locator('#arrayInput');
        const addButton = await page.locator('#addButton');
        const sortButton = await page.locator('#sortButton');

        await inputField.fill('Banana');
        await addButton.click();
        await inputField.fill('Apple');
        await addButton.click();
        await inputField.fill('Cherry');
        await addButton.click();

        await sortButton.click();

        const arrayItems = await page.locator('.array-box');
        const itemTexts = await arrayItems.allInnerTexts();
        expect(itemTexts).toEqual(['Apple', 'Banana', 'Cherry']); // Check sorted order
    });

    test('should remove an item from the array', async ({ page }) => {
        const inputField = await page.locator('#arrayInput');
        const addButton = await page.locator('#addButton');

        await inputField.fill('Item 1');
        await addButton.click();
        await inputField.fill('Item 2');
        await addButton.click();

        const arrayItems = await page.locator('.array-box');
        await arrayItems.first().click(); // Click to remove the first item

        expect(await arrayItems.count()).toBe(1); // One item should remain
        expect(await arrayItems.first().innerText()).toBe('Item 2'); // Check the remaining item
    });

    test('should not add empty items', async ({ page }) => {
        const inputField = await page.locator('#arrayInput');
        const addButton = await page.locator('#addButton');

        await addButton.click(); // Attempt to add without input

        const arrayItems = await page.locator('.array-box');
        expect(await arrayItems.count()).toBe(0); // No items should be present
    });

    test('should handle multiple additions and removals', async ({ page }) => {
        const inputField = await page.locator('#arrayInput');
        const addButton = await page.locator('#addButton');

        await inputField.fill('Item A');
        await addButton.click();
        await inputField.fill('Item B');
        await addButton.click();
        await inputField.fill('Item C');
        await addButton.click();

        let arrayItems = await page.locator('.array-box');
        expect(await arrayItems.count()).toBe(3); // Three items should be present

        await arrayItems.nth(1).click(); // Remove 'Item B'

        arrayItems = await page.locator('.array-box');
        expect(await arrayItems.count()).toBe(2); // Two items should remain
        expect(await arrayItems.first().innerText()).toBe('Item A'); // Check remaining items
        expect(await arrayItems.nth(1).innerText()).toBe('Item C');
    });
});