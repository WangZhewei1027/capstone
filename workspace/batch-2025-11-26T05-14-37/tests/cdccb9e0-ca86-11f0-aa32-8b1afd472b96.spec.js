import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-14-37/html/cdccb9e0-ca86-11f0-aa32-8b1afd472b96.html';

test.describe('KNN Application Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the KNN application page before each test
    await page.goto(BASE_URL);
  });

  test('Initial state is Idle', async ({ page }) => {
    // Verify that the application starts in the Idle state
    const numNeighborsInput = await page.locator('#numNeighbors');
    const dataInput = await page.locator('#data');
    const targetInput = await page.locator('#target');
    const runKNNButton = await page.locator('button[onclick="knn(numNeighbors, data, target)"]');

    await expect(numNeighborsInput).toBeVisible();
    await expect(dataInput).toBeVisible();
    await expect(targetInput).toBeVisible();
    await expect(runKNNButton).toBeVisible();
  });

  test('Run KNN with valid inputs', async ({ page }) => {
    // Input valid values and run the KNN algorithm
    await page.fill('#numNeighbors', '3');
    await page.fill('#data', '1,2,3,4,5');
    await page.fill('#target', '1');

    await page.click('button[onclick="knn(numNeighbors, data, target)"]');

    // Validate that the result is displayed
    const resultDiv = await page.locator('#result');
    await expect(resultDiv).toBeVisible();
    await expect(resultDiv).toContainText('Predicted neighbors');
  });

  test('Run KNN with empty inputs', async ({ page }) => {
    // Attempt to run KNN with empty inputs and check for error handling
    await page.click('button[onclick="knn(numNeighbors, data, target)"]');

    // Validate that no result is displayed
    const resultDiv = await page.locator('#result');
    await expect(resultDiv).toBeEmpty();
  });

  test('Run KNN with invalid number of neighbors', async ({ page }) => {
    // Input an invalid number of neighbors and run the KNN algorithm
    await page.fill('#numNeighbors', '-1');
    await page.fill('#data', '1,2,3,4,5');
    await page.fill('#target', '1');

    await page.click('button[onclick="knn(numNeighbors, data, target)"]');

    // Validate that no result is displayed
    const resultDiv = await page.locator('#result');
    await expect(resultDiv).toBeEmpty();
  });

  test('Check predicted neighbors table', async ({ page }) => {
    // Input valid values and run the KNN algorithm
    await page.fill('#numNeighbors', '3');
    await page.fill('#data', '1,2,3,4,5');
    await page.fill('#target', '1');

    await page.click('button[onclick="knn(numNeighbors, data, target)"]');

    // Validate that the predicted neighbors table is populated
    const resultTable = await page.locator('#result-table');
    await expect(resultTable).toBeVisible();
    const rows = await resultTable.locator('tr').count();
    await expect(rows).toBeGreaterThan(1); // At least one row for headers and one for data
  });

  test('Check visual feedback on button click', async ({ page }) => {
    // Input valid values and check for visual feedback
    await page.fill('#numNeighbors', '3');
    await page.fill('#data', '1,2,3,4,5');
    await page.fill('#target', '1');

    const runKNNButton = await page.locator('button[onclick="knn(numNeighbors, data, target)"]');
    await runKNNButton.hover();

    // Validate that the button is visually responsive
    await expect(runKNNButton).toHaveCSS('opacity', '1'); // Assuming button is not disabled
  });
});