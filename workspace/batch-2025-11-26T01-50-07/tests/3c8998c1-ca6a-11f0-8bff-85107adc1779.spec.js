import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-50-07/html/3c8998c1-ca6a-11f0-8bff-85107adc1779.html';

test.describe('Dijkstra Algorithm Visualization Tests', () => {
  let page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto(BASE_URL);
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('Initial state is Idle', async () => {
    const runButton = await page.locator('#runBtn');
    const stepButton = await page.locator('#stepBtn');
    const resetButton = await page.locator('#resetBtn');
    
    // Verify that the Run button is enabled and Step button is disabled
    await expect(runButton).toBeEnabled();
    await expect(stepButton).toBeDisabled();
    await expect(resetButton).toBeEnabled();
  });

  test('Run Algorithm transitions to AlgorithmRunning', async () => {
    const runButton = await page.locator('#runBtn');
    
    // Click the Run button
    await runButton.click();

    // Verify that the state transitions to AlgorithmRunning
    await expect(runButton).toBeDisabled();
    await expect(page.locator('#stepBtn')).toBeDisabled();
    await expect(page.locator('#resetBtn')).toBeDisabled();
    await expect(page.locator('#newGraphBtn')).toBeDisabled();
  });

  test('Algorithm completes and transitions to AlgorithmCompleted', async () => {
    // Simulate the completion of the algorithm
    await page.evaluate(() => {
      const event = new Event('ALGORITHM_COMPLETED');
      document.dispatchEvent(event);
    });

    // Verify the transition to AlgorithmCompleted
    await expect(page.locator('#log')).toContainText('Algorithm completed.');
    await expect(page.locator('#runBtn')).toBeEnabled();
    await expect(page.locator('#stepBtn')).toBeDisabled();
  });

  test('Resetting transitions back to Idle', async () => {
    const resetButton = await page.locator('#resetBtn');
    
    // Click the Reset button
    await resetButton.click();

    // Verify that the state transitions back to Idle
    await expect(page.locator('#log')).toContainText('Resetting...');
    await expect(page.locator('#runBtn')).toBeEnabled();
    await expect(page.locator('#stepBtn')).toBeDisabled();
  });

  test('Generate New Graph transitions to GeneratingNewGraph', async () => {
    const newGraphButton = await page.locator('#newGraphBtn');
    
    // Click the New Graph button
    await newGraphButton.click();

    // Verify that the state transitions to GeneratingNewGraph
    await expect(page.locator('#log')).toContainText('Generating new graph...');
    await expect(page.locator('#runBtn')).toBeEnabled();
  });

  test('Stepwise running transitions to StepwiseRunning', async () => {
    const runButton = await page.locator('#runBtn');
    const stepButton = await page.locator('#stepBtn');

    // Click the Run button to start the algorithm
    await runButton.click();

    // Click the Step button
    await stepButton.click();

    // Verify that the state transitions to StepwiseRunning
    await expect(page.locator('#log')).toContainText('Running Dijkstra\'s algorithm (stepwise)');
  });

  test('Step button works correctly', async () => {
    const stepButton = await page.locator('#stepBtn');

    // Click the Step button
    await stepButton.click();

    // Verify that the step action is logged
    await expect(page.locator('#log')).toContainText('Visit node');
  });

  test('Reset button works after completion', async () => {
    const resetButton = await page.locator('#resetBtn');

    // Click the Reset button
    await resetButton.click();

    // Verify that the reset action is logged
    await expect(page.locator('#log')).toContainText('Resetting...');
  });

  test('Error when start and end nodes are the same', async () => {
    const startNodeSelect = await page.locator('#startNode');
    const endNodeSelect = await page.locator('#endNode');
    const runButton = await page.locator('#runBtn');

    // Set start and end nodes to be the same
    await startNodeSelect.selectOption({ index: 0 });
    await endNodeSelect.selectOption({ index: 0 });

    // Click the Run button
    await runButton.click();

    // Verify that an alert is shown
    const [alert] = await Promise.all([
      page.waitForEvent('dialog'),
      runButton.click()
    ]);
    expect(alert.message()).toContain('Start node and end node must be different.');
    await alert.dismiss();
  });
});