import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-50-07/html/3c88d570-ca6a-11f0-8bff-85107adc1779.html';

test.describe('Bubble Sort Visualization', () => {
  let page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto(BASE_URL);
  });

  test.afterAll(async () => {
    await page.close();
  });

  test.beforeEach(async () => {
    await page.reload();
  });

  test('Initial state: Idle', async () => {
    const sortButton = await page.locator('#sortBtn');
    const resetButton = await page.locator('#resetBtn');
    const inputField = await page.locator('#arrayInput');

    // Verify that the sort button is enabled and reset button is disabled
    await expect(sortButton).toBeEnabled();
    await expect(resetButton).toBeDisabled();
    await expect(inputField).toBeEnabled();
  });

  test('User clicks sort button with invalid input', async () => {
    const sortButton = await page.locator('#sortBtn');
    const inputField = await page.locator('#arrayInput');

    await inputField.fill(''); // Invalid input
    await sortButton.click();

    // Expect an alert to be shown
    await page.waitForTimeout(500); // Wait for alert to be processed
    const alertText = await page.evaluate(() => window.alert);
    expect(alertText).toContain('Please enter at least two valid numbers.');
  });

  test('User clicks sort button with valid input', async () => {
    const sortButton = await page.locator('#sortBtn');
    const inputField = await page.locator('#arrayInput');

    await inputField.fill('5,3,8,6,2'); // Valid input
    await sortButton.click();

    // Verify that the state transitions to ParsingInput
    await expect(page.locator('#steps')).toContainText('Starting Bubble Sort...');
    await expect(page.locator('#arrayContainer')).toHaveCount(5); // 5 bars created
  });

  test('Bubble sort visual completes and returns to Idle state', async () => {
    const inputField = await page.locator('#arrayInput');
    const sortButton = await page.locator('#sortBtn');

    await inputField.fill('5,3,8,6,2');
    await sortButton.click();

    // Wait for sorting to complete
    await page.waitForTimeout(5000); // Adjust timeout based on sorting duration

    // Verify that sorting is completed
    await expect(page.locator('#steps')).toContainText('Sorting completed.');
    await expect(sortButton).toBeDisabled();
  });

  test('User clicks reset button', async () => {
    const resetButton = await page.locator('#resetBtn');
    const inputField = await page.locator('#arrayInput');

    await resetButton.click();

    // Verify that the state returns to Idle
    await expect(resetButton).toBeDisabled();
    await expect(inputField).toBeEnabled();
    await expect(page.locator('#arrayContainer')).toHaveCount(0); // No bars should be present
  });

  test('Reset button is disabled initially', async () => {
    const resetButton = await page.locator('#resetBtn');
    await expect(resetButton).toBeDisabled(); // Reset button should be disabled initially
  });

  test('Sorting with edge case: single number', async () => {
    const inputField = await page.locator('#arrayInput');
    const sortButton = await page.locator('#sortBtn');

    await inputField.fill('5'); // Single number
    await sortButton.click();

    // Expect an alert to be shown
    await page.waitForTimeout(500); // Wait for alert to be processed
    const alertText = await page.evaluate(() => window.alert);
    expect(alertText).toContain('Please enter at least two valid numbers.');
  });

  test('Sorting with edge case: invalid characters', async () => {
    const inputField = await page.locator('#arrayInput');
    const sortButton = await page.locator('#sortBtn');

    await inputField.fill('5,abc,8'); // Invalid input
    await sortButton.click();

    // Expect an alert to be shown
    await page.waitForTimeout(500); // Wait for alert to be processed
    const alertText = await page.evaluate(() => window.alert);
    expect(alertText).toContain('Please enter at least two valid numbers.');
  });
});