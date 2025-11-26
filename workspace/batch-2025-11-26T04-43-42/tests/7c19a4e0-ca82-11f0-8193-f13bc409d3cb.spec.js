import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T04-43-42/html/7c19a4e0-ca82-11f0-8193-f13bc409d3cb.html';

test.describe('Sliding Window Visualization Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application before each test
        await page.goto(BASE_URL);
    });

    test('Initial state is Idle', async ({ page }) => {
        // Verify that the application starts in the Idle state
        const startButton = await page.locator('#startButton');
        await expect(startButton).toBeVisible();
        await expect(startButton).toBeEnabled();
    });

    test('Clicking Start transitions to SlidingWindowStart', async ({ page }) => {
        // Simulate clicking the Start button
        const startButton = await page.locator('#startButton');
        await startButton.click();

        // Verify the transition to SlidingWindowStart
        await expect(startButton).toBeDisabled();
        // Additional checks for initialization can be added here
    });

    test('SlidingWindowStart transitions to WindowProcessing', async ({ page }) => {
        // Start the sliding window
        const startButton = await page.locator('#startButton');
        await startButton.click();

        // Simulate the completion of window processing
        await page.evaluate(() => {
            // Simulate the window processing complete event
            window.dispatchEvent(new Event('WindowProcessingComplete'));
        });

        // Verify the transition to WindowProcessing
        // Check for any visual feedback or DOM changes
        await expect(page.locator('#window')).toContainText('Window array:');
    });

    test('WindowProcessing transitions to WindowCompleted', async ({ page }) => {
        // Start the sliding window
        const startButton = await page.locator('#startButton');
        await startButton.click();

        // Simulate the processing completion
        await page.evaluate(() => {
            window.dispatchEvent(new Event('WindowProcessingComplete'));
        });

        // Verify the transition to WindowCompleted
        await expect(page.locator('#window')).toContainText('Window array:');
    });

    test('Clicking Reset transitions back to Idle', async ({ page }) => {
        // Start the sliding window
        const startButton = await page.locator('#startButton');
        await startButton.click();

        // Simulate the completion of window processing
        await page.evaluate(() => {
            window.dispatchEvent(new Event('WindowProcessingComplete'));
        });

        // Click the Reset button
        const resetButton = await page.locator('#resetButton');
        await resetButton.click();

        // Verify the transition back to Idle
        await expect(startButton).toBeVisible();
        await expect(startButton).toBeEnabled();
    });

    test('Reset during processing should handle edge cases', async ({ page }) => {
        // Start the sliding window
        const startButton = await page.locator('#startButton');
        await startButton.click();

        // Simulate the processing completion
        await page.evaluate(() => {
            window.dispatchEvent(new Event('WindowProcessingComplete'));
        });

        // Click Reset button
        const resetButton = await page.locator('#resetButton');
        await resetButton.click();

        // Verify that the application is back to Idle state
        await expect(startButton).toBeVisible();
        await expect(startButton).toBeEnabled();
    });
});