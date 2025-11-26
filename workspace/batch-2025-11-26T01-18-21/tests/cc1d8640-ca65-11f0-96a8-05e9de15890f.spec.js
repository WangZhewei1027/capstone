import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-18-21/html/cc1d8640-ca65-11f0-96a8-05e9de15890f.html';

test.describe('Adjacency Matrix Explorer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('Initial state - Idle', async ({ page }) => {
    const nodeCountInput = await page.locator('input#nodeCount');
    const addNodeButton = await page.locator('button#addNode');
    const removeNodeButton = await page.locator('button#removeNode');

    // Verify initial node count
    await expect(nodeCountInput).toHaveValue('6');
    // Verify buttons are enabled
    await expect(addNodeButton).toBeEnabled();
    await expect(removeNodeButton).toBeEnabled();
  });

  test('Add Node', async ({ page }) => {
    const nodeCountInput = await page.locator('input#nodeCount');
    const addNodeButton = await page.locator('button#addNode');

    await addNodeButton.click();
    await expect(nodeCountInput).toHaveValue('7');
    // Verify matrix has increased in size
    const matrixCells = await page.locator('table.matrix td').count();
    expect(matrixCells).toBe(49); // 7x7 matrix
  });

  test('Remove Node', async ({ page }) => {
    const nodeCountInput = await page.locator('input#nodeCount');
    const removeNodeButton = await page.locator('button#removeNode');

    await removeNodeButton.click();
    await expect(nodeCountInput).toHaveValue('5');
    // Verify matrix has decreased in size
    const matrixCells = await page.locator('table.matrix td').count();
    expect(matrixCells).toBe(25); // 5x5 matrix
  });

  test('Change Node Count', async ({ page }) => {
    const nodeCountInput = await page.locator('input#nodeCount');

    await nodeCountInput.fill('8');
    await nodeCountInput.dispatchEvent('change');
    await expect(nodeCountInput).toHaveValue('8');
    // Verify matrix has increased in size
    const matrixCells = await page.locator('table.matrix td').count();
    expect(matrixCells).toBe(64); // 8x8 matrix
  });

  test('Toggle Directed', async ({ page }) => {
    const directedCheckbox = await page.locator('input#directed');
    await directedCheckbox.check();
    await expect(directedCheckbox).toBeChecked();
  });

  test('Toggle Weighted', async ({ page }) => {
    const weightedCheckbox = await page.locator('input#weighted');
    await weightedCheckbox.check();
    await expect(weightedCheckbox).toBeChecked();
  });

  test('Randomize Edges', async ({ page }) => {
    const randomizeButton = await page.locator('button#randBtn');
    await randomizeButton.click();
    // Verify that the matrix has changed
    const firstCellValue = await page.locator('table.matrix td').nth(0).textContent();
    expect(firstCellValue).not.toBe('0');
  });

  test('Clear Matrix', async ({ page }) => {
    const clearButton = await page.locator('button#clearBtn');
    await clearButton.click();
    // Verify all cells are zero
    const allCells = await page.locator('table.matrix td');
    for (let i = 0; i < await allCells.count(); i++) {
      const cellValue = await allCells.nth(i).textContent();
      expect(cellValue).toBe('0');
    }
  });

  test('Export JSON', async ({ page }) => {
    const exportButton = await page.locator('button#exportBtn');
    await exportButton.click();
    // Verify download started (this may require a specific setup for Playwright to handle downloads)
    // This part is generally more complex and may require additional setup.
  });

  test('Import JSON', async ({ page }) => {
    const importButton = await page.locator('button#importBtn');
    await importButton.click();
    // Simulate file selection and import process
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles('path/to/valid.json'); // Adjust path as necessary
    // Verify that the matrix has been updated based on the imported JSON
  });

  test('Load Sample', async ({ page }) => {
    const sampleButton = await page.locator('button#sampleBtn');
    await sampleButton.click();
    // Verify that the matrix has been updated to the sample data
    const nodeCountInput = await page.locator('input#nodeCount');
    await expect(nodeCountInput).toHaveValue('7');
  });

  test('Check Symmetry', async ({ page }) => {
    const symmetryButton = await page.locator('button#symCheck');
    await symmetryButton.click();
    // Verify that the symmetry check output is correct
    const utilityOutput = await page.locator('#utilityOutput');
    await expect(utilityOutput).toContainText('Matrix is symmetric.');
  });

  test('Compute Degrees', async ({ page }) => {
    const degreeButton = await page.locator('button#degCalc');
    await degreeButton.click();
    // Verify that the degree output is correct
    const utilityOutput = await page.locator('#utilityOutput');
    await expect(utilityOutput).toContainText('out=0 in=0'); // Adjust based on initial state
  });

  test('Compute Floyd-Warshall', async ({ page }) => {
    const floydButton = await page.locator('button#floydWarshall');
    await floydButton.click();
    // Verify that the Floyd-Warshall output is correct
    const utilityOutput = await page.locator('#utilityOutput');
    await expect(utilityOutput).toContainText('All-pairs shortest path distances');
  });

  test('Click Matrix Cell', async ({ page }) => {
    const firstCell = await page.locator('table.matrix td.clickable').nth(0);
    await firstCell.click();
    // Verify that the cell value has changed (toggle)
    const cellValue = await firstCell.textContent();
    expect(cellValue).toBe('1'); // Assuming it toggles from 0 to 1
  });

  test('Prompt for Weight', async ({ page }) => {
    const firstCell = await page.locator('table.matrix td.clickable').nth(0);
    await firstCell.click();
    // Simulate entering a weight
    await page.evaluate(() => window.prompt = () => '5');
    await firstCell.click(); // Click again to confirm weight
    // Verify that the weight has been set
    const cellValue = await firstCell.textContent();
    expect(cellValue).toBe('5');
  });

  test('Error Handling on Import', async ({ page }) => {
    const importButton = await page.locator('button#importBtn');
    await importButton.click();
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles('path/to/invalid.json'); // Adjust path as necessary
    // Verify that an error alert is shown
    await expect(page.locator('text=Failed to parse')).toBeVisible();
  });
});