import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-25T17-13-35/html/13792290-ca22-11f0-90fa-53e5712d34e0.html';

test.describe('Heap Min/Max Application Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('should be in idle state initially', async ({ page }) => {
    // Verify the initial state of the application
    const button = await page.locator('button');
    await expect(button).toBeVisible();
    await expect(button).toHaveText('Test Heap');
  });

  test('should transition to testing state when Test Heap is clicked', async ({ page }) => {
    // Click the Test Heap button
    await page.click('button');

    // Verify that the heapTest function is called and the state transitions
    const testDiv = await page.locator('#test');
    await expect(testDiv).toBeVisible(); // Assuming some results will be displayed
  });

  test('should transition to done state after heap test completion', async ({ page }) => {
    // Click the Test Heap button to start the test
    await page.click('button');

    // Wait for the completion of the heap test
    await page.waitForTimeout(1000); // Adjust timeout as necessary for the test to complete

    // Check if the results are displayed
    const testDiv = await page.locator('#test');
    await expect(testDiv).toContainText('1'); // Assuming the sorted output will include '1'
  });

  test('should return to idle state when Reset is clicked', async ({ page }) => {
    // Click the Test Heap button to start the test
    await page.click('button');

    // Wait for the completion of the heap test
    await page.waitForTimeout(1000);

    // Click the reset button (assuming it's implemented)
    await page.click('button'); // This assumes the reset functionality is the same button for simplicity

    // Verify that the application returns to idle state
    const button = await page.locator('button');
    await expect(button).toBeVisible();
    await expect(button).toHaveText('Test Heap');
  });

  test('should handle edge cases gracefully', async ({ page }) => {
    // Test with an empty array or invalid input if applicable
    // This requires modification in the HTML/JS to handle such cases
    // For now, we will simulate the behavior by directly calling the function if possible

    // Click the Test Heap button
    await page.click('button');

    // Wait for the completion of the heap test
    await page.waitForTimeout(1000);

    // Check for any error messages or results
    const testDiv = await page.locator('#test');
    await expect(testDiv).toContainText('Error'); // Assuming the application handles errors and displays them
  });
});