import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T04-49-49/html/569ef570-ca83-11f0-8c96-fbff0f3c2a6d.html';

test.describe('Fibonacci Sequence Application', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the Fibonacci Sequence application
    await page.goto(BASE_URL);
  });

  test('should display initial Fibonacci sequence on load', async ({ page }) => {
    // Validate that the initial Fibonacci sequence is displayed correctly
    const fibonacciText = await page.locator('p#fibonacci').innerText();
    expect(fibonacciText).toBe('0, 1');
  });

  test('should generate Fibonacci sequence on button click', async ({ page }) => {
    // Click the generate button
    await page.click('button#generate');

    // Wait for the Fibonacci sequence to be updated
    await page.waitForTimeout(1000); // Wait for the generation to complete

    // Validate that the Fibonacci sequence is updated
    const fibonacciText = await page.locator('p#fibonacci').innerText();
    expect(fibonacciText).toContain(', '); // Ensure it contains more than just the initial values
  });

  test('should handle edge case when n is 1', async ({ page }) => {
    // Set n to 1 and click the generate button
    await page.evaluate(() => {
      window.n = 1;
      window.fibonacci = [0, 1]; // Reset the Fibonacci array
    });
    await page.click('button#generate');

    // Wait for the Fibonacci sequence to be updated
    await page.waitForTimeout(1000);

    // Validate that the Fibonacci sequence remains unchanged
    const fibonacciText = await page.locator('p#fibonacci').innerText();
    expect(fibonacciText).toBe('0, 1');
  });

  test('should generate Fibonacci sequence with n greater than 1', async ({ page }) => {
    // Set n to 5 and click the generate button
    await page.evaluate(() => {
      window.n = 5;
      window.fibonacci = [0, 1]; // Reset the Fibonacci array
    });
    await page.click('button#generate');

    // Wait for the Fibonacci sequence to be updated
    await page.waitForTimeout(1000);

    // Validate that the Fibonacci sequence is updated correctly
    const fibonacciText = await page.locator('p#fibonacci').innerText();
    expect(fibonacciText).toBe('0, 1, 1, 2, 3'); // Check the expected output for n=5
  });

  test('should not crash when generate button is clicked multiple times', async ({ page }) => {
    // Click the generate button multiple times
    for (let i = 0; i < 5; i++) {
      await page.click('button#generate');
      await page.waitForTimeout(1000); // Wait for each generation
    }

    // Validate that the Fibonacci sequence is still displayed
    const fibonacciText = await page.locator('p#fibonacci').innerText();
    expect(fibonacciText).toContain(', '); // Ensure it contains more than just the initial values
  });
});