import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-50-07/html/3c8a3500-ca6a-11f0-8bff-85107adc1779.html';

test.describe('Knapsack Problem Demo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test.describe('State: Idle (S0_Idle)', () => {
    test('should enable Add Item and Solve Knapsack buttons', async ({ page }) => {
      const addItemButton = await page.locator('#add-item');
      const solveButton = await page.locator('#solve-knapsack');
      await expect(addItemButton).toBeEnabled();
      await expect(solveButton).toBeEnabled();
    });
  });

  test.describe('State: Adding Item (S1_AddingItem)', () => {
    test('should add an item to the table', async ({ page }) => {
      const addItemButton = await page.locator('#add-item');
      await addItemButton.click();
      const itemsTable = await page.locator('#items-table tbody tr');
      await expect(itemsTable).toHaveCount(1);
    });

    test('should refresh row numbers after adding an item', async ({ page }) => {
      const addItemButton = await page.locator('#add-item');
      await addItemButton.click();
      await addItemButton.click(); // Add another item
      const itemsTable = await page.locator('#items-table tbody tr');
      await expect(itemsTable).toHaveCount(2);
      const firstRowIndex = await itemsTable.nth(0).locator('td').nth(0).innerText();
      const secondRowIndex = await itemsTable.nth(1).locator('td').nth(0).innerText();
      await expect(firstRowIndex).toBe('1');
      await expect(secondRowIndex).toBe('2');
    });
  });

  test.describe('State: Solving Knapsack (S2_SolvingKnapsack)', () => {
    test('should solve knapsack with valid inputs', async ({ page }) => {
      await page.locator('#capacity').fill('50');
      await page.locator('#add-item').click();
      await page.locator('#items-table tbody tr').nth(0).locator('input[type="number"]').nth(0).fill('10');
      await page.locator('#items-table tbody tr').nth(0).locator('input[type="number"]').nth(1).fill('60');
      await page.locator('#add-item').click();
      await page.locator('#items-table tbody tr').nth(1).locator('input[type="number"]').nth(0).fill('20');
      await page.locator('#items-table tbody tr').nth(1).locator('input[type="number"]').nth(1).fill('100');
      await page.locator('#solve-knapsack').click();
      const resultDiv = await page.locator('#result');
      await expect(resultDiv).toContainText('Maximum Value: 160');
    });

    test('should show error dialog for invalid inputs', async ({ page }) => {
      await page.locator('#capacity').fill('50');
      await page.locator('#add-item').click();
      await page.locator('#items-table tbody tr').nth(0).locator('input[type="number"]').nth(0).fill('-10'); // Invalid weight
      await page.locator('#solve-knapsack').click();
      await expect(page).toHaveAlert('Invalid values in item #1');
    });
  });

  test.describe('State: Error Alert (S3_ErrorAlert)', () => {
    test('should clear error dialog on retry', async ({ page }) => {
      await page.locator('#capacity').fill('50');
      await page.locator('#add-item').click();
      await page.locator('#items-table tbody tr').nth(0).locator('input[type="number"]').nth(0).fill('-10'); // Invalid weight
      await page.locator('#solve-knapsack').click();
      await expect(page).toHaveAlert('Invalid values in item #1');
      await page.locator('#solve-knapsack').click(); // Retry
      await expect(page.locator('#result')).toHaveText('');
    });
  });
});