import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T04-43-42/html/7c170cd0-ca82-11f0-8193-f13bc409d3cb.html';

test.describe('Stack Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('Initial state is Idle', async ({ page }) => {
        const stackDisplay = await page.locator('#stack').innerHTML();
        expect(stackDisplay).toBe('');
    });

    test('Add item to stack', async ({ page }) => {
        await page.fill('#num', '5');
        await page.fill('#item', 'Item 1');
        await page.click('#add');

        const stackDisplay = await page.locator('#stack').innerHTML();
        expect(stackDisplay).toContain('5');
    });

    test('Add invalid item shows alert', async ({ page }) => {
        await page.fill('#num', '');
        await page.click('#add');

        const alertText = await page.evaluate(() => window.alert);
        expect(alertText).toBe('Please enter a valid number');
    });

    test('Remove item from stack', async ({ page }) => {
        await page.fill('#num', '5');
        await page.click('#add');
        await page.fill('#num', '10');
        await page.click('#add');
        await page.click('#remove');

        const stackDisplay = await page.locator('#stack').innerHTML();
        expect(stackDisplay).toContain('5');
        expect(stackDisplay).not.toContain('10');
    });

    test('Remove from empty stack shows alert', async ({ page }) => {
        await page.click('#remove');

        const alertText = await page.evaluate(() => window.alert);
        expect(alertText).toBe('Stack is empty');
    });

    test('Multiple adds and removes', async ({ page }) => {
        await page.fill('#num', '1');
        await page.click('#add');
        await page.fill('#num', '2');
        await page.click('#add');
        await page.fill('#num', '3');
        await page.click('#add');

        let stackDisplay = await page.locator('#stack').innerHTML();
        expect(stackDisplay).toContain('1');
        expect(stackDisplay).toContain('2');
        expect(stackDisplay).toContain('3');

        await page.click('#remove');
        stackDisplay = await page.locator('#stack').innerHTML();
        expect(stackDisplay).not.toContain('3');
    });

    test('Check stack display updates correctly', async ({ page }) => {
        await page.fill('#num', '5');
        await page.click('#add');
        await page.fill('#num', '10');
        await page.click('#add');

        let stackDisplay = await page.locator('#stack').innerHTML();
        expect(stackDisplay).toContain('5');
        expect(stackDisplay).toContain('10');

        await page.click('#remove');
        stackDisplay = await page.locator('#stack').innerHTML();
        expect(stackDisplay).not.toContain('10');
    });

    test('Error alert on invalid input', async ({ page }) => {
        await page.fill('#num', 'abc');
        await page.click('#add');

        const alertText = await page.evaluate(() => window.alert);
        expect(alertText).toBe('Please enter a valid number');
    });
});