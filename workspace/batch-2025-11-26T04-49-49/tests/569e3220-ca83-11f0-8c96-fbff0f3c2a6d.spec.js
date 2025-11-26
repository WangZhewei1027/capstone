import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T04-49-49/html/569e3220-ca83-11f0-8c96-fbff0f3c2a6d.html';

test.describe('Dijkstra Algorithm Visualization Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('should start algorithm from Idle state', async ({ page }) => {
    // Verify that the start button is enabled in the Idle state
    const startButton = await page.locator('#main');
    await expect(startButton).toBeEnabled();
    
    // Click the start button to transition to AlgorithmRunning state
    await startButton.click();
    
    // Verify that the start button is disabled after clicking
    await expect(startButton).toBeDisabled();
  });

  test('should transition to AlgorithmCompleted state', async ({ page }) => {
    const startButton = await page.locator('#main');
    await startButton.click();
    
    // Simulate the algorithm finishing
    await page.evaluate(() => {
      // Trigger the AlgorithmFinished event
      const event = new Event('AlgorithmFinished');
      document.dispatchEvent(event);
    });

    // Verify that the start button is enabled again
    await expect(startButton).toBeEnabled();
    
    // Check for visual feedback indicating the algorithm has completed
    await expect(page.locator('text=Shortest Path')).toBeVisible();
  });

  test('should handle AlgorithmError state', async ({ page }) => {
    const startButton = await page.locator('#main');
    await startButton.click();
    
    // Simulate an error occurring during the algorithm execution
    await page.evaluate(() => {
      // Trigger the AlgorithmError event
      const event = new Event('AlgorithmError');
      document.dispatchEvent(event);
    });

    // Verify that the error message is displayed
    await expect(page.locator('text=Error occurred')).toBeVisible();
    
    // Verify that the start button is still disabled
    await expect(startButton).toBeDisabled();
  });

  test('should return to Idle state from ErrorState', async ({ page }) => {
    const startButton = await page.locator('#main');
    await startButton.click();
    
    // Simulate an error occurring
    await page.evaluate(() => {
      const event = new Event('AlgorithmError');
      document.dispatchEvent(event);
    });

    // Click the start button to clear the error and return to Idle state
    await startButton.click();
    
    // Verify that the error message is cleared
    await expect(page.locator('text=Error occurred')).toBeHidden();
    
    // Verify that the start button is enabled again
    await expect(startButton).toBeEnabled();
  });

  test('should ensure correct state transitions', async ({ page }) => {
    const startButton = await page.locator('#main');

    // Start the algorithm
    await startButton.click();
    await expect(startButton).toBeDisabled();

    // Simulate algorithm completion
    await page.evaluate(() => {
      const event = new Event('AlgorithmFinished');
      document.dispatchEvent(event);
    });

    // Check that we are back in Idle state
    await expect(startButton).toBeEnabled();
    await expect(page.locator('text=Shortest Path')).toBeVisible();

    // Start the algorithm again
    await startButton.click();
    await expect(startButton).toBeDisabled();

    // Simulate an error
    await page.evaluate(() => {
      const event = new Event('AlgorithmError');
      document.dispatchEvent(event);
    });

    // Verify error state
    await expect(page.locator('text=Error occurred')).toBeVisible();
    await expect(startButton).toBeDisabled();

    // Clear error and return to Idle
    await startButton.click();
    await expect(page.locator('text=Error occurred')).toBeHidden();
    await expect(startButton).toBeEnabled();
  });

  test.afterEach(async ({ page }) => {
    // Optionally reset the application state if needed
    await page.evaluate(() => {
      // Reset any global state or clear errors
    });
  });
});