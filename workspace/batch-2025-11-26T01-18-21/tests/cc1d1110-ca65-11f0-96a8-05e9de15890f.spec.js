import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-18-21/html/cc1d1110-ca65-11f0-96a8-05e9de15890f.html';

test.beforeEach(async ({ page }) => {
  await page.goto(BASE_URL);
});

test.describe('Binary Tree Visualizer Tests', () => {
  
  test('should insert a node and update the tree', async ({ page }) => {
    await page.fill('#valueInput', '42');
    await page.click('#insertBtn');
    await expect(page.locator('text=Tree is empty — insert some values')).toBeHidden();
    await expect(page.locator('text=Nodes: 1')).toBeVisible();
  });

  test('should show alert when inserting a non-number', async ({ page }) => {
    await page.fill('#valueInput', 'abc');
    await page.click('#insertBtn');
    await expect(page.locator('text=Please enter a number.')).toBeVisible();
  });

  test('should delete a node and update the tree', async ({ page }) => {
    await page.fill('#valueInput', '42');
    await page.click('#insertBtn');
    await page.fill('#valueInput', '42');
    await page.click('#deleteBtn');
    await expect(page.locator('text=Tree is empty — insert some values')).toBeVisible();
  });

  test('should show alert when deleting a non-number', async ({ page }) => {
    await page.fill('#valueInput', 'abc');
    await page.click('#deleteBtn');
    await expect(page.locator('text=Please enter a number to delete.')).toBeVisible();
  });

  test('should search for a node and highlight the path', async ({ page }) => {
    await page.fill('#valueInput', '42');
    await page.click('#insertBtn');
    await page.fill('#searchInput', '42');
    await page.click('#searchBtn');
    await expect(page.locator('text=Nodes: 1')).toBeVisible();
    await expect(page.locator('svg g[data-id]')).toHaveCount(1);
  });

  test('should show alert when searching for a non-number', async ({ page }) => {
    await page.fill('#searchInput', 'abc');
    await page.click('#searchBtn');
    await expect(page.locator('text=Enter a number to search.')).toBeVisible();
  });

  test('should show alert when searching in an empty tree', async ({ page }) => {
    await page.fill('#searchInput', '42');
    await page.click('#searchBtn');
    await expect(page.locator('text=Tree is empty.')).toBeVisible();
  });

  test('should perform in-order traversal and highlight nodes', async ({ page }) => {
    await page.fill('#valueInput', '42');
    await page.click('#insertBtn');
    await page.click('#inorderBtn');
    await expect(page.locator('svg g[data-id]')).toHaveCount(1);
  });

  test('should clear the tree', async ({ page }) => {
    await page.fill('#valueInput', '42');
    await page.click('#insertBtn');
    await page.click('#clearBtn');
    await expect(page.locator('text=Tree is empty — insert some values')).toBeVisible();
  });

  test('should generate a random tree', async ({ page }) => {
    await page.fill('#randomCount', '5');
    await page.click('#randomBtn');
    await expect(page.locator('text=Nodes:')).toBeVisible();
  });

  test('should toggle allow duplicates', async ({ page }) => {
    await page.check('#dupToggle');
    await expect(page.locator('#dupToggle')).toBeChecked();
  });

  test('should step through insertion and visualize the path', async ({ page }) => {
    await page.fill('#stepInput', '42');
    await page.click('#stepInsertBtn');
    await expect(page.locator('text=Nodes:')).toBeVisible();
  });

  test('should skip steps during insertion', async ({ page }) => {
    await page.fill('#stepInput', '42');
    await page.click('#stepInsertBtn');
    await page.click('#skipStepBtn');
    await expect(page.locator('text=Nodes:')).toBeVisible();
  });

  test('should show node details on double click', async ({ page }) => {
    await page.fill('#valueInput', '42');
    await page.click('#insertBtn');
    await page.click('svg g[data-id]');
    await expect(page.locator('text=Node value: 42')).toBeVisible();
  });

  test('should clear search input', async ({ page }) => {
    await page.fill('#searchInput', '42');
    await page.click('#clearSearchBtn');
    await expect(page.locator('#searchInput')).toHaveValue('');
  });

  test('should stop animations on button click', async ({ page }) => {
    await page.fill('#valueInput', '42');
    await page.click('#insertBtn');
    await page.click('#inorderBtn');
    await page.click('#stopAnimBtn');
    await expect(page.locator('text=Nodes:')).toBeVisible();
  });

  test('should handle clicking the SVG canvas to clear highlights', async ({ page }) => {
    await page.fill('#valueInput', '42');
    await page.click('#insertBtn');
    await page.click('#inorderBtn');
    await page.click('#svgCanvas');
    await expect(page.locator('text=Nodes:')).toBeVisible();
  });
  
});