import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-14-37/html/cdcc92d0-ca86-11f0-aa32-8b1afd472b96.html';

test.describe('Linear Regression Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should render the initial Idle state', async ({ page }) => {
        // Validate that the initial state is Idle
        const title = await page.title();
        expect(title).toBe('Linear Regression');
        const submitButton = await page.locator('button[onclick="myFunction()"]');
        await expect(submitButton).toBeVisible();
    });

    test('should submit input data and transition to Submitted state', async ({ page }) => {
        // Input values for x1, y1, x2, y2
        await page.fill('#x1', '1');
        await page.fill('#y1', '2');
        await page.fill('#x2', '3');
        await page.fill('#y2', '4');

        // Click the submit button
        await page.click('button[onclick="myFunction()"]');

        // Validate that the coefficients are calculated and logged
        const consoleMessages = await page.evaluate(() => {
            return new Promise((resolve) => {
                const originalConsoleLog = console.log;
                const messages = [];
                console.log = (...args) => {
                    messages.push(args);
                };
                setTimeout(() => {
                    console.log = originalConsoleLog;
                    resolve(messages);
                }, 100);
            });
        });

        expect(consoleMessages.length).toBeGreaterThan(0);
        expect(consoleMessages[0][0]).toEqual(expect.arrayContaining([0.5, 0.5])); // Example expected output
    });

    test('should handle empty input fields gracefully', async ({ page }) => {
        // Click the submit button without filling inputs
        await page.click('button[onclick="myFunction()"]');

        // Validate that no coefficients are logged
        const consoleMessages = await page.evaluate(() => {
            return new Promise((resolve) => {
                const originalConsoleLog = console.log;
                const messages = [];
                console.log = (...args) => {
                    messages.push(args);
                };
                setTimeout(() => {
                    console.log = originalConsoleLog;
                    resolve(messages);
                }, 100);
            });
        });

        expect(consoleMessages.length).toBe(0);
    });

    test('should validate input types', async ({ page }) => {
        // Input invalid data types
        await page.fill('#x1', 'invalid');
        await page.fill('#y1', 'data');
        
        // Click the submit button
        await page.click('button[onclick="myFunction()"]');

        // Validate that no coefficients are logged
        const consoleMessages = await page.evaluate(() => {
            return new Promise((resolve) => {
                const originalConsoleLog = console.log;
                const messages = [];
                console.log = (...args) => {
                    messages.push(args);
                };
                setTimeout(() => {
                    console.log = originalConsoleLog;
                    resolve(messages);
                }, 100);
            });
        });

        expect(consoleMessages.length).toBe(0);
    });

    test('should retain input values after submission', async ({ page }) => {
        // Input values for x1, y1
        await page.fill('#x1', '5');
        await page.fill('#y1', '10');

        // Click the submit button
        await page.click('button[onclick="myFunction()"]');

        // Validate that the input fields retain their values
        const x1Value = await page.inputValue('#x1');
        const y1Value = await page.inputValue('#y1');
        expect(x1Value).toBe('5');
        expect(y1Value).toBe('10');
    });
});