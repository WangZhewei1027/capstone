import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-35-35/html/bba44281-ca89-11f0-800e-fdebe921fc5f.html';

test.describe('Stack Application', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the stack application page before each test
        await page.goto(BASE_URL);
    });

    test('should display the initial state with input and button', async ({ page }) => {
        // Verify that the input field and button are present in the initial state
        const input = await page.locator('#input');
        const button = await page.locator('#add');
        await expect(input).toBeVisible();
        await expect(button).toBeVisible();
        await expect(input).toHaveAttribute('placeholder', 'Enter a value to push into the stack');
    });

    test('should add an item to the stack when the button is clicked', async ({ page }) => {
        // Test adding a valid item to the stack
        const input = await page.locator('#input');
        const button = await page.locator('#add');
        const stack = await page.locator('#stack');

        await input.fill('Item 1');
        await button.click();

        // Verify that the item is added to the stack
        const items = await stack.locator('li');
        await expect(items).toHaveCount(1);
        await expect(items.first()).toHaveText('Item 1');
    });

    test('should clear the input field after adding an item', async ({ page }) => {
        // Test that the input field is cleared after adding an item
        const input = await page.locator('#input');
        const button = await page.locator('#add');

        await input.fill('Item 2');
        await button.click();

        // Verify that the input field is empty
        await expect(input).toHaveValue('');
    });

    test('should not add an empty item to the stack', async ({ page }) => {
        // Test that clicking the button without input does not add an item
        const button = await page.locator('#add');
        const stack = await page.locator('#stack');

        await button.click();

        // Verify that no items are added to the stack
        const items = await stack.locator('li');
        await expect(items).toHaveCount(0);
    });

    test('should add multiple items to the stack', async ({ page }) => {
        // Test adding multiple items to the stack
        const input = await page.locator('#input');
        const button = await page.locator('#add');
        const stack = await page.locator('#stack');

        await input.fill('Item 3');
        await button.click();
        await input.fill('Item 4');
        await button.click();

        // Verify that both items are added to the stack
        const items = await stack.locator('li');
        await expect(items).toHaveCount(2);
        await expect(items.nth(0)).toHaveText('Item 3');
        await expect(items.nth(1)).toHaveText('Item 4');
    });

    test('should display items in the correct order', async ({ page }) => {
        // Test that items are displayed in the order they were added
        const input = await page.locator('#input');
        const button = await page.locator('#add');
        const stack = await page.locator('#stack');

        await input.fill('Item A');
        await button.click();
        await input.fill('Item B');
        await button.click();
        await input.fill('Item C');
        await button.click();

        // Verify that items are displayed in the correct order
        const items = await stack.locator('li');
        await expect(items).toHaveCount(3);
        await expect(items.nth(0)).toHaveText('Item A');
        await expect(items.nth(1)).toHaveText('Item B');
        await expect(items.nth(2)).toHaveText('Item C');
    });
});