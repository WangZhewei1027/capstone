import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-50-07/html/3c8a8321-ca6a-11f0-8bff-85107adc1779.html';

test.describe('Two Pointers Technique Visualization', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('Initial state should be Idle', async ({ page }) => {
    const outputArea = await page.locator('#outputArea').innerText();
    expect(outputArea).toContain('Enter an array and target, then click \'Run Two Pointers\' to see the process.');
  });

  test('Valid input should transition to ValidatingInput state', async ({ page }) => {
    await page.fill('#inputArray', '1,2,3,4,5');
    await page.fill('#inputTarget', '5');
    await page.click('#runBtn');

    const outputArea = await page.locator('#outputArea').innerText();
    expect(outputArea).toContain('Initial array: [1,2,3,4,5]');
  });

  test('Invalid input should show error message', async ({ page }) => {
    await page.fill('#inputArray', '1,2,3,4,5');
    await page.fill('#inputTarget', 'invalid');
    await page.click('#runBtn');

    const outputArea = await page.locator('#outputArea').innerText();
    expect(outputArea).toContain('Please enter a valid target sum (number).');
  });

  test('Empty input array should show error message', async ({ page }) => {
    await page.fill('#inputArray', '');
    await page.fill('#inputTarget', '5');
    await page.click('#runBtn');

    const outputArea = await page.locator('#outputArea').innerText();
    expect(outputArea).toContain('Please enter a valid array of integers.');
  });

  test('Unsorted input array should show error message', async ({ page }) => {
    await page.fill('#inputArray', '3,1,2');
    await page.fill('#inputTarget', '4');
    await page.click('#runBtn');

    const outputArea = await page.locator('#outputArea').innerText();
    expect(outputArea).toContain('Array is not sorted. Please enter a sorted array.');
  });

  test('Valid input should transition to RunningAlgorithm state and display results', async ({ page }) => {
    await page.fill('#inputArray', '1,2,3,4,5');
    await page.fill('#inputTarget', '5');
    await page.click('#runBtn');

    await page.waitForTimeout(2000); // Wait for the algorithm to complete

    const outputArea = await page.locator('#outputArea').innerText();
    expect(outputArea).toContain('Found target sum! Elements at indices 0 and 3: 1 + 4 = 5');
  });

  test('Clicking Run again after error should clear the error state', async ({ page }) => {
    await page.fill('#inputArray', '3,1,2');
    await page.fill('#inputTarget', '4');
    await page.click('#runBtn');

    let outputArea = await page.locator('#outputArea').innerText();
    expect(outputArea).toContain('Array is not sorted. Please enter a sorted array.');

    await page.fill('#inputArray', '1,2,3,4,5');
    await page.fill('#inputTarget', '5');
    await page.click('#runBtn');

    await page.waitForTimeout(2000); // Wait for the algorithm to complete

    outputArea = await page.locator('#outputArea').innerText();
    expect(outputArea).toContain('Found target sum! Elements at indices 0 and 3: 1 + 4 = 5');
  });

  test('Valid input with no pairs should display appropriate message', async ({ page }) => {
    await page.fill('#inputArray', '1,2,3');
    await page.fill('#inputTarget', '7');
    await page.click('#runBtn');

    await page.waitForTimeout(2000); // Wait for the algorithm to complete

    const outputArea = await page.locator('#outputArea').innerText();
    expect(outputArea).toContain('No two elements sum to 7.');
  });
});