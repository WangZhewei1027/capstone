import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T04-43-42/html/7c18ba82-ca82-11f0-8193-f13bc409d3cb.html';

test.describe('Binary Search Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the binary search application
        await page.goto(BASE_URL);
    });

    test('Initial state is Idle', async ({ page }) => {
        // Verify that the application is in the Idle state
        const resultText = await page.locator('#result').innerText();
        expect(resultText).toBe('');
    });

    test('Submit form with valid input and display result', async ({ page }) => {
        // Fill in valid input values
        await page.fill('#low', '1');
        await page.fill('#high', '10');
        
        // Submit the form
        await page.click('button[type="submit"]');

        // Verify that the result is displayed correctly
        const resultText = await page.locator('#result').innerText();
        expect(resultText).toContain('Low: 1, High:');
    });

    test('Submit form with no result found', async ({ page }) => {
        // Fill in input values that will lead to no result
        await page.fill('#low', '10');
        await page.fill('#high', '1');

        // Submit the form
        await page.click('button[type="submit"]');

        // Verify that the no result message is displayed
        const resultText = await page.locator('#result').innerText();
        expect(resultText).toBe('No result found');
    });

    test('Submit form with empty fields', async ({ page }) => {
        // Attempt to submit the form without filling in fields
        await page.click('button[type="submit"]');

        // Verify that the result is still empty
        const resultText = await page.locator('#result').innerText();
        expect(resultText).toBe('');
    });

    test('Submit form with invalid input (non-numeric)', async ({ page }) => {
        // Fill in invalid input values
        await page.fill('#low', 'abc');
        await page.fill('#high', 'xyz');

        // Submit the form
        await page.click('button[type="submit"]');

        // Verify that the result is still empty
        const resultText = await page.locator('#result').innerText();
        expect(resultText).toBe('');
    });

    test('Check loading state during search', async ({ page }) => {
        // Fill in valid input values
        await page.fill('#low', '1');
        await page.fill('#high', '10');

        // Submit the form
        const [response] = await Promise.all([
            page.waitForResponse(response => response.url() === BASE_URL && response.status() === 200),
            page.click('button[type="submit"]')
        ]);

        // Verify that the result is displayed after search
        const resultText = await page.locator('#result').innerText();
        expect(resultText).toContain('Low: 1, High:');
    });
});