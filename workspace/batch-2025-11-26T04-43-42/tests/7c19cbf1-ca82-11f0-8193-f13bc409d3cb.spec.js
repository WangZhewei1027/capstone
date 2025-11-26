import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T04-43-42/html/7c19cbf1-ca82-11f0-8193-f13bc409d3cb.html';

test.describe('K-Nearest Neighbors (KNN) Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('Initial state should be Idle', async ({ page }) => {
        const resultText = await page.locator('#result').textContent();
        expect(resultText).toBe('');
    });

    test('User inputs features and transitions to InputFeatures state', async ({ page }) => {
        await page.fill('#features', '1 2 3');
        const resultText = await page.locator('#result').textContent();
        expect(resultText).toBe('');
    });

    test('User clicks Search button and transitions to CalculatingKNN state', async ({ page }) => {
        await page.fill('#features', '1 2 3');
        await page.click('.button'); // Search button
        await page.waitForTimeout(1000); // Wait for calculation
        const resultText = await page.locator('#result').textContent();
        expect(resultText).not.toBe('');
    });

    test('User inputs K and transitions to InputK state', async ({ page }) => {
        await page.fill('#features', '1 2 3');
        await page.fill('#k', '2');
        const resultText = await page.locator('#result').textContent();
        expect(resultText).toBe('');
    });

    test('User clicks Calculate button and transitions to CalculatingKNN state', async ({ page }) => {
        await page.fill('#features', '1 2 3');
        await page.fill('#k', '2');
        await page.click('.button'); // Calculate button
        await page.waitForTimeout(1000); // Wait for calculation
        const resultText = await page.locator('#result').textContent();
        expect(resultText).not.toBe('');
    });

    test('Inputting features after calculation should clear the result', async ({ page }) => {
        await page.fill('#features', '1 2 3');
        await page.click('.button'); // Search button
        await page.waitForTimeout(1000); // Wait for calculation
        await page.fill('#features', '4 5 6'); // New input
        const resultText = await page.locator('#result').textContent();
        expect(resultText).toBe('');
    });

    test('Inputting K after calculation should clear the result', async ({ page }) => {
        await page.fill('#features', '1 2 3');
        await page.click('.button'); // Search button
        await page.waitForTimeout(1000); // Wait for calculation
        await page.fill('#k', '3'); // New K input
        const resultText = await page.locator('#result').textContent();
        expect(resultText).toBe('');
    });

    test('Edge case: Inputting invalid features should not crash the app', async ({ page }) => {
        await page.fill('#features', 'invalid input');
        await page.click('.button'); // Search button
        const resultText = await page.locator('#result').textContent();
        expect(resultText).toBe('');
    });

    test('Edge case: Inputting invalid K should not crash the app', async ({ page }) => {
        await page.fill('#features', '1 2 3');
        await page.fill('#k', 'invalid');
        await page.click('.button'); // Calculate button
        const resultText = await page.locator('#result').textContent();
        expect(resultText).toBe('');
    });
});