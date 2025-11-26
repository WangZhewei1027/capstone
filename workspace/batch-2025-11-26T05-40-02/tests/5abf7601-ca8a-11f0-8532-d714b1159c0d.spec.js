import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-40-02/html/5abf7601-ca8a-11f0-8532-d714b1159c0d.html';

test.describe('Two Pointers Application', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application before each test
        await page.goto(BASE_URL);
    });

    test('should display the initial state with the form', async ({ page }) => {
        // Validate that the application is in the Idle state
        const title = await page.locator('h2').innerText();
        expect(title).toBe('Two Pointers');

        const xInput = page.locator('#x');
        const yInput = page.locator('#y');
        const submitButton = page.locator('button[type="submit"]');

        // Check if input fields and button are present
        await expect(xInput).toBeVisible();
        await expect(yInput).toBeVisible();
        await expect(submitButton).toBeVisible();
    });

    test('should calculate the result correctly when x > y', async ({ page }) => {
        // Input values for X and Y
        await page.fill('#x', '10');
        await page.fill('#y', '5');

        // Submit the form
        await page.click('button[type="submit"]');

        // Validate that the result is displayed correctly
        const resultText = await page.locator('#result').innerText();
        expect(resultText).toBe('Result: 5');
    });

    test('should calculate the result correctly when x < y', async ({ page }) => {
        // Input values for X and Y
        await page.fill('#x', '3');
        await page.fill('#y', '8');

        // Submit the form
        await page.click('button[type="submit"]');

        // Validate that the result is displayed correctly
        const resultText = await page.locator('#result').innerText();
        expect(resultText).toBe('Result: 5');
    });

    test('should calculate the result correctly when x equals y', async ({ page }) => {
        // Input values for X and Y
        await page.fill('#x', '7');
        await page.fill('#y', '7');

        // Submit the form
        await page.click('button[type="submit"]');

        // Validate that the result is displayed correctly
        const resultText = await page.locator('#result').innerText();
        expect(resultText).toBe('Result: 0');
    });

    test('should show validation error when inputs are empty', async ({ page }) => {
        // Attempt to submit the form without filling inputs
        await page.click('button[type="submit"]');

        // Validate that the result is not displayed
        const resultText = await page.locator('#result').innerText();
        expect(resultText).toBe('');
    });

    test('should show validation error when inputs are non-numeric', async ({ page }) => {
        // Input non-numeric values for X and Y
        await page.fill('#x', 'abc');
        await page.fill('#y', 'xyz');

        // Attempt to submit the form
        await page.click('button[type="submit"]');

        // Validate that the result is not displayed
        const resultText = await page.locator('#result').innerText();
        expect(resultText).toBe('');
    });
});