import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-50-07/html/3c892391-ca6a-11f0-8bff-85107adc1779.html';

test.describe('Heap Sort Visualization', () => {
  let page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto(BASE_URL);
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('Initial state should render the input array', async () => {
    const inputArray = await page.locator('#inputArray').inputValue();
    expect(inputArray).toBe('20, 3, 15, 7, 6, 2, 9, 12');
    
    const bars = await page.locator('#array .bar').count();
    expect(bars).toBeGreaterThan(0); // Ensure bars are rendered
  });

  test('Start Sort button should parse input and transition to HeapBuilding', async () => {
    await page.locator('#startBtn').click();
    
    // Check if the log shows the building max heap message
    const logMessages = await page.locator('#log').innerText();
    expect(logMessages).toContain('Building max heap...');
  });

  test('Heap building should complete and transition to Sorting', async () => {
    await page.locator('#startBtn').click();
    
    // Wait for the sorting to start
    await page.waitForTimeout(3000); // Adjust timeout based on expected duration
    const logMessages = await page.locator('#log').innerText();
    expect(logMessages).toContain('Max heap built. Starting sort...');
  });

  test('Sorting should transition through Comparing and Swapping states', async () => {
    await page.locator('#startBtn').click();
    
    // Wait for comparing messages
    await page.waitForTimeout(3000);
    const logMessages = await page.locator('#log').innerText();
    expect(logMessages).toContain('Compare arr[');
    
    // Wait for swapping messages
    await page.waitForTimeout(3000);
    expect(logMessages).toContain('Swap root (index 0, value');
  });

  test('Sorting should complete and transition to Sorted state', async () => {
    await page.locator('#startBtn').click();
    
    // Wait for the sorting to finish
    await page.waitForTimeout(3000);
    const logMessages = await page.locator('#log').innerText();
    expect(logMessages).toContain('Array is fully sorted.');
  });

  test('Invalid input should show alert', async () => {
    await page.locator('#inputArray').fill('invalid input');
    await page.locator('#startBtn').click();
    
    // Expect an alert to be shown
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('Please enter a valid list of numbers separated by commas.');
      await dialog.dismiss();
    });
  });

  test('Changing speed should update the speed variable', async () => {
    await page.locator('#speed').fill('1000');
    const speedValue = await page.locator('#speed').inputValue();
    expect(speedValue).toBe('1000');
  });

  test('Start Sort button should be disabled during sorting', async () => {
    await page.locator('#startBtn').click();
    const startButtonDisabled = await page.locator('#startBtn').isDisabled();
    expect(startButtonDisabled).toBe(true);
    
    // Wait for sorting to finish
    await page.waitForTimeout(3000);
    
    const startButtonEnabled = await page.locator('#startBtn').isDisabled();
    expect(startButtonEnabled).toBe(false);
  });
});