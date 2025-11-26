import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-31-04/html/92ff4310-ca67-11f0-a3d6-179b5eb5e89b.html';

test.describe('Recursion Demonstration Application', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test.describe('Idle State Tests', () => {
    test('should enable input and button in Idle state', async ({ page }) => {
      const input = await page.locator('#numInput');
      const button = await page.locator('#calcBtn');
      await expect(input).toBeEnabled();
      await expect(button).toBeEnabled();
    });
  });

  test.describe('Calculating State Tests', () => {
    test('should transition to Calculating state when valid input is provided', async ({ page }) => {
      await page.fill('#numInput', '5');
      await page.click('#calcBtn');
      await expect(page.locator('#result')).toContainText('Calculating factorial(5) using recursion:');
    });

    test('should display error message for invalid input', async ({ page }) => {
      await page.fill('#numInput', '20');
      await page.click('#calcBtn');
      await expect(page.locator('#result')).toContainText('Please enter an integer between 0 and 15 to prevent long calculations.');
    });
  });

  test.describe('Completed State Tests', () => {
    test('should display result after calculation completes', async ({ page }) => {
      await page.fill('#numInput', '5');
      await page.click('#calcBtn');
      await expect(page.locator('#result')).toContainText('Result: factorial(5) = 120');
    });
  });

  test.describe('Error State Tests', () => {
    test('should clear result and reset input on error', async ({ page }) => {
      await page.fill('#numInput', '20');
      await page.click('#calcBtn');
      await expect(page.locator('#result')).toContainText('Please enter an integer between 0 and 15 to prevent long calculations.');
      
      await page.fill('#numInput', '5');
      await page.click('#calcBtn');
      await expect(page.locator('#result')).toContainText('Calculating factorial(5) using recursion:');
    });
  });

  test.describe('Resetting State Tests', () => {
    test('should reset for new calculation after completion', async ({ page }) => {
      await page.fill('#numInput', '5');
      await page.click('#calcBtn');
      await expect(page.locator('#result')).toContainText('Result: factorial(5) = 120');

      await page.fill('#numInput', '3');
      await page.click('#calcBtn');
      await expect(page.locator('#result')).toContainText('Calculating factorial(3) using recursion:');
    });
  });
});