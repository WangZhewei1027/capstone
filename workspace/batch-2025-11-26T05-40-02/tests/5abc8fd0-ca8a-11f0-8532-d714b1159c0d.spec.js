import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-40-02/html/5abc8fd0-ca8a-11f0-8532-d714b1159c0d.html';

test.describe('Linked List Application Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('should render the initial state with buttons', async ({ page }) => {
    // Verify that the initial state is Idle with buttons present
    const insertButton = await page.locator('#insert-btn');
    const deleteButton = await page.locator('#delete-btn');
    const searchButton = await page.locator('#search-btn');

    await expect(insertButton).toBeVisible();
    await expect(deleteButton).toBeVisible();
    await expect(searchButton).toBeVisible();
  });

  test('should insert a node and update the table', async ({ page }) => {
    // Simulate inserting a node
    await page.click('#insert-btn');
    await page.fill('input[type="text"]', 'Node 1');
    await page.keyboard.press('Enter');

    // Verify that the table is updated with the new node
    const tableRow = await page.locator('#linked-list-tbody tr');
    await expect(tableRow).toHaveCount(1);
    await expect(tableRow.nth(0)).toContainText('Node 1');
  });

  test('should delete a node and update the table', async ({ page }) => {
    // Insert a node first
    await page.click('#insert-btn');
    await page.fill('input[type="text"]', 'Node 1');
    await page.keyboard.press('Enter');

    // Now delete the node
    await page.click('#delete-btn');
    await page.fill('input[type="number"]', '0');
    await page.keyboard.press('Enter');

    // Verify that the table is empty after deletion
    const tableRow = await page.locator('#linked-list-tbody tr');
    await expect(tableRow).toHaveCount(0);
  });

  test('should search for an existing node and show alert', async ({ page }) => {
    // Insert a node first
    await page.click('#insert-btn');
    await page.fill('input[type="text"]', 'Node 1');
    await page.keyboard.press('Enter');

    // Search for the node
    await page.click('#search-btn');
    await page.fill('input[type="text"]', 'Node 1');
    await page.keyboard.press('Enter');

    // Verify that the alert shows 'Data found'
    page.on('dialog', async dialog => {
      expect(dialog.message()).toBe('Data found');
      await dialog.dismiss();
    });
  });

  test('should show alert for non-existing node search', async ({ page }) => {
    // Search for a node that does not exist
    await page.click('#search-btn');
    await page.fill('input[type="text"]', 'Node 2');
    await page.keyboard.press('Enter');

    // Verify that the alert shows 'Data not found'
    page.on('dialog', async dialog => {
      expect(dialog.message()).toBe('Data not found');
      await dialog.dismiss();
    });
  });

  test('should handle invalid delete index gracefully', async ({ page }) => {
    // Attempt to delete a node with an invalid index
    await page.click('#delete-btn');
    await page.fill('input[type="number"]', '-1');
    await page.keyboard.press('Enter');

    // Verify that the table remains unchanged (still empty)
    const tableRow = await page.locator('#linked-list-tbody tr');
    await expect(tableRow).toHaveCount(0);
  });

  test('should handle invalid search input gracefully', async ({ page }) => {
    // Search with an empty input
    await page.click('#search-btn');
    await page.fill('input[type="text"]', '');
    await page.keyboard.press('Enter');

    // Verify that no alert is shown
    const dialogCount = await page.evaluate(() => window.dialogCount);
    expect(dialogCount).toBe(0);
  });
});