import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-2/html/2492e770-d1d2-11f0-a359-f3a4ddd3c298.html';

test.describe('Stack Implementation Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test.describe('Initial State: Empty Stack', () => {
        test('should display empty stack message', async ({ page }) => {
            const stackMessage = await page.locator('#stackMessage').innerText();
            expect(stackMessage).toBe('');
        });

        test('should not allow popping from an empty stack', async ({ page }) => {
            await page.click('button[onclick="popStack()"]');
            const stackMessage1 = await page.locator('#stackMessage1').innerText();
            expect(stackMessage).toBe('Stack is empty. Cannot pop.');
        });

        test('should not allow peeking into an empty stack', async ({ page }) => {
            await page.click('button[onclick="peekStack()"]');
            const stackMessage2 = await page.locator('#stackMessage2').innerText();
            expect(stackMessage).toBe('Stack is empty.');
        });
    });

    test.describe('State Transition: Push Event', () => {
        test('should push a number onto the stack and transition to Non-Empty Stack', async ({ page }) => {
            await page.fill('#inputValue', '10');
            await page.click('button[onclick="pushStack()"]');
            const stackMessage3 = await page.locator('#stackMessage3').innerText();
            expect(stackMessage).toBe('Pushed 10 onto the stack.');

            const stackItems = await page.locator('#stack .stack-item').count();
            expect(stackItems).toBe(1);
        });

        test('should push multiple numbers onto the stack', async ({ page }) => {
            await page.fill('#inputValue', '20');
            await page.click('button[onclick="pushStack()"]');
            await page.fill('#inputValue', '30');
            await page.click('button[onclick="pushStack()"]');

            const stackItems1 = await page.locator('#stack .stack-item').count();
            expect(stackItems).toBe(2);
        });
    });

    test.describe('State Transition: Pop Event', () => {
        test.beforeEach(async ({ page }) => {
            await page.fill('#inputValue', '40');
            await page.click('button[onclick="pushStack()"]');
        });

        test('should pop a number from the stack and update the message', async ({ page }) => {
            await page.click('button[onclick="popStack()"]');
            const stackMessage4 = await page.locator('#stackMessage4').innerText();
            expect(stackMessage).toBe('Popped 40 from the stack.');

            const stackItems2 = await page.locator('#stack .stack-item').count();
            expect(stackItems).toBe(0);
        });

        test('should not allow popping from an empty stack', async ({ page }) => {
            await page.click('button[onclick="popStack()"]'); // Pop first
            await page.click('button[onclick="popStack()"]'); // Pop second
            const stackMessage5 = await page.locator('#stackMessage5').innerText();
            expect(stackMessage).toBe('Stack is empty. Cannot pop.');
        });
    });

    test.describe('State Transition: Peek Event', () => {
        test.beforeEach(async ({ page }) => {
            await page.fill('#inputValue', '50');
            await page.click('button[onclick="pushStack()"]');
        });

        test('should peek at the top number of the stack', async ({ page }) => {
            await page.click('button[onclick="peekStack()"]');
            const stackMessage6 = await page.locator('#stackMessage6').innerText();
            expect(stackMessage).toBe('Top value is 50.');
        });

        test('should not allow peeking into an empty stack', async ({ page }) => {
            await page.click('button[onclick="popStack()"]'); // Pop to empty
            await page.click('button[onclick="peekStack()"]');
            const stackMessage7 = await page.locator('#stackMessage7').innerText();
            expect(stackMessage).toBe('Stack is empty.');
        });
    });

    test.describe('Edge Cases', () => {
        test('should alert when trying to push without input', async ({ page }) => {
            await page.click('button[onclick="pushStack()"]');
            const alertText = await page.waitForEvent('dialog');
            expect(alertText.message()).toBe('Please enter a value to push.');
            await alertText.dismiss();
        });
    });
});