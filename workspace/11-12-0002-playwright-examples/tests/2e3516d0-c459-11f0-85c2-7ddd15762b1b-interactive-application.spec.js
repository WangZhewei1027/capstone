import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-12-0002-playwright-examples/html/2e3516d0-c459-11f0-85c2-7ddd15762b1b.html';

test.describe('Interactive Stack Exploration Application', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should be in idle state initially', async ({ page }) => {
        const stackOutput = await page.locator('#stackOutput').innerHTML();
        expect(stackOutput).toBe('');
    });

    test('should alert when trying to pop from an empty stack', async ({ page }) => {
        await page.click('#popButton');
        await page.waitForTimeout(100); // Wait for alert to appear
        const alertText = await page.evaluate(() => window.alert);
        expect(alertText).toBe('The stack is empty! Nothing to pop.');
    });

    test('should push a value onto the stack and update display', async ({ page }) => {
        await page.fill('#stackValue', '10');
        await page.click('#pushButton');
        const stackOutput = await page.locator('#stackOutput').innerHTML();
        expect(stackOutput).toContain('10');
    });

    test('should push multiple values onto the stack', async ({ page }) => {
        await page.fill('#stackValue', '20');
        await page.click('#pushButton');
        await page.fill('#stackValue', '30');
        await page.click('#pushButton');
        const stackOutput = await page.locator('#stackOutput').innerHTML();
        expect(stackOutput).toContain('30');
        expect(stackOutput).toContain('20');
    });

    test('should pop a value from the stack and update display', async ({ page }) => {
        await page.fill('#stackValue', '40');
        await page.click('#pushButton');
        await page.click('#popButton');
        const stackOutput = await page.locator('#stackOutput').innerHTML();
        expect(stackOutput).not.toContain('40');
    });

    test('should alert when trying to pop from an empty stack after some pops', async ({ page }) => {
        await page.fill('#stackValue', '50');
        await page.click('#pushButton');
        await page.click('#popButton');
        await page.click('#popButton'); // Second pop should trigger alert
        await page.waitForTimeout(100); // Wait for alert to appear
        const alertText = await page.evaluate(() => window.alert);
        expect(alertText).toBe('The stack is empty! Nothing to pop.');
    });

    test('should not allow pushing an empty value', async ({ page }) => {
        await page.fill('#stackValue', '');
        await page.click('#pushButton');
        const stackOutput = await page.locator('#stackOutput').innerHTML();
        expect(stackOutput).toBe('');
    });

    test('should handle multiple pushes and pops correctly', async ({ page }) => {
        await page.fill('#stackValue', '60');
        await page.click('#pushButton');
        await page.fill('#stackValue', '70');
        await page.click('#pushButton');
        await page.click('#popButton');
        await page.fill('#stackValue', '80');
        await page.click('#pushButton');
        const stackOutput = await page.locator('#stackOutput').innerHTML();
        expect(stackOutput).toContain('80');
        expect(stackOutput).toContain('60');
        expect(stackOutput).not.toContain('70');
    });

    test('should clear input after pushing a value', async ({ page }) => {
        await page.fill('#stackValue', '90');
        await page.click('#pushButton');
        const inputValue = await page.locator('#stackValue').inputValue();
        expect(inputValue).toBe('');
    });
});