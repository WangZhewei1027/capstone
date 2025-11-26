import { test, expect } from '@playwright/test';

const baseUrl = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-14-37/html/cdc87420-ca86-11f0-aa32-8b1afd472b96.html';

test.describe('Union-Find Application Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(baseUrl);
  });

  test('Initial state is Idle', async ({ page }) => {
    // Verify that the application is in the Idle state
    const resultText = await page.locator('#result').innerText();
    expect(resultText).toBe('');
  });

  test('Submit form with valid input and check for Result Found state', async ({ page }) => {
    // Input valid data
    await page.fill('#array', '1,2,3');
    await page.fill('#set', '1,2');
    await page.click('button[type="submit"]');

    // Wait for the result to be displayed
    await page.waitForTimeout(100); // Adjust timeout as necessary

    // Verify that the result indicates sets were found
    const resultText = await page.locator('#result').innerText();
    expect(resultText).toContain('Found');
  });

  test('Submit form with no results and check for No Results state', async ({ page }) => {
    // Input data that leads to no results
    await page.fill('#array', '4,5,6');
    await page.fill('#set', '1,2');
    await page.click('button[type="submit"]');

    // Wait for the result to be displayed
    await page.waitForTimeout(100); // Adjust timeout as necessary

    // Verify that the result indicates no results found
    const resultText = await page.locator('#result').innerText();
    expect(resultText).toBe('No results found.');
  });

  test('Submit form with empty input fields', async ({ page }) => {
    // Submit the form without filling any input
    await page.click('button[type="submit"]');

    // Wait for the result to be displayed
    await page.waitForTimeout(100); // Adjust timeout as necessary

    // Verify that the result indicates no results found
    const resultText = await page.locator('#result').innerText();
    expect(resultText).toBe('No results found.');
  });

  test('Check visual feedback on form submission', async ({ page }) => {
    // Input valid data
    await page.fill('#array', '1,2,3');
    await page.fill('#set', '1,2');
    await page.click('button[type="submit"]');

    // Wait for the result to be displayed
    await page.waitForTimeout(100); // Adjust timeout as necessary

    // Verify that the result is displayed
    const resultVisible = await page.locator('#result').isVisible();
    expect(resultVisible).toBe(true);
  });

  test('Check for input fields reset after submission', async ({ page }) => {
    // Input valid data
    await page.fill('#array', '1,2,3');
    await page.fill('#set', '1,2');
    await page.click('button[type="submit"]');

    // Wait for the result to be displayed
    await page.waitForTimeout(100); // Adjust timeout as necessary

    // Verify that input fields are cleared after submission
    const arrayValue = await page.locator('#array').inputValue();
    const setValue = await page.locator('#set').inputValue();
    expect(arrayValue).toBe('');
    expect(setValue).toBe('');
  });
});