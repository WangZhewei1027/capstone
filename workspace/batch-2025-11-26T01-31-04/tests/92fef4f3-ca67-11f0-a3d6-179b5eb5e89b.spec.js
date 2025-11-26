import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-31-04/html/92fef4f3-ca67-11f0-a3d6-179b5eb5e89b.html';

test.describe('Fibonacci Sequence Generator', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('should start in Idle state', async ({ page }) => {
    // Verify that the form is enabled and no error messages are displayed
    const errorMsg = await page.locator('#errorMsg').textContent();
    expect(errorMsg).toBe('');
    const numTermsInput = page.locator('#numTerms');
    expect(await numTermsInput.isEnabled()).toBe(true);
  });

  test('should display error message for invalid input', async ({ page }) => {
    // Submit the form with invalid input
    await page.fill('#numTerms', '200'); // Out of range
    await page.click('button[type="submit"]');

    // Verify that the error message is displayed
    const errorMsg = await page.locator('#errorMsg').textContent();
    expect(errorMsg).toBe('Please enter an integer between 1 and 100.');
  });

  test('should generate Fibonacci sequence for valid input', async ({ page }) => {
    // Submit the form with valid input
    await page.fill('#numTerms', '10');
    await page.click('button[type="submit"]');

    // Verify that the result is displayed
    const result = await page.locator('#result').textContent();
    expect(result).toContain('First 10 terms of the Fibonacci sequence:');
    expect(result).toContain('0, 1, 1, 2, 3, 5, 8, 13, 21, 34');
  });

  test('should reset the form after generating sequence', async ({ page }) => {
    // Submit the form with valid input
    await page.fill('#numTerms', '5');
    await page.click('button[type="submit"]');

    // Verify that the result is displayed
    const result = await page.locator('#result').textContent();
    expect(result).toContain('First 5 terms of the Fibonacci sequence:');
    expect(result).toContain('0, 1, 1, 2, 3');

    // Reset the form
    await page.click('button[type="submit"]'); // Re-submit to reset

    // Verify that the form is reset
    const errorMsg = await page.locator('#errorMsg').textContent();
    expect(errorMsg).toBe('');
    const numTermsInputValue = await page.locator('#numTerms').inputValue();
    expect(numTermsInputValue).toBe('10'); // Default value
    const resultAfterReset = await page.locator('#result').textContent();
    expect(resultAfterReset).toBe('');
  });

  test('should handle edge case of minimum input', async ({ page }) => {
    // Submit the form with minimum valid input
    await page.fill('#numTerms', '1');
    await page.click('button[type="submit"]');

    // Verify that the result is displayed correctly
    const result = await page.locator('#result').textContent();
    expect(result).toContain('First 1 term of the Fibonacci sequence:');
    expect(result).toContain('0');
  });

  test('should handle edge case of maximum input', async ({ page }) => {
    // Submit the form with maximum valid input
    await page.fill('#numTerms', '100');
    await page.click('button[type="submit"]');

    // Verify that the result is displayed correctly
    const result = await page.locator('#result').textContent();
    expect(result).toContain('First 100 terms of the Fibonacci sequence:');
    // Check the first few terms for correctness
    expect(result).toContain('0, 1, 1, 2, 3, 5, 8, 13, 21, 34');
  });
});