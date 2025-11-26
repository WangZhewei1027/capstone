import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T04-49-49/html/569ad6c0-ca83-11f0-8c96-fbff0f3c2a6d.html';

test.describe('Binary Search Tree Visualization Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('should render the tree and enable controls on idle state', async ({ page }) => {
    // Validate that the tree is rendered and controls are enabled in the Idle state
    const treeVisualization = await page.locator('.tree-visualization');
    await expect(treeVisualization).toBeVisible();
    const insertButton = await page.locator('.insert-button');
    await expect(insertButton).toBeEnabled();
    const resetButton = await page.locator('.reset-button');
    await expect(resetButton).toBeEnabled();
  });

  test('should transition to InsertStart state on insert button click', async ({ page }) => {
    // Simulate user clicking the insert button
    await page.click('.insert-button');
    const inputField = await page.locator('.input-field');
    await expect(inputField).toHaveClass(/highlighted/);
  });

  test('should show error alert for empty input', async ({ page }) => {
    // Simulate user clicking the insert button with empty input
    await page.click('.insert-button');
    await page.click('.insert-button'); // Click again to trigger validation
    const errorDialog = await page.locator('.error-dialog');
    await expect(errorDialog).toBeVisible();
  });

  test('should validate input and transition to InsertingNode on valid input', async ({ page }) => {
    // Simulate valid input and insertion
    await page.fill('.input-field', '5');
    await page.click('.insert-button');
    await page.waitForTimeout(1000); // Wait for validation to complete
    const insertingNode = await page.locator('.inserting-node');
    await expect(insertingNode).toBeVisible();
  });

  test('should visualize the tree after node insertion', async ({ page }) => {
    // Validate tree visualization after node insertion
    await page.fill('.input-field', '10');
    await page.click('.insert-button');
    await page.waitForTimeout(3000); // Wait for insertion animation
    const newNode = await page.locator('.node:has-text("10")');
    await expect(newNode).toBeVisible();
  });

  test('should reset the tree when reset button is clicked', async ({ page }) => {
    // Simulate user clicking the reset button
    await page.click('.reset-button');
    const confirmationDialog = await page.locator('.confirmation-dialog');
    await expect(confirmationDialog).toBeVisible();
    await page.click('.confirm-reset-button'); // Confirm reset
    const treeVisualization = await page.locator('.tree-visualization');
    await expect(treeVisualization).toBeEmpty();
  });

  test('should handle edge case of inserting duplicate values', async ({ page }) => {
    // Attempt to insert a duplicate value
    await page.fill('.input-field', '5');
    await page.click('.insert-button');
    await page.fill('.input-field', '5'); // Try to insert duplicate
    await page.click('.insert-button');
    const errorDialog = await page.locator('.error-dialog');
    await expect(errorDialog).toBeVisible();
  });

  test('should dismiss error alert and return to idle state', async ({ page }) => {
    // Dismiss the error alert
    await page.click('.insert-button'); // Trigger error
    const errorDialog = await page.locator('.error-dialog');
    await expect(errorDialog).toBeVisible();
    await page.click('.dismiss-error-button'); // Dismiss the alert
    await expect(errorDialog).toBeHidden();
    const inputField = await page.locator('.input-field');
    await expect(inputField).toHaveValue('');
  });
});