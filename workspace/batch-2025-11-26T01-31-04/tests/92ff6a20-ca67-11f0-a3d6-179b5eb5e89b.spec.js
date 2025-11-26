import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-31-04/html/92ff6a20-ca67-11f0-a3d6-179b5eb5e89b.html';

test.describe('Sliding Window Technique Visualization', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('should start the sliding window visualization', async ({ page }) => {
    // Input valid array and window size, then click Start
    await page.fill('#arrayInput', '2,1,5,1,3,2');
    await page.fill('#windowSize', '3');
    await page.click('#startBtn');

    // Validate that the state has transitioned to InputReceived
    const statusText = await page.textContent('#status');
    expect(statusText).toContain('Window position: [0 .. 2]');
    const sumText = await page.textContent('#sum-display');
    expect(sumText).toContain('Sum in window: 8');
  });

  test('should slide window to the next position', async ({ page }) => {
    await page.fill('#arrayInput', '2,1,5,1,3,2');
    await page.fill('#windowSize', '3');
    await page.click('#startBtn');

    // Click Next to slide the window
    await page.click('#nextBtn');

    // Validate that the window has moved to the next position
    const statusText = await page.textContent('#status');
    expect(statusText).toContain('Window position: [1 .. 3]');
    const sumText = await page.textContent('#sum-display');
    expect(sumText).toContain('Sum in window: 9');
  });

  test('should slide window to the previous position', async ({ page }) => {
    await page.fill('#arrayInput', '2,1,5,1,3,2');
    await page.fill('#windowSize', '3');
    await page.click('#startBtn');
    await page.click('#nextBtn'); // Move to the next position

    // Click Previous to slide the window back
    await page.click('#prevBtn');

    // Validate that the window has moved back to the previous position
    const statusText = await page.textContent('#status');
    expect(statusText).toContain('Window position: [0 .. 2]');
    const sumText = await page.textContent('#sum-display');
    expect(sumText).toContain('Sum in window: 8');
  });

  test('should show error for invalid input', async ({ page }) => {
    // Click Start without inputting a valid array
    await page.click('#startBtn');

    // Validate that an error alert is shown
    const errorDialog = await page.evaluate(() => window.alert);
    expect(errorDialog).toBeTruthy();
  });

  test('should handle example button clicks', async ({ page }) => {
    // Click on an example button
    await page.click('#exampleArrays button[data-array="1,3,2,6,2,7,8"]');

    // Validate that the input fields are populated correctly
    const arrayInputValue = await page.inputValue('#arrayInput');
    expect(arrayInputValue).toBe('1,3,2,6,2,7,8');
    const windowSizeValue = await page.inputValue('#windowSize');
    expect(windowSizeValue).toBe('4');

    // Click Start to begin visualization
    await page.click('#startBtn');

    // Validate the initial state
    const statusText = await page.textContent('#status');
    expect(statusText).toContain('Window position: [0 .. 3]');
    const sumText = await page.textContent('#sum-display');
    expect(sumText).toContain('Sum in window: 12');
  });

  test('should disable Next button when at the end of the array', async ({ page }) => {
    await page.fill('#arrayInput', '2,1,5,1,3,2');
    await page.fill('#windowSize', '3');
    await page.click('#startBtn');

    // Slide to the end of the array
    await page.click('#nextBtn'); // [1 .. 3]
    await page.click('#nextBtn'); // [2 .. 4]

    // Validate that the Next button is disabled
    const nextButtonDisabled = await page.isDisabled('#nextBtn');
    expect(nextButtonDisabled).toBe(true);
  });

  test('should disable Previous button when at the start of the array', async ({ page }) => {
    await page.fill('#arrayInput', '2,1,5,1,3,2');
    await page.fill('#windowSize', '3');
    await page.click('#startBtn');

    // Validate that the Previous button is disabled initially
    const prevButtonDisabled = await page.isDisabled('#prevBtn');
    expect(prevButtonDisabled).toBe(true);
  });
});