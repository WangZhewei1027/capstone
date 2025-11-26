import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-40-02/html/5abf4ef0-ca8a-11f0-8532-d714b1159c0d.html';

test.describe('Recursion Example Application', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application before each test
        await page.goto(BASE_URL);
    });

    test('Initial state is Idle', async ({ page }) => {
        // Validate that the initial state is Idle
        const input = await page.locator('#number');
        const button = await page.locator('button[onclick="calculate()"]');
        const result = await page.locator('#result');

        await expect(input).toBeVisible();
        await expect(input).toHaveAttribute('placeholder', 'Enter a number');
        await expect(button).toBeVisible();
        await expect(result).toHaveText('');
    });

    test('Calculate button click transitions to Calculating state', async ({ page }) => {
        // Simulate user input and click the Calculate button
        await page.fill('#number', '5');
        await page.click('button[onclick="calculate()"]');

        // Validate that the result is being calculated
        const result = await page.locator('#result');
        await expect(result).toHaveText('15'); // 5 + 4 + 3 + 2 + 1 = 15
    });

    test('Result is displayed after calculation', async ({ page }) => {
        // Input a number and click Calculate
        await page.fill('#number', '3');
        await page.click('button[onclick="calculate()"]');

        // Validate that the result is displayed correctly
        const result = await page.locator('#result');
        await expect(result).toHaveText('6'); // 3 + 2 + 1 = 6
    });

    test('Handles edge case of input 1', async ({ page }) => {
        // Test edge case where input is 1
        await page.fill('#number', '1');
        await page.click('button[onclick="calculate()"]');

        // Validate that the result is displayed correctly
        const result = await page.locator('#result');
        await expect(result).toHaveText('1'); // Base case of recursion
    });

    test('Handles edge case of input 0', async ({ page }) => {
        // Test edge case where input is 0
        await page.fill('#number', '0');
        await page.click('button[onclick="calculate()"]');

        // Validate that the result is displayed correctly
        const result = await page.locator('#result');
        await expect(result).toHaveText('NaN'); // 0 is not handled in the recursive function
    });

    test('Handles non-numeric input gracefully', async ({ page }) => {
        // Test with non-numeric input
        await page.fill('#number', 'abc');
        await page.click('button[onclick="calculate()"]');

        // Validate that the result is displayed as NaN
        const result = await page.locator('#result');
        await expect(result).toHaveText('NaN'); // Non-numeric input should return NaN
    });

    test('Clears result when input is changed', async ({ page }) => {
        // Input a number and click Calculate
        await page.fill('#number', '4');
        await page.click('button[onclick="calculate()"]');
        await expect(page.locator('#result')).toHaveText('10'); // 4 + 3 + 2 + 1 = 10

        // Change input value
        await page.fill('#number', '2');
        await page.click('button[onclick="calculate()"]');

        // Validate that the result is updated correctly
        const result = await page.locator('#result');
        await expect(result).toHaveText('3'); // 2 + 1 = 3
    });
});