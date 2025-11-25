import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-25T17-37-02/html/5a553660-ca25-11f0-ad71-69ecf40ad507.html';

test.describe('Binary Search Tree (BST) Interactive Application', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('should be in idle state initially', async ({ page }) => {
    // Verify that the application is in the idle state
    const insertButton = await page.locator('#insert-button');
    const resetButton = await page.locator('#reset-button');
    await expect(insertButton).toBeVisible();
    await expect(resetButton).toBeVisible();
  });

  test('should transition to inserting state on insert button click', async ({ page }) => {
    // Simulate clicking the insert button
    await page.click('#insert-button');
    
    // Verify that the state has transitioned to inserting
    const inputField = await page.locator('#input-field');
    await expect(inputField).toBeVisible();
  });

  test('should complete insertion and return to idle state', async ({ page }) => {
    // Simulate clicking the insert button
    await page.click('#insert-button');
    
    // Simulate completing the insertion
    await page.fill('#input-field', '5');
    await page.click('#insert-complete');

    // Verify that the application is back in the idle state
    const inputField = await page.locator('#input-field');
    await expect(inputField).toBeHidden();
  });

  test('should handle insertion failure and return to idle state', async ({ page }) => {
    // Simulate clicking the insert button
    await page.click('#insert-button');
    
    // Simulate a failure in insertion
    await page.fill('#input-field', 'invalid');
    await page.click('#insert-failed');

    // Verify that the application is back in the idle state
    const inputField = await page.locator('#input-field');
    await expect(inputField).toBeHidden();
  });

  test('should reset to idle state on reset button click', async ({ page }) => {
    // Simulate clicking the insert button
    await page.click('#insert-button');
    
    // Simulate clicking the reset button
    await page.click('#reset-button');

    // Verify that the application is back in the idle state
    const inputField = await page.locator('#input-field');
    await expect(inputField).toBeHidden();
  });

  test('should not allow invalid input during insertion', async ({ page }) => {
    // Simulate clicking the insert button
    await page.click('#insert-button');
    
    // Attempt to insert invalid data
    await page.fill('#input-field', 'invalid');
    await page.click('#insert-complete');

    // Verify that the input field is still visible, indicating failure
    const inputField = await page.locator('#input-field');
    await expect(inputField).toBeVisible();
  });
});