import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-4/html/47b4d271-d1d4-11f0-959c-5fbc7dc7191d.html';

test.describe('Stack Implementation Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the stack implementation page before each test
        await page.goto(BASE_URL);
    });

    test('should load the page and display initial state', async ({ page }) => {
        // Check if the page loads correctly
        const title = await page.title();
        expect(title).toBe('Stack Implementation in JavaScript');

        // Verify that the stack is empty initially
        const stackItems = await page.locator('#stack li');
        expect(await stackItems.count()).toBe(0);
    });

    test('should push an element onto the stack', async ({ page }) => {
        // Input a value and push it onto the stack
        await page.fill('#inputElement', 'First Element');
        await page.click('button:has-text("Push")');

        // Verify that the stack contains the pushed element
        const stackItems = await page.locator('#stack li');
        expect(await stackItems.count()).toBe(1);
        expect(await stackItems.nth(0).textContent()).toBe('First Element');
    });

    test('should show alert when trying to pop from an empty stack', async ({ page }) => {
        // Attempt to pop from an empty stack
        await page.click('button:has-text("Pop")');

        // Verify that an alert is shown with the correct message
        page.on('dialog', async dialog => {
            expect(dialog.message()).toBe('Stack is empty');
            await dialog.dismiss();
        });
    });

    test('should pop an element from the stack', async ({ page }) => {
        // Push an element and then pop it
        await page.fill('#inputElement', 'First Element');
        await page.click('button:has-text("Push")');
        await page.click('button:has-text("Pop")');

        // Verify that the alert shows the correct popped value
        page.on('dialog', async dialog => {
            expect(dialog.message()).toBe('Popped value: First Element');
            await dialog.dismiss();
        });

        // Verify that the stack is empty after popping
        const stackItems = await page.locator('#stack li');
        expect(await stackItems.count()).toBe(0);
    });

    test('should show alert when trying to push an empty value', async ({ page }) => {
        // Attempt to push an empty value
        await page.fill('#inputElement', '');
        await page.click('button:has-text("Push")');

        // Verify that an alert is shown with the correct message
        page.on('dialog', async dialog => {
            expect(dialog.message()).toBe('Please enter a value to push!');
            await dialog.dismiss();
        });
    });

    test('should clear the stack and reflect in the UI', async ({ page }) => {
        // Push elements onto the stack
        await page.fill('#inputElement', 'First Element');
        await page.click('button:has-text("Push")');
        await page.fill('#inputElement', 'Second Element');
        await page.click('button:has-text("Push")');

        // Clear the stack
        await page.evaluate(() => {
            const stack = new Stack();
            stack.clear();
            updateStackUI();
        });

        // Verify that the stack is empty
        const stackItems = await page.locator('#stack li');
        expect(await stackItems.count()).toBe(0);
    });
});