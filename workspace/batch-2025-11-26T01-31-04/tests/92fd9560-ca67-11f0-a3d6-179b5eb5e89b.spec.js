import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-31-04/html/92fd9560-ca67-11f0-a3d6-179b5eb5e89b.html';

test.describe('Binary Search Tree Visualization Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('should start in Idle state', async ({ page }) => {
    const output = await page.locator('#output').textContent();
    expect(output).toBe('');
  });

  test('should insert a node successfully', async ({ page }) => {
    await page.fill('#valueInput', '10');
    await page.click('#insertBtn');

    const output = await page.locator('#output').textContent();
    expect(output).toContain('Inserted 10 into the BST.');
  });

  test('should show error for duplicate insertion', async ({ page }) => {
    await page.fill('#valueInput', '10');
    await page.click('#insertBtn');
    await page.fill('#valueInput', '10');
    await page.click('#insertBtn');

    const output = await page.locator('#output').textContent();
    expect(output).toContain('Value 10 already exists in the BST (no duplicates).');
  });

  test('should search for an existing node', async ({ page }) => {
    await page.fill('#valueInput', '20');
    await page.click('#insertBtn');
    await page.fill('#valueInput', '20');
    await page.click('#searchBtn');

    const output = await page.locator('#output').textContent();
    expect(output).toContain('Value 20 found in the BST.');
  });

  test('should show error for searching a non-existing node', async ({ page }) => {
    await page.fill('#valueInput', '30');
    await page.click('#searchBtn');

    const output = await page.locator('#output').textContent();
    expect(output).toContain('Value 30 not found in the BST.');
  });

  test('should delete an existing node', async ({ page }) => {
    await page.fill('#valueInput', '40');
    await page.click('#insertBtn');
    await page.fill('#valueInput', '40');
    await page.click('#deleteBtn');

    const output = await page.locator('#output').textContent();
    expect(output).toContain('Deleted 40 from the BST.');
  });

  test('should show error for deleting a non-existing node', async ({ page }) => {
    await page.fill('#valueInput', '50');
    await page.click('#deleteBtn');

    const output = await page.locator('#output').textContent();
    expect(output).toContain('Value 50 not found. Cannot delete.');
  });

  test('should clear the tree', async ({ page }) => {
    await page.fill('#valueInput', '60');
    await page.click('#insertBtn');
    await page.click('#clearBtn');

    const output = await page.locator('#output').textContent();
    expect(output).toContain('BST cleared.');
  });

  test('should show error for invalid input on insert', async ({ page }) => {
    await page.fill('#valueInput', 'abc');
    await page.click('#insertBtn');

    const output = await page.locator('#output').textContent();
    expect(output).toContain('Invalid input. Please enter a valid number.');
  });

  test('should show error for empty input on search', async ({ page }) => {
    await page.click('#searchBtn');

    const output = await page.locator('#output').textContent();
    expect(output).toContain('Please enter a value.');
  });

  test('should show error for empty input on delete', async ({ page }) => {
    await page.click('#deleteBtn');

    const output = await page.locator('#output').textContent();
    expect(output).toContain('Please enter a value.');
  });

  test('should disable buttons when input is invalid', async ({ page }) => {
    await page.fill('#valueInput', 'abc');
    const insertBtn = page.locator('#insertBtn');
    const searchBtn = page.locator('#searchBtn');
    const deleteBtn = page.locator('#deleteBtn');

    expect(await insertBtn.isDisabled()).toBe(true);
    expect(await searchBtn.isDisabled()).toBe(true);
    expect(await deleteBtn.isDisabled()).toBe(true);
  });

  test('should allow Enter key to trigger insert', async ({ page }) => {
    await page.fill('#valueInput', '70');
    await page.press('#valueInput', 'Enter');

    const output = await page.locator('#output').textContent();
    expect(output).toContain('Inserted 70 into the BST.');
  });
});