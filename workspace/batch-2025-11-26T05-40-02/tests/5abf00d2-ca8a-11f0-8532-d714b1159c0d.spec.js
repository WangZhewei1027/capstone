import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-40-02/html/5abf00d2-ca8a-11f0-8532-d714b1159c0d.html';

test.describe('Fibonacci Sequence Application', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should display the input field and button in the Idle state', async ({ page }) => {
        // Validate that the input field and button are present in the Idle state
        const inputField = await page.locator('#n');
        const generateButton = await page.locator('#generate');
        
        await expect(inputField).toBeVisible();
        await expect(inputField).toHaveAttribute('placeholder', 'Enter the number of terms');
        await expect(generateButton).toBeVisible();
        await expect(generateButton).toHaveText('Generate Fibonacci Sequence');
    });

    test('should generate Fibonacci sequence on valid input', async ({ page }) => {
        // Input a valid number and click the generate button
        await page.fill('#n', '6');
        await page.click('#generate');

        // Validate that the Fibonacci sequence is displayed correctly
        const resultDiv = await page.locator('#fibonacci');
        await expect(resultDiv).toBeVisible();
        await expect(resultDiv).toHaveText('Fibonacci Sequence: 0, 1, 1, 2, 3, 5');
    });

    test('should handle edge case of zero input', async ({ page }) => {
        // Input zero and click the generate button
        await page.fill('#n', '0');
        await page.click('#generate');

        // Validate that the Fibonacci sequence is displayed correctly
        const resultDiv = await page.locator('#fibonacci');
        await expect(resultDiv).toBeVisible();
        await expect(resultDiv).toHaveText('Fibonacci Sequence: ');
    });

    test('should handle negative input gracefully', async ({ page }) => {
        // Input a negative number and click the generate button
        await page.fill('#n', '-5');
        await page.click('#generate');

        // Validate that the Fibonacci sequence is displayed correctly
        const resultDiv = await page.locator('#fibonacci');
        await expect(resultDiv).toBeVisible();
        await expect(resultDiv).toHaveText('Fibonacci Sequence: ');
    });

    test('should handle non-numeric input gracefully', async ({ page }) => {
        // Input a non-numeric value and click the generate button
        await page.fill('#n', 'abc');
        await page.click('#generate');

        // Validate that the Fibonacci sequence is displayed correctly
        const resultDiv = await page.locator('#fibonacci');
        await expect(resultDiv).toBeVisible();
        await expect(resultDiv).toHaveText('Fibonacci Sequence: ');
    });

    test('should not generate sequence when input is empty', async ({ page }) => {
        // Leave input empty and click the generate button
        await page.fill('#n', '');
        await page.click('#generate');

        // Validate that the Fibonacci sequence is displayed correctly
        const resultDiv = await page.locator('#fibonacci');
        await expect(resultDiv).toBeVisible();
        await expect(resultDiv).toHaveText('Fibonacci Sequence: ');
    });
});