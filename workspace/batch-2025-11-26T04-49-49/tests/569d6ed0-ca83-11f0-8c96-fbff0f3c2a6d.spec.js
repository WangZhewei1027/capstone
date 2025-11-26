import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T04-49-49/html/569d6ed0-ca83-11f0-8c96-fbff0f3c2a6d.html';

test.describe('Radix Sort Visualization Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('Initial state should be Idle', async ({ page }) => {
    const startButton = await page.locator('#startButton');
    const resetButton = await page.locator('#resetButton');
    
    // Verify that the start button is enabled and reset button is disabled
    await expect(startButton).toBeEnabled();
    await expect(resetButton).toBeDisabled();
  });

  test('Clicking Start transitions to Sorting state', async ({ page }) => {
    const startButton = await page.locator('#startButton');
    
    // Click the start button
    await startButton.click();
    
    // Verify that the state has transitioned to Sorting
    const radixSort = await page.locator('#radixSort');
    await expect(radixSort).toHaveText(/sorting/i);
    
    // Verify that the start button is disabled
    await expect(startButton).toBeDisabled();
  });

  test('Sorting completes and transitions to Completed state', async ({ page }) => {
    const startButton = await page.locator('#startButton');
    await startButton.click();
    
    // Simulate sorting completion
    await page.evaluate(() => {
      // Trigger the sorting complete event
      document.dispatchEvent(new Event('SORTING_COMPLETE'));
    });

    // Verify that the state has transitioned to Completed
    const radixSort = await page.locator('#radixSort');
    await expect(radixSort).toHaveText(/sorted/i);
    
    // Verify that the reset button is enabled
    const resetButton = await page.locator('#resetButton');
    await expect(resetButton).toBeEnabled();
  });

  test('Clicking Reset from Completed state returns to Idle state', async ({ page }) => {
    const startButton = await page.locator('#startButton');
    const resetButton = await page.locator('#resetButton');
    
    await startButton.click();
    await page.evaluate(() => {
      document.dispatchEvent(new Event('SORTING_COMPLETE'));
    });
    
    await resetButton.click();
    
    // Verify that the state has transitioned back to Idle
    await expect(startButton).toBeEnabled();
    await expect(resetButton).toBeDisabled();
  });

  test('Clicking Start with invalid input shows Error state', async ({ page }) => {
    const startButton = await page.locator('#startButton');
    
    // Simulate invalid input scenario
    await page.evaluate(() => {
      // Trigger the sorting error event
      document.dispatchEvent(new Event('SORTING_ERROR'));
    });

    // Click the start button
    await startButton.click();

    // Verify that the state has transitioned to Error
    const radixSort = await page.locator('#radixSort');
    await expect(radixSort).toHaveText(/error/i);
    
    // Verify that the reset button is enabled
    const resetButton = await page.locator('#resetButton');
    await expect(resetButton).toBeEnabled();
  });

  test('Clicking Reset from Error state returns to Idle state', async ({ page }) => {
    const startButton = await page.locator('#startButton');
    const resetButton = await page.locator('#resetButton');
    
    // Simulate error state
    await page.evaluate(() => {
      document.dispatchEvent(new Event('SORTING_ERROR'));
    });
    
    await resetButton.click();
    
    // Verify that the state has transitioned back to Idle
    await expect(startButton).toBeEnabled();
    await expect(resetButton).toBeDisabled();
  });
  
  test('Multiple resets should keep the application in Idle state', async ({ page }) => {
    const startButton = await page.locator('#startButton');
    const resetButton = await page.locator('#resetButton');
    
    await startButton.click();
    await page.evaluate(() => {
      document.dispatchEvent(new Event('SORTING_COMPLETE'));
    });
    
    await resetButton.click();
    await expect(startButton).toBeEnabled();
    
    // Click reset again
    await resetButton.click();
    
    // Verify that the application remains in Idle state
    await expect(startButton).toBeEnabled();
    await expect(resetButton).toBeDisabled();
  });
  
  test.afterEach(async ({ page }) => {
    // Cleanup actions if necessary
  });
});