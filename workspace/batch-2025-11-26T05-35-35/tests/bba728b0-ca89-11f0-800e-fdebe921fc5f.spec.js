import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-35-35/html/bba728b0-ca89-11f0-800e-fdebe921fc5f.html';

test.describe('Two Pointers Application', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application before each test
        await page.goto(BASE_URL);
    });

    test('should render initial state correctly', async ({ page }) => {
        // Validate that the initial state is rendered correctly
        const input1 = await page.locator('#input1');
        const input2 = await page.locator('#input2');
        const button = await page.locator('button[onclick="calculate()"]');
        const output = await page.locator('#output');

        await expect(input1).toBeVisible();
        await expect(input2).toBeVisible();
        await expect(button).toBeVisible();
        await expect(output).toHaveText('');
    });

    test('should calculate correctly for positive inputs', async ({ page }) => {
        // Test the calculation with positive inputs
        await page.fill('#input1', '5');
        await page.fill('#input2', '3');
        await page.click('button[onclick="calculate()"]');

        const output = await page.locator('#output');
        await expect(output).toHaveText('0 0 5 3'); // Expected output based on the logic
    });

    test('should calculate correctly for negative inputs', async ({ page }) => {
        // Test the calculation with negative inputs
        await page.fill('#input1', '-5');
        await page.fill('#input2', '-3');
        await page.click('button[onclick="calculate()"]');

        const output = await page.locator('#output');
        await expect(output).toHaveText('0 0 -5 -3'); // Expected output based on the logic
    });

    test('should calculate correctly for mixed inputs', async ({ page }) => {
        // Test the calculation with mixed inputs
        await page.fill('#input1', '5');
        await page.fill('#input2', '-3');
        await page.click('button[onclick="calculate()"]');

        const output = await page.locator('#output');
        await expect(output).toHaveText('0 0 5 -3'); // Expected output based on the logic
    });

    test('should handle edge case with zero input', async ({ page }) => {
        // Test the calculation with zero inputs
        await page.fill('#input1', '0');
        await page.fill('#input2', '0');
        await page.click('button[onclick="calculate()"]');

        const output = await page.locator('#output');
        await expect(output).toHaveText('0 0 0 0'); // Expected output based on the logic
    });

    test('should handle empty inputs gracefully', async ({ page }) => {
        // Test the calculation with empty inputs
        await page.fill('#input1', '');
        await page.fill('#input2', '');
        await page.click('button[onclick="calculate()"]');

        const output = await page.locator('#output');
        await expect(output).toHaveText('NaN NaN NaN NaN'); // Expected output based on the logic
    });

    test('should handle non-numeric inputs gracefully', async ({ page }) => {
        // Test the calculation with non-numeric inputs
        await page.fill('#input1', 'abc');
        await page.fill('#input2', 'xyz');
        await page.click('button[onclick="calculate()"]');

        const output = await page.locator('#output');
        await expect(output).toHaveText('NaN NaN NaN NaN'); // Expected output based on the logic
    });
});