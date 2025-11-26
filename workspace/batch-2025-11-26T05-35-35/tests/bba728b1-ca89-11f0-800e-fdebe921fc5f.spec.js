import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-35-35/html/bba728b1-ca89-11f0-800e-fdebe921fc5f.html';

test.describe('Linear Regression Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application before each test
        await page.goto(BASE_URL);
    });

    test('Initial state: Idle', async ({ page }) => {
        // Verify that the application is in the Idle state
        const calculateButton = await page.locator('#calculate');
        await expect(calculateButton).toBeVisible();
        await expect(page.locator('#x1')).toHaveValue('1');
        await expect(page.locator('#x2')).toHaveValue('2');
        await expect(page.locator('#x3')).toHaveValue('3');
        await expect(page.locator('#y1')).toHaveValue('2');
        await expect(page.locator('#y2')).toHaveValue('3');
        await expect(page.locator('#y3')).toHaveValue('4');
    });

    test('Transition from Idle to Calculating on Calculate button click', async ({ page }) => {
        // Simulate user input and click the calculate button
        await page.fill('#x1', '1');
        await page.fill('#x2', '2');
        await page.fill('#x3', '3');
        await page.fill('#y1', '2');
        await page.fill('#y2', '3');
        await page.fill('#y3', '4');

        // Click the calculate button
        await page.click('#calculate');

        // Verify that the application is in the Calculating state
        // Here we assume that the calculating state doesn't have a specific UI change
        // So we will wait for the chart to be displayed
        await page.waitForTimeout(1000); // Wait for the calculation to complete
    });

    test('Transition from Calculating to Chart Displayed', async ({ page }) => {
        // Simulate user input and click the calculate button
        await page.fill('#x1', '1');
        await page.fill('#x2', '2');
        await page.fill('#x3', '3');
        await page.fill('#y1', '2');
        await page.fill('#y2', '3');
        await page.fill('#y3', '4');

        // Click the calculate button
        await page.click('#calculate');

        // Verify that the chart is displayed
        const chart = await page.locator('#chart');
        await expect(chart).toBeVisible();
    });

    test('Edge case: Invalid input handling', async ({ page }) => {
        // Fill inputs with invalid data
        await page.fill('#x1', 'invalid');
        await page.fill('#y1', 'invalid');

        // Click the calculate button
        await page.click('#calculate');

        // Verify that the chart is not displayed (assuming some error handling)
        const chart = await page.locator('#chart');
        await expect(chart).toBeHidden();
    });

    test('Edge case: Empty input handling', async ({ page }) => {
        // Clear inputs
        await page.fill('#x1', '');
        await page.fill('#y1', '');

        // Click the calculate button
        await page.click('#calculate');

        // Verify that the chart is not displayed (assuming some error handling)
        const chart = await page.locator('#chart');
        await expect(chart).toBeHidden();
    });

    test('Verify chart data after calculation', async ({ page }) => {
        // Fill inputs with valid data
        await page.fill('#x1', '1');
        await page.fill('#x2', '2');
        await page.fill('#x3', '3');
        await page.fill('#y1', '2');
        await page.fill('#y2', '3');
        await page.fill('#y3', '4');

        // Click the calculate button
        await page.click('#calculate');

        // Verify that the chart is displayed and has data
        const chart = await page.locator('#chart');
        await expect(chart).toBeVisible();

        // Additional verification could be done here if we had access to chart data
    });
});