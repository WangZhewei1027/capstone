import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T04-43-42/html/7c184551-ca82-11f0-8193-f13bc409d3cb.html';

test.describe('Bubble Sort Visualization', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the Bubble Sort application
        await page.goto(BASE_URL);
    });

    test('should be in Idle state initially', async ({ page }) => {
        // Verify the initial state is Idle
        const resultText = await page.locator('#result').innerText();
        expect(resultText).toBe('');
    });

    test('should transition to InputReceived state on valid input', async ({ page }) => {
        // Enter a valid number and check the transition
        await page.fill('#number', '5');
        const resultText = await page.locator('#result').innerText();
        expect(resultText).toBe('');
    });

    test('should show error alert for invalid input', async ({ page }) => {
        // Enter an invalid number and check for alert
        await page.fill('#number', '-1');
        await page.click('#sort-button');
        const alertText = await page.evaluate(() => window.alert);
        expect(alertText).toBe('Please enter a positive integer.');
    });

    test('should sort the array when valid input is given', async ({ page }) => {
        // Enter a valid number and click sort
        await page.fill('#number', '5');
        await page.click('#sort-button');

        // Verify the result is as expected
        const resultText = await page.locator('#result').innerText();
        expect(resultText).toContain('Sorted array: 1 2 3 4 5 ');
    });

    test('should handle edge case of zero input', async ({ page }) => {
        // Enter zero and check for error
        await page.fill('#number', '0');
        await page.click('#sort-button');
        const alertText = await page.evaluate(() => window.alert);
        expect(alertText).toBe('Please enter a positive integer.');
    });

    test('should handle non-numeric input', async ({ page }) => {
        // Enter a non-numeric value and check for error
        await page.fill('#number', 'abc');
        await page.click('#sort-button');
        const alertText = await page.evaluate(() => window.alert);
        expect(alertText).toBe('Please enter a positive integer.');
    });

    test('should clear result on new input', async ({ page }) => {
        // Enter a valid number, sort, then enter a new number
        await page.fill('#number', '3');
        await page.click('#sort-button');
        let resultText = await page.locator('#result').innerText();
        expect(resultText).toContain('Sorted array: 1 2 3 ');

        // Clear input and check result
        await page.fill('#number', '2');
        await page.click('#sort-button');
        resultText = await page.locator('#result').innerText();
        expect(resultText).toContain('Sorted array: 1 2 ');
    });
});