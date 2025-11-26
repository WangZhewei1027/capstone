import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-35-35/html/bba63e50-ca89-11f0-800e-fdebe921fc5f.html';

test.describe('Binary Search Application', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the Binary Search application
        await page.goto(BASE_URL);
    });

    test('should display the initial idle state', async ({ page }) => {
        // Verify that the form is present in the idle state
        const form = await page.locator('#search-form');
        await expect(form).toBeVisible();
        
        const lowInput = await page.locator('#low');
        const highInput = await page.locator('#high');
        await expect(lowInput).toBeVisible();
        await expect(highInput).toBeVisible();
        
        const resultDiv = await page.locator('#result');
        await expect(resultDiv).toHaveText('');
    });

    test('should transition to searching state on form submission', async ({ page }) => {
        // Input values and submit the form
        await page.fill('#low', '10');
        await page.fill('#high', '50');
        await page.click('button[type="submit"]');
        
        // Verify that the result div is updated after submission
        const resultDiv = await page.locator('#result');
        await expect(resultDiv).toBeVisible();
    });

    test('should display result when element is found', async ({ page }) => {
        // Input values that will lead to a found result
        await page.fill('#low', '10');
        await page.fill('#high', '10'); // Searching for the same value
        await page.click('button[type="submit"]');
        
        // Verify the result indicates the element is present
        const resultDiv = await page.locator('#result');
        await expect(resultDiv).toHaveText(/Element is present at index/);
    });

    test('should display result when element is not found', async ({ page }) => {
        // Input values that will lead to a not found result
        await page.fill('#low', '20');
        await page.fill('#high', '10'); // Invalid range
        await page.click('button[type="submit"]');
        
        // Verify the result indicates the element is not present
        const resultDiv = await page.locator('#result');
        await expect(resultDiv).toHaveText(/Element is not present at any index/);
    });

    test('should handle edge case with invalid input', async ({ page }) => {
        // Attempt to submit the form with invalid inputs
        await page.fill('#low', 'abc'); // Invalid low value
        await page.fill('#high', '50');
        await page.click('button[type="submit"]');
        
        // Verify that the result is not updated
        const resultDiv = await page.locator('#result');
        await expect(resultDiv).toHaveText('');
        
        // Check if the form is still visible
        const form = await page.locator('#search-form');
        await expect(form).toBeVisible();
    });

    test('should not allow submission with empty inputs', async ({ page }) => {
        // Attempt to submit the form without filling inputs
        await page.click('button[type="submit"]');
        
        // Verify that the result is not updated
        const resultDiv = await page.locator('#result');
        await expect(resultDiv).toHaveText('');
        
        // Check if the form is still visible
        const form = await page.locator('#search-form');
        await expect(form).toBeVisible();
    });
});