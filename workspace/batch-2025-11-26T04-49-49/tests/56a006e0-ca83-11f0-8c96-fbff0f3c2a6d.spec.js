import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T04-49-49/html/56a006e0-ca83-11f0-8c96-fbff0f3c2a6d.html';

test.describe('Linear Regression Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('Initial state is Idle and Generate button is enabled', async ({ page }) => {
        const generateButton = page.locator('button:has-text("Generate Regression")');
        await expect(generateButton).toBeEnabled();
        await expect(page).toHaveTitle(/Linear Regression/);
    });

    test('Clicking Generate Regression transitions to GeneratingRegression state', async ({ page }) => {
        const generateButton = page.locator('button:has-text("Generate Regression")');
        
        // Click the button to generate regression
        await generateButton.click();
        
        // Check if the button is disabled and loading indicator is shown
        await expect(generateButton).toBeDisabled();
        await expect(page.locator('text=Loading...')).toBeVisible();
    });

    test('Regression process completes and transitions to RegressionComplete state', async ({ page }) => {
        const generateButton = page.locator('button:has-text("Generate Regression")');
        
        // Simulate clicking the button
        await generateButton.click();
        
        // Wait for the loading to complete and results to be displayed
        await page.waitForTimeout(3000); // Simulate the regression processing time
        
        // Check if regression results are displayed
        await expect(page.locator('text=Regression Results')).toBeVisible();
        await expect(page.locator('text=Loading...')).toBeHidden();
    });

    test('Clicking Generate Regression again resets to Idle state', async ({ page }) => {
        const generateButton = page.locator('button:has-text("Generate Regression")');
        
        // Click to generate regression
        await generateButton.click();
        await page.waitForTimeout(3000); // Wait for the regression to complete
        
        // Click again to reset
        await generateButton.click();
        
        // Verify that we are back to Idle state
        await expect(generateButton).toBeEnabled();
        await expect(page.locator('text=Regression Results')).toBeHidden();
    });

    test('Edge case: Clicking Generate Regression while loading', async ({ page }) => {
        const generateButton = page.locator('button:has-text("Generate Regression")');
        
        // Click to generate regression
        await generateButton.click();
        
        // Attempt to click again while loading
        await generateButton.click();
        
        // Verify that the button remains disabled
        await expect(generateButton).toBeDisabled();
        await expect(page.locator('text=Loading...')).toBeVisible();
    });

    test('Error handling: Simulate regression failure', async ({ page }) => {
        const generateButton = page.locator('button:has-text("Generate Regression")');
        
        // Click to generate regression
        await generateButton.click();
        
        // Simulate an error (this would typically be done by mocking the backend)
        await page.waitForTimeout(3000); // Wait for the regression to complete
        
        // Check for an error message
        await expect(page.locator('text=Error: Regression failed')).toBeVisible();
    });
});