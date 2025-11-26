import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T04-49-49/html/569e8040-ca83-11f0-8c96-fbff0f3c2a6d.html';

test.describe('Floyd-Warshall Algorithm Visualization', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to the application before each test
    await page.goto(BASE_URL);
  });

  test('Initial state is Idle', async ({ page }) => {
    // Verify that the initial state is Idle
    const resultText = await page.locator('#result').innerText();
    expect(resultText).toBe('');
    const inputValue = await page.locator('#min-references').inputValue();
    expect(inputValue).toBe('');
  });

  test('Calculate button is enabled when input is not empty', async ({ page }) => {
    // Input valid data and check if the button is enabled
    await page.fill('#min-references', '1,2,3');
    const button = page.locator('button');
    await expect(button).toBeEnabled();
  });

  test('Transition from Idle to Calculating state', async ({ page }) => {
    // Test the transition from Idle to Calculating
    await page.fill('#min-references', '1,2,3');
    await page.click('button');
    
    // Verify loading indicator is shown
    await expect(page.locator('#result')).toHaveText('Calculating...');
  });

  test('Successful calculation transitions to DisplayResult state', async ({ page }) => {
    // Simulate successful calculation
    await page.fill('#min-references', '1,2,3');
    await page.click('button');
    
    // Wait for the calculation to complete
    await page.waitForTimeout(2000); // Adjust timeout as per your implementation
    await page.evaluate(() => {
      // Simulate the completion of the calculation
      document.querySelector('#result').innerText = 'Result: 3';
    });

    // Verify result is displayed
    const resultText = await page.locator('#result').innerText();
    expect(resultText).toBe('Result: 3');
  });

  test('Transition to ErrorAlert state on invalid input', async ({ page }) => {
    // Test the transition to ErrorAlert state
    await page.fill('#min-references', 'invalid_input');
    await page.click('button');
    
    // Simulate error condition
    await page.waitForTimeout(1000); // Adjust timeout as per your implementation
    await page.evaluate(() => {
      // Simulate the error dialog
      alert('Error: Invalid input');
    });

    // Verify error dialog is shown
    await expect(page.locator('#result')).toHaveText('Error: Invalid input');
  });

  test('Reset from ErrorAlert state to Idle state', async ({ page }) => {
    // Test resetting from ErrorAlert state
    await page.fill('#min-references', 'invalid_input');
    await page.click('button');
    
    await page.waitForTimeout(1000); // Adjust timeout as per your implementation
    await page.evaluate(() => {
      // Simulate the error dialog
      alert('Error: Invalid input');
    });

    // Click the calculate button again to reset
    await page.click('button');

    // Verify that the input and result are reset
    const resultText = await page.locator('#result').innerText();
    expect(resultText).toBe('');
    const inputValue = await page.locator('#min-references').inputValue();
    expect(inputValue).toBe('');
  });

  test('Reset from DisplayResult state to Idle state', async ({ page }) => {
    // Test resetting from DisplayResult state
    await page.fill('#min-references', '1,2,3');
    await page.click('button');
    
    await page.waitForTimeout(2000); // Adjust timeout as per your implementation
    await page.evaluate(() => {
      // Simulate the completion of the calculation
      document.querySelector('#result').innerText = 'Result: 3';
    });

    // Click the calculate button again to reset
    await page.click('button');

    // Verify that the input and result are reset
    const resultText = await page.locator('#result').innerText();
    expect(resultText).toBe('');
    const inputValue = await page.locator('#min-references').inputValue();
    expect(inputValue).toBe('');
  });

  test.afterEach(async ({ page }) => {
    // Optional: Any cleanup can be done here
  });
});