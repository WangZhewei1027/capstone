import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-31-04/html/92fd6e50-ca67-11f0-a3d6-179b5eb5e89b.html';

test.describe('Binary Tree Visualization & Demo', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application before each test
    await page.goto(BASE_URL);
  });

  test('should render initial state correctly', async ({ page }) => {
    // Verify that the initial output message is correct
    const output = await page.locator('#output').innerText();
    expect(output).toBe('Insert values to build the Binary Search Tree.');
  });

  test('should insert a node and update the tree visualization', async ({ page }) => {
    // Insert a valid node value
    await page.fill('#valueInput', '10');
    await page.click('#insertForm button[type="submit"]');

    // Verify output message after insertion
    const output = await page.locator('#output').innerText();
    expect(output).toBe('Inserted value 10 into the BST.');

    // Verify that the tree is rendered
    const nodes = await page.locator('.node').count();
    expect(nodes).toBe(1); // One node should be present
  });

  test('should show error for duplicate node insertion', async ({ page }) => {
    // Insert a valid node value
    await page.fill('#valueInput', '10');
    await page.click('#insertForm button[type="submit"]');

    // Attempt to insert the same node again
    await page.fill('#valueInput', '10');
    await page.click('#insertForm button[type="submit"]');

    // Verify that an error alert is shown
    const alertDialog = await page.locator('text=Value already exists in the tree (no duplicates allowed).');
    await expect(alertDialog).toBeVisible();
  });

  test('should show error for invalid input', async ({ page }) => {
    // Attempt to insert an invalid value
    await page.fill('#valueInput', 'abc');
    await page.click('#insertForm button[type="submit"]');

    // Verify that an alert is shown
    const alertDialog = await page.locator('text=Please enter a valid number');
    await expect(alertDialog).toBeVisible();
  });

  test('should clear the tree and reset output', async ({ page }) => {
    // Insert a valid node value
    await page.fill('#valueInput', '10');
    await page.click('#insertForm button[type="submit"]');

    // Clear the tree
    await page.click('#clearBtn');

    // Verify output message after clearing
    const output = await page.locator('#output').innerText();
    expect(output).toBe('Tree cleared.');

    // Verify that no nodes are present in the tree
    const nodes = await page.locator('.node').count();
    expect(nodes).toBe(0);
  });

  test('should display node value on node click', async ({ page }) => {
    // Insert a valid node value
    await page.fill('#valueInput', '10');
    await page.click('#insertForm button[type="submit"]');

    // Click on the node to display its value
    await page.click('.node');

    // Verify that the output shows the clicked node value
    const output = await page.locator('#output').innerText();
    expect(output).toBe('Node clicked: 10');
  });

  test('should handle multiple node insertions and visualize correctly', async ({ page }) => {
    // Insert multiple valid node values
    await page.fill('#valueInput', '10');
    await page.click('#insertForm button[type="submit"]');

    await page.fill('#valueInput', '5');
    await page.click('#insertForm button[type="submit"]');

    await page.fill('#valueInput', '15');
    await page.click('#insertForm button[type="submit"]');

    // Verify that the tree is rendered with three nodes
    const nodes = await page.locator('.node').count();
    expect(nodes).toBe(3); // Three nodes should be present
  });
});