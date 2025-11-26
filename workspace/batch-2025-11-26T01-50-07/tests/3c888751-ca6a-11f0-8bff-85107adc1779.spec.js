import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-50-07/html/3c888751-ca6a-11f0-8bff-85107adc1779.html';

test.describe('Adjacency Matrix Visualization Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application before each test
    await page.goto(BASE_URL);
  });

  test('Initial state is Idle', async ({ page }) => {
    // Verify that the application starts in the Idle state
    const errorMsg = await page.locator('#errorMsg').textContent();
    expect(errorMsg).toBe('');
    const matrixContainer = await page.locator('#matrixContainer').innerHTML();
    expect(matrixContainer).toBe('');
  });

  test('Build button is enabled in Idle state', async ({ page }) => {
    // Ensure the Build button is enabled when in Idle state
    const buildButton = page.locator('#buildMatrixBtn');
    await expect(buildButton).toBeEnabled();
  });

  test('Build adjacency matrix with valid input', async ({ page }) => {
    // Input valid edges and click the Build button
    await page.fill('#edgeInput', 'A B\nB C\nC A\nC D');
    await page.click('#buildMatrixBtn');

    // Verify that the matrix is rendered and the graph is drawn
    const matrixContainer = await page.locator('#matrixContainer').innerHTML();
    expect(matrixContainer).toContain('<table');
    const graphCanvas = await page.locator('#graphCanvas');
    await expect(graphCanvas).toBeVisible();
  });

  test('Show error message for invalid input', async ({ page }) => {
    // Input invalid edges and click the Build button
    await page.fill('#edgeInput', 'A B\nB C\nInvalid');
    await page.click('#buildMatrixBtn');

    // Verify that an error message is displayed
    const errorMsg = await page.locator('#errorMsg').textContent();
    expect(errorMsg).toContain('Each line must contain exactly two nodes');
  });

  test('Clear error message on reattempt', async ({ page }) => {
    // First attempt with invalid input
    await page.fill('#edgeInput', 'A B\nB C\nInvalid');
    await page.click('#buildMatrixBtn');
    let errorMsg = await page.locator('#errorMsg').textContent();
    expect(errorMsg).toContain('Each line must contain exactly two nodes');

    // Attempt to build again with valid input
    await page.fill('#edgeInput', 'A B\nB C\nC A\nC D');
    await page.click('#buildMatrixBtn');

    // Verify that the error message is cleared
    errorMsg = await page.locator('#errorMsg').textContent();
    expect(errorMsg).toBe('');
  });

  test('Disable Build button during processing', async ({ page }) => {
    // Input valid edges and click the Build button
    await page.fill('#edgeInput', 'A B\nB C\nC A\nC D');
    const buildButton = page.locator('#buildMatrixBtn');
    await buildButton.click();

    // Verify that the Build button is disabled during processing
    await expect(buildButton).toBeDisabled();
  });

  test('Handle empty input gracefully', async ({ page }) => {
    // Clear the input and click the Build button
    await page.fill('#edgeInput', '');
    await page.click('#buildMatrixBtn');

    // Verify that an error message is displayed
    const errorMsg = await page.locator('#errorMsg').textContent();
    expect(errorMsg).toContain('No edges provided');
  });
});