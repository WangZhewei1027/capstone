import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-31-04/html/92fef4f0-ca67-11f0-a3d6-179b5eb5e89b.html';

test.beforeEach(async ({ page }) => {
  await page.goto(BASE_URL);
});

test.describe('Kruskal\'s Algorithm Visualization', () => {
  
  test('Initial state should be Idle', async ({ page }) => {
    const startButton = await page.locator('#startBtn');
    const stepButton = await page.locator('#stepBtn');
    const resetButton = await page.locator('#resetBtn');

    // Verify that the start button is enabled and others are disabled
    await expect(startButton).toBeEnabled();
    await expect(stepButton).toBeDisabled();
    await expect(resetButton).toBeDisabled();
  });

  test('Generate Random Graph', async ({ page }) => {
    const generateButton = await page.locator('#generateRandom');
    await generateButton.click();

    // Verify that the graph is generated and the log is updated
    const logDiv = await page.locator('#log');
    await expect(logDiv).toContainText('Random graph generated and loaded.');
    
    // Check if the edges input is populated
    const edgesInput = await page.locator('#edgesInput');
    const edgesValue = await edgesInput.inputValue();
    expect(edgesValue).not.toBe('');
  });

  test('Start Algorithm', async ({ page }) => {
    const generateButton = await page.locator('#generateRandom');
    await generateButton.click();
    
    const startButton = await page.locator('#startBtn');
    await startButton.click();

    // Verify that the algorithm has started
    const logDiv = await page.locator('#log');
    await expect(logDiv).toContainText('Starting Kruskal\'s Algorithm:');
    
    // Verify button states
    const stepButton = await page.locator('#stepBtn');
    const resetButton = await page.locator('#resetBtn');
    await expect(stepButton).toBeEnabled();
    await expect(startButton).toBeDisabled();
  });

  test('Execute Next Step', async ({ page }) => {
    const generateButton = await page.locator('#generateRandom');
    await generateButton.click();
    
    const startButton = await page.locator('#startBtn');
    await startButton.click();
    
    const stepButton = await page.locator('#stepBtn');
    await stepButton.click();

    // Verify that a step has been executed
    const logDiv = await page.locator('#log');
    await expect(logDiv).toContainText('Considering edge');
    
    // Verify that the next step can be executed
    await expect(stepButton).toBeEnabled();
  });

  test('Complete Algorithm', async ({ page }) => {
    const generateButton = await page.locator('#generateRandom');
    await generateButton.click();
    
    const startButton = await page.locator('#startBtn');
    await startButton.click();
    
    const stepButton = await page.locator('#stepBtn');
    
    // Execute steps until completion
    while (true) {
      await stepButton.click();
      const logDiv = await page.locator('#log');
      const logText = await logDiv.innerText();
      if (logText.includes('Minimum Spanning Tree completed.')) {
        break;
      }
    }

    // Verify that the algorithm has completed
    const logDiv = await page.locator('#log');
    await expect(logDiv).toContainText('Minimum Spanning Tree completed.');
    
    // Verify button states
    await expect(stepButton).toBeDisabled();
  });

  test('Reset Algorithm', async ({ page }) => {
    const generateButton = await page.locator('#generateRandom');
    await generateButton.click();
    
    const startButton = await page.locator('#startBtn');
    await startButton.click();
    
    const stepButton = await page.locator('#stepBtn');
    await stepButton.click();
    
    const resetButton = await page.locator('#resetBtn');
    await resetButton.click();

    // Verify that the algorithm has been reset
    const logDiv = await page.locator('#log');
    await expect(logDiv).toContainText('Algorithm reset.');
    
    // Verify button states
    await expect(startButton).toBeEnabled();
    await expect(stepButton).toBeDisabled();
    await expect(resetButton).toBeDisabled();
  });

  test('Error Handling for Invalid Edges', async ({ page }) => {
    const edgesInput = await page.locator('#edgesInput');
    await edgesInput.fill('0 1 7\n0 1 -5'); // Invalid edge with negative weight

    const generateButton = await page.locator('#generateRandom');
    await generateButton.click();

    const startButton = await page.locator('#startBtn');
    await startButton.click();

    // Verify that an alert is shown for invalid edges
    const alert = await page.waitForEvent('dialog');
    expect(alert.message()).toContain('Error parsing edges:');
    await alert.dismiss();
  });

  test('Edge case: Self Loop', async ({ page }) => {
    const edgesInput = await page.locator('#edgesInput');
    await edgesInput.fill('0 1 7\n1 1 5'); // Invalid edge with self loop

    const generateButton = await page.locator('#generateRandom');
    await generateButton.click();

    const startButton = await page.locator('#startBtn');
    await startButton.click();

    // Verify that an alert is shown for self loop
    const alert = await page.waitForEvent('dialog');
    expect(alert.message()).toContain('Self loop edge at line 2 is not allowed.');
    await alert.dismiss();
  });

  test('Edge case: Number of Vertices Exceeds Limit', async ({ page }) => {
    const numVerticesInput = await page.locator('#numVertices');
    await numVerticesInput.fill('25'); // Exceeding max limit

    const generateButton = await page.locator('#generateRandom');
    await generateButton.click();

    // Verify that an alert is shown for exceeding vertex limit
    const alert = await page.waitForEvent('dialog');
    expect(alert.message()).toContain('Number of vertices must be an integer between 2 and 20.');
    await alert.dismiss();
  });
});