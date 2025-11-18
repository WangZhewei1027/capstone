import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-18-0002/html/66bc9a70-c466-11f0-be4b-41561101a3d0.html';

test.describe('Interactive Stack Explorer', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test.describe('Idle State Tests', () => {
        test('should display initial stack state as empty', async ({ page }) => {
            const stackContent = await page.locator('#stack').innerHTML();
            expect(stackContent).toBe('<h2>Stack</h2>');
        });

        test('should show error when trying to pop from an empty stack', async ({ page }) => {
            await page.click('button:has-text("Pop")');
            const outputText = await page.locator('#output').innerText();
            expect(outputText).toBe('Stack is empty. Cannot pop.');
        });

        test('should show error when trying to peek into an empty stack', async ({ page }) => {
            await page.click('button:has-text("Peek")');
            const outputText = await page.locator('#output').innerText();
            expect(outputText).toBe('Stack is empty. Cannot peek.');
        });
    });

    test.describe('Updating State Tests', () => {
        test('should push an item to the stack and update display', async ({ page }) => {
            await page.fill('#itemInput', 'Item 1');
            await page.click('button:has-text("Push")');

            const stackContent = await page.locator('#stack').innerHTML();
            expect(stackContent).toContain('Item 1');
            const outputText = await page.locator('#output').innerText();
            expect(outputText).toBe('Pushed: Item 1');
        });

        test('should pop an item from the stack and update display', async ({ page }) => {
            await page.fill('#itemInput', 'Item 2');
            await page.click('button:has-text("Push")');
            await page.click('button:has-text("Pop")');

            const stackContent = await page.locator('#stack').innerHTML();
            expect(stackContent).toBe('<h2>Stack</h2>'); // Stack should be empty after popping
            const outputText = await page.locator('#output').innerText();
            expect(outputText).toBe('Popped: Item 2');
        });

        test('should peek the top item from the stack', async ({ page }) => {
            await page.fill('#itemInput', 'Item 3');
            await page.click('button:has-text("Push")');
            await page.click('button:has-text("Peek")');

            const outputText = await page.locator('#output').innerText();
            expect(outputText).toBe('Top item: Item 3');
        });

        test('should handle multiple pushes and pops correctly', async ({ page }) => {
            await page.fill('#itemInput', 'Item 4');
            await page.click('button:has-text("Push")');
            await page.fill('#itemInput', 'Item 5');
            await page.click('button:has-text("Push")');
            await page.click('button:has-text("Pop")');

            const stackContent = await page.locator('#stack').innerHTML();
            expect(stackContent).toContain('Item 4');
            expect(stackContent).not.toContain('Item 5');
            const outputText = await page.locator('#output').innerText();
            expect(outputText).toBe('Popped: Item 5');
        });
    });

    test.describe('Edge Cases and Error Handling', () => {
        test('should show error when trying to push an empty item', async ({ page }) => {
            await page.fill('#itemInput', '');
            await page.click('button:has-text("Push")');
            const outputText = await page.locator('#output').innerText();
            expect(outputText).toBe('Please enter an item.');
        });

        test('should show error when trying to pop from an empty stack after multiple pops', async ({ page }) => {
            await page.fill('#itemInput', 'Item 6');
            await page.click('button:has-text("Push")');
            await page.click('button:has-text("Pop")');
            await page.click('button:has-text("Pop")'); // Second pop should trigger error

            const outputText = await page.locator('#output').innerText();
            expect(outputText).toBe('Stack is empty. Cannot pop.');
        });

        test('should show error when trying to peek into an empty stack after multiple pops', async ({ page }) => {
            await page.fill('#itemInput', 'Item 7');
            await page.click('button:has-text("Push")');
            await page.click('button:has-text("Pop")');
            await page.click('button:has-text("Peek")'); // Peek should trigger error

            const outputText = await page.locator('#output').innerText();
            expect(outputText).toBe('Stack is empty. Cannot peek.');
        });
    });

    test.afterEach(async ({ page }) => {
        // Reset the state if needed, or perform any cleanup
    });
});