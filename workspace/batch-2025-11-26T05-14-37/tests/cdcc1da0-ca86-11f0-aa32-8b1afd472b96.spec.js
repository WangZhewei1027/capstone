import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-14-37/html/cdcc1da0-ca86-11f0-aa32-8b1afd472b96.html';

test.describe('Recursion Application Tests', () => {
  test.beforeAll(async ({ browser }) => {
    // Setup code can be added here if needed
  });

  test.beforeEach(async ({ page }) => {
    // Navigate to the application before each test
    await page.goto(BASE_URL);
  });

  test('should render the page correctly in Idle state', async ({ page }) => {
    // Validate that the page is rendered correctly in the Idle state
    const bodyText = await page.textContent('body');
    expect(bodyText).toContain('factorial'); // Assuming the page contains a mention of factorial
  });

  test('should correctly calculate factorial of 5', async ({ page }) => {
    // Test the factorial function's output for 5
    const result = await page.evaluate(() => factorial(5));
    expect(result).toBe(120); // Validate the output of factorial(5)
  });

  test('should handle edge case for factorial of 0', async ({ page }) => {
    // Test the factorial function's output for 0
    const result = await page.evaluate(() => factorial(0));
    expect(result).toBe(1); // Validate the output of factorial(0)
  });

  test('should handle edge case for factorial of 1', async ({ page }) => {
    // Test the factorial function's output for 1
    const result = await page.evaluate(() => factorial(1));
    expect(result).toBe(1); // Validate the output of factorial(1)
  });

  test('should throw error for negative input', async ({ page }) => {
    // Test the factorial function's behavior with a negative input
    const result = await page.evaluate(() => {
      try {
        return factorial(-1);
      } catch (e) {
        return e.message; // Capture the error message
      }
    });
    expect(result).toContain('Maximum call stack size exceeded'); // Validate the error message
  });

  test.afterEach(async ({ page }) => {
    // Teardown code can be added here if needed
  });

  test.afterAll(async () => {
    // Final cleanup can be done here if needed
  });
});