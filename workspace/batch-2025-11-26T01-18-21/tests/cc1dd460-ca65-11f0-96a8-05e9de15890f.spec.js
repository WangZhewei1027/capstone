import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-18-21/html/cc1dd460-ca65-11f0-96a8-05e9de15890f.html';

test.beforeEach(async ({ page }) => {
  await page.goto(BASE_URL);
});

test.describe('Insertion Sort Visualizer', () => {
  
  test('should initialize with correct default values', async ({ page }) => {
    const sizeVal = await page.locator('#sizeVal').innerText();
    const speedVal = await page.locator('#speedVal').innerText();
    expect(sizeVal).toBe('30');
    expect(speedVal).toBe('200');
  });

  test('should randomize the array', async ({ page }) => {
    await page.click('#randomize');
    const bars = await page.locator('.bar').count();
    expect(bars).toBeGreaterThan(0);
  });

  test('should start the sorting process', async ({ page }) => {
    await page.click('#randomize');
    await page.click('#start');
    await page.waitForTimeout(500); // Wait for a short duration to allow sorting to start
    const isRunning = await page.evaluate(() => window.running);
    expect(isRunning).toBe(true);
  });

  test('should pause the sorting process', async ({ page }) => {
    await page.click('#randomize');
    await page.click('#start');
    await page.waitForTimeout(500);
    await page.click('#pause');
    const isPaused = await page.evaluate(() => window.paused);
    expect(isPaused).toBe(true);
  });

  test('should step through the sorting process', async ({ page }) => {
    await page.click('#randomize');
    await page.click('#step');
    const barsUpdated = await page.locator('.bar').count();
    expect(barsUpdated).toBeGreaterThan(0);
  });

  test('should reset the sorting process', async ({ page }) => {
    await page.click('#randomize');
    await page.click('#start');
    await page.waitForTimeout(500);
    await page.click('#reset');
    const bars = await page.locator('.bar').count();
    expect(bars).toBeGreaterThan(0);
  });

  test('should change the array size', async ({ page }) => {
    await page.locator('#size').fill('50');
    const sizeVal = await page.locator('#sizeVal').innerText();
    expect(sizeVal).toBe('50');
  });

  test('should change the speed of sorting', async ({ page }) => {
    await page.locator('#speed').fill('300');
    const speedVal = await page.locator('#speedVal').innerText();
    expect(speedVal).toBe('300');
  });

  test('should complete sorting and mark bars as sorted', async ({ page }) => {
    await page.click('#randomize');
    await page.click('#start');
    await page.waitForTimeout(2000); // Wait for sorting to complete
    const sortedBars = await page.locator('.bar.sorted').count();
    const totalBars = await page.locator('.bar').count();
    expect(sortedBars).toBe(totalBars);
  });

  test('should handle edge case of minimum array size', async ({ page }) => {
    await page.locator('#size').fill('5');
    await page.click('#randomize');
    await page.click('#start');
    await page.waitForTimeout(2000);
    const sortedBars = await page.locator('.bar.sorted').count();
    const totalBars = await page.locator('.bar').count();
    expect(sortedBars).toBe(totalBars);
  });

  test('should handle edge case of maximum array size', async ({ page }) => {
    await page.locator('#size').fill('80');
    await page.click('#randomize');
    await page.click('#start');
    await page.waitForTimeout(2000);
    const sortedBars = await page.locator('.bar.sorted').count();
    const totalBars = await page.locator('.bar').count();
    expect(sortedBars).toBe(totalBars);
  });

  test('should not allow start button when already running', async ({ page }) => {
    await page.click('#randomize');
    await page.click('#start');
    await page.click('#start'); // Attempt to start again
    const isRunning = await page.evaluate(() => window.running);
    expect(isRunning).toBe(true);
  });

  test('should not allow step button when running', async ({ page }) => {
    await page.click('#randomize');
    await page.click('#start');
    await page.click('#step'); // Attempt to step while running
    const isPaused = await page.evaluate(() => window.paused);
    expect(isPaused).toBe(false);
  });

  test('should toggle buttons correctly', async ({ page }) => {
    await page.click('#randomize');
    await page.click('#start');
    const startDisabled = await page.isDisabled('#start');
    const pauseDisabled = await page.isDisabled('#pause');
    expect(startDisabled).toBe(true);
    expect(pauseDisabled).toBe(false);
  });

});