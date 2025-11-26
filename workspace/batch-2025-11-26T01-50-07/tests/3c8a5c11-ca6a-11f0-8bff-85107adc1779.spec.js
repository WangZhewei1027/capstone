import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-50-07/html/3c8a5c11-ca6a-11f0-8bff-85107adc1779.html';

test.describe('Recursion Demonstration - Factorial Calculator', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('should display error message for invalid input (negative number)', async ({ page }) => {
    await page.fill('#numInput', '-1');
    await page.click('#calcBtn');
    const outputText = await page.textContent('#output');
    expect(outputText).toContain('Please enter an integer between 0 and 20.');
  });

  test('should display error message for invalid input (non-integer)', async ({ page }) => {
    await page.fill('#numInput', '3.5');
    await page.click('#calcBtn');
    const outputText = await page.textContent('#output');
    expect(outputText).toContain('Please enter an integer between 0 and 20.');
  });

  test('should display error message for invalid input (greater than 20)', async ({ page }) => {
    await page.fill('#numInput', '21');
    await page.click('#calcBtn');
    const outputText = await page.textContent('#output');
    expect(outputText).toContain('Please enter an integer between 0 and 20.');
  });

  test('should calculate factorial for valid input (0)', async ({ page }) => {
    await page.fill('#numInput', '0');
    await page.click('#calcBtn');
    const outputText = await page.textContent('#output');
    expect(outputText).toContain('Final Result: factorial(0) = 1');
  });

  test('should calculate factorial for valid input (1)', async ({ page }) => {
    await page.fill('#numInput', '1');
    await page.click('#calcBtn');
    const outputText = await page.textContent('#output');
    expect(outputText).toContain('Final Result: factorial(1) = 1');
  });

  test('should calculate factorial for valid input (5)', async ({ page }) => {
    await page.fill('#numInput', '5');
    await page.click('#calcBtn');
    const outputText = await page.textContent('#output');
    expect(outputText).toContain('Final Result: factorial(5) = 120');
  });

  test('should calculate factorial for valid input (20)', async ({ page }) => {
    await page.fill('#numInput', '20');
    await page.click('#calcBtn');
    const outputText = await page.textContent('#output');
    expect(outputText).toContain('Final Result: factorial(20) = 2432902008176640000');
  });

  test('should show calculation trace for valid input', async ({ page }) => {
    await page.fill('#numInput', '3');
    await page.click('#calcBtn');
    const outputText = await page.textContent('#output');
    expect(outputText).toContain('Calculating factorial(3) using recursion:');
    expect(outputText).toContain('factorial(3) called.');
    expect(outputText).toContain('factorial(2) called.');
    expect(outputText).toContain('factorial(1) called.');
    expect(outputText).toContain('Base case reached: factorial(1) = 1.');
    expect(outputText).toContain('Returning factorial(2) = 2.');
    expect(outputText).toContain('Returning factorial(3) = 6.');
  });
});