import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T04-43-42/html/7c18ba81-ca82-11f0-8193-f13bc409d3cb.html';

test.describe('Linear Search Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('Initial state should be Idle', async ({ page }) => {
        const searchButton = await page.locator('#searchButton');
        await expect(searchButton).toBeEnabled(); // Search button should be enabled
    });

    test('Search button click transitions to Searching state', async ({ page }) => {
        const searchButton = await page.locator('#searchButton');
        await searchButton.click(); // Trigger search

        // Verify loading indicator is shown and button is disabled
        await expect(searchButton).toBeDisabled();
        await expect(page.locator('#result')).toHaveText(''); // Result should be empty during search
    });

    test('Searching state transitions to ResultFound when element is found', async ({ page }) => {
        const searchButton = await page.locator('#searchButton');
        await searchButton.click(); // Trigger search

        // Wait for result to be displayed
        await page.waitForTimeout(500); // Simulate waiting for search result
        await expect(page.locator('#result')).toHaveText(/Element found: \d+/); // Check for found result
    });

    test('Searching state transitions to ResultNotFound when element is not found', async ({ page }) => {
        const searchButton = await page.locator('#searchButton');
        await page.fill('#numElements', '5'); // Set number of elements to 5
        await searchButton.click(); // Trigger search

        // Wait for result to be displayed
        await page.waitForTimeout(500); // Simulate waiting for search result
        await expect(page.locator('#result')).toHaveText('Element not found'); // Check for not found message
    });

    test('ResultFound state clears input field', async ({ page }) => {
        const searchButton = await page.locator('#searchButton');
        await searchButton.click(); // Trigger search

        // Wait for result to be displayed
        await page.waitForTimeout(500); // Simulate waiting for search result
        await expect(page.locator('#result')).toHaveText(/Element found: \d+/); // Check for found result

        // Check if input field is cleared
        await expect(page.locator('#numElements')).toHaveValue(''); // Input field should be cleared
    });

    test('ResultNotFound state clears input field', async ({ page }) => {
        const searchButton = await page.locator('#searchButton');
        await page.fill('#numElements', '5'); // Set number of elements to 5
        await searchButton.click(); // Trigger search

        // Wait for result to be displayed
        await page.waitForTimeout(500); // Simulate waiting for search result
        await expect(page.locator('#result')).toHaveText('Element not found'); // Check for not found message

        // Check if input field is cleared
        await expect(page.locator('#numElements')).toHaveValue(''); // Input field should be cleared
    });

    test('Search button should remain disabled during searching', async ({ page }) => {
        const searchButton = await page.locator('#searchButton');
        await searchButton.click(); // Trigger search

        // Verify button is disabled during search
        await expect(searchButton).toBeDisabled();
        await page.waitForTimeout(500); // Simulate waiting for search result
        await expect(searchButton).toBeDisabled(); // Button should still be disabled
    });

    test('Search button should be enabled after search completes', async ({ page }) => {
        const searchButton = await page.locator('#searchButton');
        await searchButton.click(); // Trigger search

        // Wait for result to be displayed
        await page.waitForTimeout(500); // Simulate waiting for search result
        await expect(searchButton).toBeEnabled(); // Button should be enabled after search completes
    });
});