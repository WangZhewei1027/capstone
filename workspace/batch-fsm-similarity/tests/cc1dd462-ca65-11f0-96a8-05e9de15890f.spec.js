import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-18-21/html/cc1dd462-ca65-11f0-96a8-05e9de15890f.html';

test.describe('Quick Sort Visualizer', () => {
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

  test('Initial state should be idle', async () => {
    const cmpCount = await page.textContent('#cmpCount');
    const swapCount = await page.textContent('#swapCount');
    const stepCount = await page.textContent('#stepCount');
    expect(cmpCount).toBe('0');
    expect(swapCount).toBe('0');
    expect(stepCount).toBe('0');
  });

  test('Generate button should create an array', async () => {
    await page.click('#generate');
    const bars = await page.$$('.bar');
    expect(bars.length).toBeGreaterThan(0);
  });

  test('Shuffle button should shuffle the array', async () => {
    await page.click('#generate');
    const initialBars = await page.$$eval('.bar', bars => bars.map(bar => bar.style.height));
    await page.click('#shuffle');
    const shuffledBars = await page.$$eval('.bar', bars => bars.map(bar => bar.style.height));
    expect(initialBars).not.toEqual(shuffledBars);
  });

  test('Start button should begin sorting', async () => {
    await page.click('#generate');
    await page.click('#start');
    await page.waitForTimeout(500); // Wait for a few operations
    const cmpCount = await page.textContent('#cmpCount');
    expect(parseInt(cmpCount)).toBeGreaterThan(0);
  });

  test('Pause button should pause sorting', async () => {
    await page.click('#generate');
    await page.click('#start');
    await page.waitForTimeout(500);
    await page.click('#pause');
    const isPaused = await page.evaluate(() => window.paused);
    expect(isPaused).toBe(true);
  });

  test('Step button should execute one sorting step', async () => {
    await page.click('#generate');
    await page.click('#start');
    await page.click('#pause'); // Pause to step
    const initialStepCount = await page.textContent('#stepCount');
    await page.click('#step');
    const newStepCount = await page.textContent('#stepCount');
    expect(parseInt(newStepCount)).toBeGreaterThan(parseInt(initialStepCount));
  });

  test('Reset button should reset the array', async () => {
    await page.click('#generate');
    await page.click('#start');
    await page.click('#reset');
    const bars = await page.$$('.bar');
    expect(bars.length).toBeGreaterThan(0);
  });

  test('Changing array size should update size value', async () => {
    await page.click('#size');
    await page.fill('#size', '50');
    const sizeVal = await page.textContent('#sizeVal');
    expect(sizeVal).toBe('50');
  });

  test('Changing speed should update speed value', async () => {
    await page.click('#speed');
    await page.fill('#speed', '300');
    const speedVal = await page.textContent('#speedVal');
    expect(speedVal).toBe('300 ms');
  });

  test('Changing pivot should update pivot name', async () => {
    await page.selectOption('#pivot', 'first');
    const pivotName = await page.textContent('#pivotName');
    expect(pivotName).toBe('First element');
  });

  test('Toggle show values should show values on bars', async () => {
    await page.click('#showValues');
    const barWithValue = await page.$('.bar.show-value');
    expect(barWithValue).not.toBeNull();
  });

  test('Keyboard shortcuts should work', async () => {
    await page.click('#generate');
    await page.keyboard.press(' ');
    const isPaused = await page.evaluate(() => window.paused);
    expect(isPaused).toBe(true);
    await page.keyboard.press(' ');
    const isRunning = await page.evaluate(() => window.running);
    expect(isRunning).toBe(true);
  });

  test('Pressing R should reset the array', async () => {
    await page.click('#generate');
    await page.keyboard.press('r');
    const bars = await page.$$('.bar');
    expect(bars.length).toBeGreaterThan(0);
  });
});