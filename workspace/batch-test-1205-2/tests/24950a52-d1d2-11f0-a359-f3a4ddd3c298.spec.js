import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-2/html/24950a52-d1d2-11f0-a359-f3a4ddd3c298.html';

test.describe('Recursion Demo Application', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to the application page before each test
    await page.goto(BASE_URL);
  });

  test('should display the initial idle state', async ({ page }) => {
    // Validate that the initial state is idle
    const resultText = await page.locator('#factorial-result').innerText();
    expect(resultText).toBe('');
  });

  test('should calculate factorial for a valid input', async ({ page }) => {
    // Test valid input and check the result displayed
    await page.fill('#number-input', '5');
    await page.click('#calculate-btn');

    const resultText1 = await page.locator('#factorial-result').innerText();
    expect(resultText).toBe('Factorial of 5 is: 120');
  });

  test('should handle zero input correctly', async ({ page }) => {
    // Test edge case for zero input
    await page.fill('#number-input', '0');
    await page.click('#calculate-btn');

    const resultText2 = await page.locator('#factorial-result').innerText();
    expect(resultText).toBe('Factorial of 0 is: 1');
  });

  test('should handle negative input correctly', async ({ page }) => {
    // Test negative input and check the error message displayed
    await page.fill('#number-input', '-1');
    await page.click('#calculate-btn');

    const resultText3 = await page.locator('#factorial-result').innerText();
    expect(resultText).toBe('Please enter a non-negative integer.');
  });

  test('should handle non-integer input correctly', async ({ page }) => {
    // Test non-integer input and check the result displayed
    await page.fill('#number-input', '3.5');
    await page.click('#calculate-btn');

    const resultText4 = await page.locator('#factorial-result').innerText();
    expect(resultText).toBe('Factorial of 3 is: 6');
  });

  test('should not allow negative numbers', async ({ page }) => {
    // Test that the input field does not accept negative numbers
    await page.fill('#number-input', '-5');
    const value = await page.locator('#number-input').inputValue();
    expect(value).toBe('-5'); // Check if the value is still set to -5
  });

  test('should display an error message for non-numeric input', async ({ page }) => {
    // Test non-numeric input and check the error message displayed
    await page.fill('#number-input', 'abc');
    await page.click('#calculate-btn');

    const resultText5 = await page.locator('#factorial-result').innerText();
    expect(resultText).toBe('Please enter a non-negative integer.');
  });

  test('should not crash on invalid input', async ({ page }) => {
    // Test that the application does not crash on invalid input
    await page.fill('#number-input', 'invalid');
    await page.click('#calculate-btn');

    const resultText6 = await page.locator('#factorial-result').innerText();
    expect(resultText).toBe('Please enter a non-negative integer.');
  });
});