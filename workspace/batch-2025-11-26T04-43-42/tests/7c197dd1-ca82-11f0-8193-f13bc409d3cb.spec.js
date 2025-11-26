import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T04-43-42/html/7c197dd1-ca82-11f0-8193-f13bc409d3cb.html';

test.describe('Recursion Example Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application before each test
        await page.goto(BASE_URL);
    });

    test('Initial state is Idle', async ({ page }) => {
        // Verify the initial state of the application
        const resultText = await page.locator('#result').innerText();
        expect(resultText).toBe('');
    });

    test('User clicks Start button with empty input', async ({ page }) => {
        // Test clicking Start button when input is empty
        await page.click('#start-button');
        const resultText = await page.locator('#result').innerText();
        expect(resultText).toBe('');
    });

    test('User clicks Start button with valid input', async ({ page }) => {
        // Test clicking Start button with valid input
        await page.fill('#number', '5');
        await page.click('#start-button');

        // Wait for the result to be displayed
        await page.waitForTimeout(1000); // Adjust timeout based on expected processing time

        const resultText = await page.locator('#result').innerText();
        expect(resultText).toContain('1!');
        expect(resultText).toContain('2!');
        expect(resultText).toContain('3!');
        expect(resultText).toContain('4!');
        expect(resultText).toContain('5!');
    });

    test('State transitions from Processing to Completed', async ({ page }) => {
        // Test the transition from Processing to Completed
        await page.fill('#number', '3');
        await page.click('#start-button');

        // Wait for the result to be displayed
        await page.waitForTimeout(1000);

        const resultText = await page.locator('#result').innerText();
        expect(resultText).toContain('1!');
        expect(resultText).toContain('2!');
        expect(resultText).toContain('3!');
    });

    test('User clicks Start button after completion', async ({ page }) => {
        // Test clicking Start button again after completion
        await page.fill('#number', '4');
        await page.click('#start-button');
        await page.waitForTimeout(1000);

        const resultTextBeforeReset = await page.locator('#result').innerText();
        expect(resultTextBeforeReset).toContain('1!');
        expect(resultTextBeforeReset).toContain('2!');
        expect(resultTextBeforeReset).toContain('3!');
        expect(resultTextBeforeReset).toContain('4!');

        // Reset the state by clicking Start again
        await page.click('#start-button');

        // Verify that the result is cleared
        const resultTextAfterReset = await page.locator('#result').innerText();
        expect(resultTextAfterReset).toBe('');
    });

    test('Edge case: User inputs zero', async ({ page }) => {
        // Test the edge case where the input is zero
        await page.fill('#number', '0');
        await page.click('#start-button');

        // Wait for the result to be displayed
        await page.waitForTimeout(1000);

        const resultText = await page.locator('#result').innerText();
        expect(resultText).toBe('1!');
    });

    test('Edge case: User inputs negative number', async ({ page }) => {
        // Test the edge case where the input is negative
        await page.fill('#number', '-5');
        await page.click('#start-button');

        // Wait for the result to be displayed
        await page.waitForTimeout(1000);

        const resultText = await page.locator('#result').innerText();
        expect(resultText).toBe('');
    });
});