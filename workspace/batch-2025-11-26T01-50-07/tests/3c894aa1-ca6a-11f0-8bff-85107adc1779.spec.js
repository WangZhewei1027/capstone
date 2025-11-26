import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-50-07/html/3c894aa1-ca6a-11f0-8bff-85107adc1779.html';

test.describe('Radix Sort Visualization', () => {
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

  test('should render initial array in Idle state', async () => {
    const arrayItems = await page.$$('#arrayContainer .array-item');
    expect(arrayItems.length).toBe(8);
    const initialValues = await Promise.all(arrayItems.map(item => item.textContent()));
    expect(initialValues).toEqual(['170', '45', '75', '90', '802', '24', '2', '66']);
  });

  test('should validate input and transition to Sorting state', async () => {
    await page.fill('#inputArray', '170, 45, 75, 90, 802, 24, 2, 66');
    await page.click('#startBtn');

    // Wait for sorting to start
    await page.waitForTimeout(1000);
    const logText = await page.textContent('#log');
    expect(logText).toContain('Sorting started');
  });

  test('should show error alert for invalid input', async () => {
    await page.fill('#inputArray', '170, abc, 75');
    await page.click('#startBtn');

    const alertMessage = await page.evaluate(() => window.alert);
    expect(alertMessage).toContain('Please enter valid integers separated by commas.');
  });

  test('should show error alert for negative numbers', async () => {
    await page.fill('#inputArray', '170, -45, 75');
    await page.click('#startBtn');

    const alertMessage = await page.evaluate(() => window.alert);
    expect(alertMessage).toContain('This visualization supports only non-negative integers.');
  });

  test('should complete sorting and transition to SortingComplete state', async () => {
    await page.fill('#inputArray', '170, 45, 75, 90, 802, 24, 2, 66');
    await page.click('#startBtn');

    // Wait for sorting to complete
    await page.waitForTimeout(4000);
    const logText = await page.textContent('#log');
    expect(logText).toContain('Sorting completed!');
    
    const sortedArrayItems = await page.$$('#arrayContainer .array-item');
    const sortedValues = await Promise.all(sortedArrayItems.map(item => item.textContent()));
    expect(sortedValues).toEqual(['2', '24', '45', '66', '75', '90', '170', '802']);
  });

  test('should allow restarting after error', async () => {
    await page.fill('#inputArray', '170, abc, 75');
    await page.click('#startBtn');
    await page.waitForTimeout(500); // Wait for alert

    // Close the error alert
    await page.fill('#inputArray', '170, 45, 75, 90, 802, 24, 2, 66');
    await page.click('#startBtn');

    // Wait for sorting to start
    await page.waitForTimeout(1000);
    const logText = await page.textContent('#log');
    expect(logText).toContain('Sorting started');
  });

  test('should adjust animation speed', async () => {
    await page.fill('#inputArray', '170, 45, 75, 90, 802, 24, 2, 66');
    await page.click('#startBtn');

    await page.fill('#speedRange', '2000');
    const speedValue = await page.inputValue('#speedValue');
    expect(speedValue).toBe('2000');

    // Wait for sorting to complete
    await page.waitForTimeout(4000);
    const logText = await page.textContent('#log');
    expect(logText).toContain('Sorting completed!');
  });
});