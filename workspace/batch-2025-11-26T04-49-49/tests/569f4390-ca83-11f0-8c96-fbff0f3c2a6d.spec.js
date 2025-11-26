import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T04-49-49/html/569f4390-ca83-11f0-8c96-fbff0f3c2a6d.html';

test.describe('Longest Common Subsequence Application Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application page before each test
    await page.goto(BASE_URL);
  });

  test('should be in Idle state initially', async ({ page }) => {
    // Verify that the Calculate button is enabled in the Idle state
    const calculateButton = await page.locator('button#calculateButton');
    await expect(calculateButton).toBeEnabled();
  });

  test('should transition to Calculating state on Calculate button click', async ({ page }) => {
    const calculateButton = await page.locator('button#calculateButton');
    
    // Click the Calculate button
    await calculateButton.click();
    
    // Verify loading spinner is shown
    const loadingSpinner = await page.locator('#loadingSpinner');
    await expect(loadingSpinner).toBeVisible();

    // Simulate calculation completion
    await page.evaluate(() => {
      // Trigger the calculation complete event
      document.dispatchEvent(new Event('CALCULATION_COMPLETE'));
    });

    // Verify that we transitioned to ResultDisplayed state
    const resultDisplay = await page.locator('#resultDisplay');
    await expect(resultDisplay).toBeVisible();
  });

  test('should display result after calculation', async ({ page }) => {
    const calculateButton = await page.locator('button#calculateButton');
    
    // Click the Calculate button
    await calculateButton.click();
    
    // Simulate calculation completion
    await page.evaluate(() => {
      document.dispatchEvent(new Event('CALCULATION_COMPLETE'));
    });

    // Verify result is displayed
    const resultDisplay = await page.locator('#resultDisplay');
    await expect(resultDisplay).toHaveText(/The longest common substring is/);
  });

  test('should transition to Error state on calculation failure', async ({ page }) => {
    const calculateButton = await page.locator('button#calculateButton');
    
    // Click the Calculate button
    await calculateButton.click();
    
    // Simulate calculation failure
    await page.evaluate(() => {
      document.dispatchEvent(new Event('CALCULATION_FAILED'));
    });

    // Verify error message is displayed
    const errorDisplay = await page.locator('#errorDisplay');
    await expect(errorDisplay).toBeVisible();
  });

  test('should reset to Idle state on Reset button click from ResultDisplayed state', async ({ page }) => {
    const calculateButton = await page.locator('button#calculateButton');
    const resetButton = await page.locator('button#resetButton');
    
    // Click the Calculate button
    await calculateButton.click();
    
    // Simulate calculation completion
    await page.evaluate(() => {
      document.dispatchEvent(new Event('CALCULATION_COMPLETE'));
    });

    // Click the Reset button
    await resetButton.click();

    // Verify that we are back in Idle state
    const resultDisplay = await page.locator('#resultDisplay');
    await expect(resultDisplay).toBeHidden();
    await expect(calculateButton).toBeEnabled();
  });

  test('should reset to Idle state on Reset button click from Error state', async ({ page }) => {
    const calculateButton = await page.locator('button#calculateButton');
    const resetButton = await page.locator('button#resetButton');
    
    // Click the Calculate button
    await calculateButton.click();
    
    // Simulate calculation failure
    await page.evaluate(() => {
      document.dispatchEvent(new Event('CALCULATION_FAILED'));
    });

    // Click the Reset button
    await resetButton.click();

    // Verify that we are back in Idle state
    const errorDisplay = await page.locator('#errorDisplay');
    await expect(errorDisplay).toBeHidden();
    await expect(calculateButton).toBeEnabled();
  });
});