import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-25T17-37-02/html/5a558480-ca25-11f0-ad71-69ecf40ad507.html';

test.describe('K-Nearest Neighbors (KNN) Application', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the KNN application before each test
        await page.goto(BASE_URL);
    });

    test('should be in idle state initially', async ({ page }) => {
        // Verify the initial state of the application
        const resultText = await page.locator('#result').innerText();
        const messageText = await page.locator('#message').innerText();
        expect(resultText).toBe('');
        expect(messageText).toBe('');
    });

    test('should transition to calculating state on calculate button click', async ({ page }) => {
        // Input a distance and number of neighbors
        await page.fill('#distance', '10');
        await page.fill('#num-neighbors', '5');

        // Click the calculate button
        await page.click('button');

        // Verify that the result is displayed after calculation
        await page.waitForTimeout(1000); // Wait for calculation to complete
        const resultText = await page.locator('#result').innerText();
        const messageText = await page.locator('#message').innerText();
        expect(resultText).not.toBe('');
        expect(messageText).not.toBe('');
    });

    test('should clear inputs after calculation', async ({ page }) => {
        // Input a distance and number of neighbors
        await page.fill('#distance', '10');
        await page.fill('#num-neighbors', '5');

        // Click the calculate button
        await page.click('button');

        // Wait for calculation to complete
        await page.waitForTimeout(1000);

        // Verify that inputs are cleared
        const distanceValue = await page.locator('#distance').inputValue();
        const numNeighborsValue = await page.locator('#num-neighbors').inputValue();
        expect(distanceValue).toBe('');
        expect(numNeighborsValue).toBe('');
    });

    test('should handle edge case with zero distance', async ({ page }) => {
        // Input zero distance
        await page.fill('#distance', '0');
        await page.fill('#num-neighbors', '5');

        // Click the calculate button
        await page.click('button');

        // Wait for calculation to complete
        await page.waitForTimeout(1000);

        // Verify that the result is still displayed
        const resultText = await page.locator('#result').innerText();
        const messageText = await page.locator('#message').innerText();
        expect(resultText).not.toBe('');
        expect(messageText).not.toBe('');
    });

    test('should handle negative distance input', async ({ page }) => {
        // Input negative distance
        await page.fill('#distance', '-5');
        await page.fill('#num-neighbors', '5');

        // Click the calculate button
        await page.click('button');

        // Wait for calculation to complete
        await page.waitForTimeout(1000);

        // Verify that the result is still displayed
        const resultText = await page.locator('#result').innerText();
        const messageText = await page.locator('#message').innerText();
        expect(resultText).not.toBe('');
        expect(messageText).not.toBe('');
    });

    test('should not allow empty input', async ({ page }) => {
        // Click the calculate button without filling inputs
        await page.click('button');

        // Wait for calculation to complete
        await page.waitForTimeout(1000);

        // Verify that the result is not displayed
        const resultText = await page.locator('#result').innerText();
        const messageText = await page.locator('#message').innerText();
        expect(resultText).toBe('');
        expect(messageText).toBe('');
    });
});