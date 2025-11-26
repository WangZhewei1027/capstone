import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-50-07/html/3c8971b1-ca6a-11f0-8bff-85107adc1779.html';

test.describe('Binary Search Demonstration', () => {
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

  test('Initial state is Idle', async () => {
    const logContent = await page.locator('#log').textContent();
    expect(logContent).toContain('Click "Generate Sorted Array" to create an array.');
  });

  test('Generate Sorted Array with valid size', async () => {
    await page.fill('#array-size', '10');
    await page.click('#generate-array');

    const arrayItems = await page.locator('#array-container .array-item').count();
    expect(arrayItems).toBe(10);

    const logContent = await page.locator('#log').textContent();
    expect(logContent).toContain('Generated sorted array:');
  });

  test('Generate Sorted Array with invalid size', async () => {
    await page.fill('#array-size', '50');
    await page.click('#generate-array');

    const alertMessage = await page.waitForEvent('dialog');
    expect(alertMessage.message()).toBe('Please enter an array size between 5 and 30.');
    await alertMessage.dismiss();
  });

  test('Start Search with empty array', async () => {
    await page.click('#start-search');

    const alertMessage = await page.waitForEvent('dialog');
    expect(alertMessage.message()).toBe('Generate the array first.');
    await alertMessage.dismiss();
  });

  test('Start Search with invalid target value', async () => {
    await page.fill('#array-size', '10');
    await page.click('#generate-array');
    await page.fill('#target-value', 'invalid');
    await page.click('#start-search');

    const alertMessage = await page.waitForEvent('dialog');
    expect(alertMessage.message()).toBe('Please enter a valid target number.');
    await alertMessage.dismiss();
  });

  test('Start Search with valid target value', async () => {
    await page.fill('#array-size', '10');
    await page.click('#generate-array');
    await page.fill('#target-value', '5'); // Assuming 5 is in the generated array
    await page.click('#start-search');

    await page.waitForTimeout(2000); // Wait for search animation to complete

    const logContent = await page.locator('#log').textContent();
    expect(logContent).toContain('Found target 5');
  });

  test('Start Search with target value not in array', async () => {
    await page.fill('#array-size', '10');
    await page.click('#generate-array');
    await page.fill('#target-value', '100'); // Assuming 100 is not in the generated array
    await page.click('#start-search');

    await page.waitForTimeout(2000); // Wait for search animation to complete

    const logContent = await page.locator('#log').textContent();
    expect(logContent).toContain('Target 100 not found in the array.');
  });

  test('Adjust speed control and verify changes', async () => {
    await page.fill('#array-size', '10');
    await page.click('#generate-array');
    await page.fill('#target-value', '5');
    await page.click('#start-search');

    await page.fill('#speed-range', '1000'); // Adjust speed to 1000 ms
    const speedDisplay = await page.locator('#speed-display').textContent();
    expect(speedDisplay).toBe('1000 ms');
  });

  test('Handle error alert and return to idle state', async () => {
    await page.fill('#array-size', '10');
    await page.click('#generate-array');
    await page.fill('#target-value', 'invalid');
    await page.click('#start-search');

    const alertMessage = await page.waitForEvent('dialog');
    expect(alertMessage.message()).toBe('Please enter a valid target number.');
    await alertMessage.dismiss();

    await page.click('#generate-array'); // Generate array again to clear error
    const logContent = await page.locator('#log').textContent();
    expect(logContent).toContain('Generated sorted array:');
  });
});