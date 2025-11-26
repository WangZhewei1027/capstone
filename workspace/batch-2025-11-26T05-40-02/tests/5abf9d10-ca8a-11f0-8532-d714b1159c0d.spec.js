import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-40-02/html/5abf9d10-ca8a-11f0-8532-d714b1159c0d.html';

test.describe('Linear Regression Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the linear regression application
        await page.goto(BASE_URL);
    });

    test('Initial state is Idle', async ({ page }) => {
        // Verify that the application is in the Idle state
        const resultText = await page.locator('#result').innerText();
        expect(resultText).toBe('');
    });

    test('Valid input and calculate prediction', async ({ page }) => {
        // Input valid X and Y values and submit the form
        await page.fill('#x', '10');
        await page.fill('#y', '20');
        await page.click('button[type="submit"]');

        // Verify that the application transitions to Result state
        const resultText = await page.locator('#result').innerText();
        expect(resultText).toMatch(/Predicted value:/);
    });

    test('Invalid input shows alert', async ({ page }) => {
        // Input invalid X and Y values and submit the form
        await page.fill('#x', 'invalid');
        await page.fill('#y', '20');
        await page.click('button[type="submit"]');

        // Verify that an alert is shown for invalid input
        page.on('dialog', async dialog => {
            expect(dialog.message()).toBe('Please enter valid numbers');
            await dialog.dismiss();
        });
    });

    test('Empty input shows alert', async ({ page }) => {
        // Submit the form without filling in any values
        await page.click('button[type="submit"]');

        // Verify that an alert is shown for invalid input
        page.on('dialog', async dialog => {
            expect(dialog.message()).toBe('Please enter valid numbers');
            await dialog.dismiss();
        });
    });

    test('Check result after multiple submissions', async ({ page }) => {
        // Input valid values and submit the form
        await page.fill('#x', '5');
        await page.fill('#y', '15');
        await page.click('button[type="submit"]');

        // Verify the result
        let resultText = await page.locator('#result').innerText();
        expect(resultText).toMatch(/Predicted value:/);

        // Input new valid values and submit again
        await page.fill('#x', '10');
        await page.fill('#y', '30');
        await page.click('button[type="submit"]');

        // Verify the new result
        resultText = await page.locator('#result').innerText();
        expect(resultText).toMatch(/Predicted value:/);
    });
});