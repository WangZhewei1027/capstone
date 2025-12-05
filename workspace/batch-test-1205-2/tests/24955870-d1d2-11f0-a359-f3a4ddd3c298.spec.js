import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-2/html/24955870-d1d2-11f0-a359-f3a4ddd3c298.html';

test.describe('Linear Regression Demo Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should display the idle state with the correct heading', async ({ page }) => {
        const heading = await page.locator('h1').innerText();
        expect(heading).toBe('Linear Regression Demonstration');
    });

    test('should allow user to enter X and Y values', async ({ page }) => {
        await page.fill('#x', '1,2,3,4,5');
        await page.fill('#y', '2,3,5,7,11');

        const xValue = await page.locator('#x').inputValue();
        const yValue = await page.locator('#y').inputValue();
        expect(xValue).toBe('1,2,3,4,5');
        expect(yValue).toBe('2,3,5,7,11');
    });

    test('should transition to DataEntered state on Plot Button click', async ({ page }) => {
        await page.fill('#x', '1,2,3,4,5');
        await page.fill('#y', '2,3,5,7,11');
        await page.click('#plotBtn');

        const xInputValue = await page.evaluate(() => document.getElementById('x').value);
        const yInputValue = await page.evaluate(() => document.getElementById('y').value);
        expect(xInputValue.split(',').length).toBe(5);
        expect(yInputValue.split(',').length).toBe(5);
    });

    test('should plot points and draw regression line on valid input', async ({ page }) => {
        await page.fill('#x', '1,2,3,4,5');
        await page.fill('#y', '2,3,5,7,11');
        await page.click('#plotBtn');

        const canvas = await page.locator('#canvas');
        const ctx = await canvas.evaluate(canvas => canvas.getContext('2d'));
        
        // Check if the canvas has been drawn on
        const imageData = await ctx.getImageData(0, 0, canvas.width, canvas.height);
        expect(imageData.data.some(value => value !== 0)).toBeTruthy(); // Check if something has been drawn
    });

    test('should show alert when X and Y values have different lengths', async ({ page }) => {
        await page.fill('#x', '1,2,3');
        await page.fill('#y', '2,3');
        
        // Listen for alert
        page.on('dialog', async dialog => {
            expect(dialog.message()).toBe('X and Y values must have the same number of elements.');
            await dialog.dismiss();
        });

        await page.click('#plotBtn');
    });

    test('should handle empty input gracefully', async ({ page }) => {
        await page.click('#plotBtn');

        // Listen for alert
        page.on('dialog', async dialog => {
            expect(dialog.message()).toBe('X and Y values must have the same number of elements.');
            await dialog.dismiss();
        });
    });

    test('should handle non-numeric input gracefully', async ({ page }) => {
        await page.fill('#x', 'a,b,c');
        await page.fill('#y', '1,2,3');

        // Listen for alert
        page.on('dialog', async dialog => {
            expect(dialog.message()).toBe('X and Y values must have the same number of elements.');
            await dialog.dismiss();
        });

        await page.click('#plotBtn');
    });

    test('should throw a ReferenceError if the plot function is not defined', async ({ page }) => {
        await page.fill('#x', '1,2,3,4,5');
        await page.fill('#y', '2,3,5,7,11');

        // Listen for console errors
        page.on('console', msg => {
            if (msg.type() === 'error') {
                expect(msg.text()).toContain('ReferenceError');
            }
        });

        await page.click('#plotBtn');
    });
});