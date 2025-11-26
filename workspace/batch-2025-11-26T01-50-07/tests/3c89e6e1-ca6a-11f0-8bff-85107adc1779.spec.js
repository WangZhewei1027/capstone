import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-50-07/html/3c89e6e1-ca6a-11f0-8bff-85107adc1779.html';

test.describe('Prim\'s Algorithm Visualization', () => {
  let page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto(BASE_URL);
  });

  test.afterAll(async () => {
    await page.close();
  });

  test.beforeEach(async () => {
    // Reset the application state before each test
    await page.reload();
  });

  test('should initialize in Idle state', async () => {
    // Verify that the application starts in the Idle state
    const logText = await page.locator('#log').textContent();
    expect(logText).toBe('');
    const startButtonDisabled = await page.locator('#start-prim').isDisabled();
    expect(startButtonDisabled).toBe(true);
  });

  test('should generate a random graph and transition to GeneratingGraph state', async () => {
    // Click the Generate Random Graph button
    await page.click('#generate-graph');

    // Verify that the graph is generated
    const logText = await page.locator('#log').textContent();
    expect(logText).toContain('Start from vertex 0.');
    const startButtonDisabled = await page.locator('#start-prim').isDisabled();
    expect(startButtonDisabled).toBe(false);
  });

  test('should start Prim\'s Algorithm and transition to AlgorithmStarted state', async () => {
    await page.click('#generate-graph');
    await page.click('#start-prim');

    // Verify that the algorithm has started
    const logText = await page.locator('#log').textContent();
    expect(logText).toContain('Start from vertex 0.');
    const nextButtonDisabled = await page.locator('#next-step').isDisabled();
    expect(nextButtonDisabled).toBe(false);
  });

  test('should step through the algorithm and transition to StepCompleted state', async () => {
    await page.click('#generate-graph');
    await page.click('#start-prim');

    // Click Next Step and verify the transition
    await page.click('#next-step');
    const logText = await page.locator('#log').textContent();
    expect(logText).toContain('Add edge');
  });

  test('should complete the algorithm and transition to AlgorithmCompleted state', async () => {
    await page.click('#generate-graph');
    await page.click('#start-prim');

    // Step through to completion
    const steps = await page.locator('#next-step');
    const totalSteps = await steps.count();
    for (let i = 0; i < totalSteps; i++) {
      await page.click('#next-step');
    }

    const logText = await page.locator('#log').textContent();
    expect(logText).toContain('Minimum Spanning Tree completed');
    const nextButtonDisabled = await page.locator('#next-step').isDisabled();
    expect(nextButtonDisabled).toBe(true);
  });

  test('should handle error state during algorithm execution', async () => {
    await page.click('#generate-graph');
    await page.click('#start-prim');

    // Simulate an error scenario by clicking Next Step until an error occurs
    const steps = await page.locator('#next-step');
    const totalSteps = await steps.count();
    for (let i = 0; i < totalSteps; i++) {
      await page.click('#next-step');
      const logText = await page.locator('#log').textContent();
      if (logText.includes('No new connecting edges')) {
        break; // Stop if an error occurs
      }
    }

    const logText = await page.locator('#log').textContent();
    expect(logText).toContain('No new connecting edges');
    const nextButtonDisabled = await page.locator('#next-step').isDisabled();
    expect(nextButtonDisabled).toBe(true);
  });

  test('should reset the application state', async () => {
    await page.click('#generate-graph');
    await page.click('#start-prim');
    await page.click('#next-step');

    // Click Reset and verify the state
    await page.click('#reset');
    const logText = await page.locator('#log').textContent();
    expect(logText).toBe('');
    const startButtonDisabled = await page.locator('#start-prim').isDisabled();
    expect(startButtonDisabled).toBe(true);
  });

  test('should disable buttons appropriately during transitions', async () => {
    await page.click('#generate-graph');
    const startButtonDisabled = await page.locator('#start-prim').isDisabled();
    expect(startButtonDisabled).toBe(false);

    await page.click('#start-prim');
    const nextButtonDisabled = await page.locator('#next-step').isDisabled();
    expect(nextButtonDisabled).toBe(false);
    const resetButtonDisabled = await page.locator('#reset').isDisabled();
    expect(resetButtonDisabled).toBe(false);

    await page.click('#next-step');
    const nextButtonDisabledAfterStep = await page.locator('#next-step').isDisabled();
    expect(nextButtonDisabledAfterStep).toBe(false);
  });
});