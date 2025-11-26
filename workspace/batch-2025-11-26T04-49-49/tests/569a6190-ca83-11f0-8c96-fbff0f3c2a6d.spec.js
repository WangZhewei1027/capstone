import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T04-49-49/html/569a6190-ca83-11f0-8c96-fbff0f3c2a6d.html';

test.describe('Binary Tree Application Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to the application before each test
    await page.goto(BASE_URL);
  });

  test('should display the title and main content', async ({ page }) => {
    // Validate the title of the page
    const title = await page.title();
    expect(title).toBe('Binary Tree');

    // Check for the presence of main content
    const mainContent = await page.locator('h1');
    await expect(mainContent).toHaveText('Binary Tree');
    
    const description = await page.locator('p');
    await expect(description).toContainText('There are two types of trees: Binary Trees and Non-Binary Trees.');
  });

  test('should display examples of binary and non-binary trees', async ({ page }) => {
    // Validate that examples of binary and non-binary trees are present
    const binaryTreeExample = await page.locator('h2:has-text("Example of Binary Tree:")');
    await expect(binaryTreeExample).toBeVisible();

    const nonBinaryTreeExample = await page.locator('h2:has-text("Example of Non-Binary Tree:")');
    await expect(nonBinaryTreeExample).toBeVisible();
  });

  test('should show conclusion about binary and non-binary trees', async ({ page }) => {
    // Validate the conclusion section is present
    const conclusionHeader = await page.locator('h2:has-text("Conclusion:")');
    await expect(conclusionHeader).toBeVisible();

    const conclusionText = await page.locator('p:has-text("The binary tree and non-binary tree are two different types of trees.")');
    await expect(conclusionText).toBeVisible();
  });

  test('should validate the structure of binary trees', async ({ page }) => {
    // Validate the structure mentioned in the binary tree section
    const binaryStructure = await page.locator('ul:has-text("root")');
    await expect(binaryStructure).toContainText('root');
    await expect(binaryStructure).toContainText('left child');
    await expect(binaryStructure).toContainText('right child');
  });

  test('should validate the structure of non-binary trees', async ({ page }) => {
    // Validate the structure mentioned in the non-binary tree section
    const nonBinaryStructure = await page.locator('ul:has-text("root")');
    await expect(nonBinaryStructure).toContainText('root');
    await expect(nonBinaryStructure).toContainText('left child');
    await expect(nonBinaryStructure).toContainText('right child');
  });

  test.afterEach(async ({ page }) => {
    // Optionally, you can add cleanup code here if needed
  });
});