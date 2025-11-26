import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T04-43-42/html/7c192fb0-ca82-11f0-8193-f13bc409d3cb.html';

test.describe('Kruskal\'s Algorithm Visualization', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('Initial state is Idle', async ({ page }) => {
        const startButton = await page.locator('#startButton');
        const resetButton = await page.locator('#resetButton');
        
        // Verify that the start button is enabled and reset button is disabled
        await expect(startButton).toBeEnabled();
        await expect(resetButton).toBeDisabled();
    });

    test('User clicks Start button transitions to Processing', async ({ page }) => {
        const startButton = await page.locator('#startButton');
        
        // Click the start button
        await startButton.click();
        
        // Verify that the start button is disabled after click
        await expect(startButton).toBeDisabled();
        
        // Wait for the processing to complete
        await page.waitForTimeout(1000); // Simulating processing time
        
        // Check if the output is displayed
        const output = await page.locator('#output');
        await expect(output).toBeVisible();
    });

    test('Processing completes and transitions to Completed state', async ({ page }) => {
        const startButton = await page.locator('#startButton');
        await startButton.click();
        
        // Wait for the processing to complete
        await page.waitForTimeout(1000); // Simulating processing time
        
        // Verify that the output is displayed and the reset button is enabled
        const output = await page.locator('#output');
        await expect(output).toBeVisible();
        
        const resetButton = await page.locator('#resetButton');
        await expect(resetButton).toBeEnabled();
    });

    test('User clicks Reset button transitions to Idle', async ({ page }) => {
        const startButton = await page.locator('#startButton');
        const resetButton = await page.locator('#resetButton');
        
        // Start the algorithm
        await startButton.click();
        await page.waitForTimeout(1000); // Simulating processing time
        
        // Click the reset button
        await resetButton.click();
        
        // Verify that the output is cleared and the state returns to Idle
        const output = await page.locator('#output');
        await expect(output).toHaveText('');
        
        // Verify that the start button is enabled again
        await expect(startButton).toBeEnabled();
    });

    test('User clicks Reset button while in Idle state', async ({ page }) => {
        const resetButton = await page.locator('#resetButton');
        
        // Click the reset button
        await resetButton.click();
        
        // Verify that the reset button action is acknowledged
        await expect(resetButton).toBeDisabled(); // Assuming it gets disabled during reset
    });

    test('Resetting state completes and returns to Idle', async ({ page }) => {
        const startButton = await page.locator('#startButton');
        const resetButton = await page.locator('#resetButton');
        
        // Start the algorithm
        await startButton.click();
        await page.waitForTimeout(1000); // Simulating processing time
        
        // Click the reset button
        await resetButton.click();
        
        // Wait for the reset to complete
        await page.waitForTimeout(500); // Simulating reset time
        
        // Verify that the start button is enabled again
        await expect(startButton).toBeEnabled();
    });

    test('Edge case: Click Start multiple times', async ({ page }) => {
        const startButton = await page.locator('#startButton');
        
        // Click the start button multiple times
        await startButton.click();
        await startButton.click();
        
        // Verify that the start button is still disabled
        await expect(startButton).toBeDisabled();
    });

    test('Edge case: Click Reset before Start', async ({ page }) => {
        const resetButton = await page.locator('#resetButton');
        
        // Click the reset button before starting
        await resetButton.click();
        
        // Verify that the reset button action is acknowledged
        await expect(resetButton).toBeDisabled(); // Assuming it gets disabled during reset
    });
});