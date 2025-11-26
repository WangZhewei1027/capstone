import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-31-04/html/92fe7fc0-ca67-11f0-a3d6-179b5eb5e89b.html';

test.describe('Radix Sort Visualization', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('should start in Idle state and enable Start Sort button', async ({ page }) => {
    const startButton = await page.locator('#startSort');
    await expect(startButton).toBeEnabled();
  });

  test('should validate input and transition to Sorting state on valid input', async ({ page }) => {
    const inputArea = await page.locator('#inputArray');
    const startButton = await page.locator('#startSort');

    await inputArea.fill('170, 45, 75, 90, 802, 24, 2, 66');
    await startButton.click();

    // Check if we are in Sorting state
    const stepsDiv = await page.locator('#steps');
    await expect(stepsDiv).toContainText('Initial Array');
  });

  test('should show error dialog on invalid input', async ({ page }) => {
    const inputArea = await page.locator('#inputArray');
    const startButton = await page.locator('#startSort');

    await inputArea.fill('invalid input');
    await startButton.click();

    // Check if error dialog is shown
    await expect(page).toHaveAlert('Invalid input! Please enter non-negative integers separated by commas or spaces.');
  });

  test('should show error dialog when no input is provided', async ({ page }) => {
    const startButton = await page.locator('#startSort');

    await startButton.click();

    // Check if error dialog is shown
    await expect(page).toHaveAlert('Please enter at least one number.');
  });

  test('should sort the array and display sorted result', async ({ page }) => {
    const inputArea = await page.locator('#inputArray');
    const startButton = await page.locator('#startSort');

    await inputArea.fill('170, 45, 75, 90, 802, 24, 2, 66');
    await startButton.click();

    // Wait for sorting to complete
    await page.waitForTimeout(2000); // Adjust based on sorting duration

    // Check if the final sorted array is displayed
    const outputDiv = await page.locator('#output-area');
    await expect(outputDiv).toContainText('Sorted Array:');
    await expect(outputDiv).toContainText('2');
    await expect(outputDiv).toContainText('24');
    await expect(outputDiv).toContainText('45');
    await expect(outputDiv).toContainText('66');
    await expect(outputDiv).toContainText('75');
    await expect(outputDiv).toContainText('90');
    await expect(outputDiv).toContainText('170');
    await expect(outputDiv).toContainText('802');
  });

  test('should show steps of sorting process', async ({ page }) => {
    const inputArea = await page.locator('#inputArray');
    const startButton = await page.locator('#startSort');

    await inputArea.fill('170, 45, 75, 90, 802, 24, 2, 66');
    await startButton.click();

    // Wait for sorting to complete
    await page.waitForTimeout(2000); // Adjust based on sorting duration

    // Check if sorting steps are displayed
    const stepsDiv = await page.locator('#steps');
    await expect(stepsDiv).toContainText('Step');
  });
});