import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/f57b1880-bcab-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Interactive Stack Application', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('Initial state is idle', async ({ page }) => {
        const stackItems = await page.locator('#stack .item').count();
        expect(stackItems).toBe(0); // Stack should be empty
    });

    test('Push button click transitions to pushing state', async ({ page }) => {
        await page.fill('#inputNumber', '10');
        await page.click('#pushButton');

        // Wait for the stack to render
        await page.waitForTimeout(300); // Simulating the delay for rendering

        const stackItems1 = await page.locator('#stack .item').count();
        expect(stackItems).toBe(1); // One item should be in the stack
        expect(await page.locator('#stack .item').nth(0).textContent()).toBe('10'); // The item should be '10'
    });

    test('Push multiple items to the stack', async ({ page }) => {
        await page.fill('#inputNumber', '20');
        await page.click('#pushButton');
        await page.waitForTimeout(300);

        await page.fill('#inputNumber', '30');
        await page.click('#pushButton');
        await page.waitForTimeout(300);

        const stackItems2 = await page.locator('#stack .item').count();
        expect(stackItems).toBe(2); // Two items should be in the stack
        expect(await page.locator('#stack .item').nth(0).textContent()).toBe('30'); // The top item should be '30'
        expect(await page.locator('#stack .item').nth(1).textContent()).toBe('20'); // The next item should be '20'
    });

    test('Pop button click transitions to popping state', async ({ page }) => {
        await page.fill('#inputNumber', '40');
        await page.click('#pushButton');
        await page.waitForTimeout(300);
        
        await page.fill('#inputNumber', '50');
        await page.click('#pushButton');
        await page.waitForTimeout(300);

        await page.click('#popButton');
        await page.waitForTimeout(300); // Simulating the delay for rendering

        const stackItems3 = await page.locator('#stack .item').count();
        expect(stackItems).toBe(1); // One item should be left in the stack
        expect(await page.locator('#stack .item').nth(0).textContent()).toBe('40'); // The remaining item should be '40'
    });

    test('Pop from an empty stack should not crash the application', async ({ page }) => {
        await page.click('#popButton');
        await page.waitForTimeout(300); // Simulating the delay for rendering

        const stackItems4 = await page.locator('#stack .item').count();
        expect(stackItems).toBe(0); // Stack should still be empty
    });

    test('Push invalid input should not change the stack', async ({ page }) => {
        await page.fill('#inputNumber', 'abc'); // Invalid input
        await page.click('#pushButton');
        await page.waitForTimeout(300); // Simulating the delay for rendering

        const stackItems5 = await page.locator('#stack .item').count();
        expect(stackItems).toBe(0); // Stack should still be empty
    });

    test('Check visual feedback on button hover', async ({ page }) => {
        const pushButton = page.locator('#pushButton');
        await expect(pushButton).toHaveCSS('background-color', 'rgb(40, 167, 69)'); // Default color

        await pushButton.hover();
        await expect(pushButton).toHaveCSS('background-color', 'rgb(33, 136, 56)'); // Hover color
    });

    test.afterEach(async ({ page }) => {
        // Optional: Reset the state if needed
        await page.evaluate(() => {
            const stackContainer = document.getElementById("stack");
            stackContainer.innerHTML = ""; // Clear the stack
        });
    });
});