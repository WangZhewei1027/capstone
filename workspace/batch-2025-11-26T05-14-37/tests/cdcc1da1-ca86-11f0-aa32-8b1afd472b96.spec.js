import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-14-37/html/cdcc1da1-ca86-11f0-aa32-8b1afd472b96.html';

test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
});

test.describe('Divide and Conquer Application', () => {
    test('should render the initial Idle state', async ({ page }) => {
        // Validate that the initial page loads correctly
        const title = await page.title();
        expect(title).toBe('Divide and Conquer');

        const welcomeText = await page.locator('p').innerText();
        expect(welcomeText).toContain('Welcome to Divide and Conquer!');
        
        const divideButton = await page.locator('button[onclick="divide()"]');
        const conquerButton = await page.locator('button[onclick="conquer()"]');
        
        expect(await divideButton.isVisible()).toBe(true;
        expect(await conquerButton.isVisible()).toBe(true);
    });

    test('should alert when Divide button is clicked without numbers', async ({ page }) => {
        const divideButton = page.locator('button[onclick="divide()"]');
        await divideButton.click();

        const alert = await page.waitForEvent('dialog');
        expect(alert.message()).toBe('Both numbers must be provided.');
        await alert.dismiss();
    });

    test('should update result when Divide button is clicked with valid numbers', async ({ page }) => {
        await page.fill('#num1', '10');
        await page.fill('#num2', '2');

        const divideButton = page.locator('button[onclick="divide()"]');
        await divideButton.click();

        const resultText = await page.locator('#result').innerText();
        expect(resultText).toBe('Number 9 divided by 1 equals 9');
    });

    test('should alert when Conquer button is clicked without numbers', async ({ page }) => {
        const conquerButton = page.locator('button[onclick="conquer()"]');
        await conquerButton.click();

        const alert = await page.waitForEvent('dialog');
        expect(alert.message()).toBe('Both numbers must be provided.');
        await alert.dismiss();
    });

    test('should update result when Conquer button is clicked with valid numbers', async ({ page }) => {
        await page.fill('#num1', '10');
        await page.fill('#num2', '2');

        const conquerButton = page.locator('button[onclick="conquer()"]');
        await conquerButton.click();

        const resultText = await page.locator('#result').innerText();
        expect(resultText).toBe('Number 9 divided by 1 equals 9');
    });

    test('should alert when division results in zero', async ({ page }) => {
        await page.fill('#num1', '1');
        await page.fill('#num2', '1');

        const divideButton = page.locator('button[onclick="divide()"]');
        await divideButton.click();

        const alert = await page.waitForEvent('dialog');
        expect(alert.message()).toBe('The number cannot be divided.');
        await alert.dismiss();
    });

    test('should alert when conquer results in zero', async ({ page }) => {
        await page.fill('#num1', '1');
        await page.fill('#num2', '1');

        const conquerButton = page.locator('button[onclick="conquer()"]');
        await conquerButton.click();

        const alert = await page.waitForEvent('dialog');
        expect(alert.message()).toBe('The number cannot be divided.');
        await alert.dismiss();
    });
});