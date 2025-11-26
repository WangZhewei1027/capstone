import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-31-04/html/92fe31a0-ca67-11f0-a3d6-179b5eb5e89b.html';

test.describe('Selection Sort Visualization', () => {
  let page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto(BASE_URL);
  });

  test.afterAll(async () => {
    await page.close();
  });

  test.beforeEach(async () => {
    // Ensure the application is in the Idle state before each test
    await page.reload();
    await page.waitForSelector('#arrayContainer');
  });

  test('should render initial array in Idle state', async () => {
    const bars = await page.$$('#arrayContainer .bar');
    expect(bars.length).toBe(15); // Check if 15 bars are rendered
  });

  test('should start sorting and transition to Sorting state', async () => {
    await page.click('#startBtn');
    
    // Wait for sorting to start
    await page.waitForTimeout(100); // Allow some time for sorting to begin
    const startButtonDisabled = await page.$eval('#startBtn', btn => btn.disabled);
    expect(startButtonDisabled).toBe(true); // Start button should be disabled

    // Check if sorting is happening
    const currentBars = await page.$$('.current');
    expect(currentBars.length).toBeGreaterThan(0); // There should be at least one current bar
  });

  test('should complete sorting and transition to Sorted state', async () => {
    await page.click('#startBtn');
    
    // Wait for sorting to complete
    await page.waitForTimeout(3000); // Adjust timeout based on expected sort duration

    const sortedBars = await page.$$('#arrayContainer .sorted');
    expect(sortedBars.length).toBe(15); // All bars should be sorted
    const startButtonDisabled = await page.$eval('#startBtn', btn => btn.disabled);
    expect(startButtonDisabled).toBe(false); // Start button should be enabled again
  });

  test('should reset array and remain in Idle state', async () => {
    await page.click('#resetBtn');
    
    const bars = await page.$$('#arrayContainer .bar');
    expect(bars.length).toBe(15); // Check if 15 bars are rendered again
    const startButtonDisabled = await page.$eval('#startBtn', btn => btn.disabled);
    expect(startButtonDisabled).toBe(false); // Start button should be enabled
  });

  test('should change sorting speed', async () => {
    const initialDelay = await page.$eval('#speedRange', input => input.value);
    await page.fill('#speedRange', '1200'); // Change speed to 1200 ms
    const newDelay = await page.$eval('#speedRange', input => input.value);
    
    expect(newDelay).toBe('1200'); // Verify speed has changed
    const speedValueText = await page.$eval('#speedValue', span => span.textContent);
    expect(speedValueText).toBe('1200 ms'); // Verify displayed speed value
  });

  test('should not start sorting if already sorting', async () => {
    await page.click('#startBtn');
    await page.click('#startBtn'); // Attempt to start sorting again

    const currentBars = await page.$$('.current');
    expect(currentBars.length).toBeGreaterThan(0); // Sorting should still be in progress
  });

  test('should handle multiple resets', async () => {
    await page.click('#resetBtn');
    await page.click('#resetBtn'); // Reset again

    const bars = await page.$$('#arrayContainer .bar');
    expect(bars.length).toBe(15); // Check if 15 bars are rendered again
  });
});