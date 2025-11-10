import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0001/html/5acff0b0-bca8-11f0-9137-459e305a5daf.html';

test.describe('Interactive Stack Tutorial', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should start in idle state', async ({ page }) => {
        const stackItems = await page.locator('#stack .item').count();
        expect(stackItems).toBe(0); // Stack should be empty
    });

    test('should push an item to the stack', async ({ page }) => {
        await page.fill('#itemInput', 'Item 1');
        await page.click('#pushButton');

        const stackItems = await page.locator('#stack .item').count();
        expect(stackItems).toBe(1); // One item should be in the stack
        expect(await page.locator('#stack .item').nth(0).innerText()).toBe('Item 1'); // Check item text
    });

    test('should clear input after pushing an item', async ({ page }) => {
        await page.fill('#itemInput', 'Item 2');
        await page.click('#pushButton');

        const inputValue = await page.inputValue('#itemInput');
        expect(inputValue).toBe(''); // Input should be cleared
    });

    test('should not push an empty item', async ({ page }) => {
        await page.click('#pushButton'); // Attempt to push without input

        const stackItems = await page.locator('#stack .item').count();
        expect(stackItems).toBe(0); // Stack should still be empty
    });

    test('should pop an item from the stack', async ({ page }) => {
        await page.fill('#itemInput', 'Item 3');
        await page.click('#pushButton'); // Push first item
        await page.fill('#itemInput', 'Item 4');
        await page.click('#pushButton'); // Push second item
        await page.click('#popButton'); // Pop item

        const stackItems = await page.locator('#stack .item').count();
        expect(stackItems).toBe(1); // One item should remain in the stack
        expect(await page.locator('#stack .item').nth(0).innerText()).toBe('Item 4'); // Check remaining item
    });

    test('should not pop from an empty stack', async ({ page }) => {
        await page.click('#popButton'); // Attempt to pop without items

        const stackItems = await page.locator('#stack .item').count();
        expect(stackItems).toBe(0); // Stack should still be empty
    });

    test('should handle multiple pushes and pops', async ({ page }) => {
        await page.fill('#itemInput', 'Item 5');
        await page.click('#pushButton');
        await page.fill('#itemInput', 'Item 6');
        await page.click('#pushButton');
        await page.click('#popButton'); // Pop one item

        const stackItems = await page.locator('#stack .item').count();
        expect(stackItems).toBe(1); // One item should remain in the stack
        expect(await page.locator('#stack .item').nth(0).innerText()).toBe('Item 6'); // Check remaining item

        await page.click('#popButton'); // Pop the last item
        expect(await page.locator('#stack .item').count()).toBe(0); // Stack should be empty again
    });

    test('should show alert for invalid input when pushing', async ({ page }) => {
        await page.click('#pushButton'); // Attempt to push without input

        // Expect an alert to be shown
        page.on('dialog', async dialog => {
            expect(dialog.message()).toContain('Please enter a valid item');
            await dialog.dismiss();
        });
    });

    test('should show alert when popping from an empty stack', async ({ page }) => {
        await page.click('#popButton'); // Attempt to pop without items

        // Expect an alert to be shown
        page.on('dialog', async dialog => {
            expect(dialog.message()).toContain('Stack is empty');
            await dialog.dismiss();
        });
    });

    test.afterEach(async ({ page }) => {
        // Optionally, you can reset the state or perform cleanup if needed
    });
});