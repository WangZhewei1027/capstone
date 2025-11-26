import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-50-07/html/3c8ad141-ca6a-11f0-8bff-85107adc1779.html';

test.describe('K-Means Clustering Demo Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('should add points to the canvas', async ({ page }) => {
    // Click on the canvas to add a point
    await page.click('#canvas', { position: { x: 100, y: 100 } });
    
    // Verify that the point is added
    const points = await page.evaluate(() => {
      const canvas = document.getElementById('canvas');
      const ctx = canvas.getContext('2d');
      // Check the number of points drawn
      return ctx.__points.length; // Assuming points are stored in a custom property for testing
    });
    expect(points).toBe(1);
  });

  test('should show error when exceeding maximum points', async ({ page }) => {
    // Add 500 points
    for (let i = 0; i < 500; i++) {
      await page.click('#canvas', { position: { x: Math.random() * 700, y: Math.random() * 500 } });
    }
    
    // Attempt to add one more point
    await page.click('#canvas', { position: { x: 100, y: 100 } });
    
    // Expect an alert for maximum points exceeded
    await page.waitForTimeout(100); // Wait for alert to show
    const alertText = await page.evaluate(() => window.alert);
    expect(alertText).toBe('Maximum 500 points allowed.');
  });

  test('should run K-Means clustering', async ({ page }) => {
    // Add points
    await page.click('#canvas', { position: { x: 100, y: 100 } });
    await page.click('#canvas', { position: { x: 200, y: 200 } });
    
    // Set K value and run K-Means
    await page.fill('#kInput', '2');
    await page.click('#runBtn');
    
    // Verify that K-Means completed (check for visual feedback or state change)
    const infoText = await page.textContent('#info');
    expect(infoText).toContain('Converged');
  });

  test('should show error for invalid K value', async ({ page }) => {
    // Add points
    await page.click('#canvas', { position: { x: 100, y: 100 } });
    
    // Set invalid K value and run K-Means
    await page.fill('#kInput', '10'); // More than points
    await page.click('#runBtn');
    
    // Expect an alert for invalid K
    await page.waitForTimeout(100); // Wait for alert to show
    const alertText = await page.evaluate(() => window.alert);
    expect(alertText).toBe('K cannot be greater than number of points.');
  });

  test('should reset the canvas', async ({ page }) => {
    // Add points
    await page.click('#canvas', { position: { x: 100, y: 100 } });
    
    // Click reset button
    await page.click('#resetBtn');
    
    // Verify that the canvas is cleared
    const points = await page.evaluate(() => {
      const canvas = document.getElementById('canvas');
      const ctx = canvas.getContext('2d');
      return ctx.__points.length; // Assuming points are stored in a custom property for testing
    });
    expect(points).toBe(0);
  });

  test('should clear error message on reset', async ({ page }) => {
    // Add points and exceed maximum
    for (let i = 0; i < 500; i++) {
      await page.click('#canvas', { position: { x: Math.random() * 700, y: Math.random() * 500 } });
    }
    await page.click('#canvas', { position: { x: 100, y: 100 } });
    
    // Expect an alert for maximum points exceeded
    await page.waitForTimeout(100); // Wait for alert to show
    const alertText = await page.evaluate(() => window.alert);
    expect(alertText).toBe('Maximum 500 points allowed.');
    
    // Click reset button
    await page.click('#resetBtn');
    
    // Verify that the error message is cleared
    const infoText = await page.textContent('#info');
    expect(infoText).toBe('');
  });

  test.afterEach(async ({ page }) => {
    // Cleanup actions if necessary
  });
});