import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-25T23-45-53/html/e1386e32-ca58-11f0-b3c1-8750c080fb19.html';

test.describe('Knapsack Problem Solver', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should start in Idle state and enable inputs', async ({ page }) => {
        const weightsInput = await page.locator('#weights');
        const valuesInput = await page.locator('#values');
        const capacityInput = await page.locator('#capacity');

        await expect(weightsInput).toBeEnabled();
        await expect(valuesInput).toBeEnabled();
        await expect(capacityInput).toBeEnabled();
    });

    test('should transition to InputtingData state on Solve button click', async ({ page }) => {
        await page.fill('#weights', '1,2,3');
        await page.fill('#values', '10,15,40');
        await page.fill('#capacity', '6');

        await page.click('button');

        // Verify that inputs are disabled
        const weightsInput = await page.locator('#weights');
        const valuesInput = await page.locator('#values');
        const capacityInput = await page.locator('#capacity');

        await expect(weightsInput).toBeDisabled();
        await expect(valuesInput).toBeDisabled();
        await expect(capacityInput).toBeDisabled();
    });

    test('should show error message for mismatched input lengths', async ({ page }) => {
        await page.fill('#weights', '1,2,3');
        await page.fill('#values', '10,15'); // Mismatched length
        await page.fill('#capacity', '6');

        await page.click('button');

        const resultDiv = await page.locator('#result');
        await expect(resultDiv).toHaveText('Error: Weights and Values must be of the same length!');
    });

    test('should calculate maximum profit for valid inputs', async ({ page }) => {
        await page.fill('#weights', '1,2,3');
        await page.fill('#values', '10,15,40');
        await page.fill('#capacity', '6');

        await page.click('button');

        // Wait for the result to be displayed
        const resultDiv = await page.locator('#result');
        await expect(resultDiv).toHaveText(/Maximum Profit: \d+/);
    });

    test('should allow inputs to be re-enabled after calculation', async ({ page }) => {
        await page.fill('#weights', '1,2,3');
        await page.fill('#values', '10,15,40');
        await page.fill('#capacity', '6');

        await page.click('button');

        // Wait for the result to be displayed
        await page.waitForTimeout(1000); // Wait for calculation to complete

        const weightsInput = await page.locator('#weights');
        const valuesInput = await page.locator('#values');
        const capacityInput = await page.locator('#capacity');

        await expect(weightsInput).toBeEnabled();
        await expect(valuesInput).toBeEnabled();
        await expect(capacityInput).toBeEnabled();
    });

    test('should handle empty input fields gracefully', async ({ page }) => {
        await page.fill('#weights', '');
        await page.fill('#values', '');
        await page.fill('#capacity', '');

        await page.click('button');

        const resultDiv = await page.locator('#result');
        await expect(resultDiv).toHaveText('Error: Weights and Values must be of the same length!');
    });
});