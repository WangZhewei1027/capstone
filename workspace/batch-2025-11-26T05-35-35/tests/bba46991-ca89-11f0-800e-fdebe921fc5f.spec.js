import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-35-35/html/bba46991-ca89-11f0-800e-fdebe921fc5f.html';

test.describe('Deque Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the Deque application before each test
        await page.goto(BASE_URL);
    });

    test('Initial state - Idle', async ({ page }) => {
        // Verify that the application is in the Idle state
        const createButton = await page.locator('#deque');
        const clearButton = await page.locator('#deque-clear');
        const showButton = await page.locator('#deque-show');

        await expect(createButton).toBeVisible();
        await expect(clearButton).toBeVisible();
        await expect(showButton).toBeVisible();

        // Check that the Create Deque button is enabled
        await expect(createButton).toBeEnabled();
        // Check that the Clear and Show buttons are disabled
        await expect(clearButton).toBeDisabled();
        await expect(showButton).toBeDisabled();
    });

    test('Create Deque - Transition to Deque Created', async ({ page }) => {
        // Click the Create Deque button
        await page.click('#deque');

        // Verify that the Deque is created and buttons are disabled/enabled correctly
        const createButton = await page.locator('#deque');
        const clearButton = await page.locator('#deque-clear');
        const showButton = await page.locator('#deque-show');
        const dequeContainer = await page.locator('.deque-container');

        await expect(createButton).toBeDisabled();
        await expect(clearButton).toBeEnabled();
        await expect(showButton).toBeEnabled();
        await expect(dequeContainer).toHaveText('');
    });

    test('Clear Deque - Remain in Deque Created', async ({ page }) => {
        // Create a deque first
        await page.click('#deque');

        // Click the Clear Deque button
        await page.click('#deque-clear');

        // Verify that the Deque is cleared
        const dequeContainer = await page.locator('.deque-container');

        await expect(dequeContainer).toHaveText('');
    });

    test('Show Deque - Display contents', async ({ page }) => {
        // Create a deque first
        await page.click('#deque');

        // Attempt to show the deque (should be empty)
        await page.click('#deque-show');

        // Verify that the displayed contents are empty
        const showButton = await page.locator('#deque-show');
        await expect(showButton).toHaveText('');
    });

    test('Clear Deque - Check state after clearing', async ({ page }) => {
        // Create a deque first
        await page.click('#deque');

        // Clear the deque
        await page.click('#deque-clear');

        // Verify that the buttons are in the correct state
        const createButton = await page.locator('#deque');
        const clearButton = await page.locator('#deque-clear');
        const showButton = await page.locator('#deque-show');

        await expect(createButton).toBeDisabled();
        await expect(clearButton).toBeEnabled();
        await expect(showButton).toBeEnabled();
    });

    test('Show Deque - After clearing', async ({ page }) => {
        // Create a deque first
        await page.click('#deque');

        // Clear the deque
        await page.click('#deque-clear');

        // Attempt to show the deque (should still be empty)
        await page.click('#deque-show');

        // Verify that the displayed contents are still empty
        const showButton = await page.locator('#deque-show');
        await expect(showButton).toHaveText('');
    });
});