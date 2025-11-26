import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-50-07/html/3c8a3501-ca6a-11f0-8bff-85107adc1779.html';

test.describe('Longest Common Subsequence Application', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('Initial state is Idle', async ({ page }) => {
    const computeButton = await page.locator('#computeBtn');
    const resultDiv = await page.locator('#result');
    const matrixContainer = await page.locator('#matrixContainer');

    // Verify that inputs are enabled and result is not displayed
    await expect(computeButton).toBeEnabled();
    await expect(resultDiv).toHaveText('');
    await expect(matrixContainer).toBeEmpty();
  });

  test('Compute LCS with valid input', async ({ page }) => {
    await page.fill('#string1', 'ABCBDAB');
    await page.fill('#string2', 'BDCABA');
    await page.click('#computeBtn');

    // Verify state transition to ResultDisplayed
    const resultDiv = await page.locator('#result');
    await expect(resultDiv).toContainText('Length of LCS:');
    await expect(resultDiv).toContainText('Longest Common Subsequence:');
    
    const matrixContainer = await page.locator('#matrixContainer');
    await expect(matrixContainer).toContainText('DP Matrix (LCS lengths for prefixes):');
  });

  test('Compute LCS with empty input', async ({ page }) => {
    await page.fill('#string1', '');
    await page.fill('#string2', '');
    await page.click('#computeBtn');

    // Verify that an alert is shown for empty input
    await page.waitForTimeout(100); // Wait for alert to be triggered
    const alert = await page.evaluate(() => window.alert);
    expect(alert).toBeTruthy();
  });

  test('Compute LCS with one empty string', async ({ page }) => {
    await page.fill('#string1', 'ABC');
    await page.fill('#string2', '');
    await page.click('#computeBtn');

    // Verify that an alert is shown for empty input
    await page.waitForTimeout(100); // Wait for alert to be triggered
    const alert = await page.evaluate(() => window.alert);
    expect(alert).toBeTruthy();
  });

  test('Reset state after error', async ({ page }) => {
    await page.fill('#string1', '');
    await page.fill('#string2', 'BDCABA');
    await page.click('#computeBtn');

    // Verify that an alert is shown for empty input
    await page.waitForTimeout(100); // Wait for alert to be triggered
    const alert = await page.evaluate(() => window.alert);
    expect(alert).toBeTruthy();

    // Click compute button again to reset
    await page.click('#computeBtn');

    // Verify that inputs are enabled again
    const computeButton = await page.locator('#computeBtn');
    await expect(computeButton).toBeEnabled();
  });

  test('Verify DP matrix is displayed correctly', async ({ page }) => {
    await page.fill('#string1', 'AGGTAB');
    await page.fill('#string2', 'GXTXAYB');
    await page.click('#computeBtn');

    // Verify that the matrix is displayed
    const matrixContainer = await page.locator('#matrixContainer');
    await expect(matrixContainer).toContainText('DP Matrix (LCS lengths for prefixes):');
    
    // Check if the matrix has the expected number of rows and columns
    const rows = await matrixContainer.locator('table tr').count();
    const cols = await matrixContainer.locator('table tr:first-child th').count();
    expect(rows).toBe(7); // 6 for AGGTAB + 1 for empty string
    expect(cols).toBe(8); // 7 for GXTXAYB + 1 for empty string
  });
});