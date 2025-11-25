import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-25T17-13-35/html/13783830-ca22-11f0-90fa-53e5712d34e0.html';

test.describe('K-Nearest Neighbors Application', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the K-Nearest Neighbors application before each test
    await page.goto(BASE_URL);
  });

  test('should be in idle state initially', async ({ page }) => {
    // Verify that the application is in the idle state
    const resultText = await page.locator('#result').innerText();
    expect(resultText).toBe('');
  });

  test('should transition to calculating state on calculate button click', async ({ page }) => {
    // Click the calculate button and verify the transition to calculating state
    await page.click('#calculate-button');
    const resultText = await page.locator('#result').innerText();
    expect(resultText).toContain('The K-Nearest Neighbors algorithm returned');
  });

  test('should transition to done state after computation is complete', async ({ page }) => {
    // Click the calculate button to start the calculation
    await page.click('#calculate-button');
    // Wait for the computation to complete
    await page.waitForSelector('#result', { state: 'visible' });
    const resultText = await page.locator('#result').innerText();
    expect(resultText).toContain('The K-Nearest Neighbors algorithm returned');
  });

  test('should reset to idle state on reset button click', async ({ page }) => {
    // Click the calculate button to start the calculation
    await page.click('#calculate-button');
    // Wait for the result to be displayed
    await page.waitForSelector('#result', { state: 'visible' });
    
    // Click the reset button
    await page.click('#reset-button');
    
    // Verify that the application has transitioned back to the idle state
    const resultText = await page.locator('#result').innerText();
    expect(resultText).toBe('');
  });

  test('should handle multiple calculate and reset actions', async ({ page }) => {
    // Perform multiple calculations and resets
    for (let i = 0; i < 3; i++) {
      await page.click('#calculate-button');
      await page.waitForSelector('#result', { state: 'visible' });
      const resultText = await page.locator('#result').innerText();
      expect(resultText).toContain('The K-Nearest Neighbors algorithm returned');
      
      await page.click('#reset-button');
      const resetText = await page.locator('#result').innerText();
      expect(resetText).toBe('');
    }
  });

  test('should not display result before calculation', async ({ page }) => {
    // Ensure that no result is displayed before clicking the calculate button
    const resultText = await page.locator('#result').innerText();
    expect(resultText).toBe('');
  });
});