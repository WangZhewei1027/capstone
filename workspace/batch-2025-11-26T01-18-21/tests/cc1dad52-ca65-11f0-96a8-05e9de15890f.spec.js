import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-18-21/html/cc1dad52-ca65-11f0-96a8-05e9de15890f.html';

test.describe('Selection Sort Visualizer', () => {
  let page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto(BASE_URL);
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('Initial state is Idle', async () => {
    const startBtnDisabled = await page.isDisabled('#startBtn');
    const pauseBtnDisabled = await page.isDisabled('#pauseBtn');
    expect(startBtnDisabled).toBe(false);
    expect(pauseBtnDisabled).toBe(true);
  });

  test('Randomize button initializes array and enables controls', async () => {
    await page.click('#randomBtn');
    const stepCounter = await page.textContent('#stepCounter');
    expect(stepCounter).toBe('0');
  });

  test('Play button transitions to Playing state', async () => {
    await page.click('#randomBtn'); // Ensure we have a random array
    await page.click('#startBtn');
    const pauseBtnDisabled = await page.isDisabled('#pauseBtn');
    expect(pauseBtnDisabled).toBe(false);
  });

  test('Pause button transitions to Paused state', async () => {
    await page.click('#startBtn'); // Start playing
    await page.click('#pauseBtn');
    const startBtnDisabled = await page.isDisabled('#startBtn');
    expect(startBtnDisabled).toBe(false);
  });

  test('Step Forward button transitions to StepForward state', async () => {
    await page.click('#randomBtn'); // Ensure we have a random array
    await page.click('#startBtn'); // Start playing
    await page.click('#stepF');
    const stepCounter = await page.textContent('#stepCounter');
    expect(parseInt(stepCounter)).toBeGreaterThan(0);
  });

  test('Step Backward button transitions to StepBackward state', async () => {
    await page.click('#stepB');
    const stepCounter = await page.textContent('#stepCounter');
    expect(parseInt(stepCounter)).toBeLessThan(1);
  });

  test('Reset button resets to initial state', async () => {
    await page.click('#randomBtn'); // Ensure we have a random array
    await page.click('#startBtn'); // Start playing
    await page.click('#resetBtn');
    const stepCounter = await page.textContent('#stepCounter');
    expect(stepCounter).toBe('0');
  });

  test('Change size updates the array', async () => {
    await page.fill('#size', '30');
    const sizeVal = await page.textContent('#sizeVal');
    expect(sizeVal).toBe('30');
  });

  test('Change order updates the sorting order', async () => {
    await page.selectOption('#order', 'desc');
    const orderValue = await page.$eval('#order', el => el.value);
    expect(orderValue).toBe('desc');
  });

  test('Change delay updates the delay value', async () => {
    await page.fill('#delay', '500');
    const delayVal = await page.textContent('#delayVal');
    expect(delayVal).toContain('500ms');
  });

  test('Edit value updates the array and rebuilds snapshots', async () => {
    await page.click('#vis .bar'); // Click on the first bar to edit
    await page.fill('input[type="text"]', '25'); // Enter new value
    await page.keyboard.press('Enter'); // Confirm edit
    const firstBarValue = await page.$eval('#vis .bar', el => el.textContent);
    expect(firstBarValue).toBe('25');
  });

  test('Play completes playback and transitions to Finished state', async () => {
    await page.click('#randomBtn'); // Ensure we have a random array
    await page.click('#startBtn'); // Start playing
    await page.waitForTimeout(5000); // Wait for some time to ensure it plays
    const stepCounter = await page.textContent('#stepCounter');
    const maxStep = await page.textContent('#maxStep');
    expect(stepCounter).toBe(maxStep);
  });
});