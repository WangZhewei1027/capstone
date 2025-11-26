import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-25T23-45-53/html/e1364b51-ca58-11f0-b3c1-8750c080fb19.html';

test.describe('Stack Implementation Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('Initial state should be Idle', async ({ page }) => {
        const stackDisplay = await page.locator('#stackDisplay').innerHTML();
        expect(stackDisplay).toBe('');
    });

    test('Push button should enable controls in Idle state', async ({ page }) => {
        await page.fill('#inputValue', 'Test Item');
        await page.click('button:has-text("Push to Stack")');
        const stackDisplay = await page.locator('#stackDisplay').innerHTML();
        expect(stackDisplay).toContain('Test Item');
    });

    test('Pushing an empty input should show an alert', async ({ page }) => {
        await page.click('button:has-text("Push to Stack")');
        const alertText = await page.waitForEvent('dialog');
        expect(alertText.message()).toBe('Please enter a value to push.');
        await alertText.dismiss();
    });

    test('Pushing a value should transition from Idle to Pushing and back to Idle', async ({ page }) => {
        await page.fill('#inputValue', 'Item 1');
        await page.click('button:has-text("Push to Stack")');

        // Check if the item is displayed
        let stackDisplay = await page.locator('#stackDisplay').innerHTML();
        expect(stackDisplay).toContain('Item 1');

        // Ensure input is cleared
        const inputValue = await page.locator('#inputValue').inputValue();
        expect(inputValue).toBe('');
    });

    test('Pop from an empty stack should show an alert', async ({ page }) => {
        await page.click('button:has-text("Pop from Stack")');
        const alertText = await page.waitForEvent('dialog');
        expect(alertText.message()).toBe('Stack is empty, cannot pop.');
        await alertText.dismiss();
    });

    test('Push and then Pop should work correctly', async ({ page }) => {
        await page.fill('#inputValue', 'Item 2');
        await page.click('button:has-text("Push to Stack")');

        let stackDisplay = await page.locator('#stackDisplay').innerHTML();
        expect(stackDisplay).toContain('Item 2');

        await page.click('button:has-text("Pop from Stack")');

        stackDisplay = await page.locator('#stackDisplay').innerHTML();
        expect(stackDisplay).not.toContain('Item 2');
    });

    test('Multiple pushes and pops should maintain correct state', async ({ page }) => {
        await page.fill('#inputValue', 'Item 3');
        await page.click('button:has-text("Push to Stack")');
        
        await page.fill('#inputValue', 'Item 4');
        await page.click('button:has-text("Push to Stack")');

        let stackDisplay = await page.locator('#stackDisplay').innerHTML();
        expect(stackDisplay).toContain('Item 3');
        expect(stackDisplay).toContain('Item 4');

        await page.click('button:has-text("Pop from Stack")');
        stackDisplay = await page.locator('#stackDisplay').innerHTML();
        expect(stackDisplay).not.toContain('Item 4');

        await page.click('button:has-text("Pop from Stack")');
        stackDisplay = await page.locator('#stackDisplay').innerHTML();
        expect(stackDisplay).not.toContain('Item 3');
    });

    test('Popping from a stack with one item should remove that item', async ({ page }) => {
        await page.fill('#inputValue', 'Item 5');
        await page.click('button:has-text("Push to Stack")');

        await page.click('button:has-text("Pop from Stack")');
        const stackDisplay = await page.locator('#stackDisplay').innerHTML();
        expect(stackDisplay).toBe('');
    });

    test('Error handling for underflow when popping from empty stack', async ({ page }) => {
        await page.click('button:has-text("Pop from Stack")');
        const alertText = await page.waitForEvent('dialog');
        expect(alertText.message()).toBe('Stack is empty, cannot pop.');
        await alertText.dismiss();
    });
});