import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-40-02/html/5abf27e0-ca8a-11f0-8532-d714b1159c0d.html';

test.describe('Knapsack Problem Application', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application before each test
        await page.goto(BASE_URL);
    });

    test('should render the initial state correctly', async ({ page }) => {
        // Validate that the form and submit button are present
        const form = await page.locator('#knapsack-form');
        const submitButton = await page.locator('#submit-btn');
        const outputDiv = await page.locator('#output');

        await expect(form).toBeVisible();
        await expect(submitButton).toBeVisible();
        await expect(outputDiv).toHaveText('');
    });

    test('should calculate optimal solution for valid inputs', async ({ page }) => {
        // Input valid weight, value, and capacity
        await page.fill('#weight', '10');
        await page.fill('#value', '60');
        await page.fill('#capacity', '50');

        // Click the submit button
        await page.click('#submit-btn');

        // Validate the output message for optimal solution
        const outputDiv = await page.locator('#output');
        await expect(outputDiv).toHaveText(/The optimal solution is to take 10 units of weight and \d+ units of value./);
    });

    test('should handle cases where the optimal solution is not feasible', async ({ page }) => {
        // Input values that lead to no feasible solution
        await page.fill('#weight', '100');
        await page.fill('#value', '60');
        await page.fill('#capacity', '50');

        // Click the submit button
        await page.click('#submit-btn');

        // Validate the output message indicating no feasible solution
        const outputDiv = await page.locator('#output');
        await expect(outputDiv).toHaveText('The optimal solution is not feasible.');
    });

    test('should validate empty inputs', async ({ page }) => {
        // Click the submit button without filling any inputs
        await page.click('#submit-btn');

        // Validate that the output message is still empty
        const outputDiv = await page.locator('#output');
        await expect(outputDiv).toHaveText('');
    });

    test('should validate non-numeric inputs', async ({ page }) => {
        // Input non-numeric values
        await page.fill('#weight', 'abc');
        await page.fill('#value', 'xyz');
        await page.fill('#capacity', '50');

        // Click the submit button
        await page.click('#submit-btn');

        // Validate that the output message is still empty
        const outputDiv = await page.locator('#output');
        await expect(outputDiv).toHaveText('');
    });

    test('should handle edge case of zero capacity', async ({ page }) => {
        // Input values with zero capacity
        await page.fill('#weight', '10');
        await page.fill('#value', '60');
        await page.fill('#capacity', '0');

        // Click the submit button
        await page.click('#submit-btn');

        // Validate the output message indicating no feasible solution
        const outputDiv = await page.locator('#output');
        await expect(outputDiv).toHaveText('The optimal solution is not feasible.');
    });
});