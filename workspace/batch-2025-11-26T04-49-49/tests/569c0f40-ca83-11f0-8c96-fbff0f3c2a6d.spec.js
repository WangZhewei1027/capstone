import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T04-49-49/html/569c0f40-ca83-11f0-8c96-fbff0f3c2a6d.html';

test.describe('Union-Find Application', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should start in Idle state', async ({ page }) => {
        const searchInput = await page.locator('#search');
        const submitButton = await page.locator('button[type="submit"]');

        // Verify that the search input is enabled
        await expect(searchInput).toBeEnabled();
        // Verify that the submit button is enabled
        await expect(submitButton).toBeEnabled();
    });

    test('should transition to Searching state on valid input', async ({ page }) => {
        const searchInput = await page.locator('#search');
        const submitButton = await page.locator('button[type="submit"]');

        await searchInput.fill('valid input');
        await submitButton.click();

        // Verify that the search input is highlighted
        await expect(searchInput).toHaveCSS('border', /highlight/);
    });

    test('should transition to ProcessingSearch state on valid input', async ({ page }) => {
        const searchInput = await page.locator('#search');
        const submitButton = await page.locator('button[type="submit"]');

        await searchInput.fill('valid input');
        await submitButton.click();

        // Simulate input validation success
        await page.evaluate(() => {
            window.dispatchEvent(new Event('SearchInputValidated'));
        });

        // Verify loading indicator is shown
        await expect(page.locator('#loadingIndicator')).toBeVisible();
    });

    test('should display search results after processing', async ({ page }) => {
        const searchInput = await page.locator('#search');
        const submitButton = await page.locator('button[type="submit"]');

        await searchInput.fill('valid input');
        await submitButton.click();

        await page.evaluate(() => {
            window.dispatchEvent(new Event('SearchInputValidated'));
        });

        await page.evaluate(() => {
            window.dispatchEvent(new Event('SearchResultsDisplayed'));
        });

        // Verify that results are displayed in the table
        const results = await page.locator('#unionTableBody tr');
        await expect(results).toHaveCount(1); // Assuming one result for valid input
    });

    test('should show error alert for empty input', async ({ page }) => {
        const submitButton = await page.locator('button[type="submit"]');

        await submitButton.click();

        // Verify that the error dialog is shown
        await expect(page.locator('#errorDialog')).toBeVisible();
    });

    test('should return to Idle state after dismissing error', async ({ page }) => {
        const submitButton = await page.locator('button[type="submit"]');

        await submitButton.click();
        await page.evaluate(() => {
            window.dispatchEvent(new Event('SearchInputInvalid'));
        });

        const dismissButton = await page.locator('#dismissErrorButton');
        await dismissButton.click();

        // Verify that the error dialog is closed
        await expect(page.locator('#errorDialog')).not.toBeVisible();
        // Verify that the search input is reset
        const searchInput = await page.locator('#search');
        await expect(searchInput).toHaveValue('');
    });

    test('should handle edge case for invalid input', async ({ page }) => {
        const searchInput = await page.locator('#search');
        const submitButton = await page.locator('button[type="submit"]');

        await searchInput.fill(''); // Empty input
        await submitButton.click();

        // Verify that the error dialog is shown
        await expect(page.locator('#errorDialog')).toBeVisible();
    });

    test.afterEach(async ({ page }) => {
        // Cleanup actions if necessary
    });
});