import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-35-35/html/bba5a212-ca89-11f0-800e-fdebe921fc5f.html';

test.describe('Selection Sort Application', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('Initial state - Idle', async ({ page }) => {
        // Validate that the application is in the Idle state
        const input = await page.locator('#input');
        const sortButton = await page.locator('#sort-btn');
        const resultDiv = await page.locator('#result');

        await expect(input).toBeVisible();
        await expect(input).toHaveAttribute('placeholder', 'Enter the number of elements');
        await expect(sortButton).toBeVisible();
        await expect(resultDiv).toHaveText('');
    });

    test('Sort button click with invalid input', async ({ page }) => {
        // Test clicking the sort button with no input
        await page.locator('#sort-btn').click();

        // Expect an alert to show up for invalid input
        await page.waitForTimeout(100); // Wait for alert to appear
        const alert = await page.evaluate(() => window.alert);
        expect(alert).toBeTruthy();
    });

    test('Sort button click with valid input', async ({ page }) => {
        // Test clicking the sort button with valid input
        await page.fill('#input', '5');
        await page.locator('#sort-btn').click();

        // Validate the transition to Sorting state and then Result Displayed state
        await expect(page.locator('#result')).toBeVisible();
        await expect(page.locator('#result')).toHaveText('5 5 5 5 5 '); // Since all elements are the same
    });

    test('Sort button click with edge case input (zero)', async ({ page }) => {
        // Test clicking the sort button with zero input
        await page.fill('#input', '0');
        await page.locator('#sort-btn').click();

        // Expect an alert to show up for invalid input
        await page.waitForTimeout(100); // Wait for alert to appear
        const alert = await page.evaluate(() => window.alert);
        expect(alert).toBeTruthy();
    });

    test('Sort button click with negative input', async ({ page }) => {
        // Test clicking the sort button with negative input
        await page.fill('#input', '-3');
        await page.locator('#sort-btn').click();

        // Expect an alert to show up for invalid input
        await page.waitForTimeout(100); // Wait for alert to appear
        const alert = await page.evaluate(() => window.alert);
        expect(alert).toBeTruthy();
    });

    test('Sort button click with valid input and check sorting', async ({ page }) => {
        // Test clicking the sort button with valid input and check sorting
        await page.fill('#input', '5');
        await page.evaluate(() => {
            const inputNum = 5;
            const arr = [5, 3, 4, 1, 2];
            const input = document.getElementById('input');
            input.value = inputNum;
            const sortBtn = document.getElementById('sort-btn');
            sortBtn.click();
        });

        // Validate the result is sorted correctly
        await expect(page.locator('#result')).toHaveText('1 2 3 4 5 ');
    });

    test.afterEach(async ({ page }) => {
        // Clean up actions if necessary
        await page.close();
    });
});