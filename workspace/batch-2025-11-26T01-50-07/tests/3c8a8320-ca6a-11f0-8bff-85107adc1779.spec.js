import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-50-07/html/3c8a8320-ca6a-11f0-8bff-85107adc1779.html';

test.describe('Sliding Window Technique Demo', () => {
  let page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto(BASE_URL);
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('Initial state should be Idle', async () => {
    const runButton = await page.locator('#runBtn');
    await expect(runButton).toBeVisible();
    await expect(runButton).toBeEnabled();
  });

  test('User clicks Run button with valid input', async () => {
    await page.fill('#arrayInput', '2,1,5,1,3,2');
    await page.fill('#windowInput', '3');
    await page.click('#runBtn');

    // Validate transition to ParsingInput state
    await expect(page.locator('#visualization')).toBeVisible();
    await expect(page.locator('#output')).toBeEmpty();
  });

  test('Transition from ParsingInput to ValidatingInput', async () => {
    // Wait for the animation to complete
    await page.waitForTimeout(500); // Adjust timeout as necessary
    await expect(page.locator('#output')).toBeEmpty();
  });

  test('Valid input should transition to AnimatingWindow', async () => {
    await page.waitForTimeout(1000); // Wait for validation to complete
    await expect(page.locator('#visualization')).toContainText('Initial window sum');
  });

  test('Animation completes and transitions to CompletedAnimation', async () => {
    await page.waitForTimeout(3000); // Wait for animation to finish
    await expect(page.locator('#output')).toContainText('Sliding window sums calculation complete.');
  });

  test('User clicks Run button with invalid input', async () => {
    await page.fill('#arrayInput', 'invalid,input');
    await page.fill('#windowInput', '3');
    await page.click('#runBtn');

    // Validate error message
    await expect(page.locator('#output')).toContainText('Please enter a valid array of numbers.');
  });

  test('User clicks Run button with window size greater than array length', async () => {
    await page.fill('#arrayInput', '1,2');
    await page.fill('#windowInput', '3');
    await page.click('#runBtn');

    // Validate error message
    await expect(page.locator('#output')).toContainText('Window size k cannot be greater than array length.');
  });

  test('User clicks Run button with window size less than 1', async () => {
    await page.fill('#arrayInput', '1,2,3');
    await page.fill('#windowInput', '0');
    await page.click('#runBtn');

    // Validate error message
    await expect(page.locator('#output')).toContainText('Window size k must be at least 1.');
  });

  test('User clicks Run button after error to reset', async () => {
    await page.fill('#arrayInput', '1,2,3');
    await page.fill('#windowInput', '0');
    await page.click('#runBtn');
    await expect(page.locator('#output')).toContainText('Window size k must be at least 1.');

    // Reset by clicking run again
    await page.fill('#arrayInput', '2,1,5,1,3,2');
    await page.fill('#windowInput', '3');
    await page.click('#runBtn');

    // Validate transition to AnimatingWindow
    await expect(page.locator('#visualization')).toContainText('Initial window sum');
  });
});