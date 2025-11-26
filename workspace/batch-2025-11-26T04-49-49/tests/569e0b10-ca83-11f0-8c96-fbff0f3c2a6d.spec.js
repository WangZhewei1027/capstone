import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T04-49-49/html/569e0b10-ca83-11f0-8c96-fbff0f3c2a6d.html';

test.describe('Breadth-First Search Visualization', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('should be in Idle state initially', async ({ page }) => {
    const startButton = await page.locator('#start-button');
    await expect(startButton).toBeEnabled();
  });

  test('should transition to Searching state when Start button is clicked', async ({ page }) => {
    await page.click('#start-button');
    await expect(page.locator('#search-box')).toHaveText(/searching/i);
  });

  test('should transition to Paused state when Pause button is clicked', async ({ page }) => {
    await page.click('#start-button');
    await page.click('#pause-button');
    await expect(page.locator('#search-box')).toHaveText(/paused/i);
  });

  test('should resume Searching state when Start button is clicked again', async ({ page }) => {
    await page.click('#start-button');
    await page.click('#pause-button');
    await page.click('#start-button');
    await expect(page.locator('#search-box')).toHaveText(/searching/i);
  });

  test('should transition to Completed state when search is completed', async ({ page }) => {
    await page.click('#start-button');
    await page.waitForTimeout(2000); // Simulate search completion
    await page.evaluate(() => {
      // Trigger the search completed event
      document.dispatchEvent(new Event('SEARCH_COMPLETED'));
    });
    await expect(page.locator('#search-box')).toHaveText(/completed/i);
  });

  test('should transition to Error state when an error occurs', async ({ page }) => {
    await page.click('#start-button');
    await page.waitForTimeout(2000); // Simulate search
    await page.evaluate(() => {
      // Trigger the search error event
      document.dispatchEvent(new Event('SEARCH_ERROR'));
    });
    await expect(page.locator('#search-box')).toHaveText(/error/i);
  });

  test('should reset to Idle state when Reset button is clicked from Completed state', async ({ page }) => {
    await page.click('#start-button');
    await page.waitForTimeout(2000); // Simulate search completion
    await page.evaluate(() => {
      document.dispatchEvent(new Event('SEARCH_COMPLETED'));
    });
    await page.click('#reset-button');
    const startButton = await page.locator('#start-button');
    await expect(startButton).toBeEnabled();
  });

  test('should reset to Idle state when Reset button is clicked from Error state', async ({ page }) => {
    await page.click('#start-button');
    await page.waitForTimeout(2000); // Simulate search
    await page.evaluate(() => {
      document.dispatchEvent(new Event('SEARCH_ERROR'));
    });
    await page.click('#reset-button');
    const startButton = await page.locator('#start-button');
    await expect(startButton).toBeEnabled();
  });
});