import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-35-35/html/bba6b381-ca89-11f0-800e-fdebe921fc5f.html';

test.describe('Fibonacci Sequence Application', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to the Fibonacci Sequence application
    await page.goto(BASE_URL);
  });

  test('should display the initial state', async ({ page }) => {
    // Validate that the initial state is Idle
    const resultDiv = await page.locator('#result');
    await expect(resultDiv).toHaveText('');
  });

  test('should generate Fibonacci sequence for valid input', async ({ page }) => {
    // Test valid input and check state transition to ResultDisplayed
    await page.fill('input[type="number"]', '5');
    await page.click('button[type="submit"]');

    const resultDiv = await page.locator('#result');
    await expect(resultDiv).toHaveText('Fibonacci Sequence up to 5: 0, 1, 1, 2, 3');
  });

  test('should handle zero input gracefully', async ({ page }) => {
    // Test edge case with zero input
    await page.fill('input[type="number"]', '0');
    await page.click('button[type="submit"]');

    const resultDiv = await page.locator('#result');
    await expect(resultDiv).toHaveText('');
    await page.waitForTimeout(100); // Wait for any potential alert
    await expect(page.locator('text=Please enter a positive integer.')).toBeVisible();
  });

  test('should handle negative input gracefully', async ({ page }) => {
    // Test edge case with negative input
    await page.fill('input[type="number"]', '-3');
    await page.click('button[type="submit"]');

    const resultDiv = await page.locator('#result');
    await expect(resultDiv).toHaveText('');
    await page.waitForTimeout(100); // Wait for any potential alert
    await expect(page.locator('text=Please enter a positive integer.')).toBeVisible();
  });

  test('should handle non-integer input gracefully', async ({ page }) => {
    // Test edge case with non-integer input
    await page.fill('input[type="number"]', '3.5');
    await page.click('button[type="submit"]');

    const resultDiv = await page.locator('#result');
    await expect(resultDiv).toHaveText('');
    await page.waitForTimeout(100); // Wait for any potential alert
    await expect(page.locator('text=Please enter a positive integer.')).toBeVisible();
  });

  test('should not generate Fibonacci sequence for empty input', async ({ page }) => {
    // Test edge case with empty input
    await page.fill('input[type="number"]', '');
    await page.click('button[type="submit"]');

    const resultDiv = await page.locator('#result');
    await expect(resultDiv).toHaveText('');
    await page.waitForTimeout(100); // Wait for any potential alert
    await expect(page.locator('text=Please enter a positive integer.')).toBeVisible();
  });

  test.afterEach(async ({ page }) => {
    // Optionally, you can reset the form or perform cleanup actions
    await page.fill('input[type="number"]', '');
    await page.locator('#result').fill('');
  });
});