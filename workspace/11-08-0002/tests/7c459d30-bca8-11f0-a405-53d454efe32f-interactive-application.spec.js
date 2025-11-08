import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0002/html/7c459d30-bca8-11f0-a405-53d454efe32f.html';

test.describe('Stack Explorer Application', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should display empty stack message on initial load', async ({ page }) => {
        const output = await page.locator('#output').textContent();
        expect(output).toBe('Stack is empty.');
    });

    test.describe('Pushing items to the stack', () => {
        test('should add an item to the stack and update display', async ({ page }) => {
            await page.click('#pushButton');
            const stackItems = await page.locator('.stack-item').count();
            expect(stackItems).toBe(1);
            const output = await page.locator('#output').textContent();
            expect(output).not.toBe('Stack is empty.');
        });

        test('should allow multiple items to be pushed to the stack', async ({ page }) => {
            await page.click('#pushButton');
            await page.click('#pushButton');
            const stackItems = await page.locator('.stack-item').count();
            expect(stackItems).toBe(2);
        });

        test('should not change the output when pushing items', async ({ page }) => {
            await page.click('#pushButton');
            const outputAfterPush = await page.locator('#output').textContent();
            await page.click('#pushButton');
            const outputAfterSecondPush = await page.locator('#output').textContent();
            expect(outputAfterPush).toBe(outputAfterSecondPush);
        });
    });

    test.describe('Popping items from the stack', () => {
        test.beforeEach(async ({ page }) => {
            await page.click('#pushButton'); // Ensure stack has at least one item
        });

        test('should remove an item from the stack and update display', async ({ page }) => {
            await page.click('#popButton');
            const stackItems = await page.locator('.stack-item').count();
            expect(stackItems).toBe(0);
            const output = await page.locator('#output').textContent();
            expect(output).toBe('Stack is empty.');
        });

        test('should allow multiple pops until the stack is empty', async ({ page }) => {
            await page.click('#pushButton');
            await page.click('#pushButton');
            await page.click('#popButton');
            await page.click('#popButton');
            const stackItems = await page.locator('.stack-item').count();
            expect(stackItems).toBe(0);
            const output = await page.locator('#output').textContent();
            expect(output).toBe('Stack is empty.');
        });

        test('should display empty stack message when popping from an empty stack', async ({ page }) => {
            await page.click('#popButton'); // First pop to empty the stack
            const output = await page.locator('#output').textContent();
            expect(output).toBe('Stack is empty.');
        });
    });

    test.describe('Edge cases', () => {
        test('should not allow popping from an empty stack', async ({ page }) => {
            await page.click('#popButton'); // Attempt to pop from empty stack
            const output = await page.locator('#output').textContent();
            expect(output).toBe('Stack is empty.');
        });

        test('should allow pushing after popping from an empty stack', async ({ page }) => {
            await page.click('#popButton'); // Empty the stack
            await page.click('#pushButton'); // Push an item
            const stackItems = await page.locator('.stack-item').count();
            expect(stackItems).toBe(1);
            const output = await page.locator('#output').textContent();
            expect(output).not.toBe('Stack is empty.');
        });
    });
});