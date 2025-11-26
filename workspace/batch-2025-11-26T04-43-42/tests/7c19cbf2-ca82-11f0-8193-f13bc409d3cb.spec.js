import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T04-43-42/html/7c19cbf2-ca82-11f0-8193-f13bc409d3cb.html';

test.describe('K-Means Clustering Application', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should be in Idle state initially', async ({ page }) => {
        const submitButton = await page.locator('button[type="submit"]');
        await expect(submitButton).toBeEnabled(); // Form should be enabled
    });

    test('should transition to DataInput state on submit click', async ({ page }) => {
        const submitButton = await page.locator('button[type="submit"]');
        await submitButton.click();
        await expect(page.locator('#data')).toHaveFocus(); // Input should be focused
    });

    test('should transition to ProcessingData state with valid input', async ({ page }) => {
        const inputField = await page.locator('#data');
        await inputField.fill('1,2\n3,4\n5,6');
        const submitButton = await page.locator('button[type="submit"]');
        await submitButton.click();

        // Simulate data validation completion
        await page.waitForTimeout(1000); // Wait for processing
        await expect(page.locator('#chart')).toBeVisible(); // Chart should be visible
    });

    test('should show error alert for invalid input', async ({ page }) => {
        const inputField = await page.locator('#data');
        await inputField.fill('invalid,data');
        const submitButton = await page.locator('button[type="submit"]');
        await submitButton.click();

        // Simulate data validation failure
        await page.waitForTimeout(1000); // Wait for processing
        await expect(page.locator('#error')).toBeVisible(); // Error dialog should be visible
    });

    test('should return to DataInput state when error is dismissed', async ({ page }) => {
        const inputField = await page.locator('#data');
        await inputField.fill('invalid,data');
        const submitButton = await page.locator('button[type="submit"]');
        await submitButton.click();

        // Simulate data validation failure
        await page.waitForTimeout(1000); // Wait for processing
        const dismissButton = await page.locator('#error .dismiss'); // Assuming there's a dismiss button
        await dismissButton.click();

        await expect(inputField).toHaveFocus(); // Input should be focused again
    });

    test('should transition to Idle state after clustering is complete', async ({ page }) => {
        const inputField = await page.locator('#data');
        await inputField.fill('1,2\n3,4\n5,6');
        const submitButton = await page.locator('button[type="submit"]');
        await submitButton.click();

        // Simulate data validation completion
        await page.waitForTimeout(1000); // Wait for processing
        await expect(page.locator('#chart')).toBeVisible(); // Chart should be visible

        // Simulate clustering completion
        await page.waitForTimeout(1000); // Wait for clustering
        const submitButtonAfterClustering = await page.locator('button[type="submit"]');
        await expect(submitButtonAfterClustering).toBeEnabled(); // Form should be enabled again
    });
});