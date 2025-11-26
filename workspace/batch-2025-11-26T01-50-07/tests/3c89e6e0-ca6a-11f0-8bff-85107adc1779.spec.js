import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-50-07/html/3c89e6e0-ca6a-11f0-8bff-85107adc1779.html';

test.describe('Kruskal\'s Algorithm Visualization Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('should load graph and enable controls', async ({ page }) => {
    // Click the Load Graph button
    await page.click('#btnReset');
    
    // Expect the controls to be enabled
    await expect(page.locator('#btnStep')).toBeEnabled();
    await expect(page.locator('#btnAuto')).toBeEnabled();
    await expect(page.locator('#btnPause')).toBeDisabled();
    
    // Check if the graph is loaded
    const logContent = await page.locator('#log').textContent();
    expect(logContent).toContain('Graph loaded.');
  });

  test('should step through the algorithm', async ({ page }) => {
    await page.click('#btnReset');
    await page.click('#btnStep');

    // Expect the log to indicate the first step is executed
    const logContent = await page.locator('#log').textContent();
    expect(logContent).toContain('Step 1: Edge');
    
    // Check if the next step button is still enabled
    await expect(page.locator('#btnStep')).toBeEnabled();
  });

  test('should auto run the algorithm', async ({ page }) => {
    await page.click('#btnReset');
    await page.click('#btnAuto');

    // Wait for a few seconds to allow the auto run to execute
    await page.waitForTimeout(5000);

    // Check if the log indicates the algorithm has completed
    const logContent = await page.locator('#log').textContent();
    expect(logContent).toContain('Algorithm completed: Minimum Spanning Tree constructed.');
    
    // Ensure buttons are disabled after completion
    await expect(page.locator('#btnStep')).toBeDisabled();
    await expect(page.locator('#btnAuto')).toBeDisabled();
    await expect(page.locator('#btnPause')).toBeDisabled();
  });

  test('should pause the auto run', async ({ page }) => {
    await page.click('#btnReset');
    await page.click('#btnAuto');

    // Wait for a moment to ensure the auto run starts
    await page.waitForTimeout(2000);
    
    // Click the Pause button
    await page.click('#btnPause');

    // Ensure the auto run is paused
    const logContent = await page.locator('#log').textContent();
    expect(logContent).toContain('Algorithm paused.');
    
    // Check if the buttons are enabled correctly
    await expect(page.locator('#btnStep')).toBeEnabled();
    await expect(page.locator('#btnAuto')).toBeEnabled();
    await expect(page.locator('#btnPause')).toBeDisabled();
  });

  test('should resume auto run after pause', async ({ page }) => {
    await page.click('#btnReset');
    await page.click('#btnAuto');

    // Wait for a moment to ensure the auto run starts
    await page.waitForTimeout(2000);
    
    // Click the Pause button
    await page.click('#btnPause');

    // Click the Auto Run button again to resume
    await page.click('#btnAuto');

    // Wait for a few seconds to allow the auto run to execute
    await page.waitForTimeout(5000);

    // Check if the log indicates the algorithm has completed
    const logContent = await page.locator('#log').textContent();
    expect(logContent).toContain('Algorithm completed: Minimum Spanning Tree constructed.');
  });

  test('should handle invalid edge input gracefully', async ({ page }) => {
    // Set invalid edges input
    await page.fill('#edgesInput', 'A,B,4\nA,H,invalid\nB,H,11');
    
    // Click the Load Graph button
    await page.click('#btnReset');

    // Expect an alert to be shown for invalid input
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('Error parsing edges: Invalid edge data at line 2');
      await dialog.dismiss();
    });
  });
});