import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-18-21/html/cc1d3820-ca65-11f0-96a8-05e9de15890f.html';

test.beforeEach(async ({ page }) => {
  await page.goto(BASE_URL);
});

test.describe('Binary Search Tree Interactive Application', () => {

  test('should insert a valid integer into the BST', async ({ page }) => {
    await page.fill('#valueInput', '42');
    await page.click('#insertBtn');
    await expect(page.locator('#nodeCount')).toHaveText('1');
    await expect(page.locator('#structureText')).toHaveText('42');
  });

  test('should show alert for duplicate insertion', async ({ page }) => {
    await page.fill('#valueInput', '42');
    await page.click('#insertBtn');
    await page.fill('#valueInput', '42');
    await page.click('#insertBtn');
    await page.on('dialog', async dialog => {
      expect(dialog.message()).toBe('Value already exists in BST (duplicates ignored).');
      await dialog.dismiss();
    });
  });

  test('should delete an existing integer from the BST', async ({ page }) => {
    await page.fill('#valueInput', '42');
    await page.click('#insertBtn');
    await page.fill('#valueInput', '30');
    await page.click('#insertBtn');
    await page.fill('#valueInput', '42');
    await page.click('#deleteBtn');
    await expect(page.locator('#nodeCount')).toHaveText('1');
    await expect(page.locator('#structureText')).toHaveText('30');
  });

  test('should show alert when trying to delete a non-existing integer', async ({ page }) => {
    await page.fill('#valueInput', '50');
    await page.click('#deleteBtn');
    await page.on('dialog', async dialog => {
      expect(dialog.message()).toBe('Value not found.');
      await dialog.dismiss();
    });
  });

  test('should clear the BST after confirmation', async ({ page }) => {
    await page.fill('#valueInput', '42');
    await page.click('#insertBtn');
    await page.click('#clearBtn');
    await page.on('dialog', async dialog => {
      expect(dialog.message()).toBe('Clear the entire tree?');
      await dialog.accept();
    });
    await expect(page.locator('#nodeCount')).toHaveText('0');
    await expect(page.locator('#structureText')).toHaveText('Empty');
  });

  test('should not clear the BST if cancelled', async ({ page }) => {
    await page.fill('#valueInput', '42');
    await page.click('#insertBtn');
    await page.click('#clearBtn');
    await page.on('dialog', async dialog => {
      expect(dialog.message()).toBe('Clear the entire tree?');
      await dialog.dismiss();
    });
    await expect(page.locator('#nodeCount')).toHaveText('1');
  });

  test('should populate the BST with 7 random integers', async ({ page }) => {
    await page.click('#randomBtn');
    const nodeCount = await page.locator('#nodeCount').innerText();
    expect(parseInt(nodeCount)).toBeGreaterThan(0);
  });

  test('should search for an existing integer and highlight the path', async ({ page }) => {
    await page.fill('#valueInput', '42');
    await page.click('#insertBtn');
    await page.fill('#searchInput', '42');
    await page.click('#searchBtn');
    await expect(page.locator('#traversalResult')).toHaveText('Result: Found 42 (visited 1 nodes)');
  });

  test('should show alert when searching in an empty tree', async ({ page }) => {
    await page.fill('#searchInput', '42');
    await page.click('#searchBtn');
    await page.on('dialog', async dialog => {
      expect(dialog.message()).toBe('Tree is empty.');
      await dialog.dismiss();
    });
  });

  test('should show alert for invalid input on insert', async ({ page }) => {
    await page.fill('#valueInput', 'abc');
    await page.click('#insertBtn');
    await page.on('dialog', async dialog => {
      expect(dialog.message()).toBe('Enter an integer to insert.');
      await dialog.dismiss();
    });
  });

  test('should show alert for invalid input on delete', async ({ page }) => {
    await page.fill('#valueInput', 'abc');
    await page.click('#deleteBtn');
    await page.on('dialog', async dialog => {
      expect(dialog.message()).toBe('Enter an integer to delete.');
      await dialog.dismiss();
    });
  });

  test('should show alert for invalid input on search', async ({ page }) => {
    await page.fill('#searchInput', 'abc');
    await page.click('#searchBtn');
    await page.on('dialog', async dialog => {
      expect(dialog.message()).toBe('Enter an integer to search.');
      await dialog.dismiss();
    });
  });

  test('should handle panning on the SVG canvas', async ({ page }) => {
    await page.mouse.move(100, 100);
    await page.mouse.down();
    await page.mouse.move(150, 150);
    await page.mouse.up();
    const viewBox = await page.evaluate(() => document.getElementById('svgCanvas').getAttribute('viewBox'));
    expect(viewBox).not.toBe('0 0 1200 600'); // Check if the viewBox has changed
  });

  test('should change animation speed', async ({ page }) => {
    await page.fill('#speed', '500');
    await expect(page.locator('#speed')).toHaveValue('500');
  });

  test('should show alert for invalid speed input', async ({ page }) => {
    await page.fill('#speed', 'abc');
    await page.click('#insertBtn');
    await page.on('dialog', async dialog => {
      expect(dialog.message()).toBe('Enter an integer to insert.');
      await dialog.dismiss();
    });
  });

});