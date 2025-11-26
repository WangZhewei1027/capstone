import { test, expect } from '@playwright/test';

const baseURL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T04-43-42/html/7c1956c1-ca82-11f0-8193-f13bc409d3cb.html';

test.describe('Knapsack Problem Application', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application before each test
        await page.goto(baseURL);
    });

    test('should display the form in idle state', async ({ page }) => {
        // Verify that the form is displayed and enabled in the idle state
        const form = await page.locator('#knapsack-form');
        await expect(form).toBeVisible();
        await expect(form).toBeEnabled();
    });

    test('should show alert for invalid input', async ({ page }) => {
        // Fill the form with invalid input and submit
        await page.fill('#weight', '10');
        await page.fill('#value', '-5'); // Invalid value
        await page.fill('#capacity', '15');
        await page.click('button[type="submit"]');

        // Verify that an alert is shown for invalid input
        await page.waitForTimeout(500); // Wait for alert to show
        await expect(page).toHaveAlert('Invalid input');
    });

    test('should calculate and display results for valid input', async ({ page }) => {
        // Fill the form with valid input and submit
        await page.fill('#weight', '10');
        await page.fill('#value', '20');
        await page.fill('#capacity', '15');
        await page.click('button[type="submit"]');

        // Wait for results to be rendered
        await page.waitForSelector('#knapsack-results');

        // Verify that results are displayed
        const results = await page.locator('#knapsack-results');
        await expect(results).toContainText('Weight');
        await expect(results).toContainText('Sub-Weight');
        await expect(results).toContainText('Value');
    });

    test('should reset form after displaying results', async ({ page }) => {
        // Fill the form with valid input and submit
        await page.fill('#weight', '10');
        await page.fill('#value', '20');
        await page.fill('#capacity', '15');
        await page.click('button[type="submit"]');

        // Wait for results to be rendered
        await page.waitForSelector('#knapsack-results');

        // Verify that results are displayed
        await expect(page.locator('#knapsack-results')).toBeVisible();

        // Reset the form
        await page.fill('#weight', '');
        await page.fill('#value', '');
        await page.fill('#capacity', '');

        // Verify that the form is reset
        await expect(page.locator('#weight')).toHaveValue('');
        await expect(page.locator('#value')).toHaveValue('');
        await expect(page.locator('#capacity')).toHaveValue('');
    });

    test('should handle edge case with zero capacity', async ({ page }) => {
        // Fill the form with zero capacity
        await page.fill('#weight', '10');
        await page.fill('#value', '20');
        await page.fill('#capacity', '0');
        await page.click('button[type="submit"]');

        // Verify that an alert is shown for invalid input
        await page.waitForTimeout(500); // Wait for alert to show
        await expect(page).toHaveAlert('Invalid input');
    });

    test('should handle edge case with negative weight', async ({ page }) => {
        // Fill the form with negative weight
        await page.fill('#weight', '-10');
        await page.fill('#value', '20');
        await page.fill('#capacity', '15');
        await page.click('button[type="submit"]');

        // Verify that an alert is shown for invalid input
        await page.waitForTimeout(500); // Wait for alert to show
        await expect(page).toHaveAlert('Invalid input');
    });
});