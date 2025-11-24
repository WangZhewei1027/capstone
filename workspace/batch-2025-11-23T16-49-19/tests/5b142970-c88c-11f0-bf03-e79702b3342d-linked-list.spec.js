import { test, expect } from '@playwright/test';

test.describe('Linked List Application Tests', () => {
  const baseUrl = 'http://127.0.0.1:5500/workspace/batch-2025-11-23T16-49-19/html/5b142970-c88c-11f0-bf03-e79702b3342d.html';

  test.beforeEach(async ({ page }) => {
    await page.goto(baseUrl);
  });

  test.describe('Idle State Tests', () => {
    test('should start in idle state', async ({ page }) => {
      const container = await page.locator('#linked-list-container');
      await expect(container).toBeEmpty();
    });
  });

  test.describe('Appending State Tests', () => {
    test('should append a node to the list', async ({ page }) => {
      await page.fill('#append-value', 'A');
      await page.click('#form-append button');
      const nodes = await page.locator('.node');
      await expect(nodes).toHaveCount(1);
      await expect(nodes.first()).toHaveText('A');
    });
  });

  test.describe('Prepending State Tests', () => {
    test('should prepend a node to the list', async ({ page }) => {
      await page.fill('#prepend-value', 'B');
      await page.click('#form-prepend button');
      const nodes = await page.locator('.node');
      await expect(nodes).toHaveCount(1);
      await expect(nodes.first()).toHaveText('B');
    });
  });

  test.describe('Inserting State Tests', () => {
    test('should insert a node at a specific index', async ({ page }) => {
      await page.fill('#append-value', 'A');
      await page.click('#form-append button');
      await page.fill('#insert-index', '0');
      await page.fill('#insert-value', 'C');
      await page.click('#form-insert button');
      const nodes = await page.locator('.node');
      await expect(nodes).toHaveCount(2);
      await expect(nodes.first()).toHaveText('C');
    });

    test('should handle out-of-bounds index', async ({ page }) => {
      await page.fill('#insert-index', '5');
      await page.fill('#insert-value', 'D');
      await page.click('#form-insert button');
      const log = await page.locator('#log');
      await expect(log).toContainText('Failed to insert: index 5 is out of bounds');
    });
  });

  test.describe('Deleting State Tests', () => {
    test('should delete a node by value', async ({ page }) => {
      await page.fill('#append-value', 'E');
      await page.click('#form-append button');
      await page.fill('#delete-value', 'E');
      await page.click('#form-delete button');
      const nodes = await page.locator('.node');
      await expect(nodes).toBeEmpty();
    });

    test('should handle deleting non-existent value', async ({ page }) => {
      await page.fill('#delete-value', 'F');
      await page.click('#form-delete button');
      const log = await page.locator('#log');
      await expect(log).toContainText('Value "F" not found in list');
    });
  });

  test.describe('Searching State Tests', () => {
    test('should search for a node by value', async ({ page }) => {
      await page.fill('#append-value', 'G');
      await page.click('#form-append button');
      await page.fill('#search-value', 'G');
      await page.click('#form-search button');
      const nodes = await page.locator('.node');
      await expect(nodes.first()).toHaveCSS('background-color', 'rgb(40, 167, 69)');
    });

    test('should handle searching for non-existent value', async ({ page }) => {
      await page.fill('#search-value', 'H');
      await page.click('#form-search button');
      const log = await page.locator('#log');
      await expect(log).toContainText('Value "H" not found in list');
    });
  });
});