import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-25T17-37-02/html/5a4f9110-ca25-11f0-ad71-69ecf40ad507.html';

test.describe('Bubble Sort Application', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('should start in idle state', async ({ page }) => {
    // Verify that the application is in the idle state
    const startButton = await page.locator('#start-button');
    await expect(startButton).toBeVisible();
  });

  test('should transition to sorting state on start button click', async ({ page }) => {
    // Click the start button and verify the transition to sorting state
    await page.click('#start-button');
    const swapIndicator = await page.locator('.swap-indicator');
    await expect(swapIndicator).toBeVisible();
  });

  test('should make swaps during sorting', async ({ page }) => {
    // Start sorting and verify that swaps are made
    await page.click('#start-button');
    const swapIndicator = await page.locator('.swap-indicator');

    // Wait for a swap to occur
    await expect(swapIndicator).toBeVisible();
    await expect(swapIndicator).toHaveText(/Swap made/); // Assuming the swap indicator shows this text
  });

  test('should transition to done state when sorting is complete', async ({ page }) => {
    // Simulate sorting completion
    await page.click('#start-button');
    await page.click('#complete-indicator'); // Trigger complete event

    const doneMessage = await page.locator('.done-message'); // Assuming there's a message for done state
    await expect(doneMessage).toBeVisible();
  });

  test('should return to idle state on reset button click', async ({ page }) => {
    // Click the start button and then reset
    await page.click('#start-button');
    await page.click('#reset-button');

    const startButton = await page.locator('#start-button');
    await expect(startButton).toBeVisible(); // Should be back in idle state
  });

  test('should stop sorting when stop button is clicked', async ({ page }) => {
    // Start sorting and then stop it
    await page.click('#start-button');
    await page.click('#stop-button');

    const startButton = await page.locator('#start-button');
    await expect(startButton).toBeVisible(); // Should return to idle state
  });

  test('should handle multiple resets', async ({ page }) => {
    // Click the start button, reset, and start again
    await page.click('#start-button');
    await page.click('#reset-button');
    await page.click('#start-button');

    const swapIndicator = await page.locator('.swap-indicator');
    await expect(swapIndicator).toBeVisible(); // Should start sorting again
  });

  test('should not allow sorting if already sorting', async ({ page }) => {
    // Start sorting and try to start again
    await page.click('#start-button');
    await page.click('#start-button'); // Click again to start

    const swapIndicator = await page.locator('.swap-indicator');
    await expect(swapIndicator).toBeVisible(); // Should still be sorting
  });

  test('should show visual feedback for swaps', async ({ page }) => {
    // Start sorting and check for visual feedback
    await page.click('#start-button');
    const swapIndicator = await page.locator('.swap-indicator');

    // Wait for a swap to occur
    await expect(swapIndicator).toBeVisible();
    await expect(swapIndicator).toHaveText(/Swap made/); // Assuming the swap indicator shows this text
  });

  test('should complete sorting and show sorted result', async ({ page }) => {
    // Start sorting, wait for completion, and check result
    await page.click('#start-button');
    await page.click('#complete-indicator'); // Trigger complete event

    const sortedResult = await page.locator('.sorted-result'); // Assuming there's an element showing the sorted result
    await expect(sortedResult).toBeVisible();
    await expect(sortedResult).toHaveText(/Sorted array:/); // Check for expected text
  });
});