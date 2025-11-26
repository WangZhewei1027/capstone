import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-18-21/html/cc1d5f30-ca65-11f0-96a8-05e9de15890f.html';

test.describe('Interactive Heap Visualization Tests', () => {
  let page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto(BASE_URL);
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('Initial state verification', async () => {
    // Verify initial state of the heap
    const typeLabel = await page.locator('#typeLabel').innerText();
    const sizeLabel = await page.locator('#sizeLabel').innerText();
    expect(typeLabel).toBe('Min-heap');
    expect(sizeLabel).toBe('0');
  });

  test('Insert valid value', async () => {
    await page.fill('#valueInput', '42');
    await page.click('#insertBtn');

    // Verify state after insertion
    await page.waitForTimeout(1000); // Wait for animation
    const sizeLabel = await page.locator('#sizeLabel').innerText();
    expect(sizeLabel).toBe('1');

    const arrayRow = await page.locator('#arrayRow').innerText();
    expect(arrayRow).toContain('42');
  });

  test('Insert invalid value', async () => {
    await page.fill('#valueInput', 'invalid');
    await page.click('#insertBtn');

    // Verify alert for invalid input
    const alertMessage = await page.waitForEvent('dialog');
    expect(alertMessage.message()).toContain('Please enter a number');
    await alertMessage.dismiss();
  });

  test('Pop value from heap', async () => {
    await page.click('#popBtn');

    // Verify state after popping
    await page.waitForTimeout(1000); // Wait for animation
    const sizeLabel = await page.locator('#sizeLabel').innerText();
    expect(sizeLabel).toBe('0');

    const arrayRow = await page.locator('#arrayRow').innerText();
    expect(arrayRow).toContain('[ empty ]');
  });

  test('Build heap from array', async () => {
    await page.fill('#arrInput', '9,4,7,1,0');
    await page.click('#buildBtn');

    // Verify state after building
    await page.waitForTimeout(1000); // Wait for animation
    const sizeLabel = await page.locator('#sizeLabel').innerText();
    expect(sizeLabel).toBe('5');

    const arrayRow = await page.locator('#arrayRow').innerText();
    expect(arrayRow).toContain('0');
    expect(arrayRow).toContain('1');
    expect(arrayRow).toContain('4');
    expect(arrayRow).toContain('7');
    expect(arrayRow).toContain('9');
  });

  test('Random fill heap', async () => {
    await page.click('#rndBtn');

    // Verify state after random fill
    await page.waitForTimeout(1000); // Wait for animation
    const sizeLabel = await page.locator('#sizeLabel').innerText();
    expect(parseInt(sizeLabel)).toBeGreaterThan(0);
  });

  test('Toggle heap type', async () => {
    await page.check('#typeToggle');

    // Verify state after toggling to max-heap
    const typeLabel = await page.locator('#typeLabel').innerText();
    expect(typeLabel).toBe('Max-heap');
  });

  test('Toggle animate', async () => {
    await page.uncheck('#animateToggle');

    // Verify state after toggling animation
    const isChecked = await page.isChecked('#animateToggle');
    expect(isChecked).toBe(false);
  });

  test('Toggle show indexes', async () => {
    await page.uncheck('#showIndexes');

    // Verify state after toggling show indexes
    const isChecked = await page.isChecked('#showIndexes');
    expect(isChecked).toBe(false);
  });

  test('Peek value from heap', async () => {
    await page.click('#peekBtn');

    // Verify alert for peek value
    const alertMessage = await page.waitForEvent('dialog');
    expect(alertMessage.message()).toContain('Top element:');
    await alertMessage.dismiss();
  });

  test('Clear heap', async () => {
    await page.click('#clearBtn');

    // Verify state after clearing
    const sizeLabel = await page.locator('#sizeLabel').innerText();
    expect(sizeLabel).toBe('0');

    const arrayRow = await page.locator('#arrayRow').innerText();
    expect(arrayRow).toContain('[ empty ]');
  });

  test('Build heap with invalid input', async () => {
    await page.fill('#arrInput', '9,invalid,7');
    await page.click('#buildBtn');

    // Verify alert for invalid array input
    const alertMessage = await page.waitForEvent('dialog');
    expect(alertMessage.message()).toContain('Invalid number in list');
    await alertMessage.dismiss();
  });

  test('Insert empty value', async () => {
    await page.fill('#valueInput', '');
    await page.click('#insertBtn');

    // Verify alert for empty input
    const alertMessage = await page.waitForEvent('dialog');
    expect(alertMessage.message()).toContain('Please enter a number');
    await alertMessage.dismiss();
  });

  test('Dismiss alert on invalid input', async () => {
    await page.fill('#valueInput', 'invalid');
    await page.click('#insertBtn');

    // Dismiss the alert
    const alertMessage = await page.waitForEvent('dialog');
    await alertMessage.dismiss();
    
    // Verify input is focused again
    const isFocused = await page.evaluate(() => document.activeElement === document.getElementById('valueInput'));
    expect(isFocused).toBe(true);
  });
});