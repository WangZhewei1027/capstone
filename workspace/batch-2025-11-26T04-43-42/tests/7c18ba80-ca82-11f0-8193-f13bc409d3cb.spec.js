import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T04-43-42/html/7c18ba80-ca82-11f0-8193-f13bc409d3cb.html';

test.describe('Radix Sort Visualization', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('Initial state is Idle', async ({ page }) => {
        // Verify that the sort button is enabled when in Idle state
        const sortButton = await page.locator('#sort-btn');
        await expect(sortButton).toBeEnabled();
    });

    test('Sort button is disabled when input is empty', async ({ page }) => {
        const sortButton = await page.locator('#sort-btn');
        await sortButton.click();
        await expect(sortButton).toBeDisabled();
    });

    test('Transition from Idle to Sorting state', async ({ page }) => {
        // Input numbers and click Sort
        await page.fill('#numbers', '3 1 2');
        const sortButton = await page.locator('#sort-btn');
        await sortButton.click();

        // Verify that the button is disabled and sorting animation is shown
        await expect(sortButton).toBeDisabled();
        await expect(page.locator('#result')).toContainText('Radix Sort:');
    });

    test('Transition from Sorting to Sorted state', async ({ page }) => {
        // Input numbers and click Sort
        await page.fill('#numbers', '3 1 2');
        const sortButton = await page.locator('#sort-btn');
        await sortButton.click();

        // Wait for sorting to complete
        await page.waitForTimeout(1000); // Adjust timeout if necessary

        // Verify that the result is displayed
        await expect(page.locator('#result')).toContainText('Sorted numbers:');
    });

    test('Transition from Sorted back to Idle state', async ({ page }) => {
        // Input numbers and click Sort
        await page.fill('#numbers', '3 1 2');
        const sortButton = await page.locator('#sort-btn');
        await sortButton.click();

        // Wait for sorting to complete
        await page.waitForTimeout(1000); // Adjust timeout if necessary

        // Click Sort again to reset
        await sortButton.click();

        // Verify that the input field is reset and button is enabled
        await expect(page.locator('#numbers')).toHaveValue('');
        await expect(sortButton).toBeEnabled();
    });

    test('Handle edge case with empty input', async ({ page }) => {
        const sortButton = await page.locator('#sort-btn');
        await sortButton.click();

        // Verify that no sorting occurs and result remains empty
        await expect(page.locator('#result')).toHaveText('');
    });

    test('Handle edge case with invalid input', async ({ page }) => {
        await page.fill('#numbers', 'abc');
        const sortButton = await page.locator('#sort-btn');
        await sortButton.click();

        // Verify that no sorting occurs and result remains empty
        await expect(page.locator('#result')).toHaveText('');
    });
});