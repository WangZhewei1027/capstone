import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-25T23-45-53/html/e1389541-ca58-11f0-b3c1-8750c080fb19.html';

test.describe('Recursion Demonstration Application', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application before each test
        await page.goto(BASE_URL);
    });

    test('should display idle state initially', async ({ page }) => {
        // Verify that the result display is empty when the application is idle
        const resultDisplay = await page.locator('#factorial-result').innerText();
        expect(resultDisplay).toBe('');
    });

    test('should calculate factorial for valid input', async ({ page }) => {
        // Enter a valid number and click calculate
        await page.fill('#number-input', '5');
        await page.click('#calculate-button');

        // Verify that the result is displayed correctly
        const resultDisplay = await page.locator('#factorial-result').innerText();
        expect(resultDisplay).toBe('Factorial of 5 is: 120');
    });

    test('should show error message for negative input', async ({ page }) => {
        // Enter a negative number and click calculate
        await page.fill('#number-input', '-1');
        await page.click('#calculate-button');

        // Verify that the error message is displayed
        const resultDisplay = await page.locator('#factorial-result').innerText();
        expect(resultDisplay).toBe('Please enter a non-negative integer.');
    });

    test('should reset state after error and re-calculate', async ({ page }) => {
        // Enter a negative number and click calculate
        await page.fill('#number-input', '-1');
        await page.click('#calculate-button');

        // Verify error message
        let resultDisplay = await page.locator('#factorial-result').innerText();
        expect(resultDisplay).toBe('Please enter a non-negative integer.');

        // Enter a valid number and click calculate
        await page.fill('#number-input', '3');
        await page.click('#calculate-button');

        // Verify that the result is displayed correctly
        resultDisplay = await page.locator('#factorial-result').innerText();
        expect(resultDisplay).toBe('Factorial of 3 is: 6');
    });

    test('should handle multiple calculations correctly', async ({ page }) => {
        // First calculation
        await page.fill('#number-input', '4');
        await page.click('#calculate-button');
        let resultDisplay = await page.locator('#factorial-result').innerText();
        expect(resultDisplay).toBe('Factorial of 4 is: 24');

        // Second calculation
        await page.fill('#number-input', '2');
        await page.click('#calculate-button');
        resultDisplay = await page.locator('#factorial-result').innerText();
        expect(resultDisplay).toBe('Factorial of 2 is: 2');
    });

    test('should reset result display after calculation', async ({ page }) => {
        // Enter a valid number and click calculate
        await page.fill('#number-input', '6');
        await page.click('#calculate-button');

        // Verify that the result is displayed correctly
        let resultDisplay = await page.locator('#factorial-result').innerText();
        expect(resultDisplay).toBe('Factorial of 6 is: 720');

        // Reset by entering a new number
        await page.fill('#number-input', '0');
        await page.click('#calculate-button');

        // Verify that the result is displayed correctly for new input
        resultDisplay = await page.locator('#factorial-result').innerText();
        expect(resultDisplay).toBe('Factorial of 0 is: 1');
    });
});