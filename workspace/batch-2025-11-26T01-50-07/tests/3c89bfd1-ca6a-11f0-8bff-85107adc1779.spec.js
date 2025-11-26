import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-50-07/html/3c89bfd1-ca6a-11f0-8bff-85107adc1779.html';

test.describe('Floyd-Warshall Algorithm Visualization', () => {
  let page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto(BASE_URL);
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('Initial state is Idle', async () => {
    const runButton = await page.locator('#runButton');
    const vertexCount = await page.locator('#vertexCount');
    const graphMatrix = await page.locator('#graphMatrix');

    // Verify input fields are enabled
    await expect(runButton).toBeEnabled();
    await expect(vertexCount).toBeEnabled();
    await expect(graphMatrix).toBeEnabled();
  });

  test('Run button transitions to ParsingInput state', async () => {
    const runButton = await page.locator('#runButton');
    await runButton.click();

    // Verify that the input fields are disabled after clicking run
    await expect(runButton).toBeDisabled();
  });

  test('Valid input transitions to ValidatingInput state', async () => {
    const vertexCount = await page.locator('#vertexCount');
    const graphMatrix = await page.locator('#graphMatrix');

    await vertexCount.fill('4');
    await graphMatrix.fill(`0 3 Infinity 7
8 0 2 Infinity
5 Infinity 0 1
2 Infinity Infinity 0`);

    const runButton = await page.locator('#runButton');
    await runButton.click();

    // Simulate input validation complete event
    await page.evaluate(() => {
      document.dispatchEvent(new Event('INPUT_VALIDATION_COMPLETE'));
    });

    // Verify that the algorithm is now running
    await expect(page.locator('#output')).toBeVisible();
  });

  test('Invalid input shows ErrorAlert state', async () => {
    const vertexCount = await page.locator('#vertexCount');
    const graphMatrix = await page.locator('#graphMatrix');

    await vertexCount.fill('4');
    await graphMatrix.fill(`0 3 Infinity
8 0 2 Infinity
5 Infinity 0
2 Infinity Infinity`); // Invalid input: not enough rows

    const runButton = await page.locator('#runButton');
    await runButton.click();

    // Simulate input validation failed event
    await page.evaluate(() => {
      document.dispatchEvent(new Event('INPUT_VALIDATION_FAILED'));
    });

    // Verify error dialog is shown
    const errorDialog = await page.locator('.error-dialog'); // Assuming there's a class for the error dialog
    await expect(errorDialog).toBeVisible();
  });

  test('Dismiss error alert returns to Idle state', async () => {
    const errorDialog = await page.locator('.error-dialog');
    const dismissButton = await errorDialog.locator('.dismiss-button'); // Assuming there's a dismiss button

    await dismissButton.click();

    // Verify that the error dialog is closed and input fields are enabled again
    await expect(errorDialog).toBeHidden();
    const runButton = await page.locator('#runButton');
    await expect(runButton).toBeEnabled();
  });

  test('Valid input runs algorithm and updates output', async () => {
    const vertexCount = await page.locator('#vertexCount');
    const graphMatrix = await page.locator('#graphMatrix');

    await vertexCount.fill('4');
    await graphMatrix.fill(`0 3 Infinity 7
8 0 2 Infinity
5 Infinity 0 1
2 Infinity Infinity 0`);

    const runButton = await page.locator('#runButton');
    await runButton.click();

    // Simulate input validation complete event
    await page.evaluate(() => {
      document.dispatchEvent(new Event('INPUT_VALIDATION_COMPLETE'));
    });

    // Simulate algorithm completed event
    await page.evaluate(() => {
      document.dispatchEvent(new Event('ALGORITHM_COMPLETED'));
    });

    // Verify output table is created
    const outputTable = await page.locator('#output table');
    await expect(outputTable).toBeVisible();
  });

  test('Algorithm completion returns to Idle state', async () => {
    const runButton = await page.locator('#runButton');
    const vertexCount = await page.locator('#vertexCount');
    const graphMatrix = await page.locator('#graphMatrix');

    await vertexCount.fill('4');
    await graphMatrix.fill(`0 3 Infinity 7
8 0 2 Infinity
5 Infinity 0 1
2 Infinity Infinity 0`);

    await runButton.click();

    // Simulate input validation complete event
    await page.evaluate(() => {
      document.dispatchEvent(new Event('INPUT_VALIDATION_COMPLETE'));
    });

    // Simulate algorithm completed event
    await page.evaluate(() => {
      document.dispatchEvent(new Event('ALGORITHM_COMPLETED'));
    });

    // Verify that the input fields are enabled again
    await expect(runButton).toBeEnabled();
    await expect(vertexCount).toHaveValue('');
    await expect(graphMatrix).toHaveValue('');
  });
});