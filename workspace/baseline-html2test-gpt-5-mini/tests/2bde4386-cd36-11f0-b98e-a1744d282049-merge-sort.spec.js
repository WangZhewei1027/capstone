import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini/html/2bde4386-cd36-11f0-b98e-a1744d282049.html';

test.describe('Merge Sort Visualizer - End-to-end', () => {
  // Collect runtime errors and console error messages for each test
  let pageErrors = [];
  let consoleErrors = [];

  test.beforeEach(async ({ page }) => {
    pageErrors = [];
    consoleErrors = [];

    // Listen for uncaught exceptions on the page
    page.on('pageerror', error => {
      pageErrors.push(error);
    });

    // Listen for console.error messages
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    // Navigate to the app
    await page.goto(APP_URL, { waitUntil: 'load' });
    // Ensure the app finished initial synchronous setup
    await expect(page.locator('h1')).toHaveText(/Merge Sort — Interactive Visualizer/);
  });

  test.afterEach(async () => {
    // After each test, assert there were no uncaught page errors or console.error calls.
    // This ensures the app ran without runtime exceptions during the test.
    expect(pageErrors.length, 'No uncaught page errors should occur').toBe(0);
    expect(consoleErrors.length, 'No console.error messages should be emitted').toBe(0);
  });

  test('Initial load: default UI elements and state are correct', async ({ page }) => {
    // Verify core interactive elements exist and default labels/values are correct
    const newBtn = page.locator('#newArrayBtn');
    const startPauseBtn = page.locator('#startPauseBtn');
    const stepBtn = page.locator('#stepBtn');
    const resetBtn = page.locator('#resetBtn');
    const sizeRange = page.locator('#sizeRange');
    const speedRange = page.locator('#speedRange');
    const sizeLabel = page.locator('#sizeLabel');
    const speedLabel = page.locator('#speedLabel');
    const statusLabel = page.locator('#statusLabel');
    const compCount = page.locator('#compCount');
    const writeCount = page.locator('#writeCount');
    const actionCount = page.locator('#actionCount');
    const visualArea = page.locator('#visualArea');

    await expect(newBtn).toBeVisible();
    await expect(startPauseBtn).toBeVisible();
    await expect(stepBtn).toBeVisible();
    await expect(resetBtn).toBeVisible();
    await expect(sizeRange).toBeVisible();
    await expect(speedRange).toBeVisible();

    // Default size and speed labels as per HTML initialization
    await expect(sizeLabel).toHaveText('40');
    await expect(speedLabel).toHaveText('200');

    // Default status and counters
    await expect(statusLabel).toHaveText('Ready');
    await expect(compCount).toHaveText('Comparisons: 0');
    await expect(writeCount).toHaveText('Writes: 0');
    await expect(actionCount).toHaveText('Steps: 0');

    // Visual area should render bars equal to default SIZE (40)
    // Wait for bars to be present
    const bars = visualArea.locator('.bar');
    await expect(bars).toHaveCount(40);
  });

  test('Changing size and clicking New Array regenerates the array with expected bar count', async ({ page }) => {
    // Set size range to a smaller value and click New Array to regenerate
    const sizeLabel1 = page.locator('#sizeLabel1');
    const visualArea1 = page.locator('#visualArea1');

    // Change size to 12 via dispatching input event on the range input
    await page.evaluate(() => {
      const el = document.querySelector('#sizeRange');
      el.value = '12';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });

    // Click New Array to generate array with new size
    await page.click('#newArrayBtn');

    // The size label should reflect the new size and visual bars count should be 12
    await expect(sizeLabel).toHaveText('12');
    await expect(visualArea.locator('.bar')).toHaveCount(12);

    // Status should be Ready after regeneration
    await expect(page.locator('#statusLabel')).toHaveText('Ready');
  });

  test('Step button advances algorithm: Steps counter increments and pseudocode highlights', async ({ page }) => {
    // Ensure initial 'Steps: 0'
    const actionCount1 = page.locator('#actionCount1');
    await expect(actionCount).toHaveText('Steps: 0');

    // Click Step to advance one action
    await page.click('#stepBtn');

    // The action count should increment
    await expect(actionCount).toHaveText(/Steps: \d+/);
    const actionText = await actionCount.textContent();
    const stepsAfter = parseInt(actionText.replace('Steps: ', ''), 10);
    expect(stepsAfter).toBeGreaterThanOrEqual(1);

    // After stepping, pseudocode should have one active highlighted line
    const activeLines = page.locator('.pcode .line.active');
    await expect(activeLines).toHaveCountGreaterThan(0);
  });

  test('Start runs and completes sorting for a small array: final merged state and counters updated', async ({ page }) => {
    // Reduce size to minimum to allow fast completion
    await page.evaluate(() => {
      const sz = document.querySelector('#sizeRange');
      sz.value = '8';
      sz.dispatchEvent(new Event('input', { bubbles: true }));
    });

    // Regenerate array for the new size
    await page.click('#newArrayBtn');

    // Start running
    await page.click('#startPauseBtn');

    // Wait until statusLabel becomes 'Finished' - the algorithm completes
    const status = page.locator('#statusLabel');
    await expect(status).toHaveText(/Finished/, { timeout: 10000 });

    // After finish, all bars should have class 'merged'
    const mergedBars = page.locator('#visualArea .bar.merged');
    const totalBars = page.locator('#visualArea .bar');
    const mergedCount = await mergedBars.count();
    const totalCount = await totalBars.count();

    expect(mergedCount).toBe(totalCount);

    // Start/Pause button should have text 'Start' since it's stopped
    await expect(page.locator('#startPauseBtn')).toHaveText('Start');

    // The steps counter should be greater than 0
    const actionCountText = await page.locator('#actionCount').textContent();
    const steps = parseInt(actionCountText.replace('Steps: ', ''), 10);
    expect(steps).toBeGreaterThan(0);
  });

  test('Keyboard shortcuts: Space toggles run/pause and ArrowRight steps', async ({ page }) => {
    // Reduce size to make behaviors quicker
    await page.evaluate(() => {
      const sz1 = document.querySelector('#sizeRange');
      sz.value = '8';
      sz.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.click('#newArrayBtn');

    const startPauseBtn1 = page.locator('#startPauseBtn1');
    const statusLabel1 = page.locator('#statusLabel1');
    const actionCount2 = page.locator('#actionCount2');

    // Press Space to start (runs)
    await page.keyboard.press(' ');
    await expect(startPauseBtn).toHaveText('Pause');
    await expect(statusLabel).toMatchText(/Running|Paused|Finished/);

    // Press Space to pause
    await page.keyboard.press(' ');
    await expect(statusLabel).toHaveText('Paused');

    // Capture current steps
    const beforeStepsText = await actionCount.textContent();
    const beforeSteps = parseInt(beforeStepsText.replace('Steps: ', ''), 10);

    // Press ArrowRight to step once
    await page.keyboard.press('ArrowRight');

    // After stepping, steps should increase by at least 1
    await expect(actionCount).toHaveText(/Steps: \d+/);
    const afterStepsText = await actionCount.textContent();
    const afterSteps = parseInt(afterStepsText.replace('Steps: ', ''), 10);
    expect(afterSteps).toBeGreaterThanOrEqual(beforeSteps + 1);
  });

  test('Reset button stops run and regenerates array, clearing state', async ({ page }) => {
    // Start the algorithm
    await page.click('#startPauseBtn');
    // Wait a short moment to allow run to start
    await page.waitForTimeout(150);

    // Click Reset while running
    await page.click('#resetBtn');

    // Status should be 'Stopped' then 'Ready' after createArray is called in reset's handler
    // The createArray sets statusLabel to 'Ready'
    await expect(page.locator('#statusLabel')).toHaveText('Ready');

    // Generator should be cleared and steps reset to zero
    await expect(page.locator('#actionCount')).toHaveText('Steps: 0');
    await expect(page.locator('#compCount')).toHaveText('Comparisons: 0');
    await expect(page.locator('#writeCount')).toHaveText('Writes: 0');

    // Bars should exist according to current size label
    const sizeLabel2 = await page.locator('#sizeLabel2').textContent();
    const expectedCount = parseInt(sizeLabel, 10);
    await expect(page.locator('#visualArea .bar')).toHaveCount(expectedCount);
  });

  test('Adjusting speed while running updates speed label and keeps running', async ({ page }) => {
    // Set a small array for faster operations
    await page.evaluate(() => {
      const sz2 = document.querySelector('#sizeRange');
      sz.value = '10';
      sz.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.click('#newArrayBtn');

    // Start running
    await page.click('#startPauseBtn');
    await expect(page.locator('#startPauseBtn')).toHaveText('Pause');

    // Change speed to 50 (ms per step)
    await page.evaluate(() => {
      const sp = document.querySelector('#speedRange');
      sp.value = '50';
      sp.dispatchEvent(new Event('input', { bubbles: true }));
    });

    // Speed label should reflect the change
    await expect(page.locator('#speedLabel')).toHaveText('50');

    // Ensure the run is still active (button shows Pause) after changing speed
    await expect(page.locator('#startPauseBtn')).toHaveText('Pause');

    // Pause to clean up
    await page.click('#startPauseBtn');
    await expect(page.locator('#startPauseBtn')).toHaveText('Start');
  });

  test('Pseudo-code highlight clears when algorithm completes', async ({ page }) => {
    // Make array small and run to completion
    await page.evaluate(() => {
      const sz3 = document.querySelector('#sizeRange');
      sz.value = '8';
      sz.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.click('#newArrayBtn');
    await page.click('#startPauseBtn');

    // Wait for finish
    await expect(page.locator('#statusLabel')).toHaveText(/Finished/, { timeout: 10000 });

    // After completion, there should be no active pseudocode line
    await expect(page.locator('.pcode .line.active')).toHaveCount(0);
  });

});