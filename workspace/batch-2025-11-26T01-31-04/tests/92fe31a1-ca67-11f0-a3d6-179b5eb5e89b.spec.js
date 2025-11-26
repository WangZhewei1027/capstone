import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-31-04/html/92fe31a1-ca67-11f0-a3d6-179b5eb5e89b.html';

test.describe('Insertion Sort Visualization', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('should start in Idle state', async ({ page }) => {
    const startButton = page.locator('#startBtn');
    const inputField = page.locator('#arrayInput');
    const speedRange = page.locator('#speedRange');

    // Verify controls are enabled
    await expect(startButton).toBeEnabled();
    await expect(inputField).toBeEnabled();
    await expect(speedRange).toBeEnabled();
  });

  test('should show error alert for invalid input', async ({ page }) => {
    const startButton = page.locator('#startBtn');
    const inputField = page.locator('#arrayInput');

    // Enter invalid input and click start
    await inputField.fill('invalid,input');
    await startButton.click();

    // Verify error alert is shown
    await expect(page.locator('text=Please make sure all inputs are valid numbers.')).toBeVisible();
  });

  test('should show error alert for single number input', async ({ page }) => {
    const startButton = page.locator('#startBtn');
    const inputField = page.locator('#arrayInput');

    // Enter single number and click start
    await inputField.fill('5');
    await startButton.click();

    // Verify error alert is shown
    await expect(page.locator('text=Please enter at least two numbers.')).toBeVisible();
  });

  test('should create bars and start sorting for valid input', async ({ page }) => {
    const startButton = page.locator('#startBtn');
    const inputField = page.locator('#arrayInput');

    // Enter valid input and click start
    await inputField.fill('5,3,8,6,2');
    await startButton.click();

    // Verify bars are created
    const bars = page.locator('#barsContainer .bar');
    await expect(bars).toHaveCount(5);

    // Verify sorting animation starts
    await expect(bars.first()).toHaveClass(/current/);
  });

  test('should adjust speed and reflect changes', async ({ page }) => {
    const speedRange = page.locator('#speedRange');
    const speedValue = page.locator('#speedValue');

    // Adjust speed slider
    await speedRange.fill('1000');

    // Verify speed value updates
    await expect(speedValue).toHaveText('1000 ms');
  });

  test('should reset to Idle state after sorting completes', async ({ page }) => {
    const startButton = page.locator('#startBtn');
    const inputField = page.locator('#arrayInput');

    // Enter valid input and click start
    await inputField.fill('5,3,8,6,2');
    await startButton.click();

    // Wait for sorting to complete
    await page.waitForTimeout(6000); // Adjust timeout based on expected sorting duration

    // Verify controls are enabled again
    await expect(startButton).toBeEnabled();
    await expect(inputField).toBeEnabled();
  });

  test('should show error alert when input is empty', async ({ page }) => {
    const startButton = page.locator('#startBtn');
    const inputField = page.locator('#arrayInput');

    // Click start without input
    await startButton.click();

    // Verify error alert is shown
    await expect(page.locator('text=Please enter a sequence of numbers separated by commas.')).toBeVisible();
  });

  test('should clear error dialog and return to Idle state', async ({ page }) => {
    const startButton = page.locator('#startBtn');
    const inputField = page.locator('#arrayInput');

    // Enter invalid input and click start
    await inputField.fill('invalid,input');
    await startButton.click();

    // Wait for error alert
    await expect(page.locator('text=Please make sure all inputs are valid numbers.')).toBeVisible();

    // Click start again to clear error
    await startButton.click();

    // Verify that the error dialog is cleared and controls are enabled
    await expect(page.locator('text=Please make sure all inputs are valid numbers.')).not.toBeVisible();
    await expect(startButton).toBeEnabled();
    await expect(inputField).toBeEnabled();
  });
});