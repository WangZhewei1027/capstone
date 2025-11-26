import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-31-04/html/92fcd210-ca67-11f0-a3d6-179b5eb5e89b.html';

test.describe('Linked List Visualization and Demo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test.describe('Idle State Tests', () => {
    test('should render an empty list initially', async ({ page }) => {
      const listContainer = await page.locator('#listContainer');
      const message = await page.locator('#message');
      await expect(listContainer).toHaveText('The linked list is empty.');
      await expect(message).toHaveText('');
    });

    test('should enable controls when in Idle state', async ({ page }) => {
      const insertBtn = await page.locator('#insertBtn');
      const removeBtn = await page.locator('#removeBtn');
      const clearBtn = await page.locator('#clearBtn');
      await expect(insertBtn).toBeEnabled();
      await expect(removeBtn).toBeEnabled();
      await expect(clearBtn).toBeEnabled();
    });
  });

  test.describe('Insert Node Tests', () => {
    test('should insert a node at the head', async ({ page }) => {
      await page.fill('#insertValue', 'Node1');
      await page.selectOption('#insertPosition', 'head');
      await page.click('#insertBtn');

      const listContainer = await page.locator('#listContainer');
      await expect(listContainer).toContainText('Node1');
    });

    test('should insert a node at the tail', async ({ page }) => {
      await page.fill('#insertValue', 'Node2');
      await page.selectOption('#insertPosition', 'tail');
      await page.click('#insertBtn');

      const listContainer = await page.locator('#listContainer');
      await expect(listContainer).toContainText('Node2');
    });

    test('should insert a node at a specific index', async ({ page }) => {
      await page.fill('#insertValue', 'Node3');
      await page.selectOption('#insertPosition', 'index');
      await page.fill('#insertIndex', '0');
      await page.click('#insertBtn');

      const listContainer = await page.locator('#listContainer');
      await expect(listContainer).toContainText('Node3');
    });

    test('should show error when inserting with an empty value', async ({ page }) => {
      await page.fill('#insertValue', '');
      await page.click('#insertBtn');

      const message = await page.locator('#message');
      await expect(message).toHaveText('Please enter a value to insert.');
    });

    test('should show error when inserting at an invalid index', async ({ page }) => {
      await page.fill('#insertValue', 'Node4');
      await page.selectOption('#insertPosition', 'index');
      await page.fill('#insertIndex', '10'); // Invalid index
      await page.click('#insertBtn');

      const message = await page.locator('#message');
      await expect(message).toHaveText('Invalid index. Please enter a number between 0 and 0.');
    });
  });

  test.describe('Remove Node Tests', () => {
    test('should remove a node from the head', async ({ page }) => {
      await page.fill('#insertValue', 'Node5');
      await page.selectOption('#insertPosition', 'head');
      await page.click('#insertBtn');

      await page.click('#removeBtn');

      const listContainer = await page.locator('#listContainer');
      await expect(listContainer).not.toContainText('Node5');
    });

    test('should show error when removing from an empty list', async ({ page }) => {
      await page.click('#removeBtn');

      const message = await page.locator('#message');
      await expect(message).toHaveText('The list is empty. No nodes to remove.');
    });

    test('should remove a node by value', async ({ page }) => {
      await page.fill('#insertValue', 'Node6');
      await page.selectOption('#insertPosition', 'head');
      await page.click('#insertBtn');

      await page.fill('#removeValue', 'Node6');
      await page.click('#removeBtn');

      const listContainer = await page.locator('#listContainer');
      await expect(listContainer).not.toContainText('Node6');
    });

    test('should show error when trying to remove a non-existent value', async ({ page }) => {
      await page.fill('#insertValue', 'Node7');
      await page.selectOption('#insertPosition', 'head');
      await page.click('#insertBtn');

      await page.fill('#removeValue', 'Node8'); // Non-existent value
      await page.click('#removeBtn');

      const message = await page.locator('#message');
      await expect(message).toHaveText('Value "Node8" not found in the list.');
    });
  });

  test.describe('Clear List Tests', () => {
    test('should clear the list', async ({ page }) => {
      await page.fill('#insertValue', 'Node9');
      await page.selectOption('#insertPosition', 'head');
      await page.click('#insertBtn');

      await page.click('#clearBtn');

      const listContainer = await page.locator('#listContainer');
      await expect(listContainer).toHaveText('The linked list is empty.');
    });

    test('should show message when trying to clear an already empty list', async ({ page }) => {
      await page.click('#clearBtn');

      const message = await page.locator('#message');
      await expect(message).toHaveText('The list is already empty.');
    });
  });
});