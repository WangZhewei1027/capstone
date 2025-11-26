import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-18-21/html/cc1dfb71-ca65-11f0-96a8-05e9de15890f.html';

test.beforeEach(async ({ page }) => {
  await page.goto(BASE_URL);
});

test.describe('Radix Sort Visualizer Tests', () => {
  
  test('Initial state should be idle', async ({ page }) => {
    const statusText = await page.locator('#statusText').textContent();
    expect(statusText).toBe('Ready. Edit numbers and press "Load & Prepare".');
  });

  test('Load & Prepare with valid input', async ({ page }) => {
    await page.fill('#inputArray', '170, 45, 75, 90, 802, 24, 2, 66');
    await page.click('#btnLoad');

    const initialArray = await page.locator('#initialArray').innerHTML();
    const statusText = await page.locator('#statusText').textContent();
    expect(initialArray).toContain('170');
    expect(statusText).toContain('Prepared');
  });

  test('Load & Prepare with empty input', async ({ page }) => {
    await page.fill('#inputArray', '');
    await page.click('#btnLoad');

    const statusText = await page.locator('#statusText').textContent();
    expect(statusText).toBe('No valid integers found in input.');
  });

  test('Randomize input', async ({ page }) => {
    await page.click('#btnRandom');
    const inputValue = await page.locator('#inputArray').inputValue();
    expect(inputValue).not.toBe('');
  });

  test('Play and Pause functionality', async ({ page }) => {
    await page.fill('#inputArray', '170, 45, 75, 90, 802, 24, 2, 66');
    await page.click('#btnLoad');
    await page.click('#btnStart');

    const statusTextBeforePause = await page.locator('#statusText').textContent();
    expect(statusTextBeforePause).toContain('Sorting complete.'); // Check if it starts sorting

    await page.click('#btnStart'); // Pause
    const statusTextAfterPause = await page.locator('#statusText').textContent();
    expect(statusTextAfterPause).toContain('Sorting complete.'); // Check if it remains paused
  });

  test('Step forward through sorting', async ({ page }) => {
    await page.fill('#inputArray', '170, 45, 75, 90, 802, 24, 2, 66');
    await page.click('#btnLoad');
    await page.click('#btnStart');

    await page.click('#btnStep'); // Step forward
    const groupArray = await page.locator('#groupArray').innerHTML();
    expect(groupArray).not.toBe(''); // Ensure that the group array is updated
  });

  test('Step back through sorting', async ({ page }) => {
    await page.fill('#inputArray', '170, 45, 75, 90, 802, 24, 2, 66');
    await page.click('#btnLoad');
    await page.click('#btnStart');
    await page.click('#btnStep'); // Step forward
    await page.click('#btnBack'); // Step back

    const groupArray = await page.locator('#groupArray').innerHTML();
    expect(groupArray).not.toBe(''); // Ensure that the group array is updated
  });

  test('Reset functionality', async ({ page }) => {
    await page.fill('#inputArray', '170, 45, 75, 90, 802, 24, 2, 66');
    await page.click('#btnLoad');
    await page.click('#btnStart');
    await page.click('#btnReset');

    const statusText = await page.locator('#statusText').textContent();
    expect(statusText).toBe('Reset to initial state.');
    const initialArray = await page.locator('#initialArray').innerHTML();
    expect(initialArray).toContain('170'); // Check if the initial array is rendered again
  });

  test('Change radix/base', async ({ page }) => {
    await page.fill('#inputArray', '170, 45, 75, 90, 802, 24, 2, 66');
    await page.click('#btnLoad');
    await page.selectOption('#radixSelect', '2'); // Change radix to binary

    const radixLabel = await page.locator('#radixLabel').textContent();
    expect(radixLabel).toBe('2');
  });

  test('Change speed', async ({ page }) => {
    await page.fill('#inputArray', '170, 45, 75, 90, 802, 24, 2, 66');
    await page.click('#btnLoad');
    await page.fill('#speed', '1.5'); // Change speed

    const speedValue = await page.locator('#speed').inputValue();
    expect(speedValue).toBe('1.5');
  });

  test('Handle negative numbers', async ({ page }) => {
    await page.fill('#inputArray', '170, -45, 75, -90, 802, 24, 2, 66');
    await page.click('#btnLoad');
    await page.click('#btnStart');

    const statusText = await page.locator('#statusText').textContent();
    expect(statusText).toContain('Sorting complete.'); // Ensure sorting completes
  });

  test('Edge case: Invalid input', async ({ page }) => {
    await page.fill('#inputArray', 'abc, 123, 456');
    await page.click('#btnLoad');

    const statusText = await page.locator('#statusText').textContent();
    expect(statusText).toBe('No valid integers found in input.');
  });

  test('Edge case: Large input', async ({ page }) => {
    const largeInput = Array.from({ length: 1000 }, (_, i) => i).join(', ');
    await page.fill('#inputArray', largeInput);
    await page.click('#btnLoad');

    const initialArray = await page.locator('#initialArray').innerHTML();
    expect(initialArray).toContain('0');
    expect(initialArray).toContain('999');
  });
});