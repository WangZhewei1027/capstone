import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-50-07/html/3c88fc80-ca6a-11f0-8bff-85107adc1779.html';

test.describe('Insertion Sort Visualization Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('Initial state should be Idle', async ({ page }) => {
    const startButton = await page.locator('#startBtn');
    await expect(startButton).toBeEnabled();
  });

  test('User can input an array and transition to ValidatingInput', async ({ page }) => {
    const arrayInput = await page.locator('#arrayInput');
    const startButton = await page.locator('#startBtn');

    await arrayInput.fill('8,3,5,2,9');
    await startButton.click();

    // Check if input field is highlighted
    await expect(arrayInput).toHaveCSS('border', '2px solid rgb(0, 123, 255)'); // Assuming highlight changes border color
  });

  test('User inputs an invalid array and sees an error alert', async ({ page }) => {
    const arrayInput = await page.locator('#arrayInput');
    const startButton = await page.locator('#startBtn');

    await arrayInput.fill('invalid,input');
    await startButton.click();

    // Expect an alert to be shown
    await page.waitForTimeout(500); // Wait for the alert to appear
    const alertText = await page.evaluate(() => window.alert);
    expect(alertText).toContain('Please enter valid numbers separated by commas.');
  });

  test('User inputs a valid array and transitions to Sorting', async ({ page }) => {
    const arrayInput = await page.locator('#arrayInput');
    const startButton = await page.locator('#startBtn');

    await arrayInput.fill('8,3,5,2,9');
    await startButton.click();

    // Wait for sorting to start
    await page.waitForTimeout(1000); // Wait for the sorting animation to start

    // Check if bars are created
    const bars = await page.locator('#visualization .bar');
    await expect(bars).toHaveCount(5); // Expecting 5 bars for the input array
  });

  test('User can adjust sorting speed', async ({ page }) => {
    const speedControl = await page.locator('#speedControl');

    await speedControl.fill('1000'); // Change speed to 1000ms
    await expect(speedControl).toHaveValue('1000');
  });

  test('Sorting completes and returns to Idle state', async ({ page }) => {
    const arrayInput = await page.locator('#arrayInput');
    const startButton = await page.locator('#startBtn');

    await arrayInput.fill('8,3,5,2,9');
    await startButton.click();

    // Wait for sorting to complete
    await page.waitForTimeout(5000); // Wait for the sorting animation to finish

    // Check if the start button is enabled again
    await expect(startButton).toBeEnabled();
  });

  test('User inputs too many numbers and sees an error alert', async ({ page }) => {
    const arrayInput = await page.locator('#arrayInput');
    const startButton = await page.locator('#startBtn');

    await arrayInput.fill('1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31');
    await startButton.click();

    // Expect an alert to be shown
    await page.waitForTimeout(500); // Wait for the alert to appear
    const alertText = await page.evaluate(() => window.alert);
    expect(alertText).toContain('For visualization, please enter 30 or fewer numbers.');
  });
});