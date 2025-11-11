import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-10-0004-4o-mini/html/47f71160-bde5-11f0-ad60-cb3bd313757f.html';

test.describe('Interactive Stack Explorer Tests', () => {
    let page;

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();
        await page.goto(BASE_URL);
    });

    test.afterAll(async () => {
        await page.close();
    });

    test('Initial state should be idle', async () => {
        const stackItems = await page.$$('.stack-item');
        expect(stackItems.length).toBe(0);
    });

    test('Push button should transition to pushing state', async () => {
        await page.fill('#stackInput', '10');
        await page.click('#pushButton');

        const stackItems = await page.$$('.stack-item');
        expect(stackItems.length).toBe(1);
        expect(await stackItems[0].innerText()).toBe('10');
    });

    test('Pushing another item should update the stack', async () => {
        await page.fill('#stackInput', '20');
        await page.click('#pushButton');

        const stackItems = await page.$$('.stack-item');
        expect(stackItems.length).toBe(2);
        expect(await stackItems[1].innerText()).toBe('20');
    });

    test('Pop button should transition to popping state', async () => {
        await page.click('#popButton');

        const stackItems = await page.$$('.stack-item');
        expect(stackItems.length).toBe(1);
        expect(await stackItems[0].innerText()).toBe('10');
    });

    test('Popping again should remove the last item', async () => {
        await page.click('#popButton');

        const stackItems = await page.$$('.stack-item');
        expect(stackItems.length).toBe(0);
    });

    test('Popping from an empty stack should show alert', async () => {
        await page.click('#popButton');

        const alertMessage = await page.evaluate(() => {
            return window.alertMessage; // Assuming the alert message is stored in a global variable
        });
        expect(alertMessage).toBe('Stack is empty!');
    });

    test('Pushing after popping should work normally', async () => {
        await page.fill('#stackInput', '30');
        await page.click('#pushButton');

        const stackItems = await page.$$('.stack-item');
        expect(stackItems.length).toBe(1);
        expect(await stackItems[0].innerText()).toBe('30');
    });

    test('Visual feedback for stack items should be correct', async () => {
        const stackItems = await page.$$('.stack-item');
        for (const item of stackItems) {
            const opacity = await item.evaluate(el => getComputedStyle(el).opacity);
            expect(opacity).toBe('1'); // Check if the item is fully visible
        }
    });
});