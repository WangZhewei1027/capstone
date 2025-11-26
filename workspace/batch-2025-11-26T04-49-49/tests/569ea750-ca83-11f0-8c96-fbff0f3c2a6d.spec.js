import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T04-49-49/html/569ea750-ca83-11f0-8c96-fbff0f3c2a6d.html';

test.describe('Prim\'s Algorithm Visualization', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should start in Idle state', async ({ page }) => {
        const startButton = await page.locator('button#startButton');
        await expect(startButton).toBeEnabled();
    });

    test('should transition to Processing state when Start button is clicked', async ({ page }) => {
        const startButton = await page.locator('button#startButton');
        await startButton.click();
        
        // Verify that the processing animation is shown
        const processingAnimation = await page.locator('#processingAnimation');
        await expect(processingAnimation).toBeVisible();
        
        // Verify that the Start button is disabled
        await expect(startButton).toBeDisabled();
    });

    test('should transition to Completed state after processing', async ({ page }) => {
        const startButton = await page.locator('button#startButton');
        await startButton.click();
        
        // Simulate processing complete event
        await page.evaluate(() => {
            document.dispatchEvent(new Event('PROCESSING_COMPLETE'));
        });

        // Verify that results are displayed
        const results = await page.locator('#results');
        await expect(results).toBeVisible();
    });

    test('should transition to Error state if processing fails', async ({ page }) => {
        const startButton = await page.locator('button#startButton');
        await startButton.click();
        
        // Simulate processing error event
        await page.evaluate(() => {
            document.dispatchEvent(new Event('PROCESSING_ERROR'));
        });

        // Verify that the error message is shown
        const errorMessage = await page.locator('#errorMessage');
        await expect(errorMessage).toBeVisible();
    });

    test('should reset to Idle state when Reset button is clicked from Error state', async ({ page }) => {
        const startButton = await page.locator('button#startButton');
        await startButton.click();
        
        // Simulate processing error event
        await page.evaluate(() => {
            document.dispatchEvent(new Event('PROCESSING_ERROR'));
        });

        const resetButton = await page.locator('button#resetButton');
        await resetButton.click();

        // Verify that the error message is cleared
        const errorMessage = await page.locator('#errorMessage');
        await expect(errorMessage).toBeHidden();

        // Verify that the Start button is enabled again
        await expect(startButton).toBeEnabled();
    });

    test('should reset to Idle state when Reset button is clicked from Completed state', async ({ page }) => {
        const startButton = await page.locator('button#startButton');
        await startButton.click();
        
        // Simulate processing complete event
        await page.evaluate(() => {
            document.dispatchEvent(new Event('PROCESSING_COMPLETE'));
        });

        const resetButton = await page.locator('button#resetButton');
        await resetButton.click();

        // Verify that the results are cleared
        const results = await page.locator('#results');
        await expect(results).toBeHidden();

        // Verify that the Start button is enabled again
        await expect(startButton).toBeEnabled();
    });
});