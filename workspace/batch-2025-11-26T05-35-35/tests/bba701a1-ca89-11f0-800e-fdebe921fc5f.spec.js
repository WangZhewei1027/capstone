import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-35-35/html/bba701a1-ca89-11f0-800e-fdebe921fc5f.html';

test.describe('Sliding Window Application Tests', () => {
    let page;

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();
        await page.goto(BASE_URL);
    });

    test.afterAll(async () => {
        await page.close();
    });

    test('Initial state is Idle', async () => {
        const window = await page.locator('#window');
        const style = await window.evaluate(el => el.style);
        expect(style.top).toBe('0px');
        expect(style.left).toBe('0px');
    });

    test('Transition from Idle to Active Left on mousedown left of center', async () => {
        await page.mouse.move(100, 100);
        await page.mouse.down();
        await page.waitForTimeout(100); // Allow for any animations or updates

        const window = await page.locator('#window');
        const style = await window.evaluate(el => el.style);
        expect(style.top).toBe('100px'); // Expect the top to be set to the mouse Y position
        expect(style.left).toBe('0px'); // Expect the left to remain at 0
    });

    test('Transition from Idle to Active Right on mousedown right of center', async () => {
        await page.mouse.move(600, 100); // Move to the right side
        await page.mouse.down();
        await page.waitForTimeout(100); // Allow for any animations or updates

        const window = await page.locator('#window');
        const style = await window.evaluate(el => el.style);
        expect(style.top).toBe('0px'); // Expect the top to reset
        expect(style.left).toBe('600px'); // Expect the left to be set to the mouse X position
    });

    test('Remain in Active Left state on repeated mousedown', async () => {
        await page.mouse.move(150, 100);
        await page.mouse.down();
        await page.waitForTimeout(100); // Allow for any animations or updates

        const window = await page.locator('#window');
        const style = await window.evaluate(el => el.style);
        expect(style.top).toBe('100px'); // Expect the top to remain at 100
        expect(style.left).toBe('0px'); // Expect the left to remain at 0
    });

    test('Remain in Active Right state on repeated mousedown', async () => {
        await page.mouse.move(700, 100); // Move to the right side again
        await page.mouse.down();
        await page.waitForTimeout(100); // Allow for any animations or updates

        const window = await page.locator('#window');
        const style = await window.evaluate(el => el.style);
        expect(style.top).toBe('0px'); // Expect the top to remain at 0
        expect(style.left).toBe('700px'); // Expect the left to remain at 700
    });

    test('Check edge case for mousedown exactly at center', async () => {
        await page.mouse.move(250, 100); // Move to the center
        await page.mouse.down();
        await page.waitForTimeout(100); // Allow for any animations or updates

        const window = await page.locator('#window');
        const style = await window.evaluate(el => el.style);
        expect(style.top).toBe('0px'); // Expect the top to remain at 0
        expect(style.left).toBe('0px'); // Expect the left to remain at 0
    });
});