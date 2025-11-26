import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-31-04/html/92fecde1-ca67-11f0-a3d6-179b5eb5e89b.html';

test.describe('Floyd-Warshall Algorithm Visualization', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('Initial state is Idle', async ({ page }) => {
    const startButton = await page.locator('#startButton');
    await expect(startButton).toBeVisible();
    await expect(startButton).toBeEnabled();
  });

  test('Start button transitions to ParsingInput state', async ({ page }) => {
    const startButton = await page.locator('#startButton');
    await startButton.click();

    // Check if the input is parsed successfully
    await expect(page.locator('#output')).toBeVisible();
    await expect(page.locator('#controls')).toBeVisible();
  });

  test('Parsing invalid input shows error alert', async ({ page }) => {
    const matrixInput = await page.locator('#matrixInput');
    await matrixInput.fill('Invalid Input');
    const startButton = await page.locator('#startButton');
    await startButton.click();

    // Expect an alert to be shown
    await expect(page.locator('#output')).toBeEmpty();
    await expect(page.locator('#stepInfo')).toHaveText('');
    await expect(page.locator('#controls')).toHaveCSS('display', 'none');
  });

  test('Valid input runs the algorithm and renders steps', async ({ page }) => {
    const matrixInput = await page.locator('#matrixInput');
    await matrixInput.fill(`0 3 INF 7
8 0 2 INF
5 INF 0 1
2 INF INF 0`);
    const startButton = await page.locator('#startButton');
    await startButton.click();

    // Check if the first step is rendered
    await expect(page.locator('#output')).toContainText('0');
    await expect(page.locator('#stepInfo')).toContainText('Initial matrix (before any iteration)');
  });

  test('Next button transitions through steps', async ({ page }) => {
    const matrixInput = await page.locator('#matrixInput');
    await matrixInput.fill(`0 3 INF 7
8 0 2 INF
5 INF 0 1
2 INF INF 0`);
    const startButton = await page.locator('#startButton');
    await startButton.click();

    const nextButton = await page.locator('#nextStep');
    await nextButton.click();

    // Check if the next step is rendered
    await expect(page.locator('#stepInfo')).toContainText('Updated dist[0][1]');
  });

  test('Previous button transitions back through steps', async ({ page }) => {
    const matrixInput = await page.locator('#matrixInput');
    await matrixInput.fill(`0 3 INF 7
8 0 2 INF
5 INF 0 1
2 INF INF 0`);
    const startButton = await page.locator('#startButton');
    await startButton.click();

    const nextButton = await page.locator('#nextStep');
    await nextButton.click();
    const prevButton = await page.locator('#prevStep');
    await prevButton.click();

    // Check if we are back to the initial step
    await expect(page.locator('#stepInfo')).toContainText('Initial matrix (before any iteration)');
  });

  test('Next button is disabled on the last step', async ({ page }) => {
    const matrixInput = await page.locator('#matrixInput');
    await matrixInput.fill(`0 3 INF 7
8 0 2 INF
5 INF 0 1
2 INF INF 0`);
    const startButton = await page.locator('#startButton');
    await startButton.click();

    const nextButton = await page.locator('#nextStep');
    while (await nextButton.isEnabled()) {
      await nextButton.click();
    }

    // Next button should be disabled now
    await expect(nextButton).toBeDisabled();
  });

  test('Previous button is disabled on the first step', async ({ page }) => {
    const matrixInput = await page.locator('#matrixInput');
    await matrixInput.fill(`0 3 INF 7
8 0 2 INF
5 INF 0 1
2 INF INF 0`);
    const startButton = await page.locator('#startButton');
    await startButton.click();

    const prevButton = await page.locator('#prevStep');
    // Previous button should be disabled initially
    await expect(prevButton).toBeDisabled();
  });
});