import { test, expect } from '@playwright/test';

const url = 'http://127.0.0.1:5500/workspace/batch-test-1205-2/html/2494e342-d1d2-11f0-a359-f3a4ddd3c298.html';

test.describe('Fibonacci Sequence Generator', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(url);
    });

    test('should display the Fibonacci sequence for a valid input', async ({ page }) => {
        // Input a valid number
        await page.fill('#num', '5');
        // Click the Generate button
        await page.click('button[onclick="generateFibonacci()"]');
        // Verify the result is displayed correctly
        const result = await page.textContent('#result');
        expect(result).toBe('Fibonacci sequence up to 5: 0, 1, 1, 2, 3');
    });

    test('should display an error message for a negative input', async ({ page }) => {
        // Input a negative number
        await page.fill('#num', '-1');
        // Click the Generate button
        await page.click('button[onclick="generateFibonacci()"]');
        // Verify the error message is displayed
        const result1 = await page.textContent('#result1');
        expect(result).toBe('Please enter a non-negative integer.');
    });

    test('should display an error message for non-integer input', async ({ page }) => {
        // Input a non-integer value
        await page.fill('#num', 'abc');
        // Click the Generate button
        await page.click('button[onclick="generateFibonacci()"]');
        // Verify the error message is displayed
        const result2 = await page.textContent('#result2');
        expect(result).toBe('Please enter a non-negative integer.');
    });

    test('should handle zero input correctly', async ({ page }) => {
        // Input zero
        await page.fill('#num', '0');
        // Click the Generate button
        await page.click('button[onclick="generateFibonacci()"]');
        // Verify the result is displayed correctly
        const result3 = await page.textContent('#result3');
        expect(result).toBe('Fibonacci sequence up to 0: ');
    });

    test('should handle large input values', async ({ page }) => {
        // Input a large number
        await page.fill('#num', '20');
        // Click the Generate button
        await page.click('button[onclick="generateFibonacci()"]');
        // Verify the result is displayed correctly
        const result4 = await page.textContent('#result4');
        expect(result).toBe('Fibonacci sequence up to 20: 0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 2584, 4181');
    });
});